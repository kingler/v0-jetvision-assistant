/**
 * Tests for /api/email route
 *
 * Tests GET and POST endpoints for email operations.
 * Note: Email functionality is stubbed pending implementation.
 * Email sending is handled via proposals API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/email/route';

// Mock API utilities
vi.mock('@/lib/utils/api', () => ({
  getAuthenticatedAgent: vi.fn(),
  isErrorResponse: vi.fn(),
  withErrorHandling: vi.fn((handler) => handler),
  parseJsonBody: vi.fn(async (req) => req.json()),
}));

// Mock email service to prevent Gmail MCP connection attempts
vi.mock('@/lib/services/email-service', () => ({
  sendEmail: vi.fn(),
}));

import { getAuthenticatedAgent, isErrorResponse } from '@/lib/utils/api';
import { sendEmail } from '@/lib/services/email-service';

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
    expect(data.message).toContain('not yet implemented');
  });
});

describe('POST /api/email - Send Email', () => {
  const mockISOAgent = { id: 'iso-agent-123' };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );
    vi.mocked(isErrorResponse).mockReturnValue(true);

    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        to: 'client@example.com',
        subject: 'Test Subject',
        body_html: '<p>Test email body</p>',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should send email via Gmail MCP and return success', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      messageId: 'msg-123',
    });

    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        to: 'client@example.com',
        subject: 'Flight Proposal',
        body_html: '<p>Your flight proposal is ready.</p>',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.messageId).toBe('msg-123');
  });

  it('should return 400 for missing required fields', async () => {
    vi.mocked(getAuthenticatedAgent).mockResolvedValue(mockISOAgent);
    vi.mocked(isErrorResponse).mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        to: 'client@example.com',
        // missing subject and body_html
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });
});
