#!/usr/bin/env node

/**
 * Gmail MCP Server
 *
 * Provides MCP tools for interacting with Gmail API:
 * - send_email: Send emails with HTML content and attachments
 * - search_emails: Search email history
 * - get_email: Retrieve specific email details
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { google, gmail_v1 } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type {
  SendEmailParams,
  SearchEmailsParams,
  GetEmailParams,
  SendEmailResult,
  Email,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
config({ path: resolve(__dirname, '../../../.env.local') });

// Validate environment variables
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const userEmail = process.env.GMAIL_USER_EMAIL;

if (!credentialsPath) {
  console.error('Error: Missing GOOGLE_APPLICATION_CREDENTIALS in .env.local');
  console.error('Please provide path to Google service account JSON file');
  process.exit(1);
}

if (!userEmail) {
  console.error('Error: Missing GMAIL_USER_EMAIL in .env.local');
  console.error('Please provide the Gmail address to send from');
  process.exit(1);
}

// Initialize Google Gmail API client
const auth = new GoogleAuth({
  keyFile: credentialsPath,
  scopes: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  // For service account delegation
  clientOptions: {
    subject: userEmail,
  },
});

let gmailClient: gmail_v1.Gmail;

async function initializeGmailClient(): Promise<void> {
  const authClient = await auth.getClient();
  gmailClient = google.gmail({ version: 'v1', auth: authClient as any });
  console.error('Gmail client initialized');
}

// Define MCP tools
const tools: Tool[] = [
  {
    name: 'send_email',
    description:
      'Send an email via Gmail with optional HTML content and file attachments (PDFs, images, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        from: {
          type: 'string',
          description: 'Sender email address (optional, uses configured default)',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body_html: {
          type: 'string',
          description: 'Email body in HTML format',
        },
        body_text: {
          type: 'string',
          description: 'Plain text version of email body (optional)',
        },
        cc: {
          type: 'array',
          description: 'CC recipients',
          items: { type: 'string' },
        },
        bcc: {
          type: 'array',
          description: 'BCC recipients',
          items: { type: 'string' },
        },
        attachments: {
          type: 'array',
          description: 'Email attachments',
          items: {
            type: 'object',
            properties: {
              filename: { type: 'string' },
              content: {
                type: 'string',
                description: 'Base64-encoded file content',
              },
              contentType: {
                type: 'string',
                description: 'MIME type (e.g., application/pdf, image/png)',
              },
            },
            required: ['filename', 'content', 'contentType'],
          },
        },
      },
      required: ['to', 'subject', 'body_html'],
    },
  },
  {
    name: 'search_emails',
    description:
      'Search email history using Gmail search syntax (e.g., "from:user@example.com subject:proposal")',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10, max: 100)',
        },
        labelIds: {
          type: 'array',
          description: 'Filter by label IDs (e.g., ["INBOX", "SENT"])',
          items: { type: 'string' },
        },
        from: {
          type: 'string',
          description: 'Filter by sender email',
        },
        to: {
          type: 'string',
          description: 'Filter by recipient email',
        },
        subject: {
          type: 'string',
          description: 'Filter by subject text',
        },
        after: {
          type: 'string',
          description: 'Only return emails after this date (YYYY/MM/DD)',
        },
        before: {
          type: 'string',
          description: 'Only return emails before this date (YYYY/MM/DD)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_email',
    description: 'Retrieve detailed information about a specific email by ID',
    inputSchema: {
      type: 'object',
      properties: {
        emailId: {
          type: 'string',
          description: 'Gmail message ID',
        },
      },
      required: ['emailId'],
    },
  },
];

// Initialize MCP server
const server = new Server(
  {
    name: 'gmail-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'send_email': {
        const params = args as unknown as SendEmailParams;
        const result = await sendEmail(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'search_emails': {
        const params = args as unknown as SearchEmailsParams;
        const result = await searchEmails(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_email': {
        const params = args as unknown as GetEmailParams;
        const result = await getEmail(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool implementation functions

async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, from, subject, body_html, body_text, cc, bcc, attachments } = params;

  // Build email message in RFC 2822 format
  const boundary = '----=_Part_' + Math.random().toString(36).substring(7);
  let message = '';

  // Headers
  message += `From: ${from || userEmail}\r\n`;
  message += `To: ${to}\r\n`;
  if (cc && cc.length > 0) {
    message += `Cc: ${cc.join(', ')}\r\n`;
  }
  if (bcc && bcc.length > 0) {
    message += `Bcc: ${bcc.join(', ')}\r\n`;
  }
  message += `Subject: ${subject}\r\n`;
  message += `MIME-Version: 1.0\r\n`;
  message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

  // Body (HTML and text)
  message += `--${boundary}\r\n`;
  message += `Content-Type: multipart/alternative; boundary="${boundary}_alt"\r\n\r\n`;

  if (body_text) {
    message += `--${boundary}_alt\r\n`;
    message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
    message += `${body_text}\r\n\r\n`;
  }

  message += `--${boundary}_alt\r\n`;
  message += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
  message += `${body_html}\r\n\r\n`;
  message += `--${boundary}_alt--\r\n\r\n`;

  // Attachments
  if (attachments && attachments.length > 0) {
    for (const attachment of attachments) {
      message += `--${boundary}\r\n`;
      message += `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n`;
      message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
      message += `Content-Transfer-Encoding: base64\r\n\r\n`;
      message += `${attachment.content}\r\n\r\n`;
    }
  }

  message += `--${boundary}--`;

  // Encode message to base64url
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send email
  const response = await gmailClient.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return {
    success: true,
    messageId: response.data.id || '',
    threadId: response.data.threadId || '',
    labelIds: response.data.labelIds || [],
  };
}

async function searchEmails(params: SearchEmailsParams): Promise<Email[]> {
  const { query, maxResults = 10, labelIds, from, to, subject, after, before } = params;

  // Build search query
  let searchQuery = query;

  if (from) searchQuery += ` from:${from}`;
  if (to) searchQuery += ` to:${to}`;
  if (subject) searchQuery += ` subject:${subject}`;
  if (after) searchQuery += ` after:${after}`;
  if (before) searchQuery += ` before:${before}`;

  // Search messages
  const response = await gmailClient.users.messages.list({
    userId: 'me',
    q: searchQuery,
    labelIds,
    maxResults: Math.min(maxResults, 100),
  });

  const messages = response.data.messages || [];

  // Fetch full details for each message
  const emails: Email[] = [];
  for (const msg of messages) {
    if (msg.id) {
      const email = await getEmail({ emailId: msg.id });
      emails.push(email);
    }
  }

  return emails;
}

async function getEmail(params: GetEmailParams): Promise<Email> {
  const { emailId } = params;

  const response = await gmailClient.users.messages.get({
    userId: 'me',
    id: emailId,
    format: 'full',
  });

  const message = response.data;
  const headers = message.payload?.headers || [];

  const getHeader = (name: string): string => {
    const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  };

  // Extract body
  let body = '';
  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  } else if (message.payload?.parts) {
    const htmlPart = message.payload.parts.find((part) => part.mimeType === 'text/html');
    const textPart = message.payload.parts.find((part) => part.mimeType === 'text/plain');

    if (htmlPart?.body?.data) {
      body = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
    } else if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  }

  // Extract attachments info
  const attachments =
    message.payload?.parts
      ?.filter((part) => part.filename && part.filename.length > 0)
      .map((part) => ({
        filename: part.filename || '',
        mimeType: part.mimeType || '',
        size: part.body?.size || 0,
      })) || [];

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    from: getHeader('From'),
    to: getHeader('To').split(',').map((e) => e.trim()),
    cc: getHeader('Cc') ? getHeader('Cc').split(',').map((e) => e.trim()) : undefined,
    subject: getHeader('Subject'),
    body,
    snippet: message.snippet || '',
    date: getHeader('Date'),
    labels: message.labelIds || [],
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

// Start the server
async function main() {
  await initializeGmailClient();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Gmail MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
