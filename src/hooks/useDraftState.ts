import { useContext } from 'react';
import { DraftContext } from '../contexts/DraftContext';

export interface Team {
    id: string;
    name: string;
    owner_name: string;
    user_id?: string | null;
    draft_id: string;
    is_queue_revealed?: boolean;
}

export interface DraftPick {
    round: number;
    pick_number: number;
    current_team_id: string;
    original_team_id: string;
    draft_id: string;
}

export interface DraftLogEntry {
    id: string;
    round: number;
    pick_number: number;
    team_id: string;
    player_id: string;
    timestamp: string;
    draft_id: string;
}

export interface KeeperEntry {
    player_id: string;
    team_id: string;
    draft_id: string;
}

export interface UserQueue {
    team_id: string;
    draft_id: string;
    queue: string[]; // array of player_ids
}

// We still allow a draftId parameter so existing imports don't break,
// but the context actually handles the correct data via DraftProvider.
export function useDraftState(_draftId?: string | null) {
    const context = useContext(DraftContext);
    if (!context) {
        throw new Error('useDraftState must be used within a DraftProvider');
    }
    return context;
}
