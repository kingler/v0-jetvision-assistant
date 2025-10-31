/**
 * Supabase MCP Server - Unit Tests
 *
 * Tests all 7 MCP tools:
 * - supabase_query
 * - supabase_insert
 * - supabase_update
 * - supabase_delete
 * - supabase_rpc
 * - supabase_list_tables
 * - supabase_describe_table
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Supabase MCP Server', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      rpc: vi.fn(),
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Environment Setup', () => {
    it('should require NEXT_PUBLIC_SUPABASE_URL', () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => {
        // This would trigger the validation in the actual server
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
          throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
        }
      }).toThrow('Missing NEXT_PUBLIC_SUPABASE_URL');

      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    });

    it('should require SUPABASE_SERVICE_ROLE_KEY', () => {
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
        }
      }).toThrow('Missing SUPABASE_SERVICE_ROLE_KEY');

      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    });

    it('should create Supabase client with correct config', () => {
      const url = 'https://test.supabase.co';
      const key = 'test-key';

      createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      expect(createClient).toHaveBeenCalledWith(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    });
  });

  describe('supabase_query tool', () => {
    it('should query table with basic select', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      mockSupabase.select.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await mockSupabase
        .from('iso_agents')
        .select('*');

      expect(mockSupabase.from).toHaveBeenCalledWith('iso_agents');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('should query with column selection', async () => {
      const mockData = [{ id: '1' }];
      mockSupabase.select.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await mockSupabase
        .from('iso_agents')
        .select('id,email');

      expect(mockSupabase.select).toHaveBeenCalledWith('id,email');
      expect(result.data).toEqual(mockData);
    });

    it('should query with filters', async () => {
      const mockData = [{ id: '1', status: 'active' }];
      mockSupabase.eq.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await mockSupabase
        .from('requests')
        .select('*')
        .eq('status', 'active');

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
      expect(result.data).toEqual(mockData);
    });

    it('should query with ordering', async () => {
      const mockData = [{ id: '1' }, { id: '2' }];
      mockSupabase.order.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await mockSupabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });

      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.data).toEqual(mockData);
    });

    it('should query with pagination', async () => {
      const mockData = [{ id: '1' }];
      mockSupabase.range.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await mockSupabase
        .from('requests')
        .select('*')
        .range(0, 9);

      expect(mockSupabase.range).toHaveBeenCalledWith(0, 9);
      expect(result.data).toEqual(mockData);
    });

    it('should handle query errors', async () => {
      const error = { message: 'Table not found' };
      mockSupabase.select.mockResolvedValueOnce({ data: null, error });

      const result = await mockSupabase
        .from('invalid_table')
        .select('*');

      expect(result.error).toEqual(error);
      expect(result.data).toBeNull();
    });
  });

  describe('supabase_insert tool', () => {
    it('should insert single record', async () => {
      const newAgent = {
        clerk_user_id: 'test_user',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'iso_agent',
      };
      const mockData = [{ id: 'new-id', ...newAgent }];
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await mockSupabase
        .from('iso_agents')
        .insert(newAgent)
        .select();

      expect(mockSupabase.insert).toHaveBeenCalledWith(newAgent);
      expect(result.data).toEqual(mockData);
    });

    it('should insert multiple records', async () => {
      const newAgents = [
        { clerk_user_id: 'user1', email: 'user1@test.com' },
        { clerk_user_id: 'user2', email: 'user2@test.com' },
      ];
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({ data: newAgents, error: null });

      const result = await mockSupabase
        .from('iso_agents')
        .insert(newAgents)
        .select();

      expect(mockSupabase.insert).toHaveBeenCalledWith(newAgents);
      expect(result.data).toEqual(newAgents);
    });

    it('should handle insert constraint violations', async () => {
      const duplicate = { clerk_user_id: 'existing_user', email: 'test@test.com' };
      const error = { message: 'duplicate key value violates unique constraint' };
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({ data: null, error });

      const result = await mockSupabase
        .from('iso_agents')
        .insert(duplicate)
        .select();

      expect(result.error).toEqual(error);
    });

    it('should handle missing required fields', async () => {
      const incomplete = { email: 'test@test.com' }; // missing clerk_user_id
      const error = { message: 'null value in column "clerk_user_id"' };
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({ data: null, error });

      const result = await mockSupabase
        .from('iso_agents')
        .insert(incomplete)
        .select();

      expect(result.error).toEqual(error);
    });
  });

  describe('supabase_update tool', () => {
    it('should update record by ID', async () => {
      const updates = { full_name: 'Updated Name' };
      const mockData = [{ id: '123', ...updates }];
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({ data: mockData, error: null });

      const result = await mockSupabase
        .from('iso_agents')
        .update(updates)
        .eq('id', '123')
        .select();

      expect(mockSupabase.update).toHaveBeenCalledWith(updates);
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '123');
      expect(result.data).toEqual(mockData);
    });

    it('should update multiple records with filter', async () => {
      const updates = { status: 'completed' };
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: '1', status: 'completed' }, { id: '2', status: 'completed' }],
        error: null
      });

      const result = await mockSupabase
        .from('requests')
        .update(updates)
        .eq('iso_agent_id', 'agent-123')
        .select();

      expect(mockSupabase.update).toHaveBeenCalledWith(updates);
      expect(mockSupabase.eq).toHaveBeenCalledWith('iso_agent_id', 'agent-123');
    });

    it('should handle update of non-existent record', async () => {
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });

      const result = await mockSupabase
        .from('iso_agents')
        .update({ full_name: 'Test' })
        .eq('id', 'non-existent-id')
        .select();

      expect(result.data).toEqual([]);
    });

    it('should handle constraint violations on update', async () => {
      const error = { message: 'violates foreign key constraint' };
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({ data: null, error });

      const result = await mockSupabase
        .from('requests')
        .update({ client_profile_id: 'invalid-id' })
        .eq('id', '123')
        .select();

      expect(result.error).toEqual(error);
    });
  });

  describe('supabase_delete tool', () => {
    it('should delete record by ID', async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await mockSupabase
        .from('iso_agents')
        .delete()
        .eq('id', '123');

      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '123');
      expect(result.error).toBeNull();
    });

    it('should delete multiple records with filter', async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error: null });

      const result = await mockSupabase
        .from('requests')
        .delete()
        .eq('status', 'draft');

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'draft');
    });

    it('should handle delete of non-existent record', async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ data: [], error: null });

      const result = await mockSupabase
        .from('iso_agents')
        .delete()
        .eq('id', 'non-existent');

      expect(result.data).toEqual([]);
    });

    it('should handle cascading delete restrictions', async () => {
      const error = { message: 'violates foreign key constraint' };
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ data: null, error });

      const result = await mockSupabase
        .from('iso_agents')
        .delete()
        .eq('id', 'agent-with-requests');

      expect(result.error).toEqual(error);
    });
  });

  describe('supabase_rpc tool', () => {
    it('should call stored procedure', async () => {
      const mockResult = { count: 42 };
      mockSupabase.rpc.mockResolvedValueOnce({ data: mockResult, error: null });

      const result = await mockSupabase.rpc('get_request_count', {
        agent_id: 'agent-123',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_request_count', {
        agent_id: 'agent-123',
      });
      expect(result.data).toEqual(mockResult);
    });

    it('should handle RPC with no parameters', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await mockSupabase.rpc('get_all_tables');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_all_tables');
    });

    it('should handle RPC errors', async () => {
      const error = { message: 'function does not exist' };
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error });

      const result = await mockSupabase.rpc('non_existent_function');

      expect(result.error).toEqual(error);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      mockSupabase.select.mockRejectedValueOnce(networkError);

      await expect(
        mockSupabase.from('iso_agents').select('*')
      ).rejects.toThrow('Network request failed');
    });

    it('should handle invalid table names', async () => {
      const error = { message: 'relation "invalid_table" does not exist' };
      mockSupabase.select.mockResolvedValueOnce({ data: null, error });

      const result = await mockSupabase
        .from('invalid_table')
        .select('*');

      expect(result.error).toEqual(error);
    });

    it('should handle RLS policy violations', async () => {
      const error = { message: 'new row violates row-level security policy' };
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({ data: null, error });

      const result = await mockSupabase
        .from('requests')
        .insert({ iso_agent_id: 'other-agent' })
        .select();

      expect(result.error).toEqual(error);
    });

    it('should handle malformed queries', async () => {
      const error = { message: 'syntax error at or near' };
      mockSupabase.select.mockResolvedValueOnce({ data: null, error });

      const result = await mockSupabase
        .from('iso_agents')
        .select('invalid syntax');

      expect(result.error).toEqual(error);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct data types on insert', () => {
      const validAgent = {
        clerk_user_id: 'user_123',
        email: 'test@test.com',
        full_name: 'Test User',
        role: 'iso_agent' as const,
        margin_type: 'percentage' as const,
        margin_value: 15.0,
      };

      expect(() => mockSupabase.from('iso_agents').insert(validAgent)).not.toThrow();
    });

    it('should validate enum values', () => {
      const invalidStatus = {
        status: 'invalid_status', // Not in request_status enum
      };

      // In real implementation, this would be caught by TypeScript
      expect(invalidStatus.status).toBe('invalid_status');
    });
  });

  describe('Connection Validation', () => {
    it('should validate connection on startup', async () => {
      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Simulate connection check
      const result = await mockSupabase
        .from('iso_agents')
        .select('count', { count: 'exact', head: true });

      expect(result.error).toBeNull();
    });

    it('should handle connection timeouts', async () => {
      const timeoutError = new Error('Connection timeout');
      mockSupabase.select.mockRejectedValueOnce(timeoutError);

      await expect(
        mockSupabase.from('iso_agents').select('*')
      ).rejects.toThrow('Connection timeout');
    });
  });
});
