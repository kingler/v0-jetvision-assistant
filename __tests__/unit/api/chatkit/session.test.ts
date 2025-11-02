/**
 * Unit Tests for ChatKit Session Endpoint
 *
 * Tests session creation, refresh, and error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { ChatKitSessionRow, SessionStatus } from '@/lib/types/chatkit';

// ============================================================================
// MOCKS
// ============================================================================

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}));

// Mock Supabase server client
const mockSupabaseServer = {
  from: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseServer)),
}));

// Mock Supabase admin client
const mockSupabaseAdmin = {
  from: vi.fn(),
};
vi.mock('@/lib/supabase/client', () => ({
  supabase: mockSupabaseAdmin,
}));

// Mock crypto
vi.mock('crypto', () => ({
  randomUUID: () => 'mock-uuid-1234',
}));

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_USER_ID = 'user_123';
const MOCK_WORKFLOW_ID = 'workflow_chatkit_test';
const MOCK_DEVICE_ID = 'device_user_123_1234567890';
const MOCK_SESSION_TOKEN = 'mock-uuid-1234';

const createMockSessionRow = (
  overrides?: Partial<ChatKitSessionRow>
): ChatKitSessionRow => {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    id: 'session_123',
    clerk_user_id: MOCK_USER_ID,
    device_id: MOCK_DEVICE_ID,
    workflow_id: MOCK_WORKFLOW_ID,
    session_token: MOCK_SESSION_TOKEN,
    status: 'active' as SessionStatus,
    expires_at: expiresAt,
    metadata: {},
    last_activity_at: now,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
};

// ============================================================================
// TEST SETUP
// ============================================================================

describe('ChatKit Session Endpoint', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set default environment variables
    process.env.CHATKIT_WORKFLOW_ID = MOCK_WORKFLOW_ID;

    // Default auth mock - authenticated user
    mockAuth.mockResolvedValue({ userId: MOCK_USER_ID });

    // Default Supabase mock for getUserRole
    mockSupabaseServer.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'sales_rep' },
            error: null,
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.CHATKIT_WORKFLOW_ID;
  });

  // ==========================================================================
  // AUTHENTICATION TESTS
  // ==========================================================================

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Mock unauthenticated user
      mockAuth.mockResolvedValue({ userId: null });

      const { POST } = await import(
        '@/app/api/chatkit/session/route'
      );

      const request = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user role is not found', async () => {
      // Mock user without role
      mockSupabaseServer.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' },
            }),
          }),
        }),
      });

      const { POST } = await import(
        '@/app/api/chatkit/session/route'
      );

      const request = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });

  // ==========================================================================
  // CONFIGURATION VALIDATION TESTS
  // ==========================================================================

  describe('Configuration Validation', () => {
    it('should return 500 if CHATKIT_WORKFLOW_ID is not configured', async () => {
      // Remove environment variable
      delete process.env.CHATKIT_WORKFLOW_ID;

      const { POST } = await import(
        '@/app/api/chatkit/session/route'
      );

      const request = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Configuration Error');
      expect(data.message).toContain('workflow ID not configured');
    });
  });

  // ==========================================================================
  // SESSION CREATION TESTS
  // ==========================================================================

  describe('Session Creation', () => {
    it('should create a new session when no active session exists', async () => {
      // Mock no existing session
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Mock session creation
      const mockSessionRow = createMockSessionRow({
        metadata: { source: 'test' },
      });
      mockSupabaseAdmin.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSessionRow,
              error: null,
            }),
          }),
        }),
      });

      const { POST } = await import(
        '@/app/api/chatkit/session/route'
      );

      const request = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({ metadata: { source: 'test' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toBeDefined();
      expect(data.session.chatKitSessionId).toBe(MOCK_SESSION_TOKEN);
      expect(data.session.userId).toBe(MOCK_USER_ID);
      expect(data.session.workflowId).toBe(MOCK_WORKFLOW_ID);
      expect(data.session.metadata).toEqual({ source: 'test' });
    });

    it('should use custom device ID when provided', async () => {
      const customDeviceId = 'custom_device_123';

      // Mock no existing session
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Mock session creation with custom device ID
      const mockSessionRow = createMockSessionRow({
        device_id: customDeviceId,
      });
      mockSupabaseAdmin.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSessionRow,
              error: null,
            }),
          }),
        }),
      });

      const { POST } = await import(
        '@/app/api/chatkit/session/route'
      );

      const request = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
        body: JSON.stringify({ deviceId: customDeviceId }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session.deviceId).toBe(customDeviceId);
    });

    it('should handle empty request body', async () => {
      // Mock no existing session
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Mock session creation
      const mockSessionRow = createMockSessionRow();
      mockSupabaseAdmin.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockSessionRow,
              error: null,
            }),
          }),
        }),
      });

      const { POST } = await import(
        '@/app/api/chatkit/session/route'
      );

      const request = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toBeDefined();
    });
  });

  // ==========================================================================
  // SESSION REUSE TESTS
  // ==========================================================================

  describe('Session Reuse', () => {
    it('should return existing session if still valid', async () => {
      // Mock existing valid session (expires in 12 hours)
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const mockSessionRow = createMockSessionRow({ expires_at: expiresAt });

      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: mockSessionRow,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const { POST } = await import(
        '@/app/api/chatkit/session/route'
      );

      const request = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session.chatKitSessionId).toBe(MOCK_SESSION_TOKEN);
    });
  });

  // ==========================================================================
  // SESSION REFRESH TESTS
  // ==========================================================================

  describe('Session Refresh', () => {
    it('should refresh session if expiring soon (within 1 hour)', async () => {
      // Mock existing session expiring in 30 minutes
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const mockSessionRow = createMockSessionRow({ expires_at: expiresAt });

      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: mockSessionRow,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Mock session refresh
      const refreshedSession = createMockSessionRow({
        session_token: 'new-mock-uuid',
      });
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: refreshedSession,
                error: null,
              }),
            }),
          }),
        }),
      });

      const { POST } = await import(
        '@/app/api/chatkit/session/route'
      );

      const request = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session.chatKitSessionId).toBe('new-mock-uuid');
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle database errors when creating session', async () => {
      // Mock no existing session
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Mock database error
      mockSupabaseAdmin.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const { POST } = await import(
        '@/app/api/chatkit/session/route'
      );

      const request = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });

    it('should handle database errors when refreshing session', async () => {
      // Mock existing session expiring soon
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const mockSessionRow = createMockSessionRow({ expires_at: expiresAt });

      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: mockSessionRow,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      // Mock database error on refresh
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      const { POST } = await import(
        '@/app/api/chatkit/session/route'
      );

      const request = new NextRequest('http://localhost:3000/api/chatkit/session', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });
  });
});
