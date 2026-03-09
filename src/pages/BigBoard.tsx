import { useMemo, useState, useEffect } from 'react';
import { useBigBoardPlayers } from '../hooks/usePlayers';
import type { Player } from '../hooks/usePlayers';
import { useDraftState } from '../hooks/useDraftState';
import { useWatchlist } from '../hooks/useWatchlist';
import { supabase } from '../lib/supabase';
import { Star } from 'lucide-react';

export function BigBoard() {
    const activeDraftId = localStorage.getItem('active_draft_id');
    const { players, loading } = useBigBoardPlayers(activeDraftId);
    const { currentPick, currentTeam, fetchState } = useDraftState(activeDraftId);
    const [search, setSearch] = useState('');
    const [positionFilter, setPositionFilter] = useState('');
    const [draftingId, setDraftingId] = useState<string | null>(null);
    const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);

    const [userId, setUserId] = useState<string | null>(null);
    const [userTeamId, setUserTeamId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    }, []);

    // Find the user's team in this draft
    useEffect(() => {
        if (!userId) return;
        const fetchUserTeam = async () => {
            const { data } = await supabase.from('teams').select('id').eq('draft_id', activeDraftId).eq('user_id', userId).single();
            if (data) setUserTeamId(data.id);
        }
        fetchUserTeam();
    }, [userId, activeDraftId]);

    const { watchlist, toggleWatch } = useWatchlist(userId);

    const filteredPlayers = useMemo(() => {
        const removeDiacritics = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const searchNormalized = removeDiacritics(search.toLowerCase());

        return players.filter(p => {
            if (p.is_drafted) return false;

            if (search && !removeDiacritics(p.name.toLowerCase()).includes(searchNormalized)) return false;

            if (positionFilter) {
                const playerPositions = p.position.split(/[\s,\/]+/).filter(Boolean);

                let matchesPos = false;
                if (positionFilter === 'IF') {
                    matchesPos = playerPositions.some(pos => ['1B', '2B', '3B', 'SS'].includes(pos));
                } else if (positionFilter === 'OF') {
                    matchesPos = playerPositions.some(pos => ['OF', 'LF', 'CF', 'RF'].includes(pos));
                } else {
                    matchesPos = playerPositions.includes(positionFilter);
                }

                if (!matchesPos) return false;
            }

            if (showWatchlistOnly && !watchlist.find(w => w.player_id === p.id)) return false;
            return true;
        });
    }, [players, search, positionFilter, showWatchlistOnly, watchlist]);

    const handleDraftPlayer = async (player: Player) => {
        if (!currentPick || !currentTeam) {
            alert("Draft is not active or no pick is scheduled.");
            return;
        }

        if (currentTeam.id !== userTeamId) {
            alert("It is not your turn to draft!");
            return;
        }

        if (!window.confirm(`Draft ${player.name} to ${currentTeam.name}?`)) return;

        setDraftingId(player.id);
        try {
            const { error: logError } = await supabase.from('draft_log').insert({
                draft_id: activeDraftId,
                round: currentPick.round,
                pick_number: currentPick.pick_number,
                team_id: currentTeam.id,
                player_id: player.id
            });
            if (logError) throw logError;
            await fetchState();
            // No longer updating the global `players` table with `is_drafted`
        } catch (err: any) {
            alert("Error drafting player: " + err.message);
        } finally {
            setDraftingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 w-full h-full">
            <div className="flex justify-between items-center">
                <h2>Big Board</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search players..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}>
                        <option value="">All Positions</option>
                        <option value="C">C</option>
                        <option value="1B">1B</option>
                        <option value="2B">2B</option>
                        <option value="3B">3B</option>
                        <option value="SS">SS</option>
                        <option value="IF">IF</option>
                        <option value="OF">OF</option>
                        <option value="Util">Util</option>
                        <option value="SP">SP</option>
                        <option value="RP">RP</option>
                    </select>
                    <button
                        className={`btn ${showWatchlistOnly ? 'btn-primary' : ''}`}
                        onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: showWatchlistOnly ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: showWatchlistOnly ? '#000' : 'var(--text-primary)' }}
                    >
                        <Star size={16} fill={showWatchlistOnly ? '#000' : 'none'} />
                        Watchlist
                    </button>
                </div>
            </div>

            <div className="card table-container">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading players...</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>ADP</th>
                                <th>Player</th>
                                <th>Team</th>
                                <th>Pos</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlayers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center' }}>No players available matching criteria.</td>
                                </tr>
                            ) : (
                                filteredPlayers.map(p => {
                                    const isWatched = !!watchlist.find(w => w.player_id === p.id);
                                    return (
                                        <tr key={p.id}>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => toggleWatch(p.id)}
                                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: isWatched ? 'var(--warning)' : 'var(--text-muted)' }}
                                                >
                                                    <Star size={18} fill={isWatched ? 'var(--warning)' : 'none'} />
                                                </button>
                                            </td>
                                            <td>{p.adp}</td>
                                            <td style={{ fontWeight: 500 }}>{p.name}</td>
                                            <td>{p.team}</td>
                                            <td>{p.position}</td>
                                            <td>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleDraftPlayer(p)}
                                                    disabled={!currentPick || draftingId === p.id || currentTeam?.id !== userTeamId}
                                                    style={{
                                                        padding: '0.25rem 0.5rem',
                                                        fontSize: '0.875rem',
                                                        opacity: (!currentPick || currentTeam?.id !== userTeamId) ? 0.5 : 1
                                                    }}
                                                >
                                                    {draftingId === p.id ? 'Drafting...' : 'Draft'}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
