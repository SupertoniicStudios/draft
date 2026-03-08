import { Outlet, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, LayoutDashboard, Users, Settings } from 'lucide-react';
import { useDraftState } from '../hooks/useDraftState';

export function Layout() {
    const location = useLocation();
    const { currentPick, currentTeam } = useDraftState();

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const navItems = [
        { name: 'Big Board', path: '/', icon: <LayoutDashboard size={18} /> },
        { name: 'Rosters', path: '/rosters', icon: <Users size={18} /> },
        { name: 'Commissioner', path: '/commish', icon: <Settings size={18} /> },
    ];

    return (
        <div className="flex flex-col h-full" style={{ minHeight: '100vh' }}>
            <header className="flex items-center justify-between" style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-4">
                    <h1 style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', margin: 0 }}>Fantasy Draft</h1>
                    <nav className="flex gap-4" style={{ marginLeft: '2rem' }}>
                        {navItems.map(item => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="flex items-center gap-2"
                                style={{
                                    color: location.pathname === item.path ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontWeight: location.pathname === item.path ? 600 : 400,
                                    textDecoration: 'none',
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: location.pathname === item.path ? 'var(--bg-tertiary)' : 'transparent'
                                }}
                            >
                                {item.icon}
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    {currentTeam ? (
                        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>On the Clock: </span>
                            <strong style={{ color: 'var(--accent-primary)' }}>{currentTeam.name}</strong>
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                (Rd {currentPick?.round}, Pk {currentPick?.pick_number})
                            </span>
                        </div>
                    ) : (
                        <div style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Draft Not Active
                        </div>
                    )}
                    <button onClick={handleLogout} className="btn" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </header>

            <main className="container flex-grow" style={{ padding: '2rem 1rem' }}>
                <Outlet />
            </main>
        </div >
    );
}
