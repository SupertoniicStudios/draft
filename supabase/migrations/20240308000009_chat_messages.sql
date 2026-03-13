-- [NEW] 7. Chat Messages Table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can view chat messages
CREATE POLICY "Anyone can view chat_messages" ON chat_messages FOR SELECT USING (true);

-- Authenticated users can insert chat messages
CREATE POLICY "Authenticated users can insert chat messages" ON chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Setup Supabase Realtime for chat_messages
-- Also ensure replica identity is full for deletes if we ever support them, though we probably don't need right now.
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
alter publication supabase_realtime add table chat_messages;
