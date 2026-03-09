-- Update Replenish Identity to default to FULL so Realtime DELETE events include the draft_id
ALTER TABLE draft_log REPLICA IDENTITY FULL;
ALTER TABLE teams REPLICA IDENTITY FULL;
ALTER TABLE draft_order REPLICA IDENTITY FULL;
ALTER TABLE keeper_lists REPLICA IDENTITY FULL;
ALTER TABLE drafts REPLICA IDENTITY FULL;
