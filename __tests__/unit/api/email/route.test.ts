/**
 * Tests for /api/email route
 *
 * Tests POST endpoint for sending emails, GET for email history,
 * and template management endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/email/route';

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

describe('POST /api/email - Send Email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: null,
      sessionId: null,
      sessionClaims: null,
      actor: null,
      has: () => false,
      debug: () => null,
    });

    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        request_id: '123e4567-e89b-12d3-a456-426614174000',
        client_email: 'client@example.com',
        subject: 'Test Subject',
        body: 'Test email body',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid email format', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null,
    });

    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        request_id: '123e4567-e89b-12d3-a456-426614174000',
        client_email: 'invalid-email',
        subject: 'Test',
        body: 'Test body',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Validation failed');
  });

  it('should send email successfully', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null,
    });

    const mockISOAgent = { id: 'iso-agent-123' };
    const mockEmailRecord = {
      id: 'email-123',
      request_id: '123e4567-e89b-12d3-a456-426614174000',
      to_email: 'client@example.com',
      subject: 'Flight Proposal',
      status: 'sent',
      sent_at: new Date().toISOString(),
    };

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (table === 'iso_agents') {
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
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: '123e4567-e89b-12d3-a456-426614174000', client_id: 'client-123' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      } else if (table === 'email_history') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockEmailRecord,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        request_id: '123e4567-e89b-12d3-a456-426614174000',
        client_email: 'client@example.com',
        subject: 'Flight Proposal',
        body: 'Your flight proposal is ready.',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email.id).toBe('email-123');
    expect(data.email.status).toBe('sent');
  });

  it('should send email with attachments', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null,
    });

    const mockISOAgent = { id: 'iso-agent-123' };
    const mockEmailRecord = {
      id: 'email-456',
      request_id: '123e4567-e89b-12d3-a456-426614174000',
      to_email: 'client@example.com',
      subject: 'Flight Proposal with PDF',
      attachments: [{ filename: 'proposal.pdf', contentType: 'application/pdf' }],
      status: 'sent',
    };

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (table === 'iso_agents') {
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
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: '123e4567-e89b-12d3-a456-426614174000', client_id: 'client-123' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      } else if (table === 'email_history') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockEmailRecord,
                error: null,
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        request_id: '123e4567-e89b-12d3-a456-426614174000',
        client_email: 'client@example.com',
        subject: 'Flight Proposal with PDF',
        body: 'Please find attached proposal.',
        attachments: [
          {
            filename: 'proposal.pdf',
            content: 'base64content',
            contentType: 'application/pdf',
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email.attachments).toBeDefined();
  });

  it('should return 500 on email sending failure', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null,
    });

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (table === 'iso_agents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'iso-agent-123' },
                error: null,
              }),
            }),
          }),
        };
      } else if (table === 'requests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: '123e4567-e89b-12d3-a456-426614174000', client_id: 'client-123' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      } else if (table === 'email_history') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Email sending failed' },
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        request_id: '123e4567-e89b-12d3-a456-426614174000',
        client_email: 'client@example.com',
        subject: 'Test',
        body: 'Test',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

describe('GET /api/email - Email History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: null,
      sessionId: null,
      sessionClaims: null,
      actor: null,
      has: () => false,
      debug: () => null,
    });

    const request = new NextRequest('http://localhost:3000/api/email');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return email history for authenticated user', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null,
    });

    const mockISOAgent = { id: 'iso-agent-123' };
    const mockEmails = [
      {
        id: 'email-1',
        request_id: '123e4567-e89b-12d3-a456-426614174000',
        to_email: 'client1@example.com',
        subject: 'Proposal 1',
        status: 'sent',
        sent_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 'email-2',
        request_id: '123e4567-e89b-12d3-a456-426614174001',
        to_email: 'client2@example.com',
        subject: 'Proposal 2',
        status: 'sent',
        sent_at: '2025-01-02T00:00:00Z',
      },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'iso_agents') {
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
      } else if (table === 'email_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockEmails,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
    });
    vi.mocked(supabase.from).mockImplementation(mockFrom as any);

    const request = new NextRequest('http://localhost:3000/api/email');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.emails).toHaveLength(2);
    expect(data.emails[0].to_email).toBe('client1@example.com');
  });

  it('should filter email history by request_id', async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: 'user-123',
      sessionId: 'session-123',
      sessionClaims: null,
      actor: null,
      has: () => true,
      debug: () => null,
    });

    const mockISOAgent = { id: 'iso-agent-123' };
    const mockEmail = {
      id: 'email-specific',
      request_id: '123e4567-e89b-12d3-a456-426614174000',
      to_email: 'client@example.com',
      subject: 'Specific Request Proposal',
      status: 'sent',
    };

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'iso_agents') {
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
      } else if (table === 'email_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [mockEmail],
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

    const request = new NextRequest(
      'http://localhost:3000/api/email?request_id=123e4567-e89b-12d3-a456-426614174000'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.emails).toHaveLength(1);
    expect(data.emails[0].request_id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });
});
