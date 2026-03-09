import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { User } from '@supabase/supabase-js';

export function Profile() {
    const [user, setUser] = useState<User | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUser(user);
                setDisplayName(user.user_metadata?.display_name || '');
            }
        });
    }, []);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);

        try {
            // 1. Update Auth Metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { display_name: displayName }
            });
            if (authError) throw authError;

            // 2. Retroactively update claimed teams
            const { error: dbError } = await supabase
                .from('teams')
                .update({ owner_name: displayName || 'Owner' })
                .eq('user_id', user.id);
            if (dbError) throw dbError;

            toast.success('Profile updated successfully!');
        } catch (err: any) {
            toast.error('Error saving profile: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!user) {
        return <div className="p-8">Loading profile...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-8">
            <div className="card">
                <h2 style={{ color: 'var(--accent-primary)', marginTop: 0 }}>Your Profile</h2>
                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Welcome back!</p>
                    <p style={{ fontWeight: '500' }}>Email: {user.email}</p>
                </div>

                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="displayName" style={{ fontWeight: '500' }}>Manager Display Name</label>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                            This name will be displayed on any teams you claim across all draft lobbies.
                        </p>
                        <input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="input"
                            maxLength={50}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary mt-2"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
}
