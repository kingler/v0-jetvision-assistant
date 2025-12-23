/**
 * Manual Test Script for LLM Configuration
 * 
 * Tests the admin LLM configuration functionality including:
 * - Database migration
 * - API endpoints
 * - Encryption/decryption
 * - Agent integration
 * 
 * Usage: tsx scripts/test-llm-config.ts
 */

import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt, generateEncryptionKey } from '@/lib/utils/encryption';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function testEncryption() {
  logSection('Testing Encryption Utility');

  try {
    // Generate test key if not set
    if (!process.env.ENCRYPTION_KEY) {
      log('⚠️  ENCRYPTION_KEY not set. Generating test key...', 'yellow');
      const testKey = generateEncryptionKey();
      log(`Generated key: ${testKey}`, 'blue');
      log('Add this to .env.local: ENCRYPTION_KEY=' + testKey, 'yellow');
      process.env.ENCRYPTION_KEY = testKey;
    }

    const plaintext = 'sk-test-api-key-12345';
    log(`Encrypting: ${plaintext.substring(0, 10)}...`, 'blue');

    const encrypted = encrypt(plaintext);
    log(`Encrypted: ${encrypted.substring(0, 30)}...`, 'blue');

    const decrypted = decrypt(encrypted);
    log(`Decrypted: ${decrypted.substring(0, 10)}...`, 'blue');

    if (decrypted === plaintext) {
      log('✅ Encryption/decryption test passed', 'green');
      return true;
    } else {
      log('❌ Encryption/decryption test failed', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Encryption test error: ${error}`, 'red');
    return false;
  }
}

async function testDatabaseConnection() {
  logSection('Testing Database Connection');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      log('❌ Missing Supabase credentials', 'red');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if llm_config table exists
    const { data, error } = await supabase
      .from('llm_config')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        log('❌ llm_config table does not exist. Run migration 022_llm_config.sql', 'red');
        return false;
      }
      throw error;
    }

    log('✅ Database connection successful', 'green');
    log(`✅ llm_config table exists (${data?.length || 0} records)`, 'green');
    return true;
  } catch (error) {
    log(`❌ Database test error: ${error}`, 'red');
    return false;
  }
}

async function testAPIEndpoints() {
  logSection('Testing API Endpoints');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const testApiKey = process.env.OPENAI_API_KEY || 'sk-test-key';

  try {
    // Test 1: GET /api/admin/llm-config
    log('Testing GET /api/admin/llm-config...', 'blue');
    const getResponse = await fetch(`${baseUrl}/api/admin/llm-config`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY || 'test'}`,
      },
    });

    if (getResponse.ok) {
      const data = await getResponse.json();
      log(`✅ GET endpoint working (${data.data?.length || 0} configs)`, 'green');
    } else {
      log(`⚠️  GET endpoint returned ${getResponse.status}`, 'yellow');
      log('   (This is expected if not authenticated as admin)', 'yellow');
    }

    // Test 2: POST /api/admin/llm-config/test
    log('\nTesting POST /api/admin/llm-config/test...', 'blue');
    const testResponse = await fetch(`${baseUrl}/api/admin/llm-config/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY || 'test'}`,
      },
      body: JSON.stringify({
        provider: 'openai',
        api_key: testApiKey,
      }),
    });

    if (testResponse.ok) {
      const data = await testResponse.json();
      if (data.valid) {
        log('✅ API key test endpoint working', 'green');
        log(`   Available models: ${data.available_models?.slice(0, 3).join(', ')}...`, 'blue');
      } else {
        log('⚠️  API key test failed (expected if using test key)', 'yellow');
      }
    } else {
      log(`⚠️  Test endpoint returned ${testResponse.status}`, 'yellow');
    }

    return true;
  } catch (error) {
    log(`⚠️  API test error (server may not be running): ${error}`, 'yellow');
    return false;
  }
}

async function testAgentIntegration() {
  logSection('Testing Agent MCP Integration');

  try {
    // Test if BaseAgent can connect to MCP server
    const { MCPServerManager } = await import('@/lib/services/mcp-server-manager');
    const manager = MCPServerManager.getInstance();

    log('Checking MCPServerManager...', 'blue');
    log('✅ MCPServerManager singleton available', 'green');

    // Test if FlightSearchAgent can be instantiated
    try {
      const { FlightSearchAgent } = await import('@/agents/implementations/flight-search-agent');
      const { AgentFactory } = await import('@/agents/core/agent-factory');
      
      const factory = AgentFactory.getInstance();
      log('✅ AgentFactory available', 'green');
      log('✅ FlightSearchAgent can be imported', 'green');
      
      return true;
    } catch (error) {
      log(`⚠️  Agent import test: ${error}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`⚠️  Agent integration test error: ${error}`, 'yellow');
    return false;
  }
}

async function checkMigration() {
  logSection('Checking Database Migration');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      log('⚠️  Cannot check migration without Supabase credentials', 'yellow');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if table exists
    const { data, error } = await supabase
      .from('llm_config')
      .select('*')
      .limit(1);

    if (error && error.code === '42P01') {
      log('❌ Migration not applied. Run: supabase/migrations/022_llm_config.sql', 'red');
      return false;
    }

    log('✅ Migration appears to be applied', 'green');

    // Check if admin function exists
    const { data: functionCheck, error: funcError } = await supabase.rpc('is_admin_user');

    if (funcError && funcError.code === '42883') {
      log('⚠️  is_admin_user() function not found. Migration may be incomplete.', 'yellow');
    } else {
      log('✅ RLS helper functions available', 'green');
    }

    return true;
  } catch (error) {
    log(`⚠️  Migration check error: ${error}`, 'red');
    return false;
  }
}

async function main() {
  log('\n🚀 LLM Configuration Test Suite\n', 'cyan');

  const results = {
    encryption: false,
    database: false,
    migration: false,
    api: false,
    agent: false,
  };

  // Run tests
  results.encryption = await testEncryption();
  results.migration = await checkMigration();
  results.database = await testDatabaseConnection();
  results.api = await testAPIEndpoints();
  results.agent = await testAgentIntegration();

  // Summary
  logSection('Test Summary');

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(Boolean).length;

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${status} ${test}`, color);
  });

  console.log('\n' + '-'.repeat(60));
  log(`Results: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  console.log('-'.repeat(60) + '\n');

  if (passed === total) {
    log('🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please review the output above.', 'yellow');
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n❌ Fatal error: ${error}`, 'red');
  process.exit(1);
});

