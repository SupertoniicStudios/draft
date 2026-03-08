import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Player {
    id: string;
    name: string;
    team: string;
    position: string;
    adp: number;
    is_drafted: boolean;
    drafted_by_team_id: string | null;
}

export function useBigBoardPlayers() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlayers();

        const subscription = supabase
            .channel('players_channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'players' },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        setPlayers(current =>
                            current.map(p => p.id === payload.new.id ? payload.new as Player : p)
                        );
                    } else if (payload.eventType === 'INSERT') {
                        setPlayers(current => [...current, payload.new as Player]);
                    } else if (payload.eventType === 'DELETE') {
                        setPlayers(current => current.filter(p => p.id !== payload.old.id));
                    }
                }
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
                .select('*')
                .order('adp', { ascending: true });

            if (error) throw error;
            setPlayers(data || []);
        } catch (err) {
            console.error("Error fetching players", err);
        } finally {
            setLoading(false);
        }
    }

    return { players, loading };
}
