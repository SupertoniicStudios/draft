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

export interface KeeperEntry {
    player_id: string;
    team_id: string;
    draft_id: string;
}

export function useDraftState(draftId?: string | null) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [draftOrder, setDraftOrder] = useState<DraftPick[]>([]);
    const [draftLog, setDraftLog] = useState<DraftLogEntry[]>([]);
    const [keepers, setKeepers] = useState<KeeperEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!draftId) {
            setTeams([]);
            setDraftOrder([]);
            setDraftLog([]);
            setKeepers([]);
            setLoading(false);
            return;
        }

        fetchState();

        const channelId = Math.random().toString(36).substring(7);
        const channel = supabase.channel(`draft_channel_${draftId}_${channelId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_log' }, (payload) => {
                const log = (payload.eventType === 'DELETE' ? payload.old : payload.new) as any;
                if (!log.draft_id || log.draft_id === draftId) {
                    fetchDraftLog();
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_order' }, (payload) => {
                const order = (payload.new || payload.old) as any;
                if (!order.draft_id || order.draft_id === draftId) {
                    fetchDraftOrder();
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
                const team = (payload.new || payload.old) as any;
                if (!team.draft_id || team.draft_id === draftId) {
                    fetchTeams();
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'keeper_lists' }, (payload) => {
                const keeper = (payload.new || payload.old) as any;
                if (!keeper.draft_id || keeper.draft_id === draftId) {
                    fetchKeepers();
                }
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
            fetchDraftLog(),
            fetchKeepers()
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

    async function fetchKeepers() {
        if (!draftId) return;
        const { data } = await supabase.from('keeper_lists').select('*').eq('draft_id', draftId);
        if (data) setKeepers(data);
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

    return { teams, draftOrder, draftLog, keepers, currentPick, currentTeam, loading, fetchState };
}
