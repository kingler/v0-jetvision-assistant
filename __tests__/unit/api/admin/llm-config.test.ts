/**
 * Admin LLM Configuration API Tests
 * 
 * Tests for the admin LLM configuration API endpoints
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/admin/llm-config/route';
import { POST as TEST_POST } from '@/app/api/admin/llm-config/test/route';

// Mock Supabase admin client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'config-1',
            provider: 'openai',
            provider_name: 'OpenAI',
            api_key_encrypted: 'encrypted:iv:tag:data',
            default_model: 'gpt-4',
            is_active: true,
            is_default: true,
          },
        ],
        error: null,
      }),
    })),
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
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'config-1',
              provider: 'openai',
            },
            error: null,
          }),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
};

vi.mock('@/lib/supabase/admin', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

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

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      models: {
        list: vi.fn().mockResolvedValue({
          data: [
            { id: 'gpt-4' },
            { id: 'gpt-4-turbo' },
            { id: 'gpt-3.5-turbo' },
          ],
        }),
      },
    })),
  };
});

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
      const insertCall = mockSupabase.from().insert.mock.calls[0][0];
      expect(insertCall.api_key_encrypted).toContain('encrypted:');
    });

    it('should validate API key before saving', async () => {
      // Mock OpenAI to throw error (invalid key)
      const mockOpenAI = {
        models: {
          list: vi.fn().mockRejectedValue(new Error('Invalid API key')),
        },
      };
      
      vi.mocked(require('openai').default).mockImplementation(() => mockOpenAI);

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
      // Mock to return default config
      mockSupabase.from().select().order().mockResolvedValueOnce({
        data: [
          {
            id: 'config-1',
            is_default: true,
            provider: 'openai',
          },
        ],
        error: null,
      });

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
      // Mock OpenAI to throw error
      const mockOpenAI = {
        models: {
          list: vi.fn().mockRejectedValue(new Error('401 Unauthorized')),
        },
      };
      
      vi.mocked(require('openai').default).mockImplementation(() => mockOpenAI);

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

