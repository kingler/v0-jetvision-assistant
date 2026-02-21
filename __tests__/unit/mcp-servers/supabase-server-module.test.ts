import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock supabase mcp-helpers before import
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

describe('Supabase MCP Server Module', () => {
  let serverModule: typeof import('../../../mcp-servers/supabase-mcp-server/src/server');

  beforeAll(async () => {
    serverModule = await import(
      '../../../mcp-servers/supabase-mcp-server/src/server'
    );
  }, 30_000);

  it('should export createServerInstance factory', () => {
    expect(typeof serverModule.createServerInstance).toBe('function');
  });

  it('should export loadHelpers function', () => {
    expect(typeof serverModule.loadHelpers).toBe('function');
  });

  it('should create independent server instances', () => {
    const server1 = serverModule.createServerInstance();
    const server2 = serverModule.createServerInstance();
    expect(server1).not.toBe(server2);
  });

  it('should export TOOLS array with 8 tools', () => {
    expect(serverModule.TOOLS).toHaveLength(8);
    const names = serverModule.TOOLS.map((t: { name: string }) => t.name);
    expect(names).toContain('supabase_query');
    expect(names).toContain('supabase_insert');
    expect(names).toContain('supabase_count');
  });
});
