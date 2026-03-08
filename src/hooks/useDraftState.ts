import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export interface Team {
    id: string;
    name: string;
    owner_name: string;
}

export interface DraftPick {
    round: number;
    pick_number: number;
    current_team_id: string;
    original_team_id: string;
}

export interface DraftLogEntry {
    id: string;
    round: number;
    pick_number: number;
    team_id: string;
    player_id: string;
    timestamp: string;
}

export function useDraftState() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [draftOrder, setDraftOrder] = useState<DraftPick[]>([]);
    const [draftLog, setDraftLog] = useState<DraftLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchState();

        const channel = supabase.channel('draft_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_log' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setDraftLog(prev => [...prev, payload.new as DraftLogEntry]);
                } else if (payload.eventType === 'DELETE') {
                    setDraftLog(prev => prev.filter(log => log.id !== payload.old.id));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_order' }, (_payload) => {
                fetchDraftOrder(); // Re-fetch draft order if trades happen
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchState() {
        setLoading(true);
        await Promise.all([
            fetchTeams(),
            fetchDraftOrder(),
            fetchDraftLog()
        ]);
        setLoading(false);
    }

    async function fetchTeams() {
        const { data } = await supabase.from('teams').select('*');
        if (data) setTeams(data);
    }

    async function fetchDraftOrder() {
        const { data } = await supabase.from('draft_order').select('*').order('round').order('pick_number');
        if (data) setDraftOrder(data);
    }

    async function fetchDraftLog() {
        const { data } = await supabase.from('draft_log').select('*').order('timestamp');
        if (data) setDraftLog(data);
    }

    const currentPick = useMemo(() => {
        if (draftOrder.length === 0) return null;
        const nextPickIndex = draftLog.length;
        if (nextPickIndex >= draftOrder.length) return null; // Draft is over
        return draftOrder[nextPickIndex];
    }, [draftOrder, draftLog]);

    const currentTeam = useMemo(() => {
        if (!currentPick || teams.length === 0) return null;
        return teams.find(t => t.id === currentPick.current_team_id) || null;
    }, [currentPick, teams]);

    return { teams, draftOrder, draftLog, currentPick, currentTeam, loading };
}
