#!/usr/bin/env tsx

/**
 * Check Environment Variables for Clerk-Supabase Sync
 * 
 * This script verifies that all required environment variables are set
 * before running the sync script.
 */

const requiredEnvVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'CLERK_SECRET_KEY': process.env.CLERK_SECRET_KEY,
};

console.log('🔍 Checking Environment Variables...\n');

let allPresent = true;

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (value) {
    // Mask sensitive values
    const masked = key.includes('KEY') || key.includes('SECRET')
      ? `${value.substring(0, 10)}...`
      : value;
    console.log(`✅ ${key}: ${masked}`);
  } else {
    console.log(`❌ ${key}: MISSING`);
    allPresent = false;
  }
}

console.log('');

if (allPresent) {
  console.log('✅ All required environment variables are set!');
  console.log('You can now run: npm run clerk:sync-users');
  process.exit(0);
} else {
  console.log('❌ Missing required environment variables!');
  console.log('Please set them in your .env.local file.');
  process.exit(1);
}
