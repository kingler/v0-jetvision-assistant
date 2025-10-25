/**
 * Email API Route - Email management and sending
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';
import { validateRequest, validateQueryParams } from '@/lib/validation';
import {
  EmailSendSchema,
  EmailHistoryGetSchema,
} from '@/lib/validation/api-schemas';

/**
 * GET /api/email
 * Retrieve email history for the authenticated user's requests
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const validation = validateQueryParams(searchParams, EmailHistoryGetSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { request_id, client_id, status, limit = 50 } = validation.data;

    // Get ISO agent
    const { data: isoAgent, error: agentError } = await supabase
      .from('iso_agents')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (agentError || !isoAgent) {
      return NextResponse.json({ error: 'ISO agent not found' }, { status: 404 });
    }

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
      return NextResponse.json(
        { error: 'Failed to fetch email history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Email history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/email
 * Send an email for a flight request
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const validation = await validateRequest(request, EmailSendSchema);
    if (!validation.success) {
      return validation.response;
    }
    const emailData = validation.data;

    // Get ISO agent
    const { data: isoAgent, error: agentError } = await supabase
      .from('iso_agents')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (agentError || !isoAgent) {
      return NextResponse.json({ error: 'ISO agent not found' }, { status: 404 });
    }

    // Get request details to verify ownership
    const { data: flightRequest, error: requestError } = await supabase
      .from('requests')
      .select('id, client_id')
      .eq('id', emailData.request_id)
      .eq('iso_agent_id', isoAgent.id)
      .single();

    if (requestError || !flightRequest) {
      return NextResponse.json(
        { error: 'Flight request not found or access denied' },
        { status: 404 }
      );
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
      status: 'sent', // In production, this would be 'pending' initially
      sent_at: new Date().toISOString(),
    };

    const { data: email, error: emailError } = await supabase
      .from('email_history')
      .insert(emailRecord)
      .select()
      .single();

    if (emailError) {
      console.error('Email insert error:', emailError);
      return NextResponse.json(
        { error: 'Failed to send email', details: emailError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      email,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
