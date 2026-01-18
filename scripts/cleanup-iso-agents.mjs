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

// The 5 real Clerk user IDs to KEEP
const REAL_CLERK_USER_IDS = [
  'e26aacb7-da3b-4013-91f9-16e76472f82b', // kinglerbercy@gmail.com
  '77276a7d-4c26-4c0b-81d5-59b9d479cf32', // kham@onekaleidoscope.com
  'ee1462b9-a8f0-4e5a-9a9b-49bac34059c8', // amb464@scarletmail.rutgers.edu
  'f19e52fb-70d8-4260-bc00-bbdcda57316a', // designthrustudio@gmail.com
  '16148051-0af3-4065-9207-00bc5bd7e84b', // ab@cucinalabs.com
];

async function cleanupIsoAgents() {
  console.log('Starting cleanup of iso_agents table...\n');
  console.log('Keeping these 5 real Clerk users:');
  REAL_CLERK_USER_IDS.forEach(id => console.log('  - ' + id));

  // First, get count of users to delete
  const { data: toDelete, error: fetchError } = await supabase
    .from('iso_agents')
    .select('id, email')
    .not('id', 'in', '(' + REAL_CLERK_USER_IDS.join(',') + ')');

  if (fetchError) {
    console.log('\nError fetching users to delete:', fetchError.message);
    return;
  }

  console.log('\nUsers to delete: ' + toDelete.length);

  if (toDelete.length === 0) {
    console.log('No users to delete. Done!');
    return;
  }

  // Check for foreign key constraints - see if any requests reference these users
  const idsToDelete = toDelete.map(u => u.id);

  const { data: linkedRequests, error: reqError } = await supabase
    .from('requests')
    .select('id, iso_agent_id')
    .in('iso_agent_id', idsToDelete);

  if (reqError) {
    console.log('\nError checking linked requests:', reqError.message);
  } else if (linkedRequests && linkedRequests.length > 0) {
    console.log('\nWARNING: Found ' + linkedRequests.length + ' requests linked to users being deleted.');
    console.log('These requests will need to be handled first or the delete will fail.');

    // Delete linked requests first
    console.log('\nDeleting linked requests...');
    const { error: delReqError } = await supabase
      .from('requests')
      .delete()
      .in('iso_agent_id', idsToDelete);

    if (delReqError) {
      console.log('Error deleting linked requests:', delReqError.message);
      return;
    }
    console.log('Deleted ' + linkedRequests.length + ' linked requests.');
  }

  // Now delete the mocked users in batches (Supabase has limits)
  console.log('\nDeleting mocked iso_agents...');

  const { error: deleteError, count } = await supabase
    .from('iso_agents')
    .delete({ count: 'exact' })
    .not('id', 'in', '(' + REAL_CLERK_USER_IDS.join(',') + ')');

  if (deleteError) {
    console.log('Error deleting users:', deleteError.message);
    return;
  }

  console.log('\n✅ Successfully deleted ' + count + ' mocked iso_agents!');

  // Verify final state
  const { data: remaining, error: verifyError } = await supabase
    .from('iso_agents')
    .select('id, email, full_name, clerk_user_id')
    .order('created_at', { ascending: true });

  if (verifyError) {
    console.log('Error verifying:', verifyError.message);
    return;
  }

  console.log('\n=== REMAINING ISO_AGENTS (' + remaining.length + ') ===');
  remaining.forEach((u, i) => {
    console.log((i+1) + '. ' + u.email + ' (' + u.full_name + ')');
    console.log('   ID: ' + u.id);
    console.log('   Clerk: ' + u.clerk_user_id);
  });
}

cleanupIsoAgents();
