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

async function checkIsoAgents() {
  console.log('Fetching all iso_agents...\n');

  const { data, error } = await supabase
    .from('iso_agents')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Total iso_agents:', data.length);
  console.log('\n--- All ISO Agents ---\n');

  // Group by whether they have a clerk_user_id
  const clerkUsers = data.filter(u => u.clerk_user_id && u.clerk_user_id.startsWith('user_'));
  const nonClerkUsers = data.filter(u => !u.clerk_user_id || !u.clerk_user_id.startsWith('user_'));

  console.log('=== CLERK USERS (Real) ===');
  clerkUsers.forEach((u, i) => {
    console.log((i+1) + '. ID: ' + u.id);
    console.log('   Email: ' + u.email);
    console.log('   Name: ' + u.full_name);
    console.log('   Clerk ID: ' + u.clerk_user_id);
    console.log('   Role: ' + u.role);
    console.log('   Created: ' + u.created_at);
    console.log('');
  });

  console.log('\n=== NON-CLERK USERS (Mocked/Test) ===');
  console.log('Count:', nonClerkUsers.length);

  // Show first 10 as sample
  const sample = nonClerkUsers.slice(0, 10);
  sample.forEach((u, i) => {
    console.log((i+1) + '. ID: ' + u.id);
    console.log('   Email: ' + u.email);
    console.log('   Name: ' + u.full_name);
    console.log('   Clerk ID: ' + (u.clerk_user_id || 'NULL'));
    console.log('');
  });

  if (nonClerkUsers.length > 10) {
    console.log('... and ' + (nonClerkUsers.length - 10) + ' more non-Clerk users');
  }

  // Output IDs for deletion
  console.log('\n=== IDs TO DELETE ===');
  console.log('Non-Clerk user IDs:');
  console.log(JSON.stringify(nonClerkUsers.map(u => u.id)));
}

checkIsoAgents();
