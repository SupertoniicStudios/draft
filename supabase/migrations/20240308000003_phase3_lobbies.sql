-- Phase 3 Migrations: Multi-tenancy / Draft Lobbies

-- 1. Create Drafts Table
CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'completed')),
    current_pick_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and Realtime for Drafts
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view drafts" ON drafts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create drafts" ON drafts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Creator can update drafts" ON drafts FOR UPDATE USING (auth.uid() = created_by);
alter publication supabase_realtime add table drafts;
alter publication supabase_realtime add table keeper_lists;

-- 2. Modify existing tables to include draft_id
-- We will CASCADE deletes so if a draft is deleted, all its teams and picks go with it.

-- Teams
ALTER TABLE teams ADD COLUMN draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE;
-- IMPORTANT: For existing data, we must handle this gracefully or wipe it. We will wipe mock data for this migration.
DELETE FROM keeper_lists;
DELETE FROM draft_log;
DELETE FROM draft_order;
DELETE FROM teams;

-- Now that they are empty, make draft_id required
ALTER TABLE teams ALTER COLUMN draft_id SET NOT NULL;

-- Draft Log
ALTER TABLE draft_log ADD COLUMN draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE NOT NULL;

-- Draft Order
ALTER TABLE draft_order ADD COLUMN draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE NOT NULL;

-- Keeper Lists
ALTER TABLE keeper_lists ADD COLUMN draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE NOT NULL;

-- Watchlists can remain global per user/player. Users likely want their watchlist to persist across multiple mock drafts.

-- 3. Update Players logic
-- We no longer rely on `is_drafted` and `drafted_by_team_id` on the players table itself,
-- as a player might be drafted in Lobby A but available in Lobby B.
-- We will drop these columns to prevent confusion.
ALTER TABLE players DROP COLUMN is_drafted;
ALTER TABLE players DROP COLUMN drafted_by_team_id;

-- Ensure RLS policies still look good (They are broad enough to allow all authenticated users)
