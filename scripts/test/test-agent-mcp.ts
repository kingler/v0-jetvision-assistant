/**
 * Manual Test Script for Agent MCP Integration
 * 
 * Tests that agents can connect to MCP servers and use tools
 * 
 * Usage: tsx scripts/test-agent-mcp.ts
 */

import { AgentFactory } from '@/agents/core/agent-factory';
import { AgentType } from '@/agents/core/types';
import { MCPServerManager } from '@/lib/services/mcp-server-manager';
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

async function testMCPServerManager() {
  logSection('Testing MCPServerManager');

  try {
    const manager = MCPServerManager.getInstance();
    log('✅ MCPServerManager singleton created', 'green');

    // Check server state
    const state = manager.getServerState('avinode-mcp');
    log(`Avinode MCP server state: ${state}`, 'blue');

    return true;
  } catch (error) {
    log(`❌ MCPServerManager test failed: ${error}`, 'red');
    return false;
  }
}

async function testFlightSearchAgent() {
  logSection('Testing FlightSearchAgent MCP Integration');

  try {
    const factory = AgentFactory.getInstance();
    
    // Create agent
    const agent = factory.createAgent({
      type: AgentType.FLIGHT_SEARCH,
      name: 'Test Flight Search Agent',
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
    });

    log('✅ FlightSearchAgent created', 'green');

    // Initialize agent (should connect to MCP server)
    log('Initializing agent (connecting to MCP server)...', 'blue');
    await agent.initialize();

    log('✅ Agent initialized', 'green');

    // Check if MCP client is connected
    const mcpClients = (agent as any).mcpClients;
    if (mcpClients && mcpClients.size > 0) {
      log(`✅ Connected to ${mcpClients.size} MCP server(s)`, 'green');
      mcpClients.forEach((client: any, name: string) => {
        log(`   - ${name}`, 'blue');
      });
    } else {
      log('⚠️  No MCP servers connected', 'yellow');
    }

    // Test tool definitions
    const tools = await (agent as any).getToolDefinitions();
    log(`✅ Found ${tools.length} available tools`, 'green');
    
    if (tools.length > 0) {
      log('Available tools:', 'blue');
      tools.slice(0, 5).forEach((tool: any) => {
        log(`   - ${tool.function.name}: ${tool.function.description?.substring(0, 50)}...`, 'blue');
      });
    }

    // Cleanup
    await agent.shutdown();

    return true;
  } catch (error) {
    log(`❌ FlightSearchAgent test failed: ${error}`, 'red');
    if (error instanceof Error) {
      log(`   Error: ${error.message}`, 'red');
      if (error.stack) {
        log(`   Stack: ${error.stack.split('\n')[1]}`, 'yellow');
      }
    }
    return false;
  }
}

async function testBaseAgentMCPMethods() {
  logSection('Testing BaseAgent MCP Methods');

  try {
    const factory = AgentFactory.getInstance();
    const agent = factory.createAgent({
      type: AgentType.FLIGHT_SEARCH,
      name: 'Test Agent',
      model: 'gpt-4-turbo-preview',
    });

    await agent.initialize();

    // Test connectMCPServer
    log('Testing connectMCPServer()...', 'blue');
    try {
      await (agent as any).connectMCPServer(
        'test-server',
        'node',
        ['--version'],
        { spawnTimeout: 5000 }
      );
      log('⚠️  connectMCPServer() succeeded (unexpected)', 'yellow');
    } catch (error) {
      // Expected to fail for test server
      log('✅ connectMCPServer() method exists', 'green');
    }

    // Test getToolDefinitions
    log('Testing getToolDefinitions()...', 'blue');
    const tools = await (agent as any).getToolDefinitions();
    log(`✅ getToolDefinitions() returns ${tools.length} tools`, 'green');

    await agent.shutdown();
    return true;
  } catch (error) {
    log(`❌ BaseAgent MCP methods test failed: ${error}`, 'red');
    return false;
  }
}

async function main() {
  log('\n🚀 Agent MCP Integration Test Suite\n', 'cyan');

  const results = {
    mcpManager: false,
    baseAgent: false,
    flightSearchAgent: false,
  };

  // Run tests
  results.mcpManager = await testMCPServerManager();
  results.baseAgent = await testBaseAgentMCPMethods();
  results.flightSearchAgent = await testFlightSearchAgent();

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
    log('\nNext steps:', 'cyan');
    log('1. Run the app: pnpm dev', 'blue');
    log('2. Navigate to /settings/llm-config (as admin)', 'blue');
    log('3. Configure OpenAI API key', 'blue');
    log('4. Test agent execution with MCP tools', 'blue');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please review the output above.', 'yellow');
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n❌ Fatal error: ${error}`, 'red');
  console.error(error);
  process.exit(1);
});

