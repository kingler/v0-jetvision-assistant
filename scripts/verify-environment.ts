#!/usr/bin/env tsx
/**
 * Environment Configuration Verification Script
 * Validates all required environment variables and API connections
 *
 * @packageDocumentation
 */

interface EnvCheckResult {
  name: string;
  status: 'pass' | 'fail';
  message: string;
}

const results: EnvCheckResult[] = [];

/**
 * Check if an environment variable is set
 * @param name - Environment variable name
 * @param required - Whether the variable is required
 * @returns Whether the variable exists
 */
function checkEnvVar(name: string, required = true): boolean {
  const value = process.env[name];
  const exists = !!value;

  results.push({
    name,
    status: exists || !required ? 'pass' : 'fail',
    message: exists
      ? '✅ Set'
      : required
      ? '❌ Missing (required)'
      : '⚠️  Not set (optional)',
  });

  return exists;
}

/**
 * Verify all environment variables and API connections
 */
async function verifyEnvironment(): Promise<void> {
  console.log('\n🔍 Verifying Environment Configuration...\n');

  // Check required environment variables
  console.log('📋 Environment Variables:\n');

  // Clerk Authentication
  checkEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  checkEnvVar('CLERK_SECRET_KEY');
  checkEnvVar('CLERK_WEBHOOK_SECRET', false); // Optional for now

  // Supabase Database
  checkEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  checkEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  checkEnvVar('SUPABASE_SERVICE_KEY');

  // OpenAI
  checkEnvVar('OPENAI_API_KEY');

  // Redis (at least one option required)
  const hasLocalRedis = checkEnvVar('REDIS_URL', false);
  const hasUpstash = checkEnvVar('UPSTASH_REDIS_REST_URL', false);

  if (!hasLocalRedis && !hasUpstash) {
    results.push({
      name: 'Redis Configuration',
      status: 'fail',
      message: '❌ Either REDIS_URL or UPSTASH_REDIS_REST_URL required',
    });
  }

  if (hasUpstash) {
    checkEnvVar('UPSTASH_REDIS_REST_TOKEN');
  }

  // Google APIs
  checkEnvVar('GOOGLE_CLIENT_ID', false);
  checkEnvVar('GOOGLE_CLIENT_SECRET', false);
  checkEnvVar('GOOGLE_REFRESH_TOKEN', false);

  // Avinode (optional for development)
  checkEnvVar('AVINODE_API_KEY', false);
  checkEnvVar('AVINODE_API_URL', false);

  // Sentry Error Tracking
  checkEnvVar('SENTRY_DSN', false);

  // Print results
  results.forEach(({ name, status, message }) => {
    console.log(`  ${message} ${name}`);
  });

  // Test API connections
  console.log('\n🔌 Testing API Connections:\n');

  // Test Supabase connection
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      // Just try to access the client - don't query yet as tables may not exist
      console.log('  ✅ Supabase client initialized');
    } catch (error) {
      console.log('  ❌ Supabase connection failed:', (error as Error).message);
    }
  } else {
    console.log('  ⏭️  Supabase connection skipped (credentials missing)');
  }

  // Test OpenAI connection
  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      await openai.models.list();
      console.log('  ✅ OpenAI connection successful');
    } catch (error) {
      console.log('  ❌ OpenAI connection failed:', (error as Error).message);
    }
  } else {
    console.log('  ⏭️  OpenAI connection skipped (API key missing)');
  }

  // Test Redis connection
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (redisUrl) {
    try {
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(redisUrl);
      await redis.ping();
      await redis.disconnect();
      console.log('  ✅ Redis connection successful');
    } catch (error) {
      console.log('  ❌ Redis connection failed:', (error as Error).message);
    }
  } else {
    console.log('  ⏭️  Redis connection skipped (URL missing)');
  }

  // Summary
  const failed = results.filter((r) => r.status === 'fail').length;
  const passed = results.filter((r) => r.status === 'pass').length;
  const total = results.length;

  console.log(`\n📊 Summary: ${passed}/${total} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('❌ Environment verification failed. Please configure missing variables.\n');
    console.log('💡 Copy .env.example to .env.local and fill in your values.\n');
    process.exit(1);
  } else {
    console.log("✅ Environment verification passed! You're ready to develop.\n");
    process.exit(0);
  }
}

// Run verification if executed directly
if (require.main === module) {
  verifyEnvironment().catch((error) => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });
}

export { verifyEnvironment, checkEnvVar };
