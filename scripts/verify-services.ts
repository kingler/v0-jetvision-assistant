#!/usr/bin/env tsx

/**
 * Service Verification Script
 *
 * Tests connectivity to all required services:
 * - Redis (BullMQ task queue)
 * - Supabase (database)
 * - Clerk (authentication)
 * - OpenAI (AI agents)
 *
 * Usage: npm run verify-services
 * or: tsx scripts/verify-services.ts
 */

import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

interface ServiceStatus {
  name: string;
  status: 'ok' | 'error' | 'skipped';
  message: string;
  details?: any;
}

const results: ServiceStatus[] = [];

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : colors.reset;
  console.log(`${colorCode}${message}${colors.reset}`);
}

function logResult(result: ServiceStatus) {
  const icon = result.status === 'ok' ? '✓' : result.status === 'error' ? '✗' : '○';
  const color = result.status === 'ok' ? 'green' : result.status === 'error' ? 'red' : 'yellow';

  log(`${icon} ${result.name}: ${result.message}`, color);
  if (result.details) {
    console.log(`  ${JSON.stringify(result.details, null, 2)}`);
  }
}

async function testRedis(): Promise<ServiceStatus> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    await redis.connect();
    const pingResult = await redis.ping();

    if (pingResult !== 'PONG') {
      throw new Error(`Unexpected ping response: ${pingResult}`);
    }

    const info = await redis.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];

    await redis.quit();

    return {
      name: 'Redis',
      status: 'ok',
      message: 'Connected successfully',
      details: { url: redisUrl, version },
    };
  } catch (error: any) {
    return {
      name: 'Redis',
      status: 'error',
      message: error.message,
      details: { url: redisUrl },
    };
  }
}

async function testSupabase(): Promise<ServiceStatus> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      name: 'Supabase',
      status: 'skipped',
      message: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection by querying system tables
    const { data, error } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1);

    // Even if table doesn't exist, connection works if we get a proper error
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }

    return {
      name: 'Supabase',
      status: 'ok',
      message: 'Connected successfully',
      details: { url: supabaseUrl },
    };
  } catch (error: any) {
    return {
      name: 'Supabase',
      status: 'error',
      message: error.message,
      details: { url: supabaseUrl },
    };
  }
}

async function testClerk(): Promise<ServiceStatus> {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    return {
      name: 'Clerk',
      status: 'skipped',
      message: 'Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_SECRET_KEY',
    };
  }

  try {
    // Test by making a simple API call to Clerk
    const response = await fetch('https://api.clerk.com/v1/users/count', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      name: 'Clerk',
      status: 'ok',
      message: 'Connected successfully',
      details: { userCount: data.total_count },
    };
  } catch (error: any) {
    return {
      name: 'Clerk',
      status: 'error',
      message: error.message,
    };
  }
}

async function testOpenAI(): Promise<ServiceStatus> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      name: 'OpenAI',
      status: 'error',
      message: 'Missing OPENAI_API_KEY environment variable',
    };
  }

  try {
    const openai = new OpenAI({ apiKey });

    // Test by listing available models
    const models = await openai.models.list();
    const modelCount = models.data.length;

    // Check for required models
    const hasGpt4 = models.data.some(m => m.id.includes('gpt-4'));
    const hasGpt35 = models.data.some(m => m.id.includes('gpt-3.5'));

    return {
      name: 'OpenAI',
      status: 'ok',
      message: 'Connected successfully',
      details: {
        modelCount,
        hasGpt4,
        hasGpt35,
      },
    };
  } catch (error: any) {
    return {
      name: 'OpenAI',
      status: 'error',
      message: error.message,
    };
  }
}

async function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('  JetVision Service Verification', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  // Test all services
  log('Testing services...', 'blue');

  const redisResult = await testRedis();
  results.push(redisResult);
  logResult(redisResult);

  const supabaseResult = await testSupabase();
  results.push(supabaseResult);
  logResult(supabaseResult);

  const clerkResult = await testClerk();
  results.push(clerkResult);
  logResult(clerkResult);

  const openaiResult = await testOpenAI();
  results.push(openaiResult);
  logResult(openaiResult);

  // Summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const okCount = results.filter(r => r.status === 'ok').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  log(`\nResults: ${okCount} OK, ${errorCount} Errors, ${skippedCount} Skipped`, 'blue');

  if (errorCount > 0) {
    log('\n⚠️  Some services failed. Check the errors above.', 'yellow');
    log('Run the following to fix common issues:', 'yellow');
    log('  - Redis: npm run redis:start', 'yellow');
    log('  - Supabase: Check .env.local for correct URL and keys', 'yellow');
    log('  - Clerk: Check .env.local for correct keys', 'yellow');
    log('  - OpenAI: Check .env.local for valid API key', 'yellow');
    process.exit(1);
  }

  if (skippedCount > 0) {
    log('\nℹ️  Some services were skipped due to missing configuration.', 'yellow');
    log('See .env.local.example for required environment variables.', 'yellow');
  }

  if (okCount === results.length) {
    log('\n✅ All services are configured and working!', 'green');
    log('You are ready to start development.', 'green');
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');
}

main().catch((error) => {
  log(`\n❌ Verification failed: ${error.message}`, 'red');
  process.exit(1);
});
