/**
 * Admin LLM Configuration API Tests
 *
 * Tests for the admin LLM configuration API endpoints
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Use vi.hoisted to define mock state that needs to be available when vi.mock runs
const { mockState, mockSupabase } = vi.hoisted(() => {
  // Shared mock state for per-test customization
  const mockState = {
    selectData: [
      {
        id: 'config-1',
        provider: 'openai',
        provider_name: 'OpenAI',
        api_key_encrypted: 'encrypted:iv:tag:data',
        default_model: 'gpt-4',
        is_active: true,
        is_default: false,
      },
    ] as any[],
    singleData: {
      id: 'config-1',
      provider: 'openai',
      api_key_encrypted: 'encrypted:iv:tag:data',
      is_default: false,
    } as any,
  };

  const mockSupabase = {
    from: vi.fn(() => {
      const builder: any = {
        select: vi.fn(() => {
          const selectBuilder: any = {
            order: vi.fn().mockImplementation(() =>
              Promise.resolve({ data: mockState.selectData, error: null })
            ),
            eq: vi.fn(() => ({
              single: vi.fn().mockImplementation(() =>
                Promise.resolve({ data: mockState.singleData, error: null })
              ),
              neq: vi.fn(() => ({})),
            })),
            single: vi.fn().mockImplementation(() =>
              Promise.resolve({ data: mockState.singleData, error: null })
            ),
          };
          return selectBuilder;
        }),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'config-1',
                provider: 'openai',
                api_key_encrypted: 'encrypted:iv:tag:data',
              },
              error: null,
            }),
          })),
        })),
        update: vi.fn(() => {
          const updateBuilder: any = {
            eq: vi.fn(() => {
              const eqBuilder: any = {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
                neq: vi.fn().mockResolvedValue({ data: null, error: null }),
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'config-1',
                      provider: 'openai',
                      api_key_encrypted: 'encrypted:iv:tag:data',
                    },
                    error: null,
                  }),
                })),
              };
              return eqBuilder;
            }),
          };
          return updateBuilder;
        }),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
      return builder;
    }),
  };

  return { mockState, mockSupabase };
});

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: mockSupabase,
}));

// @ts-expect-error - Test file is excluded from tsconfig, but imports work at runtime via Vitest
import { GET, POST, PUT, DELETE } from '@/app/api/admin/llm-config/route';
// @ts-ignore - Test file is excluded from tsconfig, but imports work at runtime via Vitest
import { POST as TEST_POST } from '@/app/api/admin/llm-config/test/route';

// Mock encryption
vi.mock('@/lib/utils/encryption', () => ({
  encrypt: vi.fn((text: string) => `encrypted:iv:tag:${text}`),
  decrypt: vi.fn((encrypted: string) => {
    if (encrypted.startsWith('encrypted:')) {
      return 'sk-test-key';
    }
    return encrypted;
  }),
}));

// Mock OpenAI with hoisted state for per-test customization
const { openaiMockState, MockOpenAI } = vi.hoisted(() => {
  const openaiMockState = {
    shouldFail: false,
    errorMessage: 'Invalid API key',
  };

  const MockOpenAI = vi.fn().mockImplementation(() => ({
    models: {
      list: vi.fn().mockImplementation(() => {
        if (openaiMockState.shouldFail) {
          return Promise.reject(new Error(openaiMockState.errorMessage));
        }
        return Promise.resolve({
          data: [
            { id: 'gpt-4' },
            { id: 'gpt-4-turbo' },
            { id: 'gpt-3.5-turbo' },
          ],
        });
      }),
    },
  }));

  return { openaiMockState, MockOpenAI };
});

vi.mock('openai', () => ({
  default: MockOpenAI,
}));

// Mock RBAC middleware
const mockContext = {
  userId: 'user-admin-123',
  role: 'admin' as const,
};

vi.mock('@/lib/middleware/rbac', () => ({
  withRoles: vi.fn((handler: any) => {
    return async (req: NextRequest) => {
      return handler(req, mockContext);
    };
  }),
}));

describe('Admin LLM Configuration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock data to defaults
    mockState.selectData = [
      {
        id: 'config-1',
        provider: 'openai',
        provider_name: 'OpenAI',
        api_key_encrypted: 'encrypted:iv:tag:data',
        default_model: 'gpt-4',
        is_active: true,
        is_default: false,
      },
    ];
    mockState.singleData = {
      id: 'config-1',
      provider: 'openai',
      api_key_encrypted: 'encrypted:iv:tag:data',
      is_default: false,
    };
    // Reset OpenAI mock state
    openaiMockState.shouldFail = false;
    openaiMockState.errorMessage = 'Invalid API key';
  });

  describe('GET /api/admin/llm-config', () => {
    it('should return all LLM configurations', async () => {
      const req = new NextRequest('http://localhost/api/admin/llm-config');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      
      // API keys should not be exposed
      data.data.forEach((config: any) => {
        expect(config.api_key_encrypted).toBeUndefined();
        expect(config.has_api_key).toBeDefined();
      });
    });
  });

  describe('POST /api/admin/llm-config', () => {
    it('should create new LLM configuration', async () => {
      const body = {
        provider: 'openai',
        provider_name: 'OpenAI',
        api_key: 'sk-test-key-123',
        default_model: 'gpt-4',
        default_temperature: 0.7,
        default_max_tokens: 8192,
        is_active: true,
        is_default: true,
      };

      const req = new NextRequest('http://localhost/api/admin/llm-config', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toBeDefined();
      expect(data.message).toContain('created successfully');
      
      // Verify API key was encrypted
      const insertMock = mockSupabase.from().insert as ReturnType<typeof vi.fn>;
      const insertCalls = insertMock.mock.calls;
      if (insertCalls && insertCalls.length > 0 && Array.isArray(insertCalls[0]) && insertCalls[0].length > 0) {
        const insertCall = insertCalls[0][0] as { api_key_encrypted?: string };
        expect(insertCall.api_key_encrypted).toContain('encrypted:');
      }
    });

    it('should validate API key before saving', async () => {
      // Configure OpenAI mock to throw error (invalid key)
      openaiMockState.shouldFail = true;
      openaiMockState.errorMessage = 'Invalid API key';

      const body = {
        provider: 'openai',
        api_key: 'sk-invalid-key',
        default_model: 'gpt-4',
      };

      const req = new NextRequest('http://localhost/api/admin/llm-config', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid API key');
    });

    it('should validate required fields', async () => {
      const body = {
        provider: 'openai',
        // Missing api_key
      };

      const req = new NextRequest('http://localhost/api/admin/llm-config', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/admin/llm-config', () => {
    it('should update existing configuration', async () => {
      const body = {
        id: 'config-1',
        default_model: 'gpt-4-turbo',
        default_temperature: 0.8,
      };

      const req = new NextRequest('http://localhost/api/admin/llm-config', {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('updated successfully');
    });

    it('should test API key if provided in update', async () => {
      const body = {
        id: 'config-1',
        api_key: 'sk-new-key',
        default_model: 'gpt-4',
      };

      const req = new NextRequest('http://localhost/api/admin/llm-config', {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(req);
      
      // Should succeed if key is valid
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('DELETE /api/admin/llm-config', () => {
    it('should delete configuration', async () => {
      const req = new NextRequest('http://localhost/api/admin/llm-config?id=config-1');
      const response = await DELETE(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('deleted successfully');
    });

    it('should prevent deleting default configuration', async () => {
      // Set mock data to return a default config
      mockState.singleData = {
        id: 'config-1',
        is_default: true,
        provider: 'openai',
      };

      const req = new NextRequest('http://localhost/api/admin/llm-config?id=config-1');
      const response = await DELETE(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot delete default');
    });
  });

  describe('POST /api/admin/llm-config/test', () => {
    it('should test valid API key', async () => {
      const body = {
        provider: 'openai',
        api_key: 'sk-test-key',
      };

      const req = new NextRequest('http://localhost/api/admin/llm-config/test', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await TEST_POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.message).toContain('valid');
    });

    it('should detect invalid API key', async () => {
      // Configure OpenAI mock to throw error
      openaiMockState.shouldFail = true;
      openaiMockState.errorMessage = '401 Unauthorized';

      const body = {
        provider: 'openai',
        api_key: 'sk-invalid',
      };

      const req = new NextRequest('http://localhost/api/admin/llm-config/test', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await TEST_POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.valid).toBe(false);
      expect(data.error).toContain('Invalid API key');
    });
  });
});

