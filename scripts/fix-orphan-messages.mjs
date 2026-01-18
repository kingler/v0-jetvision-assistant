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

async function fixOrphanMessages() {
  console.log('=== ORPHAN MESSAGES ANALYSIS ===\n');

  // Get orphan messages
  const { data: orphans, error } = await supabase
    .from('messages')
    .select('id, content, sender_type, sender_iso_agent_id, created_at')
    .is('request_id', null);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Found ' + orphans.length + ' orphan messages:\n');

  orphans.forEach((msg, i) => {
    const content = msg.content || '';
    const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
    console.log((i+1) + '. ID: ' + msg.id);
    console.log('   Sender: ' + msg.sender_type);
    console.log('   Agent ID: ' + msg.sender_iso_agent_id);
    console.log('   Content: ' + preview);
    console.log('   Created: ' + msg.created_at);
    console.log('');
  });

  // These orphan messages have no request association
  // Options:
  // 1. Delete them (they're orphaned and can't be displayed anyway)
  // 2. Try to associate them with a request based on sender_iso_agent_id

  console.log('\n=== DECISION ===');
  console.log('These messages have no request_id and cannot be displayed in the UI.');
  console.log('Deleting orphan messages...\n');

  const orphanIds = orphans.map(m => m.id);

  if (orphanIds.length > 0) {
    const { error: deleteErr, count } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .in('id', orphanIds);

    if (deleteErr) {
      console.log('Error deleting:', deleteErr.message);
    } else {
      console.log('✅ Deleted ' + count + ' orphan messages');
    }
  }

  // Verify
  const { count: remaining } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .is('request_id', null);

  console.log('\nRemaining orphan messages: ' + (remaining || 0));
}

fixOrphanMessages();
