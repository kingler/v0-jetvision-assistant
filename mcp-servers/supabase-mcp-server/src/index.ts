#!/usr/bin/env node

/**
 * Supabase MCP Server - Stdio Entry Point
 *
 * Starts the Supabase MCP server using stdio transport.
 * For HTTP+SSE transport, see http-entry.ts.
 *
 * @module mcp-servers/supabase-mcp-server
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServerInstance, loadHelpers } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
config({ path: resolve(__dirname, '../../../.env.local') });

async function main() {
  await loadHelpers();
  const server = createServerInstance();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Supabase MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
