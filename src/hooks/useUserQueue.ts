import { useDraftState } from './useDraftState';
import { supabase } from '../lib/supabase';
import type { Player } from './usePlayers';
import { useMemo } from 'react';

export function useUserQueue(draftId: string | null, userId: string | null, allPlayers: Player[]) {
    const { userQueues, teams } = useDraftState(draftId);

    const userTeam = useMemo(() => {
        if (!teams || !userId) return null;
        return teams.find(t => t.user_id === userId);
    }, [teams, userId]);

    const userQueueData = useMemo(() => {
        if (!userQueues || !userTeam) return null;
        return userQueues.find(q => q.team_id === userTeam.id);
    }, [userQueues, userTeam]);

    const queuePlayerIds = userQueueData?.queue || [];
    const isQueueRevealed = userTeam?.is_queue_revealed || false;

    // Filter out players who are already drafted just in case
    const queuedPlayers = useMemo(() => {
        return queuePlayerIds
            .map(id => allPlayers.find(p => p.id === id))
            .filter((p): p is Player => p !== undefined && !p.is_drafted);
    }, [queuePlayerIds, allPlayers]);

    const addToQueue = async (playerId: string) => {
        if (!userTeam || !draftId) return;
        const newQueue = [...queuePlayerIds, playerId];
        await supabase.from('user_queues').upsert({
            team_id: userTeam.id,
            draft_id: draftId,
            queue: newQueue
        });
    };

    const removeFromQueue = async (playerId: string) => {
        if (!userTeam || !draftId) return;
        const newQueue = queuePlayerIds.filter(id => id !== playerId);
        await supabase.from('user_queues').upsert({
            team_id: userTeam.id,
            draft_id: draftId,
            queue: newQueue
        });
    };

    const reorderQueue = async (startIndex: number, endIndex: number) => {
        if (!userTeam || !draftId) return;
        const result = Array.from(queuePlayerIds);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        
        await supabase.from('user_queues').upsert({
            team_id: userTeam.id,
            draft_id: draftId,
            queue: result
        });
    };

    const toggleReveal = async () => {
        if (!userTeam) return;
        await supabase.from('teams').update({
            is_queue_revealed: !isQueueRevealed
        }).eq('id', userTeam.id);
    };

    return {
        queuedPlayers,
        isQueueRevealed,
        addToQueue,
        removeFromQueue,
        reorderQueue,
        toggleReveal,
        userTeamId: userTeam?.id
    };
}
