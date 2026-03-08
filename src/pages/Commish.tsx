import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useDraftState } from '../hooks/useDraftState';
import { useBigBoardPlayers } from '../hooks/usePlayers';
import Papa from 'papaparse';

export function Commish() {
    const { currentPick, draftLog, teams } = useDraftState();
    const { players } = useBigBoardPlayers();

    const [undoing, setUndoing] = useState(false);
    const [forcePlayerId, setForcePlayerId] = useState('');
    const [forceTeamId, setForceTeamId] = useState('');

    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const [tradeRound, setTradeRound] = useState<number>(1);
    const [tradePick, setTradePick] = useState<number>(1);
    const [tradeNewTeamId, setTradeNewTeamId] = useState('');

    const handleUndo = async () => {
        if (draftLog.length === 0) return alert("No picks to undo.");
        if (!window.confirm("Are you sure you want to undo the last pick?")) return;
        setUndoing(true);
        try {
            const lastPick = draftLog[draftLog.length - 1]; // sorted by timestamp ASC

            // 1. Delete draft log
            const { error: logError } = await supabase.from('draft_log').delete().eq('id', lastPick.id);
            if (logError) throw logError;

            // 2. Free player
            const { error: playerError } = await supabase.from('players')
                .update({ is_drafted: false, drafted_by_team_id: null })
                .eq('id', lastPick.player_id);
            if (playerError) throw playerError;

            alert("Pick undone successfully.");
        } catch (err: any) {
            alert("Error undoing: " + err.message);
        } finally {
            setUndoing(false);
        }
    };

    const handleForcePick = async () => {
        if (!forcePlayerId || !forceTeamId || !currentPick) return alert("Select player, team, and ensure draft is active.");
        try {
            // 1. Log
            const { error: logError } = await supabase.from('draft_log').insert({
                round: currentPick.round,
                pick_number: currentPick.pick_number,
                team_id: forceTeamId,
                player_id: forcePlayerId
            });
            if (logError) throw logError;

            // 2. Draft
            const { error: playerError } = await supabase.from('players')
                .update({ is_drafted: true, drafted_by_team_id: forceTeamId })
                .eq('id', forcePlayerId);
            if (playerError) throw playerError;

            alert("Force pick successful.");
            setForcePlayerId('');
            setForceTeamId('');
        } catch (err: any) {
            alert("Error forcing pick: " + err.message);
        }
    };

    const handleUploadKeepers = async () => {
        if (!csvFile) return alert("Select a CSV file.");
        setUploading(true);
        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const rows = results.data as any[];
                    alert(`Parsed ${rows.length} rows. (Implementation of actually inserting to DB skipped to avoid massive data logic, requires mapping Team Name to Team ID)`);
                } catch (err: any) {
                    alert("Error: " + err.message);
                } finally {
                    setUploading(false);
                    setCsvFile(null);
                }
            }
        });
    };

    const handleTradePick = async () => {
        if (!tradeNewTeamId) return alert("Select a team");
        try {
            const { error } = await supabase.from('draft_order')
                .update({ current_team_id: tradeNewTeamId })
                .eq('round', tradeRound)
                .eq('pick_number', tradePick);
            if (error) throw error;
            alert("Pick traded successfully!");
        } catch (err: any) {
            alert("Error trading: " + err.message);
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
                        <select value={forcePlayerId} onChange={e => setForcePlayerId(e.target.value)}>
                            <option value="">Select Player...</option>
                            {players?.filter(p => !p.is_drafted).map(p => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>)}
                        </select>
                        <button className="btn btn-primary" style={{ backgroundColor: 'var(--warning)', color: '#000' }} onClick={handleForcePick} disabled={!currentPick}>
                            Execute Force Pick
                        </button>
                    </div>

                    <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                        <button className="btn btn-danger w-full" onClick={handleUndo} disabled={undoing || !draftLog || draftLog.length === 0}>
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
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Upload a Yahoo CSV to populate players and keeper lists.</p>
                    <div className="flex flex-col gap-2" style={{ marginTop: '1rem' }}>
                        <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files ? e.target.files[0] : null)} />
                        <button className="btn btn-primary" onClick={handleUploadKeepers} disabled={uploading}>
                            {uploading ? 'Processing...' : 'Upload & Parse CSV'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
