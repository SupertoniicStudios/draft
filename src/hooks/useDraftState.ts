import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export interface Team {
    id: string;
    name: string;
    owner_name: string;
    user_id?: string | null;
    draft_id: string;
}

export interface DraftPick {
    round: number;
    pick_number: number;
    current_team_id: string;
    original_team_id: string;
    draft_id: string;
}

export interface DraftLogEntry {
    id: string;
    round: number;
    pick_number: number;
    team_id: string;
    player_id: string;
    timestamp: string;
    draft_id: string;
}

export function useDraftState(draftId?: string | null) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [draftOrder, setDraftOrder] = useState<DraftPick[]>([]);
    const [draftLog, setDraftLog] = useState<DraftLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!draftId) {
            setTeams([]);
            setDraftOrder([]);
            setDraftLog([]);
            setLoading(false);
            return;
        }

        fetchState();

        const channel = supabase.channel(`draft_channel_${draftId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_log', filter: `draft_id=eq.${draftId}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setDraftLog(prev => [...prev, payload.new as DraftLogEntry]);
                } else if (payload.eventType === 'DELETE') {
                    setDraftLog(prev => prev.filter(log => log.id !== payload.old.id));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_order', filter: `draft_id=eq.${draftId}` }, () => {
                fetchDraftOrder();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `draft_id=eq.${draftId}` }, () => {
                fetchTeams(); // For claim team updates
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [draftId]);

    async function fetchState() {
        if (!draftId) return;
        setLoading(true);
        await Promise.all([
            fetchTeams(),
            fetchDraftOrder(),
            fetchDraftLog()
        ]);
        setLoading(false);
    }

    async function fetchTeams() {
        if (!draftId) return;
        const { data } = await supabase.from('teams').select('*').eq('draft_id', draftId);
        if (data) setTeams(data);
    }

    async function fetchDraftOrder() {
        if (!draftId) return;
        const { data } = await supabase.from('draft_order').select('*').eq('draft_id', draftId).order('round').order('pick_number');
        if (data) setDraftOrder(data);
    }

    async function fetchDraftLog() {
        if (!draftId) return;
        const { data } = await supabase.from('draft_log').select('*').eq('draft_id', draftId).order('timestamp');
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
