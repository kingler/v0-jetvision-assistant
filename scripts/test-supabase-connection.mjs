import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection...\n');
console.log('Supabase URL:', url ? url.substring(0, 35) + '...' : 'NOT SET');
console.log('Service Key:', key ? 'SET (length: ' + key.length + ')' : 'NOT SET');

if (!url || !key) {
  console.log('\n❌ Missing environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

try {
  // Test basic query
  const { data, error } = await supabase
    .from('requests')
    .select('id, created_at, departure_airport, arrival_airport, status')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log('\n❌ Query error:', error.message);
    console.log('Error details:', error);
  } else {
    console.log('\n✅ Supabase connection successful!');
    console.log('\nRecent requests from "requests" table:');
    if (data && data.length > 0) {
      data.forEach((row, i) => {
        const dep = row.departure_airport || 'N/A';
        const arr = row.arrival_airport || 'N/A';
        const status = row.status || 'no status';
        console.log('  ' + (i+1) + '. ' + dep + ' → ' + arr + ' (' + status + ')');
      });
    } else {
      console.log('  (No data in requests table)');
    }
  }

  // Get table count
  const { count, error: countErr } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true });

  if (!countErr) {
    console.log('\nTotal requests in database: ' + count);
  }

  // List some other tables
  const tables = ['iso_agents', 'quotes', 'workflow_states', 'agent_executions'];
  console.log('\nChecking other tables:');
  for (const table of tables) {
    const { count: c, error: e } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (!e) {
      console.log('  - ' + table + ': ' + c + ' rows');
    } else {
      console.log('  - ' + table + ': error (' + e.message + ')');
    }
  }

} catch (err) {
  console.log('\n❌ Connection error:', err.message);
}
