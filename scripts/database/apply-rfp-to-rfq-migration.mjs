#!/usr/bin/env node
/**
 * Script to apply the RFP→RFQ column rename migration
 *
 * Run with: node scripts/database/apply-rfp-to-rfq-migration.mjs
 *
 * This script renames avinode_rfp_id to avinode_rfq_id in the requests table
 * to standardize naming with Avinode API terminology (RFQ = Request for Quote).
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
config({ path: join(__dirname, '../..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumnExists(columnName) {
  try {
    // Try to query the column
    const { data, error } = await supabase
      .from('requests')
      .select(columnName)
      .limit(1);

    if (error && error.message.includes('column') && error.message.includes('does not exist')) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function applyMigration() {
  console.log('=== RFP→RFQ Column Rename Migration ===\n');

  // Step 1: Check current state
  console.log('Step 1: Checking current column state...');

  const hasRfpColumn = await checkColumnExists('avinode_rfp_id');
  const hasRfqColumn = await checkColumnExists('avinode_rfq_id');

  if (hasRfqColumn && !hasRfpColumn) {
    console.log('✅ Migration already applied: avinode_rfq_id exists, avinode_rfp_id does not exist');
    console.log('\nNo action needed.');
    return;
  }

  if (hasRfqColumn && hasRfpColumn) {
    console.log('⚠️ Both columns exist. This is unexpected state.');
    console.log('Please check the database manually.');
    return;
  }

  if (!hasRfpColumn && !hasRfqColumn) {
    console.log('⚠️ Neither column exists. The requests table may have a different schema.');
    console.log('Please check the database manually.');
    return;
  }

  // hasRfpColumn is true and hasRfqColumn is false
  console.log('Found avinode_rfp_id column. Migration needed.\n');

  // Step 2: Try using RPC to execute DDL
  console.log('Step 2: Attempting to run migration via RPC...');

  // First try exec_sql if it exists
  const { error: rpcError } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE requests RENAME COLUMN avinode_rfp_id TO avinode_rfq_id;`
  });

  if (!rpcError) {
    console.log('✅ Successfully renamed column via exec_sql RPC');

    // Create index
    await supabase.rpc('exec_sql', {
      sql: `DROP INDEX IF EXISTS idx_requests_avinode_rfp_id;
            CREATE INDEX IF NOT EXISTS idx_requests_avinode_rfq_id ON requests(avinode_rfq_id);`
    });
    console.log('✅ Updated indexes');
    return;
  }

  // RPC not available, print manual instructions
  console.log('⚠️ RPC not available. Please run the migration manually.\n');
  console.log('Run this SQL in Supabase Dashboard > SQL Editor:');
  console.log('─'.repeat(60));
  console.log(`
-- Migration: Rename avinode_rfp_id to avinode_rfq_id
-- Purpose: Standardize naming to match Avinode API terminology

-- Step 1: Rename the column
ALTER TABLE requests
RENAME COLUMN avinode_rfp_id TO avinode_rfq_id;

-- Step 2: Update indexes
DROP INDEX IF EXISTS idx_requests_avinode_rfp_id;
CREATE INDEX IF NOT EXISTS idx_requests_avinode_rfq_id ON requests(avinode_rfq_id);

-- Step 3: Add comment
COMMENT ON COLUMN requests.avinode_rfq_id IS 'Avinode RFQ (Request for Quote) ID - identifies an RFQ sent to a specific operator';

-- Verification (run after migration)
SELECT id, avinode_trip_id, avinode_rfq_id, avinode_deep_link
FROM requests
WHERE avinode_rfq_id IS NOT NULL
LIMIT 5;
  `);
  console.log('─'.repeat(60));
  console.log('\nAfter running the migration, regenerate types with:');
  console.log('npx supabase gen types typescript --project-id <project-id> > lib/types/database.types.ts');
}

applyMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
