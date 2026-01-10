# ONEK-140: Gmail MCP Integration - Connect Email Service to Existing MCP Server

**Linear Issue:** ONEK-140
**Priority:** Urgent
**Status:** Todo
**Type:** Integration

---

## Overview

Connect the existing email service (`lib/services/email-service.ts`) to the **already implemented** Gmail MCP server. The Gmail MCP server exists and is functional - the gap is that the email service still uses a mock implementation.

---

## Current State Analysis

### ✅ Gmail MCP Server (Already Implemented)

**Location:** `mcp-servers/gmail-mcp-server/src/index.ts`

**Available Tools:**
| Tool | Description |
|------|-------------|
| `send_email` | Send email via Gmail API with HTML and attachments |
| `search_emails` | Search emails with Gmail query syntax |
| `get_email` | Retrieve email by message ID |

**Features:**
- Google service account authentication
- HTML content support
- PDF attachment support (Base64 encoded)
- CC/BCC support

### ❌ Email Service (MOCK - Needs Integration)

**Location:** `lib/services/email-service.ts`

**Current Implementation:**
```typescript
// Lines 255-320: MOCK implementation
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // TODO: Integrate with Gmail MCP or other email service

  // Simulate network delay
  const delayMs = getMockEmailDelay(mockDelayMs);
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  // Generate a mock message ID
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  return { success: true, messageId };
}
```

**Problems:**
- Does NOT call Gmail MCP server
- Returns fake message IDs
- Only logs to console in development
- No real email delivery

---

## Implementation Plan

### Step 1: Create MCP Client Utility

```typescript
// lib/mcp/gmail-client.ts

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface GmailMCPClient {
  sendEmail(params: {
    to: string;
    subject: string;
    body_html: string;
    from?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{
      filename: string;
      content: string; // Base64
      mimeType: string;
    }>;
  }): Promise<{ messageId: string; threadId: string }>;
}

let client: Client | null = null;

export async function getGmailMCPClient(): Promise<GmailMCPClient> {
  if (!client) {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['mcp-servers/gmail-mcp-server/dist/index.js'],
    });

    client = new Client({ name: 'email-service', version: '1.0.0' }, {});
    await client.connect(transport);
  }

  return {
    async sendEmail(params) {
      const result = await client!.callTool('send_email', params);
      return result.content as { messageId: string; threadId: string };
    },
  };
}
```

### Step 2: Update Email Service

```typescript
// lib/services/email-service.ts

import { getGmailMCPClient } from '@/lib/mcp/gmail-client';

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, body, attachments, replyTo, cc, bcc } = options;

  // Validate email addresses (keep existing validation)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return { success: false, error: 'Invalid email address format' };
  }

  try {
    // Get MCP client
    const gmailClient = await getGmailMCPClient();

    // Transform attachments to MCP format
    const mcpAttachments = attachments?.map(a => ({
      filename: a.filename,
      content: a.content, // Already Base64
      mimeType: a.contentType || 'application/octet-stream',
    }));

    // Send via Gmail MCP
    const result = await gmailClient.sendEmail({
      to,
      subject,
      body_html: body,
      cc: normalizeEmailArray(cc, 'cc'),
      bcc: normalizeEmailArray(bcc, 'bcc'),
      attachments: mcpAttachments,
    });

    return {
      success: true,
      messageId: result.messageId,
    };

  } catch (error) {
    console.error('[EmailService] Gmail MCP error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
```

### Step 3: Add Environment Configuration

```env
# .env.local

# Gmail MCP Configuration
GMAIL_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GMAIL_SENDER_EMAIL=sales@jetvision.com
GMAIL_SENDER_NAME=Jetvision Charter Services

# For local development, can use mock mode
USE_MOCK_EMAIL=false
```

### Step 4: Support Mock Mode for Testing

```typescript
// lib/services/email-service.ts

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // Allow mock mode for testing
  if (process.env.USE_MOCK_EMAIL === 'true') {
    return sendEmailMock(options);
  }

  // Production: Use Gmail MCP
  return sendEmailViaMCP(options);
}

// Keep mock implementation for testing
async function sendEmailMock(options: SendEmailOptions): Promise<SendEmailResult> {
  // ... existing mock logic ...
}

// Real implementation
async function sendEmailViaMCP(options: SendEmailOptions): Promise<SendEmailResult> {
  // ... Gmail MCP integration ...
}
```

---

## Testing Plan

### Unit Tests

```typescript
// __tests__/unit/services/email-service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail, sendProposalEmail } from '@/lib/services/email-service';

// Mock the MCP client
vi.mock('@/lib/mcp/gmail-client', () => ({
  getGmailMCPClient: vi.fn().mockResolvedValue({
    sendEmail: vi.fn().mockResolvedValue({
      messageId: 'mcp-msg-123',
      threadId: 'mcp-thread-456',
    }),
  }),
}));

describe('EmailService with Gmail MCP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USE_MOCK_EMAIL = 'false';
  });

  it('should send email via Gmail MCP', async () => {
    const result = await sendEmail({
      to: 'client@example.com',
      subject: 'Test',
      body: '<p>Hello</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('mcp-msg-123');
  });

  it('should send proposal email with PDF attachment', async () => {
    const result = await sendProposalEmail({
      to: 'client@example.com',
      customerName: 'John Doe',
      proposalId: 'prop-123',
      pdfBase64: 'base64encodedpdf...',
      pdfFilename: 'Proposal_123.pdf',
      tripDetails: {
        departureAirport: 'KTEB',
        arrivalAirport: 'KOPF',
        departureDate: '2025-01-15',
      },
      pricing: { total: 25000, currency: 'USD' },
    });

    expect(result.success).toBe(true);
  });

  it('should handle MCP errors gracefully', async () => {
    const { getGmailMCPClient } = await import('@/lib/mcp/gmail-client');
    (getGmailMCPClient as any).mockResolvedValue({
      sendEmail: vi.fn().mockRejectedValue(new Error('MCP connection failed')),
    });

    const result = await sendEmail({
      to: 'client@example.com',
      subject: 'Test',
      body: 'Hello',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('MCP connection failed');
  });

  it('should use mock mode when USE_MOCK_EMAIL is true', async () => {
    process.env.USE_MOCK_EMAIL = 'true';

    const result = await sendEmail({
      to: 'client@example.com',
      subject: 'Test',
      body: 'Hello',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^msg-/); // Mock format
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/gmail-mcp-integration.test.ts

describe('Gmail MCP Integration', () => {
  it('should connect to Gmail MCP server', async () => {
    // Test MCP server startup and connection
  });

  it('should send real email in sandbox mode', async () => {
    // Test with Gmail API in sandbox/test mode
  });
});
```

---

## Acceptance Criteria

- [ ] `lib/mcp/gmail-client.ts` created with MCP client wrapper
- [ ] `lib/services/email-service.ts` updated to call Gmail MCP
- [ ] Mock mode preserved for testing (`USE_MOCK_EMAIL=true`)
- [ ] Error handling for MCP connection failures
- [ ] Unit tests updated to mock MCP client
- [ ] Integration test for Gmail MCP connection
- [ ] Environment variables documented

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `lib/mcp/gmail-client.ts` | Create | MCP client wrapper for Gmail |
| `lib/services/email-service.ts` | Modify | Use Gmail MCP instead of mock |
| `__tests__/unit/services/email-service.test.ts` | Modify | Update mocks for MCP |
| `.env.example` | Modify | Add Gmail MCP config |

---

## Related Files

- `mcp-servers/gmail-mcp-server/src/index.ts` - **Already implemented** Gmail MCP server
- `app/api/proposal/send/route.ts` - API route that calls email service
- `components/avinode/rfq-flight-card.tsx` - UI that triggers proposal send
