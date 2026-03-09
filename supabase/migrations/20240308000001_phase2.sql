-- Phase 2 Migrations

-- 1. Create Watchlists Table
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    player_id TEXT REFERENCES players(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, player_id)
);

-- Enable RLS for Watchlists
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Users can only view and edit their own watchlists
CREATE POLICY "Users can manage own watchlist" ON watchlists FOR ALL USING (auth.uid() = user_id);

-- Enable Realtime for Watchlists
alter publication supabase_realtime add table watchlists;

-- 2. Allow claiming a team
-- We need a policy to allow users to update a team IF the team's user_id is null
CREATE POLICY "Users can claim an unassigned team" ON teams FOR UPDATE USING (user_id IS NULL) WITH CHECK (auth.uid() = user_id);
