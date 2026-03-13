import { useMemo, useState, useEffect, useRef } from 'react';
import { useDraftState } from '../hooks/useDraftState';
import { useBigBoardPlayers } from '../hooks/usePlayers';
import { useWatchlist } from '../hooks/useWatchlist';
import { useChatMessages } from '../hooks/useChatMessages';
import { supabase } from '../lib/supabase';
import { Star, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import type { Player } from '../hooks/usePlayers';

export function DraftDashboard() {
    const activeDraftId = localStorage.getItem('active_draft_id');
    const { players, loading: playersLoading } = useBigBoardPlayers(activeDraftId);
    const { draftOrder, draftLog, teams, currentPick, currentTeam, fetchState } = useDraftState(activeDraftId);
    const { messages, sendMessage } = useChatMessages(activeDraftId);

    const [userId, setUserId] = useState<string | null>(null);
    const [userTeamId, setUserTeamId] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const { watchlist, toggleWatch } = useWatchlist(userId);

    // Big Board State
    const [search, setSearch] = useState('');
    const [positionFilter, setPositionFilter] = useState('');
    const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
    const [draftingId, setDraftingId] = useState<string | null>(null);
    const [playerToDraft, setPlayerToDraft] = useState<Player | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    }, []);

    useEffect(() => {
        if (!userId || !activeDraftId) return;
        const fetchUserTeam = async () => {
            const { data } = await supabase.from('teams').select('id').eq('draft_id', activeDraftId).eq('user_id', userId).single();
            if (data) setUserTeamId(data.id);
        }
        fetchUserTeam();
    }, [userId, activeDraftId]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !userId) return;
        await sendMessage(userId, chatInput);
        setChatInput('');
    };

    // Filtered Players for Compact Board
    const filteredPlayers = useMemo(() => {
        const removeDiacritics = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const searchNormalized = removeDiacritics(search.toLowerCase());

        return players.filter(p => {
            if (p.is_drafted) return false;
            if (search && !removeDiacritics(p.name.toLowerCase()).includes(searchNormalized)) return false;
            if (positionFilter) {
                const playerPositions = p.position.split(/[\s,/]+/).filter(Boolean);
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

    const handleDraftPlayer = (player: Player) => {
        if (!currentPick || !currentTeam) {
            toast.error("Draft is not active or no pick is scheduled.");
            return;
        }
        if (currentTeam.id !== userTeamId) {
            toast.error("It is not your turn to draft!");
            return;
        }
        setPlayerToDraft(player);
    };

    const confirmDraftPlayer = async () => {
        if (!playerToDraft || !currentPick || !currentTeam) return;

        setDraftingId(playerToDraft.id);
        const player = playerToDraft;
        setPlayerToDraft(null);

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
            toast.success(`Drafted ${player.name} to ${currentTeam.name}!`);
        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error("Error drafting player: " + err.message);
            } else {
                toast.error("An unknown error occurred.");
            }
        } finally {
            setDraftingId(null);
        }
    };

    // Status Data
    const lastPick = draftLog.length > 0 ? draftLog[draftLog.length - 1] : null;
    const lastPlayer = lastPick ? players.find(p => p.id === lastPick.player_id) : null;
    const lastTeam = lastPick ? teams.find(t => t.id === lastPick.team_id) : null;
    
    // Reverse draft log for activity list
    const reversedLog = [...draftLog].reverse();

    if (!activeDraftId) {
        return <div className="p-8 text-center text-gray-500">Please select an active draft lobby.</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] w-full gap-4 max-w-7xl mx-auto p-4">
            
            {/* Top Section: Status */}
            <div className="flex gap-4 items-center bg-[var(--bg-secondary)] p-5 rounded-xl border border-[var(--border-color)] overflow-x-auto whitespace-nowrap shadow-md">
                <div className="flex-1 min-w-[200px]">
                    <h3 className="text-xs uppercase font-bold text-[var(--accent-primary)] tracking-widest mb-1">On the Clock</h3>
                    <div className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        {currentTeam ? currentTeam.name : "Draft Complete"}
                    </div>
                </div>
                {lastPick && (
                    <div className="flex-1 min-w-[200px] border-l border-[var(--border-color)] pl-5">
                        <h3 className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-widest mb-1">Last Pick</h3>
                        <div className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
                            {lastPlayer?.name || "Unknown"} <span className="text-[var(--text-muted)] text-base font-normal ml-1">({lastTeam?.name})</span>
                        </div>
                    </div>
                )}
                {/* On Deck Section */}
                {draftOrder && draftOrder.length > draftLog.length && (
                    <div className="flex-1 min-w-[200px] border-l border-[var(--border-color)] pl-5">
                        <h3 className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-widest mb-1">On Deck</h3>
                        <div className="text-xl font-medium text-[var(--text-secondary)] tracking-tight">
                            {teams.find(t => t.id === draftOrder[draftLog.length].current_team_id)?.name || "Unknown"}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Grid: Left (Activity) | Middle (Board) | Right (Chat) */}
            <div className="flex flex-1 gap-4 min-h-0">
                
                {/* Left Column: Activity Log */}
                <div className="flex flex-col flex-[1] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden min-h-0 min-w-[250px] shadow-sm">
                    <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)] font-bold text-sm tracking-wider uppercase text-[var(--text-secondary)] shrink-0">
                        Pick Activity
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 layout-scrollbar">
                        {reversedLog.length === 0 ? (
                            <div className="text-center p-6 text-[var(--text-muted)] text-sm italic">No picks made yet.</div>
                        ) : (
                            reversedLog.map((log) => {
                                const p = players.find(player => player.id === log.player_id);
                                const t = teams.find(team => team.id === log.team_id);
                                return (
                                    <div key={log.id} className="p-3 mb-3 rounded-lg bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border-color)] transition-colors animate-fade-in flex flex-col gap-1">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-[var(--text-primary)] text-base leading-tight">
                                                {p?.name || 'Unknown Player'}
                                            </span>
                                            <span className="bg-[var(--bg-tertiary)] text-[var(--accent-primary)] text-xs font-bold px-2 py-1 rounded">
                                                {log.round}.{log.pick_number}
                                            </span>
                                        </div>
                                        <div className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wide">
                                            {t?.name} <span className="mx-1">•</span> {p?.position}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Middle Column: Compact Big Board */}
                <div className="flex flex-col flex-[2] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden min-h-0 min-w-[350px] shadow-sm">
                    <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)] flex gap-3 items-center shrink-0">
                        <input
                            type="text"
                            placeholder="Player Search..."
                            className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md px-3 py-2 text-sm flex-1 focus:ring-1 focus:ring-[var(--accent-primary)]"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <select 
                            className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md px-3 py-2 text-sm cursor-pointer hover:border-[var(--text-muted)] transition-colors"
                            value={positionFilter} 
                            onChange={e => setPositionFilter(e.target.value)}
                        >
                            <option value="">Pos</option>
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
                            className={`p-2 rounded-md transition-colors ${showWatchlistOnly ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-white'}`}
                            onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                            title="Toggle Watchlist"
                        >
                            <Star size={18} fill={showWatchlistOnly ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto layout-scrollbar p-0">
                        {playersLoading ? (
                            <div className="text-center p-8 text-[var(--text-muted)] text-sm">Loading players...</div>
                        ) : (
                            <table className="w-full text-left border-collapse m-0">
                                <thead className="sticky top-0 bg-[var(--bg-tertiary)] z-10 text-xs text-[var(--text-muted)] uppercase tracking-widest shadow-sm">
                                    <tr>
                                        <th className="font-bold py-3 px-4 w-[40px] text-center border-b border-[var(--border-color)]"></th>
                                        <th className="font-bold py-3 px-4 border-b border-[var(--border-color)]">ADP</th>
                                        <th className="font-bold py-3 px-4 border-b border-[var(--border-color)]">Player</th>
                                        <th className="font-bold py-3 px-4 border-b border-[var(--border-color)]">Pos</th>
                                        <th className="font-bold py-3 px-4 text-right border-b border-[var(--border-color)]">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPlayers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center p-8 text-[var(--text-muted)] text-sm">No players found.</td>
                                        </tr>
                                    ) : (
                                        filteredPlayers.map(p => {
                                            const isWatched = !!watchlist.find(w => w.player_id === p.id);
                                            return (
                                                <tr key={p.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors group">
                                                    <td className="py-3 px-4 text-center">
                                                        <button
                                                            onClick={() => toggleWatch(p.id)}
                                                            className={`bg-transparent border-none p-1 rounded hover:bg-[var(--bg-primary)] cursor-pointer transition-colors ${isWatched ? 'text-[var(--warning)]' : 'text-[var(--text-muted)] hover:text-white'}`}
                                                        >
                                                            <Star size={18} fill={isWatched ? 'currentColor' : 'none'} />
                                                        </button>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm font-medium text-[var(--text-muted)]">{p.adp}</td>
                                                    <td className="py-3 px-4 text-base font-bold text-[var(--text-primary)]">
                                                        {p.name} <span className="text-[var(--text-muted)] font-medium text-xs ml-2 uppercase tracking-wide">{p.team}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">{p.position}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button
                                                            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2 rounded-md transition-all shadow-sm"
                                                            onClick={() => handleDraftPlayer(p)}
                                                            disabled={!currentPick || draftingId === p.id || currentTeam?.id !== userTeamId}
                                                        >
                                                            {draftingId === p.id ? '...' : 'Draft'}
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

                {/* Right Column: Chat Window */}
                <div className="flex flex-col flex-[1] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden min-h-0 min-w-[250px] shadow-sm">
                    <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)] font-bold text-sm tracking-wider uppercase text-[var(--text-secondary)] shrink-0 flex justify-between items-center">
                        <span>Draft Chat</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 layout-scrollbar flex flex-col gap-4">
                        {messages.length === 0 ? (
                            <div className="text-center p-6 text-[var(--text-muted)] text-sm italic my-auto">Say hello to the draft room!</div>
                        ) : (
                            messages.map(msg => {
                                const isMe = msg.user_id === userId;
                                const senderTeam = teams.find(t => t.user_id === msg.user_id);
                                const senderName = senderTeam ? senderTeam.owner_name : 'Spectator';

                                return (
                                    <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1 px-1">{isMe ? 'You' : senderName}</span>
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${isMe ? 'bg-[var(--accent-primary)] text-white rounded-tr-sm' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-tl-sm border border-[var(--border-color)]'}`}>
                                            {msg.message}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleSendChat} className="p-4 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)] flex gap-2 shrink-0">
                        <input
                            type="text"
                            className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] min-w-0"
                            placeholder="Type a message..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim()}
                            className="bg-[var(--accent-primary)] text-white p-2.5 rounded-lg hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-primary)] disabled:text-[var(--text-muted)] disabled:border disabled:border-[var(--border-color)] transition-all whitespace-nowrap shadow-sm"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>

            </div>

            <ConfirmModal
                isOpen={playerToDraft !== null}
                title="Confirm Draft Pick"
                message={`Are you sure you want to draft ${playerToDraft?.name} to ${currentTeam?.name}?`}
                confirmText="Draft Player"
                cancelText="Cancel"
                onConfirm={confirmDraftPlayer}
                onCancel={() => setPlayerToDraft(null)}
            />
        </div>
    );
}
