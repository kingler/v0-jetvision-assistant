/**
 * Gmail MCP Client
 *
 * Singleton wrapper around the Gmail MCP server, communicating via
 * StdioClientTransport. Spawns the MCP server as a child process on
 * first use and keeps the connection alive for subsequent calls.
 *
 * @see mcp-servers/gmail-mcp-server/src/index.ts - The MCP server
 * @see lib/services/email-service.ts - Primary consumer
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface GmailSendEmailParams {
  to: string;
  subject: string;
  body_html: string;
  body_text?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
}

export interface GmailSendEmailResult {
  success: boolean;
  messageId: string;
  threadId: string;
  labelIds: string[];
}

export interface GmailSearchEmailsParams {
  query: string;
  maxResults?: number;
  from?: string;
  to?: string;
  subject?: string;
  after?: string;
  before?: string;
  labelIds?: string[];
}

export interface GmailSearchResult {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  snippet: string;
  date: string;
  labels: string[];
  attachments?: {
    filename: string;
    mimeType: string;
    size: number;
  }[];
}

// ============================================================================
// Client
// ============================================================================

let clientInstance: Client | null = null;
let transportInstance: StdioClientTransport | null = null;
let initPromise: Promise<Client> | null = null;

/**
 * Get or create the singleton MCP client connected to the Gmail MCP server.
 * Lazy-initializes on first call and reuses the connection afterwards.
 */
async function getClient(): Promise<Client> {
  if (clientInstance) {
    return clientInstance;
  }

  // Prevent concurrent initialization
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const serverPath = resolve(
      process.cwd(),
      'mcp-servers/gmail-mcp-server/src/index.ts'
    );

    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', serverPath],
    });

    const client = new Client(
      { name: 'gmail-mcp-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);

    clientInstance = client;
    transportInstance = transport;
    initPromise = null;

    return client;
  })();

  initPromise.catch(() => {
    // Reset on failure so next call retries
    initPromise = null;
  });

  return initPromise;
}

/**
 * Send an email via the Gmail MCP server.
 *
 * @throws Error if the MCP server is unreachable or returns an error
 */
export async function sendEmail(
  params: GmailSendEmailParams
): Promise<GmailSendEmailResult> {
  const client = await getClient();

  const result = await client.callTool({
    name: 'send_email',
    arguments: params as unknown as Record<string, unknown>,
  });

  // The MCP server returns JSON text in content[0].text
  const content = result.content;
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('Gmail MCP: empty response from send_email tool');
  }

  const firstContent = content[0];
  if (firstContent.type !== 'text' || typeof firstContent.text !== 'string') {
    throw new Error('Gmail MCP: unexpected response format from send_email tool');
  }

  if (result.isError) {
    throw new Error(`Gmail MCP send_email error: ${firstContent.text}`);
  }

  const parsed = JSON.parse(firstContent.text) as GmailSendEmailResult;
  return parsed;
}

/**
 * Search emails via the Gmail MCP server.
 *
 * @throws Error if the MCP server is unreachable or returns an error
 */
export async function searchEmails(
  params: GmailSearchEmailsParams
): Promise<GmailSearchResult[]> {
  const client = await getClient();

  const result = await client.callTool({
    name: 'search_emails',
    arguments: params as unknown as Record<string, unknown>,
  });

  // The MCP server returns JSON text in content[0].text
  const content = result.content;
  if (!Array.isArray(content) || content.length === 0) {
    return [];
  }

  const firstContent = content[0];
  if (firstContent.type !== 'text' || typeof firstContent.text !== 'string') {
    return [];
  }

  if (result.isError) {
    throw new Error(`Gmail MCP search_emails error: ${firstContent.text}`);
  }

  const parsed = JSON.parse(firstContent.text);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Gracefully shut down the MCP client and transport.
 * Safe to call multiple times.
 */
export async function disconnect(): Promise<void> {
  if (clientInstance) {
    try {
      await clientInstance.close();
    } catch {
      // Ignore close errors during shutdown
    }
    clientInstance = null;
  }

  if (transportInstance) {
    try {
      await transportInstance.close();
    } catch {
      // Ignore close errors during shutdown
    }
    transportInstance = null;
  }

  initPromise = null;
}

const gmailMCPClient = {
  sendEmail,
  searchEmails,
  disconnect,
};

export default gmailMCPClient;
