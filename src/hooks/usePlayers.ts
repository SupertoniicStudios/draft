import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useDraftState } from './useDraftState';

export interface Player {
    id: string;
    name: string;
    team: string;
    position: string;
    adp: number;
    // We will compute these dynamically based on the current draft Id
    is_drafted?: boolean;
    drafted_by_team_id?: string | null;
}

export function useBigBoardPlayers(draftId?: string | null) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    const { draftLog, keepers } = useDraftState(draftId);

    useEffect(() => {
        fetchPlayers();

        // The base `players` table rarely changes, but we'll keep the subscription just in case
        const subscription = supabase
            .channel('players_channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'players' },
                () => fetchPlayers()
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    async function fetchPlayers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('players')
                .select('id, name, team, position, adp') // No more is_drafted or drafted_by
                .order('adp', { ascending: true });

            if (error) throw error;
            setPlayers(data || []);
        } catch (err) {
            console.error("Error fetching players", err);
        } finally {
            setLoading(false);
        }
    }

    // Compute the final player list with injected `is_drafted` state based on `draftLog` and `keepers`
    const computedPlayers = useMemo(() => {
        if (!players.length) return [];
        if (!draftId) return players; // If no draft, they are all just "available"

        const draftedMap = new Map<string, string>(); // player_id -> team_id

        // Add Keepers
        keepers.forEach(k => draftedMap.set(k.player_id, k.team_id));

        // Add Drafted
        draftLog.forEach(log => draftedMap.set(log.player_id, log.team_id));

        return players.map(p => {
            const teamId = draftedMap.get(p.id);
            return {
                ...p,
                is_drafted: !!teamId,
                drafted_by_team_id: teamId || null
            };
        });
    }, [players, draftLog, keepers, draftId]);


    return { players: computedPlayers, loading };
}
