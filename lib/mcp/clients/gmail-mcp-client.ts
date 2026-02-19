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
 * Check whether an error indicates a broken MCP transport connection.
 * These errors warrant a reconnect + retry.
 */
function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('connection closed') ||
    msg.includes('connection reset') ||
    msg.includes('connection refused') ||
    msg.includes('-32000')
  );
}

/**
 * Reset the singleton connection so the next getClient() call
 * spawns a fresh MCP server process.
 */
async function resetConnection(): Promise<void> {
  const oldClient = clientInstance;
  const oldTransport = transportInstance;
  clientInstance = null;
  transportInstance = null;
  initPromise = null;

  if (oldClient) {
    try { await oldClient.close(); } catch { /* ignore */ }
  }
  if (oldTransport) {
    try { await oldTransport.close(); } catch { /* ignore */ }
  }
}

/**
 * Get or create the singleton MCP client connected to the Gmail MCP server.
 * Lazy-initializes on first call and reuses the connection afterwards.
 *
 * The child process inherits the parent's environment variables so that
 * Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 * GOOGLE_REFRESH_TOKEN) are available even if dotenv's file resolution
 * fails inside the child.
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
      cwd: process.cwd(),
      env: { ...process.env } as Record<string, string>,
      stderr: 'pipe',
    });

    // Capture stderr from the child process for diagnostics.
    // The stderr getter returns a PassThrough stream immediately when
    // stderr is set to 'pipe', so listeners can be attached before start().
    const stderrStream = transport.stderr;
    if (stderrStream) {
      stderrStream.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
          console.error(`[Gmail MCP Server] ${msg}`);
        }
      });
    }

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
 * Execute a callTool request with automatic reconnect on connection errors.
 * On a connection error the singleton is reset, a fresh server is spawned,
 * and the call is retried exactly once.
 */
async function callToolWithRetry(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: unknown[]; isError?: boolean }> {
  const client = await getClient();

  try {
    const res = await client.callTool({ name: toolName, arguments: args });
    return res as { content: unknown[]; isError?: boolean };
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }

    console.warn(`[Gmail MCP] Connection error, reconnecting: ${(error as Error).message}`);
    await resetConnection();
    const freshClient = await getClient();
    const res = await freshClient.callTool({ name: toolName, arguments: args });
    return res as { content: unknown[]; isError?: boolean };
  }
}

/**
 * Send an email via the Gmail MCP server.
 *
 * If the MCP connection has dropped (e.g. stdio pipe closed), the client
 * automatically reconnects and retries once before throwing.
 *
 * @throws Error if the MCP server is unreachable or returns an error
 */
export async function sendEmail(
  params: GmailSendEmailParams
): Promise<GmailSendEmailResult> {
  let result;
  try {
    result = await callToolWithRetry(
      'send_email',
      params as unknown as Record<string, unknown>
    );
  } catch (error) {
    if (isConnectionError(error)) {
      await resetConnection();
    }
    throw error;
  }

  // The MCP server returns JSON text in content[0].text
  const content = result.content;
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('Gmail MCP: empty response from send_email tool');
  }

  const firstContent = content[0] as { type: string; text: string };
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
 * If the MCP connection has dropped, the client automatically reconnects
 * and retries once before throwing.
 *
 * @throws Error if the MCP server is unreachable or returns an error
 */
export async function searchEmails(
  params: GmailSearchEmailsParams
): Promise<GmailSearchResult[]> {
  let result;
  try {
    result = await callToolWithRetry(
      'search_emails',
      params as unknown as Record<string, unknown>
    );
  } catch (error) {
    if (isConnectionError(error)) {
      await resetConnection();
    }
    throw error;
  }

  // The MCP server returns JSON text in content[0].text
  const content = result.content;
  if (!Array.isArray(content) || content.length === 0) {
    return [];
  }

  const firstContent = content[0] as { type: string; text: string };
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
