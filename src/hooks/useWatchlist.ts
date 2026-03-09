import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface WatchlistItem {
    id: string;
    user_id: string;
    player_id: string;
}

export function useWatchlist(userId: string | null) {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setWatchlist([]);
            setLoading(false);
            return;
        }

        fetchWatchlist();

        const channel = supabase.channel('watchlist_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'watchlists', filter: `user_id=eq.${userId}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setWatchlist(prev => [...prev, payload.new as WatchlistItem]);
                } else if (payload.eventType === 'DELETE') {
                    setWatchlist(prev => prev.filter(w => w.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    async function fetchWatchlist() {
        if (!userId) return;
        setLoading(true);
        const { data } = await supabase.from('watchlists').select('*').eq('user_id', userId);
        if (data) setWatchlist(data);
        setLoading(false);
    }

    const toggleWatch = async (playerId: string) => {
        if (!userId) return;

        const existing = watchlist.find(w => w.player_id === playerId);
        if (existing) {
            // Remove
            await supabase.from('watchlists').delete().eq('id', existing.id);
        } else {
            // Add
            await supabase.from('watchlists').insert({ user_id: userId, player_id: playerId });
        }
    };

    return { watchlist, loading, toggleWatch };
}
