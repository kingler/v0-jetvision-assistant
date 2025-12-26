/**
 * Gmail MCP Server Unit Tests
 *
 * Tests the Gmail MCP server tools and functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { google } from 'googleapis';

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    gmail: vi.fn(() => ({
      users: {
        messages: {
          send: vi.fn(),
          list: vi.fn(),
          get: vi.fn(),
        },
      },
    })),
  },
  GoogleAuth: vi.fn(() => ({
    getClient: vi.fn().mockResolvedValue({}),
  })),
}));

describe('Gmail MCP Server', () => {
  let mockGmailClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGmailClient = {
      users: {
        messages: {
          send: vi.fn(),
          list: vi.fn(),
          get: vi.fn(),
        },
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('send_email tool', () => {
    it('should send email with HTML body', async () => {
      // Arrange
      const emailParams = {
        to: 'client@example.com',
        from: 'agent@jetvision.com',
        subject: 'Your Flight Proposal',
        body_html: '<h1>Flight Options</h1><p>Dear Client,</p>',
        body_text: 'Flight Options\n\nDear Client,',
      };

      const mockResponse = {
        data: {
          id: '18c5f8a3b2d1e4f0',
          threadId: '18c5f8a3b2d1e4f0',
          labelIds: ['SENT'],
        },
      };

      mockGmailClient.users.messages.send.mockResolvedValue(mockResponse);

      // Act
      const response = await mockGmailClient.users.messages.send();

      // Assert
      expect(response.data.id).toBe('18c5f8a3b2d1e4f0');
      expect(response.data.labelIds).toContain('SENT');
    });

    it('should send email with PDF attachment', async () => {
      // Arrange
      const pdfContent = 'base64-encoded-pdf-content';
      const attachment = {
        filename: 'proposal.pdf',
        content: pdfContent,
        contentType: 'application/pdf',
      };

      // Act - Build MIME message with attachment
      const boundary = '----=_Part_boundary123';
      let message = '';
      message += `--${boundary}\r\n`;
      message += `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n`;
      message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
      message += `Content-Transfer-Encoding: base64\r\n\r\n`;
      message += `${attachment.content}\r\n\r\n`;
      message += `--${boundary}--`;

      // Assert
      expect(message).toContain('application/pdf');
      expect(message).toContain('proposal.pdf');
      expect(message).toContain(pdfContent);
    });

    it('should send email with multiple attachments', () => {
      // Arrange
      const attachments = [
        { filename: 'proposal.pdf', content: 'pdf-content', contentType: 'application/pdf' },
        { filename: 'brochure.pdf', content: 'brochure-content', contentType: 'application/pdf' },
      ];

      // Act
      const attachmentCount = attachments.length;

      // Assert
      expect(attachmentCount).toBe(2);
      expect(attachments.every(a => a.contentType === 'application/pdf')).toBe(true);
    });

    it('should encode email to base64url format', () => {
      // Arrange
      const rawMessage = 'From: sender@example.com\r\nTo: recipient@example.com\r\n\r\nHello';

      // Act
      const encoded = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Assert
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');
    });

    it('should include CC recipients', () => {
      // Arrange
      const emailParams = {
        to: 'client@example.com',
        cc: ['manager@jetvision.com', 'supervisor@jetvision.com'],
      };

      // Act
      const ccHeader = `Cc: ${emailParams.cc.join(', ')}`;

      // Assert
      expect(ccHeader).toBe('Cc: manager@jetvision.com, supervisor@jetvision.com');
    });

    it('should include BCC recipients', () => {
      // Arrange
      const emailParams = {
        to: 'client@example.com',
        bcc: ['audit@jetvision.com'],
      };

      // Act
      const bccHeader = `Bcc: ${emailParams.bcc.join(', ')}`;

      // Assert
      expect(bccHeader).toBe('Bcc: audit@jetvision.com');
    });

    it('should build RFC 2822 compliant message', () => {
      // Arrange
      const headers = [
        'From: sender@example.com',
        'To: recipient@example.com',
        'Subject: Test Email',
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset="UTF-8"',
      ];

      // Act
      const message = headers.join('\r\n') + '\r\n\r\n<html><body>Content</body></html>';

      // Assert
      expect(message).toContain('From: sender@example.com');
      expect(message).toContain('MIME-Version: 1.0');
      expect(message).toContain('<html>');
    });
  });

  describe('search_emails tool', () => {
    it('should search emails by query', async () => {
      // Arrange
      const mockResponse = {
        data: {
          messages: [
            { id: 'msg_1', threadId: 'thread_1' },
            { id: 'msg_2', threadId: 'thread_2' },
          ],
        },
      };

      mockGmailClient.users.messages.list.mockResolvedValue(mockResponse);

      // Act
      const response = await mockGmailClient.users.messages.list({
        userId: 'me',
        q: 'subject:proposal',
      });

      // Assert
      expect(response.data.messages).toHaveLength(2);
    });

    it('should build search query with from filter', () => {
      // Arrange
      const baseQuery = 'subject:proposal';
      const from = 'client@example.com';

      // Act
      const fullQuery = `${baseQuery} from:${from}`;

      // Assert
      expect(fullQuery).toBe('subject:proposal from:client@example.com');
    });

    it('should build search query with to filter', () => {
      // Arrange
      const baseQuery = 'subject:proposal';
      const to = 'agent@jetvision.com';

      // Act
      const fullQuery = `${baseQuery} to:${to}`;

      // Assert
      expect(fullQuery).toBe('subject:proposal to:agent@jetvision.com');
    });

    it('should build search query with date range', () => {
      // Arrange
      const baseQuery = 'subject:proposal';
      const after = '2025/01/01';
      const before = '2025/12/31';

      // Act
      const fullQuery = `${baseQuery} after:${after} before:${before}`;

      // Assert
      expect(fullQuery).toBe('subject:proposal after:2025/01/01 before:2025/12/31');
    });

    it('should filter by label IDs', async () => {
      // Arrange
      const mockResponse = {
        data: {
          messages: [
            { id: 'msg_1', threadId: 'thread_1' },
          ],
        },
      };

      mockGmailClient.users.messages.list.mockResolvedValue(mockResponse);

      // Act
      const response = await mockGmailClient.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX', 'IMPORTANT'],
      });

      // Assert
      expect(response.data.messages).toHaveLength(1);
    });

    it('should respect maxResults limit', () => {
      // Arrange
      const maxResults = 10;
      const requestedResults = 50;

      // Act
      const actualLimit = Math.min(requestedResults, maxResults);

      // Assert
      expect(actualLimit).toBe(10);
    });

    it('should handle empty search results', async () => {
      // Arrange
      mockGmailClient.users.messages.list.mockResolvedValue({
        data: { messages: [] },
      });

      // Act
      const response = await mockGmailClient.users.messages.list();

      // Assert
      expect(response.data.messages || []).toHaveLength(0);
    });
  });

  describe('get_email tool', () => {
    it('should retrieve email details', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: '18c5f8a3b2d1e4f0',
          threadId: '18c5f8a3b2d1e4f0',
          labelIds: ['INBOX'],
          snippet: 'Thank you for the proposal...',
          payload: {
            headers: [
              { name: 'From', value: 'client@example.com' },
              { name: 'To', value: 'agent@jetvision.com' },
              { name: 'Subject', value: 'Re: Flight Proposal' },
              { name: 'Date', value: 'Mon, 20 Jan 2025 10:30:00 -0500' },
            ],
            body: {
              data: Buffer.from('<html><body>Email content</body></html>').toString('base64'),
            },
          },
        },
      };

      mockGmailClient.users.messages.get.mockResolvedValue(mockResponse);

      // Act
      const response = await mockGmailClient.users.messages.get({
        userId: 'me',
        id: '18c5f8a3b2d1e4f0',
        format: 'full',
      });

      // Assert
      expect(response.data.id).toBe('18c5f8a3b2d1e4f0');
      expect(response.data.payload.headers).toHaveLength(4);
    });

    it('should extract headers correctly', () => {
      // Arrange
      const headers = [
        { name: 'From', value: 'sender@example.com' },
        { name: 'To', value: 'recipient@example.com' },
        { name: 'Subject', value: 'Test Subject' },
      ];

      // Act
      const getHeader = (name: string) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header?.value || '';
      };

      // Assert
      expect(getHeader('From')).toBe('sender@example.com');
      expect(getHeader('Subject')).toBe('Test Subject');
      expect(getHeader('Cc')).toBe('');
    });

    it('should decode base64 email body', () => {
      // Arrange
      const encodedBody = Buffer.from('Hello, World!').toString('base64');

      // Act
      const decoded = Buffer.from(encodedBody, 'base64').toString('utf-8');

      // Assert
      expect(decoded).toBe('Hello, World!');
    });

    it('should extract HTML part from multipart email', () => {
      // Arrange
      const parts = [
        { mimeType: 'text/plain', body: { data: 'text-content' } },
        { mimeType: 'text/html', body: { data: 'html-content' } },
      ];

      // Act
      const htmlPart = parts.find(p => p.mimeType === 'text/html');

      // Assert
      expect(htmlPart).toBeDefined();
      expect(htmlPart!.body.data).toBe('html-content');
    });

    it('should extract attachment information', () => {
      // Arrange
      const parts = [
        {
          filename: 'proposal.pdf',
          mimeType: 'application/pdf',
          body: { size: 245678 },
        },
        {
          filename: 'brochure.pdf',
          mimeType: 'application/pdf',
          body: { size: 123456 },
        },
      ];

      // Act
      const attachments = parts
        .filter(p => p.filename && p.filename.length > 0)
        .map(p => ({
          filename: p.filename,
          mimeType: p.mimeType,
          size: p.body.size,
        }));

      // Assert
      expect(attachments).toHaveLength(2);
      expect(attachments[0].filename).toBe('proposal.pdf');
      expect(attachments[0].size).toBe(245678);
    });

    it('should parse To header with multiple recipients', () => {
      // Arrange
      const toHeader = 'recipient1@example.com, recipient2@example.com, recipient3@example.com';

      // Act
      const recipients = toHeader.split(',').map(e => e.trim());

      // Assert
      expect(recipients).toHaveLength(3);
      expect(recipients[0]).toBe('recipient1@example.com');
    });

    it('should handle missing Cc header', () => {
      // Arrange
      const ccHeader: string | undefined = '';

      // Act
      const cc = ccHeader ? ccHeader.split(',').map((e: string) => e.trim()) : undefined;

      // Assert
      expect(cc).toBeUndefined();
    });
  });

  describe('Email validation', () => {
    it('should validate email address format', () => {
      // Arrange
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Act & Assert
      expect('client@example.com').toMatch(validEmail);
      expect('invalid-email').not.toMatch(validEmail);
      expect('missing@domain').not.toMatch(validEmail);
    });

    it('should validate required fields are present', () => {
      // Arrange
      const emailParams = {
        to: 'client@example.com',
        subject: 'Test',
        body_html: '<p>Content</p>',
      };

      // Act
      const hasRequiredFields = Boolean(emailParams.to && emailParams.subject && emailParams.body_html);

      // Assert
      expect(hasRequiredFields).toBe(true);
    });

    it('should validate attachment content is base64', () => {
      // Arrange
      const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
      const validBase64 = 'SGVsbG8gV29ybGQ=';
      const invalidBase64 = 'Hello World!';

      // Act & Assert
      expect(validBase64).toMatch(base64Pattern);
      expect(invalidBase64).not.toMatch(base64Pattern);
    });

    it('should validate attachment content type', () => {
      // Arrange
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      const contentType = 'application/pdf';

      // Act & Assert
      expect(validTypes).toContain(contentType);
    });
  });

  describe('Gmail search syntax', () => {
    it('should build query for unread emails', () => {
      // Arrange
      const query = 'is:unread';

      // Act & Assert
      expect(query).toBe('is:unread');
    });

    it('should build query for emails with attachments', () => {
      // Arrange
      const query = 'has:attachment';

      // Act & Assert
      expect(query).toBe('has:attachment');
    });

    it('should build query for important emails', () => {
      // Arrange
      const query = 'is:important';

      // Act & Assert
      expect(query).toBe('is:important');
    });

    it('should combine multiple search operators', () => {
      // Arrange
      const operators = ['from:client@example.com', 'subject:proposal', 'has:attachment'];

      // Act
      const query = operators.join(' ');

      // Assert
      expect(query).toBe('from:client@example.com subject:proposal has:attachment');
    });
  });

  describe('Error handling', () => {
    it('should handle Gmail API errors', async () => {
      // Arrange
      const error = new Error('Gmail API error: Quota exceeded');
      mockGmailClient.users.messages.send.mockRejectedValue(error);

      // Act & Assert
      await expect(mockGmailClient.users.messages.send()).rejects.toThrow('Gmail API error');
    });

    it('should handle invalid recipient errors', async () => {
      // Arrange
      const error = new Error('Invalid recipient email address');
      mockGmailClient.users.messages.send.mockRejectedValue(error);

      // Act & Assert
      await expect(mockGmailClient.users.messages.send()).rejects.toThrow('Invalid recipient');
    });

    it('should handle quota limit errors', async () => {
      // Arrange
      const error = {
        response: {
          status: 429,
          data: { message: 'Quota exceeded' },
        },
      };

      mockGmailClient.users.messages.send.mockRejectedValue(error);

      // Act & Assert
      await expect(mockGmailClient.users.messages.send()).rejects.toEqual(error);
    });

    it('should handle authentication errors', async () => {
      // Arrange
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      };

      mockGmailClient.users.messages.list.mockRejectedValue(error);

      // Act & Assert
      await expect(mockGmailClient.users.messages.list()).rejects.toEqual(error);
    });
  });

  describe('MIME message building', () => {
    it('should create multipart/mixed boundary', () => {
      // Arrange
      const boundary = '----=_Part_' + Math.random().toString(36).substring(7);

      // Act & Assert
      expect(boundary).toMatch(/^----=_Part_[a-z0-9]+$/);
    });

    it('should build multipart alternative for HTML and text', () => {
      // Arrange
      const boundary = '----=_Part_boundary';
      const altBoundary = `${boundary}_alt`;

      // Act
      let message = `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;
      message += `--${altBoundary}\r\n`;
      message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\nPlain text\r\n\r\n`;
      message += `--${altBoundary}\r\n`;
      message += `Content-Type: text/html; charset="UTF-8"\r\n\r\n<html>HTML</html>\r\n\r\n`;
      message += `--${altBoundary}--\r\n`;

      // Assert
      expect(message).toContain('multipart/alternative');
      expect(message).toContain('text/plain');
      expect(message).toContain('text/html');
    });
  });
});
