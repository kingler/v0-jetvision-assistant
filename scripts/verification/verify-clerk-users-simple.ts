#!/usr/bin/env tsx
/**
 * Simple verification script - test if output works
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

console.log('Script started!');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Env vars:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

console.log('Creating client...');
const supabase = createClient(supabaseUrl, supabaseKey);

const userIds = [
  'user_34sZ1CKQIimet0xDqOVEFBeNxcz',
  'user_34sYCoSlyn6siCnXWL49nvakvYp',
  'user_34YmaZ12hM0a9wpp3aDqVBNuqyJ',
  'user_34Ylb9cbSnECXxeIsKcbwnZ4EUb',
  'user_34R2SvVkcfq5fWJkdQT0AFluLRr',
];

async function run(): Promise<void> {
  console.log('Querying database...');
  for (const userId of userIds) {
    const { data, error } = await supabase
      .from('iso_agents')
      .select('clerk_user_id, email, full_name, role, is_active')
      .eq('clerk_user_id', userId)
      .single();
    
    if (error) {
      console.log(`${userId}: NOT FOUND (${error.code})`);
    } else {
      console.log(`${userId}: FOUND - ${data.email} (${data.role})`);
    }
  }

  console.log('Done!');
}

run().catch((error) => {
  console.error('Failed to verify users:', error);
  process.exit(1);
});
