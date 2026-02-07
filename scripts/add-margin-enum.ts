#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  // Use the SQL editor / management API to alter enum
  // Supabase doesn't have a built-in rpc for raw SQL, so we use the management API
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (dbUrl) {
    // If we have a direct DB connection string, use pg
    console.log('Using direct DB connection...');
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();
    await client.query("ALTER TYPE message_content_type ADD VALUE IF NOT EXISTS 'margin_selection'");
    console.log('Successfully added margin_selection to message_content_type enum');
    await client.end();
  } else {
    // Try via Supabase management API
    console.log('No DATABASE_URL found. Trying via Supabase SQL API...');

    // Check if margin_selection already exists in enum
    const { data, error } = await supabase
      .from('messages')
      .select('content_type')
      .eq('content_type', 'margin_selection')
      .limit(1);

    if (error && error.message.includes('invalid input value')) {
      console.log('margin_selection NOT in enum yet. Need to run migration manually.');
      console.log('');
      console.log('Run this SQL in the Supabase SQL Editor:');
      console.log("ALTER TYPE message_content_type ADD VALUE IF NOT EXISTS 'margin_selection';");
    } else {
      console.log('Enum check result:', { data, error: error?.message });
      if (!error) {
        console.log('margin_selection may already exist in enum (no error on query)');
      }
    }
  }
}

run().catch(console.error);
