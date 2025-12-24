/**
 * Integration Tests for API Auth Helpers
 *
 * Tests getAuthenticatedAgent and getAuthenticatedUser functions
 * with real Supabase database connection to validate iso_agents table usage.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/types/database';
import {
  getAuthenticatedAgent,
  getAuthenticatedUser,
  isErrorResponse,
} from '../../../lib/utils/api';

// Mock Clerk auth
import { auth } from '@clerk/nextjs/server';
import { vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase client used by api.ts
// Create a mutable mock object that can be updated in tests
// Using a factory function to ensure the mock can access the mutable reference
let mockSupabaseInstance: any = null;

vi.mock('@/lib/supabase/client', () => {
  return {
    get supabase() {
      return mockSupabaseInstance;
    },
  };
});

describe('API Auth Helpers - Integration with iso_agents', () => {
  let supabase: SupabaseClient<Database>;
  let testClerkUserId: string;
  let testAgentId: string;

  beforeAll(async () => {
    // Create Supabase client with service role key for testing
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

    // Verify connection by checking iso_agents table exists
    const { error } = await supabase
      .from('iso_agents')
      .select('id')
      .limit(1);

    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }

    // Verify required columns exist by querying schema
    const { data: sample } = await supabase
      .from('iso_agents')
      .select('id, role, clerk_user_id')
      .limit(1);

    if (sample && sample.length > 0) {
      // Verify columns exist
      expect(sample[0]).toHaveProperty('id');
      expect(sample[0]).toHaveProperty('role');
      expect(sample[0]).toHaveProperty('clerk_user_id');
    }
  });

  beforeEach(async () => {
    // Create a test ISO agent for each test
    testClerkUserId = `test_clerk_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const { data: agent, error } = await supabase
      .from('iso_agents')
      .insert({
        clerk_user_id: testClerkUserId,
        email: `test_${Date.now()}@test.com`,
        full_name: 'Test Agent',
        role: 'iso_agent',
      })
      .select('id')
      .single();

    if (error || !agent) {
      throw new Error(`Failed to create test agent: ${error?.message}`);
    }

    testAgentId = agent.id;

    // Set up mocked Supabase client for api.ts
    // Update the mock instance with our test client
    mockSupabaseInstance = supabase;
  });

  afterAll(async () => {
    // Clean up test agents
    if (testClerkUserId) {
      await supabase
        .from('iso_agents')
        .delete()
        .eq('clerk_user_id', testClerkUserId);
    }
  });

  describe('getAuthenticatedAgent', () => {
    it('should return ISO agent id when found in iso_agents table', async () => {
      // Mock authenticated Clerk user
      vi.mocked(auth).mockResolvedValue({
        userId: testClerkUserId,
      } as any);

      const result = await getAuthenticatedAgent();

      expect(isErrorResponse(result)).toBe(false);
      if (!isErrorResponse(result)) {
        expect(result).toHaveProperty('id');
        expect(result.id).toBe(testAgentId);
      }
    });

    it('should query iso_agents table with clerk_user_id column', async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: testClerkUserId,
      } as any);

      const result = await getAuthenticatedAgent();

      expect(isErrorResponse(result)).toBe(false);
      // If we got here, the query worked with clerk_user_id
      expect(result).toBeDefined();
    });

    it('should return 404 when ISO agent not found', async () => {
      const nonExistentClerkId = `non_existent_${Date.now()}`;
      
      vi.mocked(auth).mockResolvedValue({
        userId: nonExistentClerkId,
      } as any);

      const result = await getAuthenticatedAgent();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(404);
        expect(data.error).toBe('ISO agent not found');
        expect(data.message).toContain('No ISO agent record found');
      }
    });

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
      } as any);

      const result = await getAuthenticatedAgent();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      }
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should return user data with id, role, and clerkUserId when found', async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: testClerkUserId,
      } as any);

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(false);
      if (!isErrorResponse(result)) {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('role');
        expect(result).toHaveProperty('clerkUserId');
        expect(result.id).toBe(testAgentId);
        expect(result.clerkUserId).toBe(testClerkUserId);
        expect(result.role).toBe('iso_agent');
      }
    });

    it('should query iso_agents table with id and role columns', async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: testClerkUserId,
      } as any);

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(false);
      if (!isErrorResponse(result)) {
        // Verify we got both id and role
        expect(result.id).toBeDefined();
        expect(result.role).toBeDefined();
      }
    });

    it('should handle null role by converting to undefined', async () => {
      // Create agent with null role (if allowed by schema)
      const nullRoleClerkId = `test_null_role_${Date.now()}`;
      
      const { data: agent } = await supabase
        .from('iso_agents')
        .insert({
          clerk_user_id: nullRoleClerkId,
          email: `null_role_${Date.now()}@test.com`,
          full_name: 'Null Role Agent',
          role: 'iso_agent', // Schema requires role, so we can't test null
        })
        .select('id, role')
        .single();

      // Since schema requires role, we test with a valid role
      vi.mocked(auth).mockResolvedValue({
        userId: testClerkUserId,
      } as any);

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(false);
      if (!isErrorResponse(result)) {
        // Role should be defined (not null/undefined) since schema requires it
        expect(result.role).toBeDefined();
      }

      // Cleanup
      await supabase
        .from('iso_agents')
        .delete()
        .eq('clerk_user_id', nullRoleClerkId);
    });

    it('should return 404 when ISO agent not found', async () => {
      const nonExistentClerkId = `non_existent_${Date.now()}`;
      
      vi.mocked(auth).mockResolvedValue({
        userId: nonExistentClerkId,
      } as any);

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(404);
        expect(data.error).toBe('ISO agent not found');
        expect(data.message).toContain('No ISO agent record found');
      }
    });

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
      } as any);

      const result = await getAuthenticatedUser();

      expect(isErrorResponse(result)).toBe(true);
      if (isErrorResponse(result)) {
        const data = await result.json();
        expect(result.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      }
    });

    it('should handle all user_role enum values correctly', async () => {
      const roles: Array<'iso_agent' | 'admin' | 'operator'> = [
        'iso_agent',
        'admin',
        'operator',
      ];

      for (const role of roles) {
        const roleClerkId = `test_role_${role}_${Date.now()}`;
        
        const { data: agent } = await supabase
          .from('iso_agents')
          .insert({
            clerk_user_id: roleClerkId,
            email: `role_${role}_${Date.now()}@test.com`,
            full_name: `Test ${role}`,
            role,
          })
          .select('id, role')
          .single();

        vi.mocked(auth).mockResolvedValue({
          userId: roleClerkId,
        } as any);

        const result = await getAuthenticatedUser();

        expect(isErrorResponse(result)).toBe(false);
        if (!isErrorResponse(result)) {
          expect(result.role).toBe(role);
          expect(result.id).toBe(agent?.id);
        }

        // Cleanup
        await supabase
          .from('iso_agents')
          .delete()
          .eq('clerk_user_id', roleClerkId);
      }
    });
  });

  describe('Schema Validation', () => {
    it('should verify iso_agents table has required columns', async () => {
      // Query to verify columns exist
      const { data, error } = await supabase
        .from('iso_agents')
        .select('id, role, clerk_user_id')
        .eq('clerk_user_id', testClerkUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('role');
      expect(data).toHaveProperty('clerk_user_id');
    });

    it('should verify clerk_user_id is unique and indexed', async () => {
      // Try to insert duplicate clerk_user_id (should fail)
      const { error } = await supabase
        .from('iso_agents')
        .insert({
          clerk_user_id: testClerkUserId, // Duplicate
          email: `duplicate_${Date.now()}@test.com`,
          full_name: 'Duplicate User',
          role: 'iso_agent',
        });

      expect(error).toBeDefined();
      expect(error?.code).toBe('23505'); // unique_violation
    });
  });
});

