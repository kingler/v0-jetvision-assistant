/**
 * Email API Route - Email management and sending
 *
 * NOTE: Email history tracking is not yet implemented.
 * This is a stub implementation that returns empty results.
 * Email functionality is handled via proposals API.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedAgent,
  isErrorResponse,
  withErrorHandling,
} from '@/lib/utils/api';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

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
    message: 'Email history tracking not yet implemented. Use proposals API for email status.',
  });
});

/**
 * POST /api/email
 * Send an email for a flight request
 * NOTE: Stub implementation - use proposals API for email functionality
 */
export const POST = withErrorHandling(async (_request: NextRequest) => {
  // Authenticate
  const isoAgentOrError = await getAuthenticatedAgent();
  if (isErrorResponse(isoAgentOrError)) return isoAgentOrError;

  // Return stub response - email functionality via proposals API
  return NextResponse.json({
    message: 'Email sending not yet implemented. Use proposals API to send proposals via email.',
    email: null,
  }, { status: 501 });
});
