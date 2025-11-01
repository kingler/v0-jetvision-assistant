/**
 * Email API Route - Email management and sending
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { validateRequest, validateQueryParams } from '@/lib/validation';
import {
  EmailSendSchema,
  EmailHistoryGetSchema,
} from '@/lib/validation/api-schemas';
import {
  getAuthenticatedAgent,
  isErrorResponse,
  withErrorHandling,
  ErrorResponses,
} from '@/lib/utils/api';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

/**
 * GET /api/email
 * Retrieve email history for the authenticated user's requests
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Authenticate and get ISO agent
  const isoAgentOrError = await getAuthenticatedAgent();
  if (isErrorResponse(isoAgentOrError)) return isoAgentOrError;
  const isoAgent = isoAgentOrError;

  // Validate query parameters
  const { searchParams } = new URL(request.url);
  const validation = validateQueryParams(searchParams, EmailHistoryGetSchema);
  if (!validation.success) {
    return validation.response;
  }
  const { request_id, client_id, status, limit = 50 } = validation.data;

  // Build query for email history
  let query = supabase
    .from('email_history')
    .select('*')
    .eq('iso_agent_id', isoAgent.id);

  // Apply filters
  if (request_id) {
    query = query.eq('request_id', request_id);
  }
  if (client_id) {
    query = query.eq('client_id', client_id);
  }
  if (status) {
    query = query.eq('status', status);
  }

  // Apply ordering and limit at the end
  query = query.order('sent_at', { ascending: false }).limit(limit);

  const { data: emails, error } = await query;

  if (error) {
    return ErrorResponses.internalError('Failed to fetch email history');
  }

  return NextResponse.json({ emails });
});

/**
 * POST /api/email
 * Send an email for a flight request
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Authenticate and get ISO agent
  const isoAgentOrError = await getAuthenticatedAgent();
  if (isErrorResponse(isoAgentOrError)) return isoAgentOrError;
  const isoAgent = isoAgentOrError;

  // Validate request body
  const validation = await validateRequest(request, EmailSendSchema);
  if (!validation.success) {
    return validation.response;
  }
  const emailData = validation.data;

  // Get request details to verify ownership
  const { data: flightRequest, error: requestError } = await supabase
    .from('requests')
    .select('id, client_id')
    .eq('id', emailData.request_id)
    .eq('iso_agent_id', isoAgent.id)
    .single();

  if (requestError || !flightRequest) {
    return ErrorResponses.notFound('Flight request not found or access denied');
  }

  // TODO: In production, integrate with email service (Gmail MCP, SendGrid, etc.)
  // For now, we'll simulate email sending and store in database

  const emailRecord = {
    iso_agent_id: isoAgent.id,
    request_id: emailData.request_id,
    client_id: flightRequest.client_id,
    to_email: emailData.client_email,
    cc: emailData.cc || null,
    bcc: emailData.bcc || null,
    subject: emailData.subject,
    body: emailData.body,
    template_id: emailData.template_id || null,
    attachments: emailData.attachments || null,
    status: 'simulated', // Status is 'simulated' since email is not actually sent; use 'pending' in production
    sent_at: new Date().toISOString(),
  };

  const { data: email, error: emailError } = await supabase
    .from('email_history')
    .insert(emailRecord)
    .select()
    .single();

  if (emailError) {
    console.error('Email insert error:', emailError);
    return ErrorResponses.internalError('Failed to send email', emailError.message);
  }

  return NextResponse.json({
    email,
    message: 'Email sent successfully',
  });
});
