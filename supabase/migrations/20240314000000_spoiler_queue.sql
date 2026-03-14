-- 1. Add is_queue_revealed to teams
ALTER TABLE teams ADD COLUMN is_queue_revealed BOOLEAN DEFAULT FALSE;

-- 2. Create user_queues table
CREATE TABLE user_queues (
    team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
    queue JSONB DEFAULT '[]'::jsonb,
    draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE NOT NULL
);

-- 3. Enable RLS on user_queues
ALTER TABLE user_queues ENABLE ROW LEVEL SECURITY;

-- 4. RLS for user_queues
-- Team owner can select their own queue.
CREATE POLICY "Users can view their own queue" ON user_queues
  FOR SELECT USING (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
  );

-- ANYONE can select a queue if the team's is_queue_revealed is true.
CREATE POLICY "Anyone can view revealed queues" ON user_queues
  FOR SELECT USING (
    team_id IN (SELECT id FROM teams WHERE is_queue_revealed = TRUE)
  );

-- Team owner can update their own queue
CREATE POLICY "Users can update their own queue" ON user_queues
  FOR UPDATE USING (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own queue" ON user_queues
  FOR INSERT WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE user_id = auth.uid())
  );

-- 5. Trigger to remove drafted player from all queues
CREATE OR REPLACE FUNCTION remove_drafted_player_from_queues()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_queues
    SET queue = (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements_text(queue) elem
        WHERE elem != NEW.player_id
    )
    WHERE queue @> jsonb_build_array(NEW.player_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_player_drafted_remove_from_queues
AFTER INSERT ON draft_log
FOR EACH ROW
EXECUTE FUNCTION remove_drafted_player_from_queues();

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_queues;
ALTER TABLE teams REPLICA IDENTITY FULL;
