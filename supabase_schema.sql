-- Database Schema for Fantasy Baseball Draft

-- 1. Teams Table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Players Table
CREATE TABLE players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    team TEXT NOT NULL,
    position TEXT NOT NULL,
    adp NUMERIC DEFAULT 999.9,
    is_drafted BOOLEAN DEFAULT FALSE,
    drafted_by_team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Draft Log Table
CREATE TABLE draft_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round INTEGER NOT NULL,
    pick_number INTEGER NOT NULL,
    team_id UUID REFERENCES teams(id) NOT NULL,
    player_id TEXT REFERENCES players(id) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Keeper Lists Table
CREATE TABLE keeper_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) NOT NULL,
    player_id TEXT REFERENCES players(id) NOT NULL,
    UNIQUE(team_id, player_id)
);

-- 5. Draft Order Table (for fixed but editable drafts & traded picks)
CREATE TABLE draft_order (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round INTEGER NOT NULL,
    pick_number INTEGER NOT NULL,
    original_team_id UUID REFERENCES teams(id) NOT NULL,
    current_team_id UUID REFERENCES teams(id) NOT NULL,
    UNIQUE(round, pick_number)
);

-- [NEW] 6. Watchlists Table
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    player_id TEXT REFERENCES players(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, player_id)
);

-- Add updated_at trigger for players
create extension if not exists moddatetime schema extensions;
create trigger handle_updated_at before update on players 
  for each row execute procedure moddatetime (updated_at);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE keeper_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY; -- NEW

-- 1. Teams
-- Anyone can view teams
CREATE POLICY "Anyone can view teams" ON teams FOR SELECT USING (true);
-- End users can claim an unassigned team (where user_id is null)
CREATE POLICY "Users can claim an unassigned team" ON teams FOR UPDATE USING (user_id IS NULL) WITH CHECK (auth.uid() = user_id);
-- End users can edit their claimed team
CREATE POLICY "Users can edit own team" ON teams FOR ALL USING (auth.uid() = user_id);

-- 2. Players
-- Anyone can view
CREATE POLICY "Anyone can view players" ON players FOR SELECT USING (true);
-- Only authenticated users can draft (update)
CREATE POLICY "Authenticated users can update players" ON players FOR UPDATE USING (auth.role() = 'authenticated');
-- Commish can insert (Yahoo CSV upload)
CREATE POLICY "Authenticated users can insert players" ON players FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Draft Log
-- Anyone can view
CREATE POLICY "Anyone can view draft_log" ON draft_log FOR SELECT USING (true);
-- Only authenticated users can insert (make a pick)
CREATE POLICY "Authenticated users can insert draft_log" ON draft_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Only Commish can delete (Undo pick)
CREATE POLICY "Authenticated users can delete draft_log" ON draft_log FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Keeper Lists
CREATE POLICY "Anyone can view keeper_lists" ON keeper_lists FOR SELECT USING (true);
-- Commish can manage keeper_lists
CREATE POLICY "Authenticated users can manage keepers" ON keeper_lists FOR ALL USING (auth.role() = 'authenticated');

-- 5. Draft Order
CREATE POLICY "Anyone can view draft_order" ON draft_order FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage draft_order" ON draft_order FOR ALL USING (auth.role() = 'authenticated');

-- 6. Watchlists
CREATE POLICY "Users can manage own watchlist" ON watchlists FOR ALL USING (auth.uid() = user_id);

-- Setup Supabase Realtime for necessary tables
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table draft_log;
alter publication supabase_realtime add table draft_order;
alter publication supabase_realtime add table watchlists; -- NEW
