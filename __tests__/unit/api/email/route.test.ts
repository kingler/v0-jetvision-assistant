/**
 * Tests for /api/email route
 *
 * Tests GET and POST endpoints for email operations.
 * Note: Email functionality is stubbed pending implementation.
 * Email sending is handled via proposals API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/email/route';

// Mock API utilities
vi.mock('@/lib/utils/api', () => ({
  getAuthenticatedAgent: vi.fn(),
  isErrorResponse: vi.fn(),
  withErrorHandling: vi.fn((handler) => handler),
}));

import { getAuthenticatedAgent, isErrorResponse } from '@/lib/utils/api';

describe('GET /api/email - Email History', () => {
  const mockISOAgent = { id: 'iso-agent-123' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
    vi.mocked(isErrorResponse).mockReturnValue(true);

    const request = new NextRequest('http://localhost:3000/api/email');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return empty email list with stub message for authenticated user', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/email');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.emails).toEqual([]);
    expect(data.message).toContain('not yet implemented');
  });

  it('should return stub response even with request_id filter', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest(
      'http://localhost:3000/api/email?request_id=123e4567-e89b-12d3-a456-426614174000'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.emails).toEqual([]);
    expect(data.message).toContain('proposals API');
  });
});

describe('POST /api/email - Send Email', () => {
  const mockISOAgent = { id: 'iso-agent-123' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
    vi.mocked(isErrorResponse).mockReturnValue(true);

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

  it('should return 501 stub response for email send request', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

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

    expect(response.status).toBe(501);
    expect(data.email).toBeNull();
    expect(data.message).toContain('not yet implemented');
    expect(data.message).toContain('proposals API');
  });

  it('should return 501 stub response even for email with attachments', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

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

    expect(response.status).toBe(501);
    expect(data.email).toBeNull();
  });
});
