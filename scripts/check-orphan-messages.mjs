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

async function checkOrphanMessages() {
  console.log('=== MESSAGES WITHOUT REQUEST_ID ===\n');

  const { data, error } = await supabase
    .from('messages')
    .select('id, content, sender_type, conversation_id, request_id, created_at')
    .is('request_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Found ' + data.length + ' messages without request_id:\n');

  data.forEach((msg, i) => {
    console.log((i+1) + '. ID: ' + msg.id);
    console.log('   Content: ' + (msg.content ? msg.content.substring(0, 80) + '...' : 'NULL'));
    console.log('   Sender: ' + msg.sender_type);
    console.log('   conversation_id: ' + msg.conversation_id);
    console.log('   Created: ' + msg.created_at);
    console.log('');
  });

  // Check if these conversation_ids exist in conversations table
  if (data.length > 0) {
    const convIds = [...new Set(data.map(m => m.conversation_id).filter(Boolean))];
    console.log('\n=== CHECKING CONVERSATION IDS ===');
    console.log('Unique conversation_ids: ' + JSON.stringify(convIds));

    if (convIds.length > 0) {
      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('id, request_id')
        .in('id', convIds);

      if (convErr) {
        console.log('Error checking conversations:', convErr.message);
      } else {
        console.log('\nConversations found: ' + convs.length);
        convs.forEach(c => {
          console.log('  - ' + c.id + ' -> request_id: ' + c.request_id);
        });
      }
    }
  }
}

checkOrphanMessages();
