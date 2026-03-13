-- Fix Keeper Lists Unique Constraint
-- Drop global constraint and implement draft isolated uniqueness

ALTER TABLE keeper_lists DROP CONSTRAINT IF EXISTS keeper_lists_team_id_player_id_key;
ALTER TABLE keeper_lists ADD CONSTRAINT keeper_lists_draft_id_team_id_player_id_key UNIQUE (draft_id, team_id, player_id);
