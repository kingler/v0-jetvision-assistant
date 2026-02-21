import { describe, it, expect, vi } from 'vitest';

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
  it('should export createServerInstance factory', async () => {
    const { createServerInstance } = await import(
      '../../../mcp-servers/supabase-mcp-server/src/server'
    );
    expect(typeof createServerInstance).toBe('function');
  });

  it('should export loadHelpers function', async () => {
    const { loadHelpers } = await import(
      '../../../mcp-servers/supabase-mcp-server/src/server'
    );
    expect(typeof loadHelpers).toBe('function');
  });

  it('should create independent server instances', async () => {
    const { createServerInstance } = await import(
      '../../../mcp-servers/supabase-mcp-server/src/server'
    );
    const server1 = createServerInstance();
    const server2 = createServerInstance();
    expect(server1).not.toBe(server2);
  });

  it('should export TOOLS array with 8 tools', async () => {
    const { TOOLS } = await import(
      '../../../mcp-servers/supabase-mcp-server/src/server'
    );
    expect(TOOLS).toHaveLength(8);
    const names = TOOLS.map((t: { name: string }) => t.name);
    expect(names).toContain('supabase_query');
    expect(names).toContain('supabase_insert');
    expect(names).toContain('supabase_count');
  });
});
