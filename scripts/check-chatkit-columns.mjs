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

async function check() {
  console.log('Checking ChatKit columns for data...\n');

  // Check requests.chatkit_thread_id
  const { count: reqWithChatkit } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .not('chatkit_thread_id', 'is', null);

  console.log('requests with chatkit_thread_id: ' + (reqWithChatkit || 0));

  // Check messages.chatkit_message_id
  const { count: msgWithChatkit } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .not('chatkit_message_id', 'is', null);

  console.log('messages with chatkit_message_id: ' + (msgWithChatkit || 0));

  if ((reqWithChatkit || 0) === 0 && (msgWithChatkit || 0) === 0) {
    console.log('\n✅ No ChatKit data - columns can be safely dropped');
  } else {
    console.log('\n⚠️  ChatKit data exists - keep columns for historical reference');
  }
}

check();
