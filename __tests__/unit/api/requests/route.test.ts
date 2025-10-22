/**
 * Tests for /api/requests route
 *
 * Tests both GET and POST endpoints with authentication,
 * validation, and database interactions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/requests/route';

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

// Mock AgentFactory
vi.mock('@agents/core', () => ({
  AgentFactory: {
    getInstance: vi.fn(() => ({
      createAndInitialize: vi.fn().mockResolvedValue({
        execute: vi.fn().mockResolvedValue({ success: true }),
      }),
    })),
  },
  AgentType: {
    ORCHESTRATOR: 'orchestrator',
  },
}));

import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

describe('GET /api/requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    // Mock unauthenticated user
    vi.mocked(auth).mockResolvedValue({ userId: null, sessionId: null, sessionClaims: null, actor: null, has: () => false, debug: () => null });

    const request = new NextRequest('http://localhost:3000/api/requests');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if ISO agent not found', async () => {
    // Mock authenticated user
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    // Mock Supabase query returning no ISO agent
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found', code: 'PGRST116' },
          }),
        }),
      }),
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/requests');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('ISO agent not found');
  });

  it('should return all requests for authenticated user', async () => {
    // Mock authenticated user
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockISOAgent = { id: 'iso-agent-123', clerk_user_id: 'user-123' };
    const mockRequests = [
      {
        id: 'req-1',
        iso_agent_id: 'iso-agent-123',
        client_profile_id: 'client-1',
        departure_airport: 'KJFK',
        arrival_airport: 'KLAX',
        departure_date: '2025-11-01',
        passengers: 4,
        status: 'pending',
      },
      {
        id: 'req-2',
        iso_agent_id: 'iso-agent-123',
        client_profile_id: 'client-2',
        departure_airport: 'KORD',
        arrival_airport: 'KSFO',
        departure_date: '2025-11-05',
        passengers: 2,
        status: 'completed',
      },
    ];

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1 && table === 'iso_agents') {
        // First call for ISO agent lookup
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockISOAgent,
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'requests') {
        // Second call for requests
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockRequests,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/requests');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requests).toHaveLength(2);
    expect(data.requests[0].id).toBe('req-1');
    expect(data.requests[1].id).toBe('req-2');
  });

  it('should filter requests by status', async () => {
    // Mock authenticated user
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockISOAgent = { id: 'iso-agent-123' };
    const mockRequests = [
      {
        id: 'req-1',
        status: 'completed',
      },
    ];

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockISOAgent,
                error: null,
              }),
            }),
          }),
        };
      } else {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: mockRequests,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/requests?status=completed');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requests).toHaveLength(1);
    expect(data.requests[0].status).toBe('completed');
  });

  it('should filter requests by client_id', async () => {
    // Mock authenticated user
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockISOAgent = { id: 'iso-agent-123' };
    const mockRequests = [
      {
        id: 'req-1',
        client_profile_id: 'client-1',
      },
    ];

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockISOAgent,
                error: null,
              }),
            }),
          }),
        };
      } else {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockRequests,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/requests?client_id=client-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requests).toHaveLength(1);
    expect(data.requests[0].client_profile_id).toBe('client-1');
  });

  it('should return a specific request by request_id', async () => {
    // Mock authenticated user
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockISOAgent = { id: 'iso-agent-123' };
    const mockRequest = {
      id: 'req-specific',
      iso_agent_id: 'iso-agent-123',
      departure_airport: 'KJFK',
      status: 'pending',
    };

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockISOAgent,
                error: null,
              }),
            }),
          }),
        };
      } else {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: [mockRequest],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/requests?request_id=req-specific');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requests).toHaveLength(1);
    expect(data.requests[0].id).toBe('req-specific');
  });
});

describe('POST /api/requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, sessionId: null, sessionClaims: null, actor: null, has: () => false, debug: () => null });

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        client_profile_id: 'client-1',
        departure_airport: 'KJFK',
        arrival_airport: 'KLAX',
        departure_date: '2025-11-01',
        passengers: 4,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if ISO agent not found', async () => {
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

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        client_profile_id: 'client-1',
        departure_airport: 'KJFK',
        arrival_airport: 'KLAX',
        departure_date: '2025-11-01',
        passengers: 4,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('ISO agent not found');
  });

  it('should create a new request successfully', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockISOAgent = { id: 'iso-agent-123' };
    const mockNewRequest = {
      id: 'new-req-123',
      iso_agent_id: 'iso-agent-123',
      client_profile_id: 'client-1',
      departure_airport: 'KJFK',
      arrival_airport: 'KLAX',
      departure_date: '2025-11-01',
      passengers: 4,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) {
        // ISO agent lookup
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockISOAgent,
                error: null,
              }),
            }),
          }),
        };
      } else {
        // Insert request
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockNewRequest,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        client_profile_id: 'client-1',
        departure_airport: 'KJFK',
        arrival_airport: 'KLAX',
        departure_date: '2025-11-01',
        passengers: 4,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.request.id).toBe('new-req-123');
    expect(data.request.status).toBe('pending');
    expect(data.message).toContain('Processing started');
  });

  it('should create request with optional fields', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null
    });

    const mockISOAgent = { id: 'iso-agent-123' };
    const mockNewRequest = {
      id: 'new-req-456',
      iso_agent_id: 'iso-agent-123',
      client_profile_id: 'client-1',
      departure_airport: 'KJFK',
      arrival_airport: 'KLAX',
      departure_date: '2025-11-01',
      return_date: '2025-11-05',
      passengers: 6,
      aircraft_type: 'Citation X',
      budget: 75000,
      special_requirements: 'Catering required',
      status: 'pending',
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
                data: mockISOAgent,
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
                data: mockNewRequest,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        client_profile_id: 'client-1',
        departure_airport: 'KJFK',
        arrival_airport: 'KLAX',
        departure_date: '2025-11-01',
        return_date: '2025-11-05',
        passengers: 6,
        aircraft_type: 'Citation X',
        budget: 75000,
        special_requirements: 'Catering required',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.request.aircraft_type).toBe('Citation X');
    expect(data.request.budget).toBe(75000);
    expect(data.request.special_requirements).toBe('Catering required');
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

    const mockISOAgent = { id: 'iso-agent-123' };

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockISOAgent,
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
                data: null,
                error: { message: 'Database error', code: 'PGRST500' },
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        client_profile_id: 'client-1',
        departure_airport: 'KJFK',
        arrival_airport: 'KLAX',
        departure_date: '2025-11-01',
        passengers: 4,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to create request');
  });
});
