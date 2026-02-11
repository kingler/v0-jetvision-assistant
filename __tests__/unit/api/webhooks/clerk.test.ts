import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/clerk/route';

// Track calls to insert/update so we can inspect the role being sent to the DB
const mockInsert = vi.fn(() => ({
  select: vi.fn(() => ({
    single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
  })),
}));

const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
    })),
  })),
}));

// Mock dependencies
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: mockInsert,
      update: mockUpdate,
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

  describe('Role Validation (DB enum alignment)', () => {
    // The DB enum is: CREATE TYPE user_role AS ENUM ('iso_agent', 'admin', 'operator');
    // The webhook MUST only use these values or Postgres will reject the insert.
    const DB_VALID_ROLES = ['iso_agent', 'admin', 'operator'] as const;

    it('should default to iso_agent when no role is specified in metadata', async () => {
      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {
            id: 'clerk_user_no_role',
            email_addresses: [{ email_address: 'norole@example.com' }],
            first_name: 'No',
            last_name: 'Role',
            // No public_metadata.role — should default to 'iso_agent'
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

      // Verify the role sent to Supabase is 'iso_agent', not 'sales_rep'
      expect(mockInsert).toHaveBeenCalledOnce();
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.role).toBe('iso_agent');
    });

    it('should reject sales_rep as an invalid role and use iso_agent instead', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {
            id: 'clerk_user_salesrep',
            email_addresses: [{ email_address: 'salesrep@example.com' }],
            first_name: 'Sales',
            last_name: 'Rep',
            public_metadata: { role: 'sales_rep' },
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

      // sales_rep is NOT a valid DB enum value; should fall back to iso_agent
      expect(mockInsert).toHaveBeenCalledOnce();
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.role).toBe('iso_agent');

      // Should have warned about invalid role
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('sales_rep'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('defaulting to iso_agent'),
      );

      warnSpy.mockRestore();
    });

    it('should reject customer as an invalid role and use iso_agent instead', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {
            id: 'clerk_user_customer',
            email_addresses: [{ email_address: 'customer@example.com' }],
            first_name: 'Some',
            last_name: 'Customer',
            public_metadata: { role: 'customer' },
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

      // customer is NOT a valid DB enum value; should fall back to iso_agent
      expect(mockInsert).toHaveBeenCalledOnce();
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.role).toBe('iso_agent');

      warnSpy.mockRestore();
    });

    it('should accept admin as a valid role from metadata', async () => {
      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {
            id: 'clerk_user_admin',
            email_addresses: [{ email_address: 'admin@example.com' }],
            first_name: 'Admin',
            last_name: 'User',
            public_metadata: { role: 'admin' },
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

      expect(mockInsert).toHaveBeenCalledOnce();
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.role).toBe('admin');
    });

    it('should accept operator as a valid role from metadata', async () => {
      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {
            id: 'clerk_user_operator',
            email_addresses: [{ email_address: 'operator@example.com' }],
            first_name: 'Operator',
            last_name: 'User',
            public_metadata: { role: 'operator' },
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

      expect(mockInsert).toHaveBeenCalledOnce();
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.role).toBe('operator');
    });

    it('should accept iso_agent as a valid role from metadata', async () => {
      const mockRequest = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({
          type: 'user.created',
          data: {
            id: 'clerk_user_isoagent',
            email_addresses: [{ email_address: 'isoagent@example.com' }],
            first_name: 'ISO',
            last_name: 'Agent',
            public_metadata: { role: 'iso_agent' },
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

      expect(mockInsert).toHaveBeenCalledOnce();
      const insertArg = mockInsert.mock.calls[0][0];
      expect(insertArg.role).toBe('iso_agent');
    });

    it('should only allow roles that match the DB user_role enum', () => {
      // This is a static assertion test to document the contract
      // DB enum: CREATE TYPE user_role AS ENUM ('iso_agent', 'admin', 'operator');
      expect(DB_VALID_ROLES).toEqual(['iso_agent', 'admin', 'operator']);
      expect(DB_VALID_ROLES).not.toContain('sales_rep');
      expect(DB_VALID_ROLES).not.toContain('customer');
    });
  });
});
