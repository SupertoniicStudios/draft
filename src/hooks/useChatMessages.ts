import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ChatMessage {
    id: string;
    draft_id: string;
    user_id: string;
    message: string;
    created_at: string;
    // We will join basic team info if possible, or we might need to look it up in the UI
}

export function useChatMessages(draftId: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = async () => {
        if (!draftId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('draft_id', draftId)
            .order('created_at', { ascending: true }); // Newest at bottom for chat

        if (error) {
            console.error('Error fetching chat messages:', error);
        } else if (data) {
            setMessages(data as ChatMessage[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!draftId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        fetchMessages();

        const channel = supabase.channel(`chat_messages_${draftId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `draft_id=eq.${draftId}`
                },
                (_payload) => {
                    // Following dev best practices constraint:
                    // While we could just append, the rule is to fetchState.
                    // But for chat, we might just fetch messages. Let's fetch to ensure ordering and completeness if many arrive.
                    fetchMessages();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [draftId]);

    const sendMessage = async (userId: string, message: string) => {
        if (!draftId || !message.trim() || !userId) return;

        const { error } = await supabase.from('chat_messages').insert({
            draft_id: draftId,
            user_id: userId,
            message: message.trim()
        });
        
        if (error) {
            console.error('Error sending message:', error);
        }
    };

    return { messages, loading, sendMessage };
}
