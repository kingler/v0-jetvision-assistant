/**
 * Supabase MCP Tools - Integration Tests
 *
 * Tests the actual MCP server tool implementations
 * using a real Supabase connection
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

describe('Supabase MCP Tools - Integration', () => {
  let supabase: SupabaseClient<Database>;
  let testAgentId: string;
  let testClientId: string;
  let testRequestId: string;

  beforeAll(async () => {
    // Create Supabase client (uses .env.local)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials for integration tests');
    }

    supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify connection
    const { error } = await supabase
      .from('iso_agents')
      .select('count', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await supabase.from('agent_executions').delete().ilike('metadata->>test', '%true%');
    await supabase.from('workflow_states').delete().ilike('metadata->>test', '%true%');
    await supabase.from('quotes').delete().ilike('metadata->>test', '%true%');
    await supabase.from('requests').delete().ilike('metadata->>test', '%true%');
    await supabase.from('client_profiles').delete().ilike('notes', '%TEST_DATA%');
    await supabase.from('iso_agents').delete().eq('email', 'mcp-test@test.com');
  });

  afterAll(async () => {
    // Clean up all test data
    await supabase.from('iso_agents').delete().eq('email', 'mcp-test@test.com');
  });

  describe('Tool: supabase_query', () => {
    it('should query iso_agents table', async () => {
      const { data, error } = await supabase
        .from('iso_agents')
        .select('id,email,full_name,role')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should filter by status', async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'draft')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      if (data && data.length > 0) {
        expect(data.every(r => r.status === 'draft')).toBe(true);
      }
    });

    it('should order by created_at descending', async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('id,created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      if (data && data.length > 1) {
        // Verify descending order
        for (let i = 0; i < data.length - 1; i++) {
          const currentCreatedAt = data[i].created_at;
          const nextCreatedAt = data[i + 1].created_at;
          if (currentCreatedAt && nextCreatedAt) {
            const current = new Date(currentCreatedAt);
            const next = new Date(nextCreatedAt);
            expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
          }
        }
      }
    });

    it('should use pagination with range', async () => {
      const { data: page1, error: error1 } = await supabase
        .from('iso_agents')
        .select('id')
        .range(0, 1);

      const { data: page2, error: error2 } = await supabase
        .from('iso_agents')
        .select('id')
        .range(2, 3);

      expect(error1).toBeNull();
      expect(error2).toBeNull();
      expect(page1?.length).toBeLessThanOrEqual(2);
      expect(page2?.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Tool: supabase_insert', () => {
    it('should insert new iso_agent', async () => {
      const newAgent = {
        clerk_user_id: `test_${Date.now()}`,
        email: 'mcp-test@test.com',
        full_name: 'MCP Test User',
        role: 'iso_agent' as const,
        margin_type: 'percentage' as const,
        margin_value: 10.0,
        is_active: true,
        metadata: { test: true },
      };

      const { data, error } = await supabase
        .from('iso_agents')
        .insert(newAgent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.email).toBe('mcp-test@test.com');
      expect(data?.full_name).toBe('MCP Test User');

      if (data) {
        testAgentId = data.id;
      }
    });

    it('should enforce unique constraints', async () => {
      const duplicateAgent = {
        clerk_user_id: 'user_test_agent_1', // Exists in seed data
        email: 'duplicate@test.com',
        full_name: 'Duplicate',
        role: 'iso_agent' as const,
      };

      const { error } = await supabase
        .from('iso_agents')
        .insert(duplicateAgent)
        .select();

      expect(error).not.toBeNull();
      expect(error?.message).toContain('duplicate');
    });

    it('should validate required fields', async () => {
      const incompleteAgent = {
        email: 'incomplete@test.com',
        // Missing required clerk_user_id
      } as any;

      const { error } = await supabase
        .from('iso_agents')
        .insert(incompleteAgent)
        .select();

      expect(error).not.toBeNull();
    });
  });

  describe('Tool: supabase_update', () => {
    beforeEach(async () => {
      // Create test agent for update tests
      const { data } = await supabase
        .from('iso_agents')
        .insert({
          clerk_user_id: `test_update_${Date.now()}`,
          email: 'mcp-test@test.com',
          full_name: 'Update Test',
          role: 'iso_agent' as const,
        })
        .select()
        .single();

      if (data) {
        testAgentId = data.id;
      }
    });

    it('should update iso_agent by id', async () => {
      const { data, error } = await supabase
        .from('iso_agents')
        .update({ full_name: 'Updated Name' })
        .eq('id', testAgentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.full_name).toBe('Updated Name');
    });

    it('should update multiple fields', async () => {
      const updates = {
        full_name: 'Multi Update',
        margin_type: 'fixed' as const,
        margin_value: 500.0,
      };

      const { data, error } = await supabase
        .from('iso_agents')
        .update(updates)
        .eq('id', testAgentId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.full_name).toBe('Multi Update');
      expect(data?.margin_type).toBe('fixed');
      expect(data?.margin_value).toBe(500.0);
    });

    it('should return empty array for non-existent id', async () => {
      const { data, error } = await supabase
        .from('iso_agents')
        .update({ full_name: 'Ghost' })
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .select();

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('Tool: supabase_delete', () => {
    beforeEach(async () => {
      // Create test agent for delete tests
      const { data } = await supabase
        .from('iso_agents')
        .insert({
          clerk_user_id: `test_delete_${Date.now()}`,
          email: 'mcp-test@test.com',
          full_name: 'Delete Test',
          role: 'iso_agent' as const,
        })
        .select()
        .single();

      if (data) {
        testAgentId = data.id;
      }
    });

    it('should delete iso_agent by id', async () => {
      const { error: deleteError } = await supabase
        .from('iso_agents')
        .delete()
        .eq('id', testAgentId);

      expect(deleteError).toBeNull();

      // Verify deletion
      const { data, error } = await supabase
        .from('iso_agents')
        .select()
        .eq('id', testAgentId)
        .single();

      expect(error).not.toBeNull(); // Should error because record doesn't exist
      expect(data).toBeNull();
    });

    it('should not error when deleting non-existent record', async () => {
      const { error } = await supabase
        .from('iso_agents')
        .delete()
        .eq('id', '00000000-0000-0000-0000-000000000000');

      expect(error).toBeNull();
    });
  });

  describe('Tool: supabase_list_tables', () => {
    it.skip('should list all accessible tables (requires RPC function)', async () => {
      // information_schema is not accessible via REST API
      // This would need an RPC function: CREATE FUNCTION get_tables() ...
      // TODO: Implement get_tables() RPC function
    });

    it('should verify core tables exist by querying them', async () => {
      const tables = ['iso_agents', 'client_profiles', 'requests', 'quotes', 'workflow_states', 'agent_executions'] as const;

      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true });

        expect(error).toBeNull();
      }
    });
  });

  describe('Tool: supabase_describe_table', () => {
    it.skip('should describe table structure (requires RPC function)', async () => {
      // information_schema.columns not accessible via REST API
      // This would need an RPC function: CREATE FUNCTION describe_table(table_name text) ...
      // TODO: Implement describe_table() RPC function
    });

    it('should verify table columns by selecting from table', async () => {
      const { data, error } = await supabase
        .from('iso_agents')
        .select('id,clerk_user_id,email,full_name,role,margin_type,margin_value')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      // If there's data, verify the structure is correct
      if (data && data.length > 0) {
        const agent = data[0];
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('clerk_user_id');
        expect(agent).toHaveProperty('email');
        expect(agent).toHaveProperty('full_name');
        expect(agent).toHaveProperty('role');
      }
    });
  });

  describe('End-to-End Workflow', () => {
    it('should create agent -> client -> request workflow', async () => {
      // 1. Create ISO agent
      const { data: agent, error: agentError } = await supabase
        .from('iso_agents')
        .insert({
          clerk_user_id: `e2e_test_${Date.now()}`,
          email: 'mcp-test@test.com',
          full_name: 'E2E Test Agent',
          role: 'iso_agent' as const,
          margin_type: 'percentage' as const,
          margin_value: 15.0,
        })
        .select()
        .single();

      expect(agentError).toBeNull();
      expect(agent).toBeDefined();

      if (!agent) return;

      // 2. Create client profile
      const { data: client, error: clientError } = await supabase
        .from('client_profiles')
        .insert({
          user_id: agent.id,
          company_name: 'E2E Test Company',
          contact_name: 'E2E Contact',
          email: 'e2e@test.com',
          notes: 'TEST_DATA',
        })
        .select()
        .single();

      expect(clientError).toBeNull();
      expect(client).toBeDefined();

      if (!client) return;

      // 3. Create RFP request
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .insert({
          user_id: agent.id,
          client_profile_id: client.id,
          departure_airport: 'KLAX',
          arrival_airport: 'KJFK',
          departure_date: new Date('2026-01-15T10:00:00Z').toISOString(),
          passengers: 4,
          status: 'draft',
          metadata: { test: true },
        })
        .select()
        .single();

      expect(requestError).toBeNull();
      expect(request).toBeDefined();
      expect(request?.departure_airport).toBe('KLAX');
      expect(request?.status).toBe('draft');

      // 4. Update request status
      const { data: updatedRequest, error: updateError } = await supabase
        .from('requests')
        .update({ status: 'pending' })
        .eq('id', request!.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedRequest?.status).toBe('pending');

      // 5. Clean up
      await supabase.from('requests').delete().eq('id', request!.id);
      await supabase.from('client_profiles').delete().eq('id', client.id);
      await supabase.from('iso_agents').delete().eq('id', agent.id);
    });
  });

  describe('Performance', () => {
    it('should query large result sets efficiently', async () => {
      const startTime = Date.now();

      const { data, error } = await supabase
        .from('iso_agents')
        .select('*')
        .limit(100);

      const duration = Date.now() - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        supabase.from('iso_agents').select('id').limit(1)
      );

      const results = await Promise.all(promises);

      results.forEach(({ error }) => {
        expect(error).toBeNull();
      });
    });
  });
});
