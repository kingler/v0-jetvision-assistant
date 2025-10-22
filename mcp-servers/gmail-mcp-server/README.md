# Gmail MCP Server

MCP server for Gmail API integration - email sending and management.

## Overview

This MCP server provides tools for:
- Sending emails with HTML content
- Attaching files (PDFs, images, etc.)
- Searching email history
- Retrieving email details

## Tools

1. **send_email** - Send emails with attachments
2. **search_emails** - Search email history with Gmail syntax
3. **get_email** - Retrieve specific email details

## Prerequisites

### Google Cloud Project Setup

1. Create a Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable Gmail API
3. Create a service account
4. Download service account JSON credentials
5. **Enable domain-wide delegation** for the service account

### Domain-Wide Delegation (Required)

To send emails on behalf of a user:

1. Go to Google Admin Console > Security > API Controls > Domain-wide Delegation
2. Add your service account client ID
3. Grant scopes:
   ```
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.modify
   ```

### Environment Variables

Add to `.env.local`:

```env
# Gmail MCP Server
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GMAIL_USER_EMAIL=your-email@example.com
```

## Installation

```bash
cd mcp-servers/gmail-mcp-server
pnpm install
```

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Usage Examples

### Send Email

```typescript
{
  tool: 'send_email',
  arguments: {
    to: 'client@example.com',
    from: 'agent@jetvision.com',
    subject: 'Your Private Jet Options',
    body_html: '<h1>Flight Proposals</h1><p>Dear John,</p>...',
    body_text: 'Flight Proposals\n\nDear John,\n...',
    cc: ['manager@jetvision.com'],
    attachments: [
      {
        filename: 'proposal.pdf',
        content: 'base64-encoded-pdf-content',
        contentType: 'application/pdf'
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "18c5f8a3b2d1e4f0",
  "threadId": "18c5f8a3b2d1e4f0",
  "labelIds": ["SENT"]
}
```

### Search Emails

```typescript
{
  tool: 'search_emails',
  arguments: {
    query: 'subject:proposal',
    from: 'client@example.com',
    after: '2025/01/01',
    maxResults: 10
  }
}
```

**Response:**
```json
[
  {
    "id": "18c5f8a3b2d1e4f0",
    "threadId": "18c5f8a3b2d1e4f0",
    "from": "client@example.com",
    "to": ["agent@jetvision.com"],
    "subject": "Re: Flight Proposal",
    "snippet": "Thank you for the proposal. I'm interested in...",
    "date": "Mon, 20 Jan 2025 10:30:00 -0500",
    "labels": ["INBOX", "IMPORTANT"]
  }
]
```

### Get Email Details

```typescript
{
  tool: 'get_email',
  arguments: {
    emailId: '18c5f8a3b2d1e4f0'
  }
}
```

**Response:**
```json
{
  "id": "18c5f8a3b2d1e4f0",
  "from": "client@example.com",
  "to": ["agent@jetvision.com"],
  "subject": "Re: Flight Proposal",
  "body": "<html><body>Full email content...</body></html>",
  "date": "Mon, 20 Jan 2025 10:30:00 -0500",
  "attachments": [
    {
      "filename": "requirements.pdf",
      "mimeType": "application/pdf",
      "size": 245678
    }
  ]
}
```

## Agent Integration

### Communication Manager Agent

```typescript
import { MCPClient } from '@/lib/mcp/client'

const mcpClient = new MCPClient()

// Generate email content
const emailContent = await generateProposalEmail(client, quotes)

// Attach PDF
const pdfBuffer = await generateProposalPDF(quotes)
const pdfBase64 = pdfBuffer.toString('base64')

// Send email
await mcpClient.callTool('gmail', {
  tool: 'send_email',
  arguments: {
    to: client.email,
    subject: `Your Private Jet Options: ${route}`,
    body_html: emailContent.html,
    body_text: emailContent.text,
    attachments: [
      {
        filename: 'Flight_Proposal.pdf',
        content: pdfBase64,
        contentType: 'application/pdf'
      }
    ]
  }
})
```

## Gmail Search Syntax

Use Gmail's powerful search operators:

- `from:user@example.com` - From specific sender
- `to:user@example.com` - To specific recipient
- `subject:proposal` - Subject contains text
- `has:attachment` - Has any attachment
- `is:unread` - Unread emails
- `is:important` - Important emails
- `after:2025/01/01` - After date
- `before:2025/12/31` - Before date
- `label:inbox` - Has specific label

## Error Handling

The server returns structured error responses:

```json
{
  "content": [{
    "type": "text",
    "text": "Error executing tool: Recipient email is invalid"
  }],
  "isError": true
}
```

## Testing

```bash
# Test connection
npx tsx src/index.ts

# Expected output:
# Gmail client initialized
# Gmail MCP server running on stdio
```

## Troubleshooting

### Error: Missing GOOGLE_APPLICATION_CREDENTIALS

Download service account JSON and set path:
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### Error: Missing GMAIL_USER_EMAIL

Set the Gmail address to send from:
```env
GMAIL_USER_EMAIL=your-email@example.com
```

### Error: Domain-wide delegation required

1. Enable domain-wide delegation in Google Admin Console
2. Add service account client ID
3. Grant required scopes

### Error: Insufficient permissions

Verify the service account has these scopes:
```
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.modify
```

## Security Notes

- **Never commit** service account JSON files to git
- Store credentials in `.env.local` (gitignored)
- Use service accounts with domain-wide delegation
- Grant minimum necessary permissions
- Regularly audit email sending activity
- Rotate service account keys regularly

## Rate Limits

Gmail API has the following rate limits:
- **Sending**: 2000 emails per day (can request increase)
- **Reading**: 1 billion quota units per day
- **Search**: 250 quota units per request

## Related Documentation

- [Communication Manager Agent](../../docs/subagents/agents/communication/README.md)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [MCP Server Template](../TEMPLATE.md)
- [Google Service Accounts](https://cloud.google.com/iam/docs/service-accounts)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2025 | Initial implementation |
