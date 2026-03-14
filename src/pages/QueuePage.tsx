import { useEffect, useState } from 'react';
import { useBigBoardPlayers } from '../hooks/usePlayers';
import { supabase } from '../lib/supabase';
import { DraftQueue } from '../components/DraftQueue';

export function QueuePage() {
    const activeDraftId = localStorage.getItem('active_draft_id');
    const { players, loading } = useBigBoardPlayers(activeDraftId);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-full">Loading Queue...</div>;
    }

    if (!activeDraftId) {
        return (
            <div className="flex justify-center items-center h-full text-muted">
                Please join a draft lobby to view your queue.
            </div>
        );
    }

    if (!userId) {
        return null; // Should be handled by Auth protection in App.tsx
    }

    return (
        <div className="w-full h-full flex justify-center pb-16 md:pb-0">
            <div className="w-full max-w-4xl h-[calc(100vh-120px)]">
                <DraftQueue draftId={activeDraftId} userId={userId} allPlayers={players} />
            </div>
        </div>
    );
}
