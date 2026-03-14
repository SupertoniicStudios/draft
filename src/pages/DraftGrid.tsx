import React, { useMemo } from 'react';
import { useDraftState } from '../hooks/useDraftState';
import { useBigBoardPlayers } from '../hooks/usePlayers';

export function DraftGrid() {
    const { draftOrder, draftLog, teams, currentPick, loading } = useDraftState();
    const { players } = useBigBoardPlayers();

    // Group picks by round
    const roundsMap = useMemo(() => {
        const map = new Map<number, typeof draftOrder>();
        draftOrder.forEach(pick => {
            if (!map.has(pick.round)) map.set(pick.round, []);
            map.get(pick.round)!.push(pick);
        });
        map.forEach(picks => picks.sort((a, b) => a.pick_number - b.pick_number));
        return map;
    }, [draftOrder]);

    const rounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);
    const firstRoundPicks = roundsMap.get(1) || [];

    const getPositionColor = (pos: string) => {
        if (!pos) return { bg: '#1f2937', border: '#374151', text: '#f3f4f6' }; // gray-800
        const p = pos.toUpperCase();
        if (p.includes('P')) return { bg: '#1e3a8a', border: '#1d4ed8', text: '#eff6ff' }; // blue-900/700
        if (p.includes('1B') || p.includes('3B')) return { bg: '#7f1d1d', border: '#b91c1c', text: '#fef2f2' }; // red-900/700
        if (p.includes('OF')) return { bg: '#14532d', border: '#15803d', text: '#f0fdf4' }; // green-900/700
        if (p.includes('SS') || p.includes('2B')) return { bg: '#713f12', border: '#a16207', text: '#fefce8' }; // yellow-900/700
        if (p.includes('C')) return { bg: '#581c87', border: '#7e22ce', text: '#faf5ff' }; // purple-900/700
        return { bg: '#1f2937', border: '#374151', text: '#f3f4f6' };
    };

    const handleExport = () => {
        const rows = [['Round', 'Pick', 'Team', 'Player', 'Position', 'MLB Team']];
        
        draftOrder.forEach(pick => {
            const logEntry = draftLog.find(l => l.round === pick.round && l.pick_number === pick.pick_number);
            const team = teams.find(t => t.id === pick.current_team_id)?.name || 'Unknown Team';
            
            if (logEntry) {
                const player = players.find(p => p.id === logEntry.player_id);
                if (player) {
                    rows.push([
                        pick.round.toString(),
                        pick.pick_number.toString(),
                        `"${team}"`,
                        `"${player.name}"`,
                        player.position,
                        player.team
                    ]);
                } else {
                    rows.push([pick.round.toString(), pick.pick_number.toString(), `"${team}"`, 'Unknown Player', '', '']);
                }
            } else {
                rows.push([pick.round.toString(), pick.pick_number.toString(), `"${team}"`, '', '', '']);
            }
        });

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "draft_board.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full">Loading War Room...</div>;
    }

    if (draftOrder.length === 0) {
        return <div className="flex justify-center items-center h-full text-muted">Draft order not generated yet.</div>;
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <style>{`
                .grid-container {
                    display: grid;
                    grid-template-columns: 60px repeat(${firstRoundPicks.length}, minmax(140px, 1fr));
                    gap: 0.5rem;
                    overflow-x: auto;
                    padding-bottom: 2rem;
                }
                .grid-header {
                    background-color: var(--bg-tertiary);
                    padding: 0.5rem;
                    text-align: center;
                    font-weight: bold;
                    border-radius: 0.25rem;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .grid-sidebar {
                    background-color: var(--bg-tertiary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    border-radius: 0.25rem;
                    position: sticky;
                    left: 0;
                    z-index: 5;
                }
                .grid-tile {
                    border: 1px solid var(--border-color);
                    border-radius: 0.25rem;
                    padding: 0.5rem;
                    min-height: 80px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .tile-empty {
                    background-color: var(--bg-secondary);
                    color: var(--text-muted);
                    text-align: center;
                }
                @keyframes pulse-yellow {
                    0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7); }
                    70% { box-shadow: 0 0 0 6px rgba(250, 204, 21, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
                }
                .tile-active {
                    border: 2px solid #facc15 !important;
                    animation: pulse-yellow 2s infinite;
                    background-color: var(--bg-tertiary);
                }
                .player-name {
                    font-weight: 600;
                    font-size: 0.9rem;
                    margin-bottom: 0.25rem;
                    line-height: 1.2;
                }
                .player-meta {
                    font-size: 0.75rem;
                    opacity: 0.9;
                    display: flex;
                    justify-content: space-between;
                }
                .team-override {
                    font-size: 0.7rem;
                    opacity: 0.7;
                    margin-top: 0.25rem;
                    text-align: center;
                }
            `}</style>

            <div className="flex justify-between items-center">
                <h2>The War Room</h2>
                <button onClick={handleExport} className="btn btn-primary">
                    Download Final Board
                </button>
            </div>

            <div className="card" style={{ flexGrow: 1, padding: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="grid-container layout-scrollbar">
                    {/* Top Left Empty Cell */}
                    <div className="grid-header" style={{ left: 0, zIndex: 15 }}>Rnd</div>
                    
                    {/* Column Headers (Teams) */}
                    {firstRoundPicks.map(p => {
                        const originalTeam = teams.find(t => t.id === p.original_team_id);
                        return (
                            <div key={`header-${p.pick_number}`} className="grid-header">
                                <div style={{ fontSize: '0.85rem' }}>{originalTeam?.name || 'Unknown'}</div>
                            </div>
                        );
                    })}

                    {/* Grid Rows */}
                    {rounds.map(roundNum => {
                        const picksInRound = roundsMap.get(roundNum) || [];
                        return (
                            <React.Fragment key={`round-${roundNum}`}>
                                {/* Row Sidebar */}
                                <div className="grid-sidebar">
                                    {roundNum}
                                </div>

                                {/* Pick Tiles */}
                                {picksInRound.map(pick => {
                                    const logEntry = draftLog.find(l => l.round === pick.round && l.pick_number === pick.pick_number);
                                    const isOnTheClock = currentPick?.round === pick.round && currentPick?.pick_number === pick.pick_number;
                                    const currentTeam = teams.find(t => t.id === pick.current_team_id);
                                    const isTraded = pick.current_team_id !== pick.original_team_id;

                                    if (logEntry) {
                                        // Drafted State
                                        const player = players.find(p => p.id === logEntry.player_id);
                                        if (player) {
                                            const colors = getPositionColor(player.position);
                                            return (
                                                <div 
                                                    key={`${pick.round}-${pick.pick_number}`} 
                                                    className="grid-tile"
                                                    style={{ 
                                                        backgroundColor: colors.bg, 
                                                        borderColor: colors.border,
                                                        color: colors.text
                                                    }}
                                                >
                                                    <div className="player-name">{player.name}</div>
                                                    <div className="player-meta">
                                                        <span>{player.position}</span>
                                                        <span>{player.team}</span>
                                                    </div>
                                                    {isTraded && (
                                                        <div className="team-override">VIA {currentTeam?.name.substring(0, 10)}</div>
                                                    )}
                                                </div>
                                            );
                                        }
                                    }

                                    // Empty / Active State
                                    return (
                                        <div 
                                            key={`${pick.round}-${pick.pick_number}`} 
                                            className={`grid-tile tile-empty ${isOnTheClock ? 'tile-active' : ''}`}
                                        >
                                            <div style={{ fontSize: '0.85rem', fontWeight: isOnTheClock ? 'bold' : 'normal', color: isOnTheClock ? '#fefce8' : 'inherit' }}>
                                                {pick.round}.{pick.pick_number.toString().padStart(2, '0')}
                                            </div>
                                            {(isOnTheClock || isTraded) && (
                                                <div className="team-override" style={{ color: isOnTheClock ? '#facc15' : 'inherit' }}>
                                                    {currentTeam?.name}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
