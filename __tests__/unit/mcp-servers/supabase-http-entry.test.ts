import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';

// Mock supabase mcp-helpers
vi.mock('../../../lib/supabase/mcp-helpers', () => ({
  queryTable: vi.fn(),
  insertRow: vi.fn(),
  updateRow: vi.fn(),
  deleteRow: vi.fn(),
  callRpc: vi.fn(),
  listTables: vi.fn(() => ['clients', 'requests']),
  describeTable: vi.fn(),
  countRows: vi.fn(),
}));

const MCP_INIT_REQUEST = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0.0' },
  },
};

describe('Supabase MCP HTTP Server', () => {
  let app: any;

  beforeAll(async () => {
    // Disable auth for basic tests
    process.env.MCP_AUTH_DISABLED = 'true';
    const mod = await import(
      '../../../mcp-servers/supabase-mcp-server/src/http-entry'
    );
    app = mod.app;
  });

  it('should respond to POST /mcp with MCP protocol', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .send(MCP_INIT_REQUEST);
    expect(res.status).toBe(200);
  });

  it('should reject GET /mcp with 405', async () => {
    const res = await request(app).get('/mcp');
    expect(res.status).toBe(405);
  });

  it('should reject DELETE /mcp with 405', async () => {
    const res = await request(app).delete('/mcp');
    expect(res.status).toBe(405);
  });
});

describe('Auth middleware', () => {
  let app: any;

  beforeAll(async () => {
    const mod = await import(
      '../../../mcp-servers/supabase-mcp-server/src/http-entry'
    );
    app = mod.app;
  });

  beforeEach(() => {
    // Enable auth with a known token
    delete process.env.MCP_AUTH_DISABLED;
    process.env.MCP_AUTH_TOKEN = 'test-secret-token';
  });

  afterEach(() => {
    // Reset to disabled auth
    process.env.MCP_AUTH_DISABLED = 'true';
    delete process.env.MCP_AUTH_TOKEN;
  });

  it('should reject requests without auth token when auth enabled', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .send(MCP_INIT_REQUEST);
    expect(res.status).toBe(401);
  });

  it('should accept requests with valid auth token', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set('Authorization', 'Bearer test-secret-token')
      .send(MCP_INIT_REQUEST);
    expect(res.status).toBe(200);
  });

  it('should reject requests with invalid auth token', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set('Authorization', 'Bearer wrong-token')
      .send(MCP_INIT_REQUEST);
    expect(res.status).toBe(401);
  });

  it('should reject requests with malformed auth header', async () => {
    const res = await request(app)
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set('Authorization', 'Basic dXNlcjpwYXNz')
      .send(MCP_INIT_REQUEST);
    expect(res.status).toBe(401);
  });
});
