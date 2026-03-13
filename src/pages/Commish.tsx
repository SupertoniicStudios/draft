import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDraftState } from '../hooks/useDraftState';
import { useBigBoardPlayers } from '../hooks/usePlayers';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';

export function Commish() {
    const activeDraftId = localStorage.getItem('active_draft_id');
    const { currentPick, draftLog, teams, fetchState } = useDraftState(activeDraftId);
    const { players } = useBigBoardPlayers(activeDraftId);

    const [undoing, setUndoing] = useState(false);
    const [forcePlayerSearch, setForcePlayerSearch] = useState('');
    const [forcePlayerId, setForcePlayerId] = useState('');
    const [forceTeamId, setForceTeamId] = useState('');

    useEffect(() => {
        if (currentPick) {
            setForceTeamId(currentPick.current_team_id);
        }
    }, [currentPick]);

    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadText, setUploadText] = useState('Upload & Parse CSV');

    const [tradeRound, setTradeRound] = useState<number>(1);
    const [tradePick, setTradePick] = useState<number>(1);
    const [tradeNewTeamId, setTradeNewTeamId] = useState('');

    // Modal state
    const [showUndoConfirm, setShowUndoConfirm] = useState(false);
    const [showUploadConfirm, setShowUploadConfirm] = useState(false);

    const checkUndo = () => {
        if (draftLog.length === 0) {
            toast.error("No picks to undo.");
            return;
        }
        setShowUndoConfirm(true);
    };

    const confirmUndo = async () => {
        setShowUndoConfirm(false);
        setUndoing(true);
        try {
            const lastPick = draftLog[draftLog.length - 1]; // sorted by timestamp ASC

            // 1. Delete draft log
            const { error: logError } = await supabase.from('draft_log').delete().eq('id', lastPick.id);
            if (logError) throw logError;
            await fetchState();

            // Player is_drafted state is handled dynamically now, no need to update players table

            toast.success("Pick undone successfully.");
        } catch (err: any) {
            toast.error("Error undoing: " + err.message);
        } finally {
            setUndoing(false);
        }
    };

    const handleForcePick = async () => {
        if (!forcePlayerId || !forceTeamId || !currentPick) {
            toast.error("Select player, team, and ensure draft is active.");
            return;
        }
        try {
            // 1. Log
            const { error: logError } = await supabase.from('draft_log').insert({
                draft_id: activeDraftId,
                round: currentPick.round,
                pick_number: currentPick.pick_number,
                team_id: forceTeamId,
                player_id: forcePlayerId
            });
            if (logError) throw logError;
            await fetchState();

            // No need to update global players table

            toast.success("Force pick successful.");
            setForcePlayerId('');
            setForcePlayerSearch('');
            // forceTeamId is auto-populated by useEffect, don't clear it
        } catch (err: any) {
            toast.error("Error forcing pick: " + err.message);
        }
    };

    const checkUploadKeepers = () => {
        if (!csvFile) {
            toast.error("Select a CSV file.");
            return;
        }
        setShowUploadConfirm(true);
    };

    const confirmUploadKeepers = async () => {
        setShowUploadConfirm(false);
        if (!csvFile) return;

        setUploading(true);
        setUploadText("Parsing CSV...");

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const rows = results.data as any[];
                    // Expected CSV format: team_name, player_id

                    setUploadText(`Processing ${rows.length} keepers...`);

                    let successCount = 0;
                    let errorCount = 0;

                    for (const row of rows) {
                        const teamName = row.team_name?.trim();
                        const playerId = row.player_id?.toString().trim();

                        if (!teamName || !playerId) continue;

                        const team = teams.find(t => t.name.toLowerCase() === teamName.toLowerCase());
                        if (!team) {
                            console.warn(`Could not find team: ${teamName}`);
                            errorCount++;
                            continue;
                        }

                        // 1. Insert into keeper_lists (Upsert or ignore if exists)
                        const { error: keeperError } = await supabase.from('keeper_lists').upsert({
                            draft_id: activeDraftId,
                            team_id: team.id,
                            player_id: playerId
                        }, { onConflict: 'team_id, player_id' });

                        if (keeperError) {
                            console.error(keeperError);
                            errorCount++;
                            continue;
                        }

                        // No longer updating players table
                        successCount++;
                    }

                    toast.success(`Keeper Upload Complete.\nSuccessfully added: ${successCount}\nErrors/Skipped: ${errorCount}`);
                } catch (err: any) {
                    toast.error("Error: " + err.message);
                } finally {
                    setUploading(false);
                    setUploadText("Upload & Parse CSV");
                    setCsvFile(null);
                }
            }
        });
    };

    const handleTradePick = async () => {
        if (!tradeNewTeamId) {
            toast.error("Select a team");
            return;
        }
        try {
            const { error } = await supabase.from('draft_order')
                .update({ current_team_id: tradeNewTeamId })
                .eq('round', tradeRound)
                .eq('pick_number', tradePick);
            if (error) throw error;
            toast.success("Pick traded successfully!");
        } catch (err: any) {
            toast.error("Error trading: " + err.message);
        }
    };

    const handleDownloadCSV = () => {
        if (!draftLog) return;
        const csvData = draftLog.map(log => {
            const p = players?.find(x => x.id === log.player_id);
            const t = teams?.find(x => x.id === log.team_id);
            return {
                Round: log.round,
                Pick: log.pick_number,
                Team: t?.name || 'Unknown',
                Player: p?.name || 'Unknown',
                Position: p?.position || '',
                Timestamp: log.timestamp
            };
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "draft_results.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!activeDraftId) {
        return (
            <div className="flex flex-col gap-6 w-full h-full items-center justify-center pt-20">
                <h2 style={{ color: 'var(--text-muted)' }}>Commissioner Controls Locked</h2>
                <p style={{ color: 'var(--text-secondary)' }}>You must join a draft lobby to access commissioner controls.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full h-full">
            <h2>Commissioner Dashboard</h2>

            <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
                <div className="card flex-col gap-4" style={{ flex: '1 1 300px' }}>
                    <h3>Draft Controls</h3>

                    <div className="flex flex-col gap-2" style={{ marginTop: '1rem' }}>
                        <strong>Force Pick</strong>
                        <select value={forceTeamId} onChange={e => setForceTeamId(e.target.value)}>
                            <option value="">Select Team...</option>
                            {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <input
                            type="text"
                            placeholder="Search player to force pick..."
                            value={forcePlayerSearch}
                            onChange={e => {
                                setForcePlayerSearch(e.target.value);
                                setForcePlayerId(''); // Reset selection when searching
                            }}
                        />
                        {forcePlayerSearch && (
                            <select value={forcePlayerId} onChange={e => setForcePlayerId(e.target.value)} size={5} style={{ height: 'auto' }}>
                                <option value="" disabled>Select Player...</option>
                                {players?.filter(p => {
                                    if (p.is_drafted) return false;
                                    const removeDiacritics = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                    const searchNormalized = removeDiacritics(forcePlayerSearch.toLowerCase());
                                    const nameNormalized = removeDiacritics(p.name.toLowerCase());
                                    return nameNormalized.includes(searchNormalized);
                                }).slice(0, 10).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.position}) - ADP: {p.adp}</option>
                                ))}
                            </select>
                        )}
                        <button className="btn btn-primary" style={{ backgroundColor: 'var(--warning)', color: '#000' }} onClick={handleForcePick} disabled={!currentPick || !forcePlayerId}>
                            Execute Force Pick
                        </button>
                    </div>

                    <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                        <button className="btn btn-danger w-full" onClick={checkUndo} disabled={undoing || !draftLog || draftLog.length === 0}>
                            {undoing ? 'Undoing...' : 'Undo Last Pick'}
                        </button>
                    </div>

                    <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                        <button className="btn btn-primary w-full" onClick={handleDownloadCSV}>
                            Download Results CSV
                        </button>
                    </div>
                </div>

                <div className="card flex-col gap-4" style={{ flex: '1 1 300px' }}>
                    <h3>Trade Picks</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Swap pick owners manually.</p>
                    <div className="flex flex-col gap-2" style={{ marginTop: '1rem' }}>
                        <div className="flex gap-2">
                            <input type="number" placeholder="Round" value={tradeRound} onChange={e => setTradeRound(Number(e.target.value))} min={1} max={14} style={{ width: '50%' }} />
                            <input type="number" placeholder="Pick" value={tradePick} onChange={e => setTradePick(Number(e.target.value))} min={1} max={10} style={{ width: '50%' }} />
                        </div>
                        <select value={tradeNewTeamId} onChange={e => setTradeNewTeamId(e.target.value)}>
                            <option value="">New Owner...</option>
                            {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={handleTradePick}>Update Pick Owner</button>
                    </div>
                </div>

                <div className="card flex-col gap-4" style={{ flex: '1 1 300px' }}>
                    <h3>Upload Keepers</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Upload a CSV with headers `team_name` and `player_id` (Yahoo ID). This will assign the players to the team's keeper list and mark them as drafted.</p>
                    <div className="flex flex-col gap-2" style={{ marginTop: '1rem' }}>
                        <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files ? e.target.files[0] : null)} />
                        <button className="btn btn-primary" onClick={checkUploadKeepers} disabled={uploading}>
                            {uploadText}
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showUndoConfirm}
                title="Undo Pick"
                message="Are you sure you want to undo the last pick? This action cannot be reversed."
                confirmText="Undo Pick"
                cancelText="Cancel"
                isDestructive={true}
                onConfirm={confirmUndo}
                onCancel={() => setShowUndoConfirm(false)}
            />

            <ConfirmModal
                isOpen={showUploadConfirm}
                title="Upload Keepers CSV"
                message="This will read the CSV and assign the players to the team's keeper list and mark them as drafted. Ensure your Team Names in the CSV EXACTLY match the Team Names in the Database."
                confirmText="Process CSV"
                cancelText="Cancel"
                onConfirm={confirmUploadKeepers}
                onCancel={() => setShowUploadConfirm(false)}
            />
        </div>
    );
}
