import React, { useState } from 'react';
import { useUserQueue } from '../hooks/useUserQueue';
import type { Player } from '../hooks/usePlayers';

interface DraftQueueProps {
    draftId: string | null;
    userId: string | null;
    allPlayers: Player[];
}

export function DraftQueue({ draftId, userId, allPlayers }: DraftQueueProps) {
    const { queuedPlayers, isQueueRevealed, toggleReveal, removeFromQueue, reorderQueue } = useUserQueue(draftId, userId, allPlayers);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    const onDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const onDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const sourceIndexStr = e.dataTransfer.getData('text/plain');
        if (!sourceIndexStr) return;
        
        const sourceIndex = parseInt(sourceIndexStr, 10);
        
        if (!isNaN(sourceIndex) && sourceIndex !== dropIndex) {
            reorderQueue(sourceIndex, dropIndex);
        }
        setDraggedIdx(null);
    };

    if (!draftId || !userId) return null;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '300px',
            minWidth: '300px',
            backgroundColor: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-color)',
            padding: '1rem',
            gap: '1rem',
            height: '100%',
            overflowY: 'auto'
        }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Draft Queue</h3>
            
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)'
            }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Reveal Next Pick to Commish</span>
                <button 
                    onClick={toggleReveal}
                    style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        borderRadius: '0.25rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        backgroundColor: isQueueRevealed ? 'var(--accent-primary)' : 'var(--bg-primary)',
                        color: isQueueRevealed ? '#000' : 'var(--text-primary)'
                    }}
                >
                    {isQueueRevealed ? 'ON' : 'OFF'}
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {queuedPlayers.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', padding: '2rem 0' }}>
                        Your queue is empty. Add players from the Big Board.
                    </div>
                ) : (
                    queuedPlayers.map((player, idx) => (
                        <div
                            key={player.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, idx)}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, idx)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0.75rem',
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.375rem',
                                cursor: 'grab',
                                opacity: draggedIdx === idx ? 0.5 : 1
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{idx + 1}. {player.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{player.position} - {player.team}</span>
                            </div>
                            <button
                                onClick={() => removeFromQueue(player.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    fontSize: '1rem',
                                    fontWeight: 'bold'
                                }}
                                title="Remove from Queue"
                            >
                                ×
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
