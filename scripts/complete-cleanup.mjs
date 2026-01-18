import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Remaining cleanup SQL from migration 033
// (skipping the chat_sessions parts since it's already dropped)
const cleanupSQL = `
-- Drop conversation_participants FKs if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_participants') THEN
    ALTER TABLE conversation_participants
      DROP CONSTRAINT IF EXISTS conversation_participants_conversation_id_fkey,
      DROP CONSTRAINT IF EXISTS conversation_participants_iso_agent_id_fkey,
      DROP CONSTRAINT IF EXISTS conversation_participants_operator_profile_id_fkey,
      DROP CONSTRAINT IF EXISTS conversation_participants_last_read_message_id_fkey;
  END IF;
END $$;

-- Drop deprecated columns from messages table
ALTER TABLE messages DROP COLUMN IF EXISTS conversation_id;

-- Drop deprecated columns from requests table
ALTER TABLE requests DROP COLUMN IF EXISTS primary_conversation_id;

-- Drop deprecated columns from quotes table
ALTER TABLE quotes DROP COLUMN IF EXISTS conversation_id;

-- Drop deprecated columns from avinode_webhook_events table
ALTER TABLE avinode_webhook_events DROP COLUMN IF EXISTS conversation_id;

-- Drop conversation_participants table
DROP TABLE IF EXISTS conversation_participants CASCADE;

-- Drop conversations table
DROP TABLE IF EXISTS conversations CASCADE;

-- Drop chat_sessions table (already dropped but just in case)
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Drop deprecated enums
DROP TYPE IF EXISTS conversation_type CASCADE;
DROP TYPE IF EXISTS conversation_status CASCADE;
DROP TYPE IF EXISTS chat_session_status CASCADE;
DROP TYPE IF EXISTS participant_role CASCADE;

-- Drop deprecated functions
DROP FUNCTION IF EXISTS get_or_create_request_conversation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS update_chat_session_activity(UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_chat_session(UUID) CASCADE;
DROP FUNCTION IF EXISTS archive_old_chat_sessions() CASCADE;

-- Clean up orphaned indexes
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_messages_conversation_id;
DROP INDEX IF EXISTS idx_conversations_request_id;
DROP INDEX IF EXISTS idx_conversations_quote_id;
DROP INDEX IF EXISTS idx_conversations_status;
DROP INDEX IF EXISTS idx_conversations_type;
DROP INDEX IF EXISTS idx_conversations_last_message_at;
DROP INDEX IF EXISTS idx_conversations_avinode_thread;
DROP INDEX IF EXISTS idx_conversations_chatkit_thread;
DROP INDEX IF EXISTS idx_conversations_active;
DROP INDEX IF EXISTS idx_conversations_priority;
DROP INDEX IF EXISTS idx_chat_sessions_conversation_status;
DROP INDEX IF EXISTS idx_chat_sessions_request_id;
DROP INDEX IF EXISTS idx_chat_sessions_iso_agent;
DROP INDEX IF EXISTS idx_chat_sessions_avinode_trip;
DROP INDEX IF EXISTS idx_chat_sessions_avinode_rfp;
DROP INDEX IF EXISTS idx_chat_sessions_active_activity;
DROP INDEX IF EXISTS idx_chat_sessions_status_updated;
DROP INDEX IF EXISTS idx_chat_sessions_conversation_type;
DROP INDEX IF EXISTS idx_participants_conversation;
DROP INDEX IF EXISTS idx_participants_iso_agent;
DROP INDEX IF EXISTS idx_participants_operator;
DROP INDEX IF EXISTS idx_participants_role;
DROP INDEX IF EXISTS idx_participants_active;
DROP INDEX IF EXISTS idx_participants_unread;
DROP INDEX IF EXISTS idx_participants_unique_iso;
DROP INDEX IF EXISTS idx_participants_unique_operator;
DROP INDEX IF EXISTS idx_participants_unique_ai;
`;

async function completeCleanup() {
  console.log('=== COMPLETING SCHEMA CLEANUP ===\n');

  // Execute cleanup via RPC (raw SQL)
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: cleanupSQL
  });

  if (error) {
    console.log('RPC exec_sql not available, trying alternative approach...\n');

    // Try individual operations
    const operations = [
      { name: 'Drop conversation_participants', table: 'conversation_participants' },
      { name: 'Drop conversations', table: 'conversations' },
      { name: 'Drop chat_sessions', table: 'chat_sessions' },
    ];

    for (const op of operations) {
      // Check if table exists
      const { count, error: checkErr } = await supabase
        .from(op.table)
        .select('*', { count: 'exact', head: true });

      if (checkErr && checkErr.code === '42P01') {
        console.log('✅ ' + op.name + ': Already dropped');
      } else if (checkErr) {
        console.log('⚠️  ' + op.name + ': Error checking - ' + checkErr.message);
      } else {
        console.log('❌ ' + op.name + ': Still exists with ' + count + ' rows');
      }
    }

    console.log('\n⚠️  Cannot execute raw SQL via Supabase client.');
    console.log('Please run the cleanup SQL directly via Supabase Dashboard SQL editor or psql.\n');
    return;
  }

  console.log('✅ Cleanup SQL executed successfully!');
}

completeCleanup();
