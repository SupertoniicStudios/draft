-- Fix RLS for teams insertion so users can create Drafts which clone the base teams

-- Allow authenticated users to insert teams
CREATE POLICY "Authenticated users can insert teams" ON teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- We should also allow the draft creator to update/delete teams if needed later
CREATE POLICY "Draft creators can modify teams" ON teams FOR UPDATE USING (
    EXISTS (SELECT 1 FROM drafts WHERE drafts.id = teams.draft_id AND drafts.created_by = auth.uid())
);
CREATE POLICY "Draft creators can delete teams" ON teams FOR DELETE USING (
    EXISTS (SELECT 1 FROM drafts WHERE drafts.id = teams.draft_id AND drafts.created_by = auth.uid())
);
