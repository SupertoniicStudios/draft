-- Add missing DELETE policy to drafts table

CREATE POLICY "Creator can delete drafts" ON drafts FOR DELETE USING (auth.uid() = created_by);
