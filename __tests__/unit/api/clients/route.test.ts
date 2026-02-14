/**
 * Tests for /api/clients route
 *
 * Tests GET, POST, and PATCH endpoints for client profile management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PATCH } from '@/app/api/clients/route';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase Admin (route uses supabaseAdmin exclusively)
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

describe('GET /api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, sessionId: null, sessionClaims: null, actor: null, has: () => false, debug: () => null });

    const request = new NextRequest('http://localhost:3000/api/clients');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if user not found', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    });
    vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/clients');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('User not found');
  });

  it('should return all clients for authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUser = { id: 'user-123' };
    const mockClients = [
      {
        id: 'client-1',
        user_id: 'user-123',
        company_name: 'Acme Corp',
        contact_name: 'John Doe',
        email: 'john@acme.com',
        created_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 'client-2',
        user_id: 'user-123',
        company_name: 'Tech Inc',
        contact_name: 'Jane Smith',
        email: 'jane@tech.com',
        created_at: '2025-01-02T00:00:00Z',
      },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'iso_agents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUser,
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'client_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockClients,
              error: null,
            }),
          }),
        };
      }
    });
    vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/clients');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.clients).toHaveLength(2);
    expect(data.clients[0].company_name).toBe('Acme Corp');
    expect(data.clients[1].email).toBe('jane@tech.com');
  });

  it('should return a specific client by client_id', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUser = { id: 'user-123' };
    const mockClient = {
      id: 'client-specific',
      user_id: 'user-123',
      company_name: 'Specific Corp',
      contact_name: 'Bob Johnson',
      email: 'bob@specific.com',
    };

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'iso_agents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUser,
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'client_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockClient],
              error: null,
            }),
          }),
        };
      }
    });
    vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/clients?client_id=client-specific');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.clients).toHaveLength(1);
    expect(data.clients[0].id).toBe('client-specific');
    expect(data.clients[0].company_name).toBe('Specific Corp');
  });
});

describe('POST /api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, sessionId: null, sessionClaims: null, actor: null, has: () => false, debug: () => null });

    const request = new NextRequest('http://localhost:3000/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        company_name: 'New Corp',
        contact_name: 'Alice Brown',
        email: 'alice@newcorp.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should create a new client successfully', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUser = { id: 'user-123' };
    const mockNewClient = {
      id: 'new-client-123',
      user_id: 'user-123',
      company_name: 'New Corp',
      contact_name: 'Alice Brown',
      email: 'alice@newcorp.com',
      created_at: new Date().toISOString(),
    };

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUser,
                error: null,
              }),
            }),
          }),
        };
      } else {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockNewClient,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        company_name: 'New Corp',
        contact_name: 'Alice Brown',
        email: 'alice@newcorp.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.client.id).toBe('new-client-123');
    expect(data.client.company_name).toBe('New Corp');
  });

  it('should create client with optional fields', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUser = { id: 'user-123' };
    const mockNewClient = {
      id: 'new-client-456',
      user_id: 'user-123',
      company_name: 'Full Corp',
      contact_name: 'Charlie Davis',
      email: 'charlie@full.com',
      phone: '+1234567890',
      preferences: { vip: true },
      notes: 'VIP client',
    };

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUser,
                error: null,
              }),
            }),
          }),
        };
      } else {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockNewClient,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        company_name: 'Full Corp',
        contact_name: 'Charlie Davis',
        email: 'charlie@full.com',
        phone: '+1234567890',
        preferences: { vip: true },
        notes: 'VIP client',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.client.phone).toBe('+1234567890');
    expect(data.client.preferences).toEqual({ vip: true });
  });
});

describe('PATCH /api/clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, sessionId: null, sessionClaims: null, actor: null, has: () => false, debug: () => null });

    const request = new NextRequest('http://localhost:3000/api/clients', {
      method: 'PATCH',
      body: JSON.stringify({
        client_id: 'client-1',
        company_name: 'Updated Corp',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should update client successfully', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUpdatedClient = {
      id: 'client-1',
      user_id: 'user-123',
      company_name: 'Updated Corp',
      contact_name: 'John Doe',
      email: 'john@updated.com',
      updated_at: new Date().toISOString(),
    };

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'iso_agents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'client_profiles') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedClient,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/clients', {
      method: 'PATCH',
      body: JSON.stringify({
        client_id: 'client-1',
        company_name: 'Updated Corp',
        email: 'john@updated.com',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.client.company_name).toBe('Updated Corp');
    expect(data.client.email).toBe('john@updated.com');
  });

  it('should update client preferences', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUpdatedClient = {
      id: 'client-1',
      preferences: { aircraftType: 'Citation X', budget: 100000 },
      updated_at: new Date().toISOString(),
    };

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'iso_agents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'client_profiles') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdatedClient,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/clients', {
      method: 'PATCH',
      body: JSON.stringify({
        client_id: 'client-1',
        preferences: { aircraftType: 'Citation X', budget: 100000 },
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.client.preferences.aircraftType).toBe('Citation X');
  });

  it('should return 500 on database error', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'iso_agents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'user-123' },
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'client_profiles') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/clients', {
      method: 'PATCH',
      body: JSON.stringify({
        client_id: 'client-1',
        company_name: 'Updated Corp',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update client');
  });
});
