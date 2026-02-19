/**
 * Email API Route Unit Tests
 *
 * Tests POST /api/email sends email via email-service (not via HTTP fetch).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock authentication — always return a valid agent
vi.mock('@/lib/utils/api', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getAuthenticatedAgent: vi.fn().mockResolvedValue({ id: 'agent-123' }),
    isErrorResponse: vi.fn().mockReturnValue(false),
    parseJsonBody: vi.fn(),
    withErrorHandling: (fn: unknown) => fn,
  };
});

// Mock email service
vi.mock('@/lib/services/email-service', () => ({
  sendEmail: vi.fn(),
  default: { sendEmail: vi.fn() },
}));

import { POST } from '@/app/api/email/route';
import { parseJsonBody } from '@/lib/utils/api';
import { sendEmail } from '@/lib/services/email-service';

const mockedParseJsonBody = vi.mocked(parseJsonBody);
const mockedSendEmail = vi.mocked(sendEmail);

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends email via email-service (not via HTTP fetch)', async () => {
    mockedParseJsonBody.mockResolvedValueOnce({
      to: 'client@example.com',
      subject: 'Test Proposal',
      body_html: '<h1>Your Proposal</h1>',
    } as never);

    mockedSendEmail.mockResolvedValueOnce({
      success: true,
      messageId: 'msg-abc-123',
    });

    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        to: 'client@example.com',
        subject: 'Test Proposal',
        body_html: '<h1>Your Proposal</h1>',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    // Should call email-service directly
    expect(mockedSendEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'client@example.com',
        subject: 'Test Proposal',
      })
    );

    expect(body.success).toBe(true);
    expect(body.messageId).toBe('msg-abc-123');
  });

  it('returns error when email-service fails', async () => {
    mockedParseJsonBody.mockResolvedValueOnce({
      to: 'client@example.com',
      subject: 'Test',
      body_html: '<p>Hello</p>',
    } as never);

    mockedSendEmail.mockResolvedValueOnce({
      success: false,
      error: 'Gmail MCP connection failed',
    });

    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        to: 'client@example.com',
        subject: 'Test',
        body_html: '<p>Hello</p>',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
  });
});
