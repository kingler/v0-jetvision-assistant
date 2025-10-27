/**
 * Tests for /api/quotes route
 *
 * Tests GET endpoint for listing quotes and PATCH endpoint for updating quote status.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/quotes/route';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

describe('GET /api/quotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, sessionId: null, sessionClaims: null, actor: null, has: () => false, debug: () => null });

    const request = new NextRequest('http://localhost:3000/api/quotes');
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
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/quotes');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('User not found');
  });

  it('should return all quotes for authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUser = { id: 'user-123' };
    const mockQuotes = [
      {
        id: 'quote-1',
        request_id: 'req-1',
        operator_name: 'Operator A',
        aircraft_type: 'Citation X',
        price: 50000,
        currency: 'USD',
        status: 'received',
      },
      {
        id: 'quote-2',
        request_id: 'req-1',
        operator_name: 'Operator B',
        aircraft_type: 'Gulfstream G650',
        price: 75000,
        currency: 'USD',
        status: 'received',
      },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
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
      } else if (table === 'quotes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockQuotes,
              error: null,
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/quotes');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toHaveLength(2);
    expect(data.quotes[0].operator_name).toBe('Operator A');
    expect(data.quotes[1].price).toBe(75000);
  });

  it('should filter quotes by request_id', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUser = { id: 'user-123' };
    const mockQuotes = [
      {
        id: 'quote-1',
        request_id: 'req-specific',
        operator_name: 'Operator A',
        price: 50000,
      },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
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
      } else if (table === 'quotes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockQuotes,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/quotes?request_id=req-specific');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toHaveLength(1);
    expect(data.quotes[0].request_id).toBe('req-specific');
  });

  it('should filter quotes by status', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUser = { id: 'user-123' };
    const mockQuotes = [
      {
        id: 'quote-1',
        status: 'accepted',
        operator_name: 'Operator A',
      },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
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
      } else if (table === 'quotes') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockQuotes,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/quotes?status=accepted');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quotes).toHaveLength(1);
    expect(data.quotes[0].status).toBe('accepted');
  });
});

describe('PATCH /api/quotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, sessionId: null, sessionClaims: null, actor: null, has: () => false, debug: () => null });

    const request = new NextRequest('http://localhost:3000/api/quotes', {
      method: 'PATCH',
      body: JSON.stringify({
        quote_id: 'quote-1',
        status: 'accepted',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should update quote status successfully', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUser = { id: 'user-123' };
    const mockUpdatedQuote = {
      id: 'quote-1',
      request_id: 'req-1',
      operator_name: 'Operator A',
      status: 'accepted',
      updated_at: new Date().toISOString(),
    };

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
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
      } else if (table === 'quotes') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockUpdatedQuote,
                  error: null,
                }),
              }),
            }),
          }),
        };
      } else if (table === 'requests') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: { id: 'req-1', status: 'completed' },
              error: null,
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/quotes', {
      method: 'PATCH',
      body: JSON.stringify({
        quote_id: 'quote-1',
        status: 'accepted',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quote.status).toBe('accepted');
    expect(data.quote.id).toBe('quote-1');
  });

  it('should update quote with notes', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUser = { id: 'user-123' };
    const mockUpdatedQuote = {
      id: 'quote-1',
      status: 'rejected',
      notes: 'Aircraft not suitable',
      updated_at: new Date().toISOString(),
    };

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
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
      } else if (table === 'quotes') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockUpdatedQuote,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/quotes', {
      method: 'PATCH',
      body: JSON.stringify({
        quote_id: 'quote-1',
        status: 'rejected',
        notes: 'Aircraft not suitable',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quote.status).toBe('rejected');
    expect(data.quote.notes).toBe('Aircraft not suitable');
  });

  it('should auto-complete request when quote is accepted', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockUser = { id: 'user-123' };
    const mockUpdatedQuote = {
      id: 'quote-1',
      request_id: 'req-1',
      status: 'accepted',
    };

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1 && table === 'users') {
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
      } else if (callCount === 2 && table === 'quotes') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockUpdatedQuote,
                  error: null,
                }),
              }),
            }),
          }),
        };
      } else if (table === 'requests') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: { id: 'req-1', status: 'completed' },
              error: null,
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/quotes', {
      method: 'PATCH',
      body: JSON.stringify({
        quote_id: 'quote-1',
        status: 'accepted',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quote.status).toBe('accepted');
    // Verify supabase.from was called for both quotes and requests
    expect(mockFrom).toHaveBeenCalledWith('quotes');
    expect(mockFrom).toHaveBeenCalledWith('requests');
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

    const mockUser = { id: 'user-123' };
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
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
      } else if (table === 'quotes') {
        return {
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
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/quotes', {
      method: 'PATCH',
      body: JSON.stringify({
        quote_id: 'quote-1',
        status: 'accepted',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to update quote');
  });
});
