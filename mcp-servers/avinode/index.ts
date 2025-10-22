#!/usr/bin/env node
/**
 * Avinode MCP Server - Entry Point
 *
 * Starts the Avinode MCP server for integration with Claude Code.
 * Automatically detects mock mode vs real mode based on AVINODE_API_KEY.
 */

import { AvinodeMCPServer } from '../../lib/mcp/avinode-server';

/**
 * Main execution
 */
async function main() {
  // Create server instance
  const server = new AvinodeMCPServer();

  // Log mode
  const mode = server.isUsingMockMode() ? 'MOCK' : 'REAL';
  console.error(`[Avinode MCP] Starting in ${mode} mode...`);

  // Register shutdown hook
  server.onShutdown(async () => {
    console.error('[Avinode MCP] Cleanup complete');
  });

  try {
    // Start the server
    await server.start();
    console.error('[Avinode MCP] Server started successfully');
    console.error(`[Avinode MCP] Available tools: ${server.getTools().join(', ')}`);

    // Keep process alive
    process.stdin.resume();
  } catch (error) {
    console.error('[Avinode MCP] Fatal error:', error);
    process.exit(1);
  }

  // Graceful shutdown on SIGINT
  process.on('SIGINT', async () => {
    console.error('\n[Avinode MCP] Shutting down...');
    await server.stop();
    process.exit(0);
  });

  // Handle SIGTERM
  process.on('SIGTERM', async () => {
    console.error('\n[Avinode MCP] Shutting down...');
    await server.stop();
    process.exit(0);
  });
}

// Run the server
if (require.main === module) {
  main().catch((error) => {
    console.error('[Avinode MCP] Fatal error:', error);
    process.exit(1);
  });
}

export { AvinodeMCPServer };
