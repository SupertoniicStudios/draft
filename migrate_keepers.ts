import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running migration...');
  
  // Create an RPC function to execute arbitrary SQL since we can't run DDL via REST directly
  // Actually, we can't create an RPC function without SQL access.
  // We'll have to ask the user to run this in their Supabase SQL editor.
  
  console.log('Please run the following SQL in your Supabase SQL Editor:');
  console.log(\`
ALTER TABLE keeper_lists ADD COLUMN draft_id TEXT;
ALTER TABLE keeper_lists DROP CONSTRAINT IF EXISTS keeper_lists_team_id_player_id_key;
ALTER TABLE keeper_lists ADD CONSTRAINT keeper_lists_draft_id_team_id_player_id_key UNIQUE (draft_id, team_id, player_id);
  \`);
}

runMigration();
