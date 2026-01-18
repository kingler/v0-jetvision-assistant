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

async function verify() {
  console.log('Verifying chatkit_sessions table is dropped...\n');

  const { data, error } = await supabase
    .from('chatkit_sessions')
    .select('id')
    .limit(1);

  if (error && error.message.includes('does not exist')) {
    console.log('✅ chatkit_sessions table has been DROPPED');
  } else if (error) {
    console.log('✅ Table gone (error: ' + error.code + ')');
  } else {
    console.log('❌ Table still exists!');
  }
}

verify();
