# Gmail MCP Server Implementation

**Task ID**: TASK-009
**Created**: 2025-10-20
**Assigned To**: Backend Developer / Integration Specialist
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 6 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Implement a specialized MCP server that extends the base MCP infrastructure to provide Gmail API integration for sending proposal emails, tracking delivery status, and managing email threads.

### User Story
**As a** Communication Manager Agent
**I want** to send professional proposal emails via Gmail API through an MCP interface
**So that** I can deliver flight proposals to clients programmatically with delivery tracking

### Business Value
The Gmail MCP server enables automated, professional email communication with clients. By abstracting Gmail API complexity behind a clean MCP tool interface, AI agents can send personalized proposal emails without manual intervention, dramatically reducing response time from hours to minutes while maintaining quality and tracking.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL extend BaseMCPServer with Gmail-specific tools
- Inherit all base functionality (validation, error handling, retry logic)
- Register 3 core tools: send_email, get_email_status, get_threads
- Configure stdio transport for AI agent communication
- Implement OAuth 2.0 authentication with Gmail API

**FR-2**: System SHALL implement send_email tool
- **Input Parameters**:
  - to (string, email address, required)
  - subject (string, required)
  - body (string, HTML or plain text, required)
  - cc (array of strings, email addresses, optional)
  - bcc (array of strings, email addresses, optional)
  - attachments (array of objects with filename and content, optional)
  - from_name (string, sender display name, optional)
- **Output**: Message ID and send confirmation
- **Behavior**: Send email via Gmail API, return tracking ID
- **Timeout**: 15 seconds

**FR-3**: System SHALL implement get_email_status tool
- **Input Parameters**:
  - message_id (string, Gmail message ID, required)
- **Output**: Delivery status object
- **Behavior**: Query Gmail API for message status, return delivery info

**FR-4**: System SHALL implement get_threads tool
- **Input Parameters**:
  - query (string, Gmail search query, optional)
  - max_results (integer, 1-100, default 10, optional)
- **Output**: Array of email threads matching query
- **Behavior**: Search Gmail threads, return thread summaries

**FR-5**: System SHALL support HTML email templating
- Accept HTML body content
- Sanitize HTML to prevent XSS
- Support inline styles for email clients
- Fallback to plain text for incompatible clients

**FR-6**: System SHALL handle attachments
- Support common formats (PDF, images, documents)
- Base64 encode attachment content
- Validate file size limits (25MB per attachment)
- Set appropriate MIME types

**FR-7**: System SHALL implement OAuth 2.0 flow
- Use refresh token for authentication
- Automatic token refresh when expired
- Secure credential storage
- Handle OAuth errors gracefully

### Acceptance Criteria

- [ ] **AC-1**: GmailMCPServer extends BaseMCPServer
- [ ] **AC-2**: All 3 tools registered with valid schemas
- [ ] **AC-3**: send_email sends emails successfully via Gmail API
- [ ] **AC-4**: get_email_status returns accurate delivery info
- [ ] **AC-5**: get_threads searches and returns thread data
- [ ] **AC-6**: HTML emails render correctly in common clients
- [ ] **AC-7**: Attachments are properly encoded and sent
- [ ] **AC-8**: OAuth tokens refresh automatically
- [ ] **AC-9**: All tools validate input parameters
- [ ] **AC-10**: Errors properly formatted and logged
- [ ] **AC-11**: Unit tests achieve >75% coverage
- [ ] **AC-12**: Integration tests verify email sending
- [ ] **AC-13**: Code review approved

### Non-Functional Requirements

- **Performance**: Email sending completes in <5 seconds
- **Reliability**: Automatic retry for transient Gmail API failures
- **Security**: OAuth credentials never logged or exposed
- **Usability**: Clear error messages for authentication issues
- **Compliance**: Follows Gmail API usage policies and rate limits

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/mcp/gmail-server.test.ts
__tests__/unit/mcp/gmail-client.test.ts
__tests__/integration/mcp/gmail-tools.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/mcp/gmail-server.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GmailMCPServer } from '@/lib/mcp/gmail-server'

describe('GmailMCPServer', () => {
  let server: GmailMCPServer

  beforeEach(() => {
    server = new GmailMCPServer()
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('Tool Registration', () => {
    it('should register all 3 Gmail tools', () => {
      const tools = server.getTools()
      expect(tools).toContain('send_email')
      expect(tools).toContain('get_email_status')
      expect(tools).toContain('get_threads')
    })
  })

  describe('send_email Tool', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should send email with valid parameters', async () => {
      const result = await server.executeTool('send_email', {
        to: 'client@example.com',
        subject: 'Your Flight Proposal',
        body: '<h1>Flight Proposal</h1><p>Details here...</p>'
      })

      expect(result).toHaveProperty('message_id')
      expect(result).toHaveProperty('status', 'sent')
      expect(result.message_id).toMatch(/^[a-f0-9]+$/)
    })

    it('should send email with CC and BCC', async () => {
      const result = await server.executeTool('send_email', {
        to: 'client@example.com',
        subject: 'Flight Proposal',
        body: 'Plain text body',
        cc: ['manager@example.com'],
        bcc: ['archive@example.com']
      })

      expect(result).toHaveProperty('message_id')
    })

    it('should send email with attachments', async () => {
      const result = await server.executeTool('send_email', {
        to: 'client@example.com',
        subject: 'Flight Proposal',
        body: 'See attached proposal',
        attachments: [
          {
            filename: 'proposal.pdf',
            content: 'base64-encoded-content-here',
            mimeType: 'application/pdf'
          }
        ]
      })

      expect(result).toHaveProperty('message_id')
    })

    it('should validate required parameters', async () => {
      await expect(
        server.executeTool('send_email', {
          to: 'client@example.com'
          // Missing subject and body
        })
      ).rejects.toThrow('Validation failed')
    })

    it('should validate email format', async () => {
      await expect(
        server.executeTool('send_email', {
          to: 'invalid-email',
          subject: 'Test',
          body: 'Test'
        })
      ).rejects.toThrow('Validation failed')
    })

    it('should sanitize HTML content', async () => {
      const result = await server.executeTool('send_email', {
        to: 'client@example.com',
        subject: 'Test',
        body: '<script>alert("xss")</script><p>Safe content</p>'
      })

      // Script tag should be removed
      expect(result).toHaveProperty('message_id')
    })
  })

  describe('get_email_status Tool', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should return status for existing message', async () => {
      const result = await server.executeTool('get_email_status', {
        message_id: 'abc123def456'
      })

      expect(result).toHaveProperty('message_id')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('sent_at')
    })

    it('should throw error for non-existent message', async () => {
      await expect(
        server.executeTool('get_email_status', {
          message_id: 'nonexistent'
        })
      ).rejects.toThrow('Message not found')
    })
  })

  describe('get_threads Tool', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should return recent threads', async () => {
      const result = await server.executeTool('get_threads', {
        max_results: 10
      })

      expect(result).toHaveProperty('threads')
      expect(Array.isArray(result.threads)).toBe(true)
    })

    it('should filter threads by query', async () => {
      const result = await server.executeTool('get_threads', {
        query: 'subject:proposal',
        max_results: 5
      })

      expect(result).toHaveProperty('threads')
      expect(result.threads.length).toBeLessThanOrEqual(5)
    })
  })

  describe('OAuth Authentication', () => {
    it('should refresh expired tokens automatically', async () => {
      // Mock expired token scenario
      // Test that server refreshes token and retries
    })

    it('should handle OAuth errors gracefully', async () => {
      // Mock OAuth error
      // Verify proper error handling
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await server.start()
    })

    it('should not expose OAuth credentials in errors', async () => {
      try {
        await server.executeTool('send_email', {})
      } catch (error: any) {
        const errorString = JSON.stringify(error)
        expect(errorString).not.toContain('client_secret')
        expect(errorString).not.toContain('refresh_token')
      }
    })
  })
})
```

**Run Tests** (should FAIL initially):
```bash
npm test -- gmail-server
# Expected: Tests fail because implementation doesn't exist
```

### Step 2: Implement Minimal Code (Green Phase)

Write minimum code to make tests pass.

**Example Implementation**:
```typescript
// lib/mcp/gmail-server.ts
import { BaseMCPServer } from './base-server'
import { GmailClient } from './clients/gmail-client'
import { sanitizeHtml } from './utils/html-sanitizer'

export class GmailMCPServer extends BaseMCPServer {
  private client: GmailClient

  constructor() {
    super({
      name: 'gmail-mcp-server',
      version: '1.0.0',
      transport: 'stdio',
      timeout: 15000
    })

    this.client = new GmailClient({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN!
    })

    this.registerTools()
  }

  private registerTools() {
    // send_email tool
    this.registerTool({
      name: 'send_email',
      description: 'Send an email via Gmail',
      inputSchema: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            format: 'email',
            description: 'Recipient email address'
          },
          subject: {
            type: 'string',
            minLength: 1,
            description: 'Email subject line'
          },
          body: {
            type: 'string',
            minLength: 1,
            description: 'Email body (HTML or plain text)'
          },
          cc: {
            type: 'array',
            items: { type: 'string', format: 'email' },
            description: 'CC recipients'
          },
          bcc: {
            type: 'array',
            items: { type: 'string', format: 'email' },
            description: 'BCC recipients'
          },
          attachments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                filename: { type: 'string' },
                content: { type: 'string' },
                mimeType: { type: 'string' }
              },
              required: ['filename', 'content']
            }
          },
          from_name: {
            type: 'string',
            description: 'Sender display name'
          }
        },
        required: ['to', 'subject', 'body']
      },
      execute: async (params) => {
        // Sanitize HTML content
        const sanitizedBody = sanitizeHtml(params.body)

        return await this.client.sendEmail({
          ...params,
          body: sanitizedBody
        })
      }
    })

    // get_email_status tool
    this.registerTool({
      name: 'get_email_status',
      description: 'Get the status of a sent email',
      inputSchema: {
        type: 'object',
        properties: {
          message_id: {
            type: 'string',
            description: 'Gmail message ID'
          }
        },
        required: ['message_id']
      },
      execute: async (params) => {
        return await this.client.getEmailStatus(params.message_id)
      }
    })

    // get_threads tool
    this.registerTool({
      name: 'get_threads',
      description: 'Search and retrieve email threads',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Gmail search query (optional)'
          },
          max_results: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
            description: 'Maximum number of threads to return'
          }
        }
      },
      execute: async (params) => {
        return await this.client.getThreads(params.query, params.max_results || 10)
      }
    })
  }
}
```

```typescript
// lib/mcp/clients/gmail-client.ts
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

interface GmailConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
}

export class GmailClient {
  private oauth2Client: OAuth2Client
  private gmail: any

  constructor(config: GmailConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      'http://localhost:3000' // Redirect URL (not used for refresh token flow)
    )

    this.oauth2Client.setCredentials({
      refresh_token: config.refreshToken
    })

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  async sendEmail(params: any): Promise<any> {
    const { to, subject, body, cc, bcc, attachments, from_name } = params

    // Build email message
    const message = this.buildEmailMessage({
      to,
      subject,
      body,
      cc,
      bcc,
      attachments,
      from_name
    })

    // Send via Gmail API
    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: message
      }
    })

    return {
      message_id: response.data.id,
      status: 'sent',
      sent_at: new Date().toISOString()
    }
  }

  async getEmailStatus(messageId: string): Promise<any> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId
      })

      return {
        message_id: messageId,
        status: 'delivered',
        sent_at: new Date(parseInt(response.data.internalDate)).toISOString(),
        thread_id: response.data.threadId
      }
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error('Message not found')
      }
      throw error
    }
  }

  async getThreads(query?: string, maxResults: number = 10): Promise<any> {
    const response = await this.gmail.users.threads.list({
      userId: 'me',
      q: query,
      maxResults
    })

    const threads = response.data.threads || []

    return {
      threads: threads.map((thread: any) => ({
        id: thread.id,
        snippet: thread.snippet
      })),
      total: threads.length
    }
  }

  private buildEmailMessage(params: any): string {
    const { to, subject, body, cc, bcc, attachments } = params

    // Build MIME message
    const boundary = '----=_Part_0_' + Date.now()
    let message = ''

    // Headers
    message += `To: ${to}\r\n`
    if (cc) message += `Cc: ${cc.join(', ')}\r\n`
    if (bcc) message += `Bcc: ${bcc.join(', ')}\r\n`
    message += `Subject: ${subject}\r\n`
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`

    // Body
    message += `--${boundary}\r\n`
    message += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`
    message += `${body}\r\n\r\n`

    // Attachments
    if (attachments) {
      attachments.forEach((att: any) => {
        message += `--${boundary}\r\n`
        message += `Content-Type: ${att.mimeType || 'application/octet-stream'}\r\n`
        message += `Content-Disposition: attachment; filename="${att.filename}"\r\n`
        message += `Content-Transfer-Encoding: base64\r\n\r\n`
        message += `${att.content}\r\n\r\n`
      })
    }

    message += `--${boundary}--`

    // Base64 encode for Gmail API
    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
}
```

```typescript
// lib/mcp/utils/html-sanitizer.ts
import sanitizeHtmlLib from 'sanitize-html'

export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'img'],
    allowedAttributes: {
      'a': ['href'],
      'img': ['src', 'alt', 'width', 'height']
    },
    allowedSchemes: ['http', 'https', 'mailto']
  })
}
```

**Run Tests Again**:
```bash
npm test -- gmail-server
# Expected: Tests now pass ✓
```

### Step 3: Refactor (Blue Phase)

- [ ] Extract email building logic
- [ ] Improve error messages
- [ ] Add JSDoc comments
- [ ] Optimize token refresh

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] TASK-007 (MCP Base Server) completed
- [ ] TASK-003 (Environment with Google OAuth) configured
- [ ] Gmail API enabled in Google Cloud Console
- [ ] OAuth refresh token obtained

### Step-by-Step Implementation

**Step 1**: Install Dependencies

```bash
npm install googleapis google-auth-library sanitize-html
npm install -D @types/sanitize-html
```

**Step 2**: Create Gmail Client

File: `lib/mcp/clients/gmail-client.ts` (see above)

**Step 3**: Create HTML Sanitizer

File: `lib/mcp/utils/html-sanitizer.ts` (see above)

**Step 4**: Implement Gmail MCP Server

File: `lib/mcp/gmail-server.ts` (see above)

**Step 5**: Create Server Entry Point

```typescript
// mcp-servers/gmail/index.ts
import { GmailMCPServer } from '@/lib/mcp/gmail-server'

const server = new GmailMCPServer()

server.start().then(() => {
  console.log('Gmail MCP Server started')
})

process.on('SIGINT', async () => {
  await server.stop()
  process.exit(0)
})
```

**Step 6**: Add npm Scripts

```json
{
  "scripts": {
    "mcp:gmail": "tsx mcp-servers/gmail/index.ts"
  }
}
```

---

## 5. GIT WORKFLOW

```bash
git checkout -b feature/gmail-mcp-server
git add lib/mcp/gmail-server.ts lib/mcp/clients/gmail-client.ts
git commit -m "feat(mcp): implement Gmail MCP server with 3 tools"
git add __tests__/unit/mcp/gmail*
git commit -m "test(mcp): add Gmail MCP tests"
git push origin feature/gmail-mcp-server
```

---

## 6. CODE REVIEW CHECKLIST

- [ ] All 3 tools working correctly
- [ ] OAuth authentication secure
- [ ] HTML sanitization prevents XSS
- [ ] Attachments properly encoded
- [ ] Test coverage >75%

---

## 7. TESTING REQUIREMENTS

### Unit Tests
- Tool registration
- Email sending
- Status checking
- Thread retrieval
- OAuth token refresh

### Integration Tests
- End-to-end email sending
- Attachment handling
- Error scenarios

---

## 8. DEFINITION OF DONE

- [ ] All 3 tools implemented
- [ ] OAuth working
- [ ] Tests passing >75% coverage
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Merged to main

---

## 9. RESOURCES & REFERENCES

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- TASK-007: MCP Base Server

### Related Tasks
- TASK-007: MCP Base Server (prerequisite)
- TASK-003: Environment Configuration (prerequisite)
- TASK-016: Communication Manager Agent (uses this server)

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- OAuth refresh token must be obtained via one-time authorization flow
- HTML sanitization prevents XSS attacks
- Attachment size limited by Gmail API (25MB)

### Open Questions
- [ ] Should we implement email templates?
- [ ] Do we need read receipt tracking?

### Assumptions
- OAuth refresh token configured correctly
- Gmail API quota sufficient for production use
- HTML email preferred over plain text

---

## 11. COMPLETION SUMMARY

*[Fill out after completion]*

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
