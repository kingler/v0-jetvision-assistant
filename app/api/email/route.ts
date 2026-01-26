/**
 * Email API Route - Send emails via Gmail MCP
 *
 * POST /api/email - Send an email with optional attachments
 * GET /api/email - Retrieve email history (stub)
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedAgent,
  isErrorResponse,
  withErrorHandling,
  parseJsonBody,
} from '@/lib/utils/api';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

interface SendEmailRequest {
  to: string;
  subject: string;
  body_html: string;
  body_text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType: string;
  }>;
}

/**
 * GET /api/email
 * Retrieve email history for the authenticated user's requests
 * NOTE: Stub implementation - email_history table not yet created
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  // Authenticate
  const isoAgentOrError = await getAuthenticatedAgent();
  if (isErrorResponse(isoAgentOrError)) return isoAgentOrError;

  // Return empty list - email history table not yet implemented
  return NextResponse.json({
    emails: [],
    message: 'Email history tracking not yet implemented.',
  });
});

/**
 * POST /api/email
 * Send an email via Gmail MCP server
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Authenticate
  const isoAgentOrError = await getAuthenticatedAgent();
  if (isErrorResponse(isoAgentOrError)) return isoAgentOrError;

  // Parse request body
  const bodyResult = await parseJsonBody<SendEmailRequest>(request);
  if (isErrorResponse(bodyResult)) {
    return bodyResult;
  }

  const { to, subject, body_html, body_text, cc, bcc, attachments } = bodyResult;

  // Validate required fields
  if (!to || !subject || !body_html) {
    return NextResponse.json(
      { error: 'Missing required fields: to, subject, body_html' },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return NextResponse.json(
      { error: 'Invalid email address format' },
      { status: 400 }
    );
  }

  try {
    // Call Gmail MCP server via internal Avinode API (which routes to MCP servers)
    const url = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : url.origin);

    // Prepare Gmail MCP tool params
    const gmailParams = {
      to,
      subject,
      body_html,
      body_text,
      cc,
      bcc,
      attachments,
    };

    console.log('[POST /api/email] Sending email via Gmail MCP:', {
      to,
      subject,
      attachmentCount: attachments?.length || 0,
    });

    // Call the MCP router endpoint
    const response = await fetch(`${baseUrl}/api/mcp/gmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        tool: 'send_email',
        params: gmailParams,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[POST /api/email] Gmail MCP error:', errorText);
      return NextResponse.json(
        { error: 'Failed to send email', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    console.log('[POST /api/email] Email sent successfully:', {
      messageId: result.messageId,
      threadId: result.threadId,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      threadId: result.threadId,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[POST /api/email] Error sending email:', error);
    return NextResponse.json(
      {
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
});
