import { useDraftState } from '../hooks/useDraftState';

export function UpcomingPicks({ draftId }: { draftId: string | null }) {
    const { draftOrder, draftLog, teams } = useDraftState(draftId);

    if (!draftId || draftOrder.length === 0) return null;

    const nextPickIndex = draftLog.length;
    // Get the next 5 picks
    const upcoming = draftOrder.slice(nextPickIndex, nextPickIndex + 5);

    if (upcoming.length === 0) return null; // Draft over

    return (
        <div className="flex gap-2 items-center" style={{
            backgroundColor: 'var(--bg-primary)',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid var(--border-color)',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            maxWidth: '400px'
        }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>Up Next:</span>
            {upcoming.map((pick, i) => {
                const team = teams.find(t => t.id === pick.current_team_id);
                return (
                    <div key={`${pick.round}-${pick.pick_number}`} style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.5rem',
                        backgroundColor: i === 0 ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: i === 0 ? '#000' : 'var(--text-primary)',
                        borderRadius: '0.25rem',
                        opacity: i === 0 ? 1 : 0.7,
                        fontWeight: i === 0 ? 600 : 400
                    }}>
                        <span style={{ marginRight: '0.25rem', opacity: 0.7 }}>{pick.round}.{pick.pick_number}</span>
                        {team?.name || 'Unknown'}
                    </div>
                )
            })}
        </div>
    );
}
