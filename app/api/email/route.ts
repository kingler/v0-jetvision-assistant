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
import { sendEmail } from '@/lib/services/email-service';

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
export async function POST(request: NextRequest) {
  // Authenticate
  const isoAgentOrError = await getAuthenticatedAgent();
  if (isErrorResponse(isoAgentOrError)) return isoAgentOrError;

  // Parse request body
  const bodyResult = await parseJsonBody<SendEmailRequest>(request);
  if (isErrorResponse(bodyResult)) {
    return bodyResult;
  }

  const { to, subject, body_html, cc, bcc, attachments } = bodyResult;

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

  // Send via email-service (routes through Gmail MCP client)
  const result = await sendEmail({
    to,
    subject,
    body: body_html,
    cc,
    bcc,
    attachments,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Failed to send email' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
    sentAt: new Date().toISOString(),
  });
}
