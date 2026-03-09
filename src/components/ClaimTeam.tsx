import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useDraftState } from '../hooks/useDraftState';
import toast from 'react-hot-toast';

export function ClaimTeam({ draftId }: { draftId: string }) {
    const { teams, loading } = useDraftState(draftId);
    const [claiming, setClaiming] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string>('Owner');

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserId(data.user?.id || null);
            setDisplayName(data.user?.user_metadata?.display_name || 'Owner');
        });
    }, []);

    const userTeam = teams.find(t => t.user_id === userId);
    const unassignedTeams = teams.filter(t => !t.user_id);

    const handleClaim = async (teamId: string) => {
        if (!userId) return;
        setClaiming(true);
        try {
            const { error } = await supabase
                .from('teams')
                .update({ user_id: userId, owner_name: displayName })
                .eq('id', teamId);
            if (error) throw error;
            // The Realtime hook in useDraftState will catch this and update
            const teamInfo = unassignedTeams.find(t => t.id === teamId);
            toast.success(`You have successfully claimed ${teamInfo?.name}!`);
        } catch (err: any) {
            toast.error("Error claiming team: " + err.message);
        } finally {
            setClaiming(false);
        }
    };

    if (loading) return null;

    if (userTeam) {
        return (
            <div className="card" style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)' }}>
                <h3 style={{ margin: 0, color: 'var(--accent-primary)' }}>Your Team: {userTeam.name} ({userTeam.owner_name})</h3>
            </div>
        );
    }

    if (unassignedTeams.length === 0) {
        return null; // All teams claimed
    }

    return (
        <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginTop: 0 }}>Claim Your Team</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                You haven't claimed a team yet. Please select your team from the list below:
            </p>
            <div className="flex gap-4" style={{ flexWrap: 'wrap', marginTop: '1rem' }}>
                {unassignedTeams.map(t => (
                    <div key={t.id} className="card" style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
                        <strong>{t.name}</strong>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t.owner_name}</span>
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 'auto' }}
                            onClick={() => handleClaim(t.id)}
                            disabled={claiming}
                        >
                            Claim this Team
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
