import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Gmail MCP client before importing the service
vi.mock('@/lib/mcp/clients/gmail-mcp-client', () => ({
  default: {
    sendEmail: vi.fn(),
    disconnect: vi.fn(),
  },
}));

import { sendEmail, sendProposalEmail, sendContractEmail } from '@/lib/services/email-service';
import gmailMCPClient from '@/lib/mcp/clients/gmail-mcp-client';

const mockedSendEmail = vi.mocked(gmailMCPClient.sendEmail);

describe('email-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: mock mode off
    delete process.env.USE_MOCK_EMAIL;
    delete process.env.MOCK_EMAIL_DELAY_MS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Validation ─────────────────────────────────────────────────────
  describe('email validation', () => {
    it('rejects invalid "to" address', async () => {
      const result = await sendEmail({
        to: 'not-an-email',
        subject: 'Test',
        body: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('"to"');
    });

    it('rejects invalid "replyTo" address', async () => {
      const result = await sendEmail({
        to: 'valid@example.com',
        subject: 'Test',
        body: 'Hello',
        replyTo: 'bad-reply',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('"replyTo"');
    });

    it('accepts valid email addresses', async () => {
      process.env.USE_MOCK_EMAIL = 'true';
      process.env.MOCK_EMAIL_DELAY_MS = '0';

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: 'Hello',
      });

      expect(result.success).toBe(true);
    });
  });

  // ─── Mock mode ──────────────────────────────────────────────────────
  describe('mock mode (USE_MOCK_EMAIL=true)', () => {
    beforeEach(() => {
      process.env.USE_MOCK_EMAIL = 'true';
      process.env.MOCK_EMAIL_DELAY_MS = '0';
    });

    it('returns success with mock message ID', async () => {
      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        body: 'Test body',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock-/);
    });

    it('does not call the MCP client', async () => {
      await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: 'Hello',
      });

      expect(mockedSendEmail).not.toHaveBeenCalled();
    });

    it('logs attachment info', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: 'Hello',
        attachments: [
          {
            filename: 'doc.pdf',
            content: 'dGVzdA==', // "test" in base64
            contentType: 'application/pdf',
          },
        ],
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('doc.pdf')
      );
    });
  });

  // ─── MCP mode ───────────────────────────────────────────────────────
  describe('MCP mode (default)', () => {
    it('sends email via Gmail MCP client', async () => {
      mockedSendEmail.mockResolvedValueOnce({
        success: true,
        messageId: 'mcp-msg-123',
        threadId: 'thread-456',
        labelIds: ['SENT'],
      });

      const result = await sendEmail({
        to: 'recipient@example.com',
        subject: 'Hello MCP',
        body: 'Plain text body',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mcp-msg-123');
      expect(mockedSendEmail).toHaveBeenCalledTimes(1);
    });

    it('wraps plain text body in <pre> for body_html', async () => {
      mockedSendEmail.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-1',
        threadId: 'thread-1',
        labelIds: [],
      });

      await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: 'Just plain text',
      });

      const callArgs = mockedSendEmail.mock.calls[0][0];
      expect(callArgs.body_html).toBe('<pre>Just plain text</pre>');
      expect(callArgs.body_text).toBe('Just plain text');
    });

    it('passes HTML body as-is', async () => {
      mockedSendEmail.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-2',
        threadId: 'thread-2',
        labelIds: [],
      });

      const htmlBody = '<h1>Hello</h1><p>World</p>';
      await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: htmlBody,
      });

      const callArgs = mockedSendEmail.mock.calls[0][0];
      expect(callArgs.body_html).toBe(htmlBody);
      expect(callArgs.body_text).toBeUndefined();
    });

    it('maps attachments correctly', async () => {
      mockedSendEmail.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-3',
        threadId: 'thread-3',
        labelIds: [],
      });

      await sendEmail({
        to: 'user@example.com',
        subject: 'With attachment',
        body: 'See attached',
        attachments: [
          {
            filename: 'report.pdf',
            content: 'base64content',
            contentType: 'application/pdf',
          },
        ],
      });

      const callArgs = mockedSendEmail.mock.calls[0][0];
      expect(callArgs.attachments).toEqual([
        {
          filename: 'report.pdf',
          content: 'base64content',
          contentType: 'application/pdf',
        },
      ]);
    });

    it('passes cc and bcc arrays', async () => {
      mockedSendEmail.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-4',
        threadId: 'thread-4',
        labelIds: [],
      });

      await sendEmail({
        to: 'user@example.com',
        subject: 'CC test',
        body: 'Hello',
        cc: ['cc1@example.com', 'cc2@example.com'],
        bcc: 'bcc@example.com',
      });

      const callArgs = mockedSendEmail.mock.calls[0][0];
      expect(callArgs.cc).toEqual(['cc1@example.com', 'cc2@example.com']);
      expect(callArgs.bcc).toEqual(['bcc@example.com']);
    });

    it('filters out invalid cc/bcc addresses', async () => {
      mockedSendEmail.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-5',
        threadId: 'thread-5',
        labelIds: [],
      });

      await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: 'Hello',
        cc: ['valid@example.com', 'invalid-email'],
      });

      const callArgs = mockedSendEmail.mock.calls[0][0];
      expect(callArgs.cc).toEqual(['valid@example.com']);
    });
  });

  // ─── MCP error handling ─────────────────────────────────────────────
  describe('MCP error handling', () => {
    it('returns error result on MCP connection failure', async () => {
      mockedSendEmail.mockRejectedValueOnce(
        new Error('Connection refused')
      );

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });

    it('does not fall back to mock on MCP error', async () => {
      mockedSendEmail.mockRejectedValueOnce(new Error('Server error'));

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.messageId).toBeUndefined();
    });
  });

  // ─── sendProposalEmail ──────────────────────────────────────────────
  describe('sendProposalEmail', () => {
    beforeEach(() => {
      process.env.USE_MOCK_EMAIL = 'true';
      process.env.MOCK_EMAIL_DELAY_MS = '0';
    });

    it('generates default subject from trip details', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sendProposalEmail({
        to: 'client@example.com',
        customerName: 'John Doe',
        proposalId: 'PROP-001',
        tripDetails: {
          departureAirport: 'KTEB',
          arrivalAirport: 'KLAX',
          departureDate: '2026-03-15',
        },
        pricing: { total: 45000, currency: 'USD' },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('KTEB')
      );
    });

    it('uses custom HTML body when provided', async () => {
      mockedSendEmail.mockResolvedValueOnce({
        success: true,
        messageId: 'msg-prop',
        threadId: 'thread-prop',
        labelIds: [],
      });

      // Turn off mock to exercise MCP path so we can check body_html
      delete process.env.USE_MOCK_EMAIL;

      await sendProposalEmail({
        to: 'client@example.com',
        customerName: 'Jane Doe',
        proposalId: 'PROP-002',
        customHtmlBody: '<h1>Custom Proposal</h1>',
      });

      const callArgs = mockedSendEmail.mock.calls[0][0];
      expect(callArgs.body_html).toBe('<h1>Custom Proposal</h1>');
    });

    it('attaches PDF when provided', async () => {
      const result = await sendProposalEmail({
        to: 'client@example.com',
        customerName: 'Jane Doe',
        proposalId: 'PROP-003',
        pdfBase64: 'JVBERi0xLjQ=',
        pdfFilename: 'proposal-003.pdf',
      });

      expect(result.success).toBe(true);
    });
  });

  // ─── sendContractEmail ──────────────────────────────────────────────
  describe('sendContractEmail', () => {
    beforeEach(() => {
      process.env.USE_MOCK_EMAIL = 'true';
      process.env.MOCK_EMAIL_DELAY_MS = '0';
    });

    it('generates default subject and body from flight details', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await sendContractEmail({
        to: 'client@example.com',
        customerName: 'Alice Smith',
        contractNumber: 'CTR-001',
        pdfBase64: 'JVBERi0xLjQ=',
        pdfFilename: 'contract-001.pdf',
        flightDetails: {
          departureAirport: 'KJFK',
          arrivalAirport: 'EGLL',
          departureDate: '2026-04-01',
          aircraftType: 'Gulfstream G650',
        },
        pricing: { total: 120000, currency: 'USD' },
      });

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('KJFK')
      );
    });

    it('uses provided subject and body', async () => {
      const result = await sendContractEmail({
        to: 'client@example.com',
        customerName: 'Bob Jones',
        contractNumber: 'CTR-002',
        pdfBase64: 'JVBERi0xLjQ=',
        pdfFilename: 'contract-002.pdf',
        subject: 'Your Flight Contract',
        body: 'Custom contract body',
        flightDetails: {
          departureAirport: 'KTEB',
          arrivalAirport: 'KLAS',
          departureDate: '2026-05-01',
          aircraftType: 'Citation X',
        },
        pricing: { total: 35000, currency: 'USD' },
      });

      expect(result.success).toBe(true);
    });
  });
});
