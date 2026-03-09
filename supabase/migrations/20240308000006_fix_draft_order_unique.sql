-- Fix UNIQUE constraint on draft_order to allow multiple drafts
ALTER TABLE draft_order DROP CONSTRAINT IF EXISTS draft_order_round_pick_number_key;
ALTER TABLE draft_order ADD CONSTRAINT draft_order_draft_id_round_pick_number_key UNIQUE(draft_id, round, pick_number);
