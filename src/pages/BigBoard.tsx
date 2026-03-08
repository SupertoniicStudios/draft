import { useMemo, useState } from 'react';
import { useBigBoardPlayers } from '../hooks/usePlayers';
import type { Player } from '../hooks/usePlayers';
import { useDraftState } from '../hooks/useDraftState';
import { supabase } from '../lib/supabase';

export function BigBoard() {
    const { players, loading } = useBigBoardPlayers();
    const { currentPick, currentTeam } = useDraftState();
    const [search, setSearch] = useState('');
    const [positionFilter, setPositionFilter] = useState('');
    const [draftingId, setDraftingId] = useState<string | null>(null);

    const filteredPlayers = useMemo(() => {
        return players.filter(p => {
            if (p.is_drafted) return false;
            if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (positionFilter && p.position !== positionFilter && !p.position.includes(positionFilter)) return false;
            return true;
        });
    }, [players, search, positionFilter]);

    const handleDraftPlayer = async (player: Player) => {
        if (!currentPick || !currentTeam) {
            alert("Draft is not active or no pick is scheduled.");
            return;
        }

        // Check if Commish or active user logic here, for now allowing it
        if (!window.confirm(`Draft ${player.name} to ${currentTeam.name}?`)) return;

        setDraftingId(player.id);
        try {
            // 1. Insert into draft_log
            const { error: logError } = await supabase.from('draft_log').insert({
                round: currentPick.round,
                pick_number: currentPick.pick_number,
                team_id: currentTeam.id,
                player_id: player.id
            });
            if (logError) throw logError;

            // 2. Update player as drafted
            const { error: updateError } = await supabase.from('players')
                .update({ is_drafted: true, drafted_by_team_id: currentTeam.id })
                .eq('id', player.id);
            if (updateError) throw updateError;

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
                        <option value="OF">OF</option>
                        <option value="SP">SP</option>
                        <option value="RP">RP</option>
                    </select>
                </div>
            </div>

            <div className="card table-container">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading players...</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
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
                                    <td colSpan={5} style={{ textAlign: 'center' }}>No players available matching criteria.</td>
                                </tr>
                            ) : (
                                filteredPlayers.map(p => (
                                    <tr key={p.id}>
                                        <td>{p.adp}</td>
                                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                                        <td>{p.team}</td>
                                        <td>{p.position}</td>
                                        <td>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleDraftPlayer(p)}
                                                disabled={!currentPick || draftingId === p.id}
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                            >
                                                {draftingId === p.id ? 'Drafting...' : 'Draft'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
