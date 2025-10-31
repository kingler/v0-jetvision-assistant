import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/clerk/route';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('svix', () => ({
  Webhook: vi.fn(() => ({
    verify: vi.fn((body) => {
      // Parse and return the body as the verified event
      return JSON.parse(body);
    }),
  })),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      const headers: Record<string, string> = {
        'svix-id': 'test-id',
        'svix-timestamp': '1234567890',
        'svix-signature': 'test-signature',
      };
      return headers[key];
    }),
  })),
}));

describe('Clerk Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variable
    process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  describe('POST /api/webhooks/clerk', () => {
    it('should create a user in Supabase when user.created event is received', async () => {
      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {
            id: 'clerk_user_123',
            email_addresses: [{ email_address: 'test@example.com' }],
            first_name: 'John',
            last_name: 'Doe',
          },
        }),
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'test-signature',
        },
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);

      const text = await response.text();
      expect(text).toBe('Webhook processed successfully');
    });

    it('should update a user in Supabase when user.updated event is received', async () => {
      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.updated',
          data: {
            id: 'clerk_user_123',
            email_addresses: [{ email_address: 'updated@example.com' }],
            first_name: 'Jane',
            last_name: 'Smith',
          },
        }),
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'test-signature',
        },
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should soft-delete a user when user.deleted event is received', async () => {
      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.deleted',
          data: {
            id: 'clerk_user_123',
          },
        }),
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'test-signature',
        },
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should return 400 if svix headers are missing', async () => {
      vi.mocked((await import('next/headers')).headers).mockReturnValueOnce({
        get: vi.fn(() => null),
      } as any);

      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: {} }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);

      const text = await response.text();
      expect(text).toContain('Missing svix headers');
    });

    it('should return 500 if CLERK_WEBHOOK_SECRET is missing', async () => {
      delete process.env.CLERK_WEBHOOK_SECRET;

      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: {} }),
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(500);

      const text = await response.text();
      expect(text).toContain('Missing webhook secret');
    });

    it('should return 400 if user has no email address', async () => {
      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {
            id: 'clerk_user_123',
            email_addresses: [],
            first_name: 'John',
            last_name: 'Doe',
          },
        }),
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'test-signature',
        },
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(400);

      const text = await response.text();
      expect(text).toContain('No email address');
    });

    it('should handle unhandled event types gracefully', async () => {
      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'session.created',
          data: {},
        }),
        headers: {
          'svix-id': 'test-id',
          'svix-timestamp': '1234567890',
          'svix-signature': 'test-signature',
        },
      });

      const response = await POST(mockRequest);
      expect(response.status).toBe(200);
    });
  });
});
