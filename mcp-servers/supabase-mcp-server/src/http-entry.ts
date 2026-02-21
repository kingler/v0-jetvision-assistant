/**
 * Supabase MCP Server - HTTP+SSE Entry Point
 *
 * Runs the Supabase MCP server as a standalone HTTP service using
 * StreamableHTTPServerTransport in stateless mode.
 *
 * For stdio transport, see index.ts.
 *
 * @module mcp-servers/supabase-mcp-server/http-entry
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response, NextFunction } from 'express';
import { createServerInstance, loadHelpers } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
config({ path: resolve(__dirname, '../../../.env.local') });

const DEFAULT_PORT = 3100;

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.MCP_AUTH_DISABLED === 'true') {
    next();
    return;
  }

  const token = process.env.MCP_AUTH_TOKEN;
  if (!token) {
    // No token configured — skip auth
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: missing or invalid Authorization header' });
    return;
  }

  const providedToken = authHeader.slice(7);
  if (providedToken !== token) {
    res.status(401).json({ error: 'Unauthorized: invalid token' });
    return;
  }

  next();
}

// ============================================================================
// EXPRESS APP
// ============================================================================

export const app = createMcpExpressApp();

// Apply auth middleware to /mcp route
app.use('/mcp', authMiddleware);

// POST /mcp — Stateless MCP request handler
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    // Create fresh server + transport per request (stateless mode)
    const server = createServerInstance();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
    });

    // Connect server to transport
    await server.connect(transport);

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('[supabase-http] Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
});

// GET /mcp — Not supported in stateless mode
app.get('/mcp', (_req: Request, res: Response) => {
  res.status(405).json({
    error: 'Method Not Allowed. Use POST for MCP requests in stateless mode.',
  });
});

// DELETE /mcp — Not supported in stateless mode
app.delete('/mcp', (_req: Request, res: Response) => {
  res.status(405).json({
    error: 'Method Not Allowed. Session management not supported in stateless mode.',
  });
});

// ============================================================================
// SERVER STARTUP (only when run directly, not imported for testing)
// ============================================================================

async function main(): Promise<void> {
  await loadHelpers();

  const port = parseInt(process.env.MCP_SUPABASE_PORT || String(DEFAULT_PORT), 10);

  app.listen(port, () => {
    console.error(`Supabase MCP HTTP server listening on http://127.0.0.1:${port}/mcp`);
  });
}

// Only start server when run directly (not imported by tests)
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('http-entry.ts') || process.argv[1].endsWith('http-entry.js'));

if (isMainModule) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
