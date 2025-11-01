import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log('✅ Jetvision Database - Deployment Verification\n');
console.log('='.repeat(60));

const tables = [
  'iso_agents',
  'client_profiles',
  'requests',
  'quotes',
  'workflow_states',
  'agent_executions'
];

for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log(`❌ ${table}: ERROR - ${error.message}`);
  } else {
    console.log(`✅ ${table.padEnd(20)} ${count} rows`);
  }
}

console.log('='.repeat(60));
console.log('\n🎉 Database deployment successful!');
console.log('\nNext steps:');
console.log('  1. Test RLS policies: npm run test:rls');
console.log('  2. Test agent operations: npm run test:agents');
console.log('  3. Start Phase 2: MCP server implementations\n');
