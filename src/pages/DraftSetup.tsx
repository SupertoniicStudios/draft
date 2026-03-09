import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

import { ClaimTeam } from '../components/ClaimTeam';

// Temporary type until we update the hooks
interface DraftLobby {
    id: string;
    name: string;
    created_by: string;
    status: 'setup' | 'active' | 'completed';
    created_at: string;
}

export function DraftSetup() {
    const navigate = useNavigate();
    const [drafts, setDrafts] = useState<DraftLobby[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDraftName, setNewDraftName] = useState('');
    const [creating, setCreating] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

    // This will be handled by the updated useDraftState later, but for Setup we need to fetch all lobbies
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
        fetchDrafts();

        const channel = supabase.channel('public:drafts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drafts' }, () => {
                fetchDrafts();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); }
    }, []);

    async function fetchDrafts() {
        setLoading(true);
        const { data } = await supabase.from('drafts').select('*').order('created_at', { ascending: false });
        if (data) setDrafts(data);
        setLoading(false);
    }

    const handleCreateDraft = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDraftName.trim() || !userId) return;
        setCreating(true);
        try {
            // 1. Create the Draft
            const { data: draftData, error: draftError } = await supabase.from('drafts')
                .insert({ name: newDraftName.trim(), created_by: userId })
                .select()
                .single();
            if (draftError) throw draftError;

            // 2. Clone the 10 Base Teams into this Draft
            const baseTeams = [
                { name: 'Mutilation Engineers', owner_name: 'Owner' },
                { name: 'Billy\'s Beaners', owner_name: 'Owner' },
                { name: 'Acuna Matata', owner_name: 'Owner' },
                { name: 'Baby Bombers', owner_name: 'Owner' },
                { name: 'Black Whales in the Sunset', owner_name: 'Owner' },
                { name: 'Giant BALLS', owner_name: 'Owner' },
                { name: 'Raw Doggin\' Randos', owner_name: 'Owner' },
                { name: 'The Roman Legion', owner_name: 'Owner' },
                { name: 'HollidayInnExpress', owner_name: 'Owner' },
                { name: 'The Schoolyard', owner_name: 'Owner' },
            ];

            const teamsToInsert = baseTeams.map(t => ({ ...t, draft_id: draftData.id }));
            const { error: teamsError } = await supabase.from('teams').insert(teamsToInsert);
            if (teamsError) throw teamsError;

            // 3. (Optional) Could generate a random 14 round snake draft_order here
            // For now, we'll wait to implement `draft_order` generation

            setNewDraftName('');
            alert(`Draft ${draftData.name} created!`);
        } catch (err: any) {
            alert("Error creating draft: " + err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleEnterLobby = (draftId: string) => {
        setSelectedDraftId(draftId);
    };

    const handleJoinDraft = (draftId: string) => {
        localStorage.setItem('active_draft_id', draftId);
        navigate('/'); // Go back to Big Board which will now read this ID
        window.location.reload();
    };

    const handleDeleteDraft = async (draftId: string) => {
        if (!window.confirm("Are you sure? This deletes the draft and all picks forever.")) return;
        try {
            const { error } = await supabase.from('drafts').delete().eq('id', draftId);
            if (error) throw error;
            if (localStorage.getItem('active_draft_id') === draftId) {
                localStorage.removeItem('active_draft_id');
            }
        } catch (err: any) {
            alert("Error deleting draft: " + err.message);
        }
    }

    if (selectedDraftId) {
        const d = drafts.find(d => d.id === selectedDraftId);
        return (
            <div className="flex flex-col gap-6" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <div className="flex items-center gap-4">
                    <button className="btn" onClick={() => setSelectedDraftId(null)} style={{ padding: '0.5rem 1rem' }}>&larr; Back to Lobbies</button>
                    <h2 style={{ margin: 0 }}>Lobby: {d?.name}</h2>
                </div>

                <div className="card" style={{ padding: '2rem' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Draft Room Status</h3>
                            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Join this draft to enter the war room.</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => handleJoinDraft(selectedDraftId)} style={{ fontSize: '1.125rem', padding: '0.75rem 1.5rem' }}>
                            Enter Draft Room
                        </button>
                    </div>

                    <hr style={{ borderColor: 'var(--border-color)', margin: '2rem 0' }} />

                    <ClaimTeam draftId={selectedDraftId} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <h2>Draft Setup & Lobbies</h2>

            <div className="card" style={{ padding: '2rem' }}>
                <h3>Create a New Draft Lobby</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    This will create a brand new draft instance and generate a fresh set of 10 teams.
                </p>
                <form onSubmit={handleCreateDraft} className="flex gap-4">
                    <input
                        type="text"
                        placeholder="e.g. 2026 Mock Draft 1"
                        value={newDraftName}
                        onChange={e => setNewDraftName(e.target.value)}
                        required
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={creating || !userId}>
                        {creating ? 'Creating...' : 'Create Draft'}
                    </button>
                </form>
            </div>

            <div className="card">
                <h3>Available Draft Lobbies</h3>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Lobbies...</div>
                ) : drafts.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No drafts have been created yet.
                    </div>
                ) : (
                    <table style={{ marginTop: '1rem' }}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drafts.map(draft => (
                                <tr key={draft.id}>
                                    <td style={{ fontWeight: 500 }}>{draft.name}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            backgroundColor: draft.status === 'active' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                            color: draft.status === 'active' ? '#000' : 'var(--text-primary)',
                                            textTransform: 'uppercase',
                                            fontWeight: 600
                                        }}>
                                            {draft.status}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                        {new Date(draft.created_at).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleEnterLobby(draft.id)}
                                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                            >
                                                View Lobby
                                            </button>
                                            {userId === draft.created_by && (
                                                <button
                                                    className="btn btn-danger"
                                                    onClick={() => handleDeleteDraft(draft.id)}
                                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
