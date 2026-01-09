#!/usr/bin/env node
/**
 * Script to apply migration 025 directly to Supabase
 * Run with: node scripts/apply-migration-025.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying migration 025: Add conversation_type to chat_sessions...');

  try {
    // Step 1: Add column if not exists
    console.log('Step 1: Adding conversation_type column...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE chat_sessions
        ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'general';
      `
    });

    // If RPC doesn't work, try direct query via REST
    if (error1) {
      console.log('RPC not available, using direct SQL...');

      // Check if column already exists
      const { data: columns } = await supabase
        .from('chat_sessions')
        .select('*')
        .limit(1);

      if (columns && columns.length > 0 && 'conversation_type' in columns[0]) {
        console.log('Column conversation_type already exists');
      } else {
        console.log('Note: Column needs to be added via Supabase SQL Editor');
        console.log('Run this SQL in Supabase Dashboard > SQL Editor:');
        console.log(`
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'general'
CHECK (conversation_type IN ('flight_request', 'general'));

COMMENT ON COLUMN chat_sessions.conversation_type IS 'UI variant: flight_request (FlightRequestCard) or general (GeneralChatCard)';

CREATE INDEX IF NOT EXISTS idx_chat_sessions_conversation_type
ON chat_sessions(conversation_type, status);

UPDATE chat_sessions
SET conversation_type = 'flight_request'
WHERE (avinode_trip_id IS NOT NULL OR avinode_rfp_id IS NOT NULL OR request_id IS NOT NULL)
  AND (conversation_type IS NULL OR conversation_type = 'general');

DELETE FROM chat_sessions
WHERE message_count = 0
  AND avinode_trip_id IS NULL
  AND avinode_rfp_id IS NULL
  AND request_id IS NULL;
        `);
        process.exit(0);
      }
    }

    // Step 2: Update existing flight request sessions
    console.log('Step 2: Updating existing flight request sessions...');
    const { data: updateResult, error: error2 } = await supabase
      .from('chat_sessions')
      .update({ conversation_type: 'flight_request' })
      .or('avinode_trip_id.not.is.null,avinode_rfp_id.not.is.null,request_id.not.is.null')
      .select('id');

    if (error2) {
      console.error('Error updating sessions:', error2.message);
    } else {
      console.log(`Updated ${updateResult?.length || 0} sessions to flight_request`);
    }

    // Step 3: Clean up blank sessions
    console.log('Step 3: Cleaning up blank sessions...');
    const { data: deleteResult, error: error3 } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('message_count', 0)
      .is('avinode_trip_id', null)
      .is('avinode_rfp_id', null)
      .is('request_id', null)
      .select('id');

    if (error3) {
      console.error('Error deleting blank sessions:', error3.message);
    } else {
      console.log(`Deleted ${deleteResult?.length || 0} blank sessions`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
