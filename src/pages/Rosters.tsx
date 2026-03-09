import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Team } from '../hooks/useDraftState';
import type { Player } from '../hooks/usePlayers';

interface RosterPlayer extends Player {
    isKeeper?: boolean;
}

export function Rosters() {
    const activeDraftId = localStorage.getItem('active_draft_id');
    const [teams, setTeams] = useState<Team[]>([]);
    const [rosters, setRosters] = useState<Record<string, RosterPlayer[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRosters();

        // Subscribe to new picks and keepers
        const channel = supabase.channel('rosters_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
                fetchRosters(); // Re-fetch on any player update (drafted/undrafted)
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'keeper_lists' }, () => {
                fetchRosters();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchRosters() {
        if (!activeDraftId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // 1. Fetch Teams
        const { data: teamsData } = await supabase.from('teams').select('*').eq('draft_id', activeDraftId);
        if (!teamsData) return;
        setTeams(teamsData);

        // 2. Fetch all drafted players via draft_log for this lobby
        const { data: draftLogData } = await supabase.from('draft_log').select(`
            team_id,
            player_id,
            players:players(*)
        `).eq('draft_id', activeDraftId);

        // 3. Fetch keepers for this lobby
        const { data: keeperLists } = await supabase.from('keeper_lists').select(`
            team_id,
            player_id,
            players:players(*)
        `).eq('draft_id', activeDraftId);

        const newRosters: Record<string, RosterPlayer[]> = {};
        teamsData.forEach(t => {
            newRosters[t.id] = [];
        });

        if (keeperLists) {
            keeperLists.forEach(k => {
                if (newRosters[k.team_id] && k.players) {
                    newRosters[k.team_id].push({ ...(k.players as unknown as Player), isKeeper: true });
                }
            });
        }

        if (draftLogData) {
            draftLogData.forEach(log => {
                if (newRosters[log.team_id] && log.players) {
                    newRosters[log.team_id].push({ ...(log.players as unknown as Player), isKeeper: false });
                }
            });
        }

        setRosters(newRosters);
        setLoading(false);
    }

    if (!activeDraftId) {
        return (
            <div className="flex flex-col gap-6 w-full h-full items-center justify-center pt-20">
                <h2 style={{ color: 'var(--text-muted)' }}>No Active Draft</h2>
                <p style={{ color: 'var(--text-secondary)' }}>You must join a draft lobby to view team rosters.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full h-full">
            <h2>Team Rosters</h2>

            {loading && <p>Loading rosters...</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {teams.map(team => {
                    const roster = rosters[team.id] || [];
                    // A standard roster is 26 players (12 keepers + 14 draft rounds)
                    const spots = Array.from({ length: 26 }, (_, i) => roster[i] || null);

                    return (
                        <div key={team.id} className="card flex-col gap-2" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: '1rem' }}>{team.name}</h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{roster.length}/26</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                {team.owner_name}
                            </div>

                            <div className="flex flex-col gap-1">
                                {spots.map((player, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            backgroundColor: player ? 'var(--bg-tertiary)' : 'transparent',
                                            border: player ? 'none' : '1px dashed var(--border-color)',
                                            borderRadius: '0.25rem',
                                            minHeight: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: '0.875rem',
                                            color: player ? (player.isKeeper ? 'var(--warning)' : 'var(--text-primary)') : 'var(--text-muted)'
                                        }}
                                    >
                                        {player ? (
                                            <div className="flex justify-between w-full">
                                                <span>{player.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{player.position}</span></span>
                                                {player.isKeeper && <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>K</span>}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem' }}>Empty Pick {index + 1}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
