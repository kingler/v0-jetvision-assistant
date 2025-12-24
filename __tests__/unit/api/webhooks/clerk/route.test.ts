/**
 * Tests for /api/webhooks/clerk route
 *
 * Tests webhook signature verification and user sync for Clerk events.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/webhooks/clerk/route';
import { Webhook } from 'svix';

// Mock svix
vi.mock('svix', () => ({
  Webhook: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase/client';

describe('POST /api/webhooks/clerk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  describe('Security & Validation', () => {
    it('should return 500 if webhook secret is missing', async () => {
      delete process.env.CLERK_WEBHOOK_SECRET;

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).toContain('Missing webhook secret configuration');
    });

    it('should return 400 if svix headers are missing', async () => {
      vi.mocked(headers).mockResolvedValue(new Map() as any);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(400);
      expect(text).toContain('Missing svix headers');
    });

    it('should return 400 if webhook signature verification fails', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'invalid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const mockVerify = vi.fn().mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({ type: 'user.created', data: {} }),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(400);
      expect(text).toContain('Verification failed');
    });
  });

  describe('user.created event', () => {
    it('should create user with default sales_rep role', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'clerk_user_123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'John',
          last_name: 'Doe',
          public_metadata: {},
        },
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                clerk_user_id: 'clerk_user_123',
                email: 'test@example.com',
                full_name: 'John Doe',
                role: 'sales_rep',
              },
              error: null,
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toBe('Webhook processed successfully');
      expect(mockFrom).toHaveBeenCalledWith('iso_agents');
    });

    it('should create user with admin role from public_metadata', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'clerk_admin_123',
          email_addresses: [{ email_address: 'admin@example.com' }],
          first_name: 'Admin',
          last_name: 'User',
          public_metadata: { role: 'admin' },
        },
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      let insertedRole: string = '';
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockImplementation((data: any) => {
          insertedRole = data.role;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'user-123' },
                error: null,
              }),
            }),
          };
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(insertedRole).toBe('admin');
    });

    it('should default to sales_rep for invalid role', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'clerk_user_123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'Test',
          last_name: 'User',
          public_metadata: { role: 'invalid_role' },
        },
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      let insertedRole: string = '';
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockImplementation((data: any) => {
          insertedRole = data.role;
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data, id: 'user-123' },
                error: null,
              }),
            }),
          };
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(insertedRole).toBe('sales_rep');
    });

    it('should return 400 if email is missing', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'clerk_user_123',
          email_addresses: [],
          first_name: 'Test',
          last_name: 'User',
          public_metadata: {},
        },
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(400);
      expect(text).toContain('No email address');
    });

    it('should return 500 if database insert fails', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'clerk_user_123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'Test',
          last_name: 'User',
          public_metadata: {},
        },
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).toContain('Database sync failed');
    });
  });

  describe('user.updated event', () => {
    it('should update user information', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.updated',
        data: {
          id: 'clerk_user_123',
          email_addresses: [{ email_address: 'updated@example.com' }],
          first_name: 'Updated',
          last_name: 'Name',
          public_metadata: {},
        },
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  email: 'updated@example.com',
                  full_name: 'Updated Name',
                },
                error: null,
              }),
            }),
          }),
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toBe('Webhook processed successfully');
    });

    it('should update user role from public_metadata', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.updated',
        data: {
          id: 'clerk_user_123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'Test',
          last_name: 'User',
          public_metadata: { role: 'operator' },
        },
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      let updatedRole: string | undefined;
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockImplementation((data: any) => {
          updatedRole = data.role;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...data, id: 'user-123' },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(updatedRole).toBe('operator');
    });

    it('should return 500 if database update fails', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.updated',
        data: {
          id: 'clerk_user_123',
          email_addresses: [{ email_address: 'test@example.com' }],
          first_name: 'Test',
          last_name: 'User',
          public_metadata: {},
        },
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      const mockFrom = vi.fn().mockReturnValue({
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
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).toContain('Database update failed');
    });
  });

  describe('user.deleted event', () => {
    it('should soft delete user (mark as inactive)', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.deleted',
        data: {
          id: 'clerk_user_123',
        },
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      let isActiveValue: boolean | undefined;
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockImplementation((data: any) => {
          isActiveValue = data.is_active;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'user-123', is_active: false },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toBe('Webhook processed successfully');
      expect(isActiveValue).toBe(false);
    });

    it('should return 500 if database soft delete fails', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.deleted',
        data: {
          id: 'clerk_user_123',
        },
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      const mockFrom = vi.fn().mockReturnValue({
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
      vi.mocked(supabase.from).mockImplementation(mockFrom as any);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(500);
      expect(text).toContain('Database deletion failed');
    });
  });

  describe('Unhandled events', () => {
    it('should handle unhandled event types gracefully', async () => {
      const mockHeaders = new Map([
        ['svix-id', 'msg_123'],
        ['svix-timestamp', '1234567890'],
        ['svix-signature', 'valid-signature'],
      ]);
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const webhookEvent = {
        type: 'user.session.created',
        data: {},
      };

      const mockVerify = vi.fn().mockReturnValue(webhookEvent);
      vi.mocked(Webhook).mockImplementation(() => ({
        verify: mockVerify,
      } as any));

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify(webhookEvent),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(text).toBe('Webhook processed successfully');
    });
  });
});
