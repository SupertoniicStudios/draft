import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Team {
    id: string;
    name: string;
    owner_name: string;
}

interface DraftOrderSetupProps {
    draftId: string;
    onStartDraft: (orderedTeamIds: string[]) => void;
    starting: boolean;
}

export function DraftOrderSetup({ draftId, onStartDraft, starting }: DraftOrderSetupProps) {
    const [teams, setTeams] = useState<Team[]>([]);

    useEffect(() => {
        supabase.from('teams').select('*').eq('draft_id', draftId).then(({ data }) => {
            if (data) setTeams(data);
        });
    }, [draftId]);

    const moveUp = (index: number) => {
        if (index === 0) return;
        const newTeams = [...teams];
        [newTeams[index], newTeams[index - 1]] = [newTeams[index - 1], newTeams[index]];
        setTeams(newTeams);
    }

    const moveDown = (index: number) => {
        if (index === teams.length - 1) return;
        const newTeams = [...teams];
        [newTeams[index], newTeams[index + 1]] = [newTeams[index + 1], newTeams[index]];
        setTeams(newTeams);
    }

    const shuffle = () => {
        const newTeams = [...teams];
        for (let i = newTeams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newTeams[i], newTeams[j]] = [newTeams[j], newTeams[i]];
        }
        setTeams(newTeams);
    }

    if (teams.length === 0) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading teams...</div>;

    return (
        <div className="card" style={{ padding: '2rem', marginTop: '2rem', border: '1px solid var(--accent-primary)' }}>
            <h3 style={{ marginTop: 0 }}>Set Draft Order</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Configure the 1-10 draft order before starting the draft. It will automatically Snake through 14 rounds.</p>

            <button className="btn" onClick={shuffle} style={{ marginBottom: '1rem', backgroundColor: 'var(--bg-tertiary)' }}>
                🎲 Randomize Order
            </button>

            <div className="flex flex-col gap-2">
                {teams.map((t, index) => (
                    <div key={t.id} className="flex justify-between items-center" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '0.25rem' }}>
                        <div>
                            <strong style={{ marginRight: '1rem', color: 'var(--accent-primary)' }}>{index + 1}.</strong>
                            <strong style={{ color: 'var(--text-primary)' }}>{t.name}</strong>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({t.owner_name})</span>
                        </div>
                        <div className="flex gap-2">
                            <button className="btn" onClick={() => moveUp(index)} disabled={index === 0} style={{ padding: '0.25rem 0.5rem' }}>&uarr;</button>
                            <button className="btn" onClick={() => moveDown(index)} disabled={index === teams.length - 1} style={{ padding: '0.25rem 0.5rem' }}>&darr;</button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                className="btn btn-primary"
                onClick={() => onStartDraft(teams.map(t => t.id))}
                disabled={starting || teams.length !== 10}
                style={{ marginTop: '2rem', width: '100%', fontSize: '1.25rem', padding: '1rem', backgroundColor: 'var(--warning)', color: '#000', fontWeight: 'bold' }}
            >
                {starting ? 'Generating Draft Order...' : 'Launch Draft with this Order'}
            </button>
        </div>
    );
}
