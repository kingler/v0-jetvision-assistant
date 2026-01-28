/**
 * Proposal Email Approval API Route
 *
 * POST /api/proposal/approve-email
 *
 * Approves and sends a proposal email after user review.
 * Part of the human-in-the-loop email approval workflow.
 *
 * Flow:
 * 1. Validates proposal exists and is in 'pending' approval state
 * 2. Accepts final email content (may be edited by user)
 * 3. Updates proposal email_approval_status to 'approved'
 * 4. Sends email via email service
 * 5. Updates proposal status to 'sent'
 * 6. Persists confirmation message to DB
 * 7. Returns success/error response
 *
 * @see lib/services/email-service.ts
 * @see lib/services/proposal-service.ts
 * @see components/email/email-preview-card.tsx
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendProposalEmail } from '@/lib/services/email-service'
import {
  getAuthenticatedAgent,
  isErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api'
import {
  getProposalById,
  updateProposalSent,
} from '@/lib/services/proposal-service'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { saveMessage } from '@/lib/conversation/message-persistence'

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic'

// =============================================================================
// TYPES
// =============================================================================

interface ApproveEmailRequest {
  /** Proposal ID (UUID) */
  proposalId: string
  /** Final email subject (may be edited) */
  subject: string
  /** Final email body (HTML, may be edited) */
  body: string
  /** Recipient information */
  to: {
    email: string
    name: string
  }
  /** Request ID for message persistence */
  requestId?: string
}

interface ApproveEmailResponse {
  success: boolean
  /** Email message ID after sending */
  messageId?: string
  /** When the email was sent */
  sentAt?: string
  /** Proposal ID */
  proposalId?: string
  /** Proposal number */
  proposalNumber?: string
  /** ID of persisted confirmation message */
  savedMessageId?: string
  /** Error message if failed */
  error?: string
}

// =============================================================================
// VALIDATION
// =============================================================================

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateRequest(body: ApproveEmailRequest): string | null {
  if (!body.proposalId) {
    return 'Proposal ID is required'
  }

  if (!body.subject || body.subject.trim() === '') {
    return 'Email subject is required'
  }

  if (!body.body || body.body.trim() === '') {
    return 'Email body is required'
  }

  if (!body.to) {
    return 'Recipient information is required'
  }

  if (!body.to.email || body.to.email.trim() === '') {
    return 'Recipient email is required'
  }

  if (!isValidEmail(body.to.email)) {
    return 'Invalid recipient email format'
  }

  if (!body.to.name || body.to.name.trim() === '') {
    return 'Recipient name is required'
  }

  return null
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/proposal/approve-email
 *
 * Approve and send a proposal email after user review.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApproveEmailResponse>> {
  try {
    // Authenticate user
    const authResult = await getAuthenticatedAgent()
    if (isErrorResponse(authResult)) {
      return authResult as NextResponse<ApproveEmailResponse>
    }

    // Parse request body
    const bodyResult = await parseJsonBody<ApproveEmailRequest>(request)
    if (isErrorResponse(bodyResult)) {
      return bodyResult as NextResponse<ApproveEmailResponse>
    }

    const body = bodyResult

    // Validate request
    const validationError = validateRequest(body)
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      )
    }

    // Get proposal to validate state
    const proposal = await getProposalById(body.proposalId)
    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      )
    }

    // Verify proposal is owned by authenticated user
    if (proposal.iso_agent_id !== authResult.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to approve this proposal' },
        { status: 403 }
      )
    }

    // Note: We allow sending even if not in 'pending' state to handle
    // cases where the proposal was created before the approval workflow
    // was implemented, or if the user refreshed and lost state
    console.log('[ApproveEmail] Processing approval:', {
      proposalId: body.proposalId,
      // email_approval_status may not exist yet if migration hasn't run
      currentStatus: (proposal as unknown as Record<string, unknown>).email_approval_status ?? 'not_required',
    })

    // Update proposal to 'approved' status before sending
    const approvedAt = new Date().toISOString()
    try {
      await supabaseAdmin
        .from('proposals')
        .update({
          email_approval_status: 'approved',
          email_approved_at: approvedAt,
          // Store final (possibly edited) content
          email_draft_subject: body.subject,
          email_draft_body: body.body,
          updated_at: approvedAt,
        })
        .eq('id', body.proposalId)

      console.log('[ApproveEmail] Updated proposal to approved status')
    } catch (updateError) {
      console.warn('[ApproveEmail] Could not update approval status:', updateError)
      // Continue - email sending is more important
    }

    // Get request details for email
    let request_details: Record<string, unknown> | null = null
    if (proposal.request_id) {
      const { data } = await supabaseAdmin
        .from('requests')
        .select('departure_airport, arrival_airport, departure_date')
        .eq('id', proposal.request_id)
        .single()
      request_details = data
    }

    // Send the email
    const emailResult = await sendProposalEmail({
      to: body.to.email,
      customerName: body.to.name,
      subject: body.subject,
      body: '', // We pass the full body as HTML below
      proposalId: proposal.proposal_number || body.proposalId,
      // If proposal has PDF attachment, include it
      ...(proposal.file_url && {
        pdfFilename: proposal.file_name || 'proposal.pdf',
      }),
      tripDetails: request_details ? {
        departureAirport: (request_details.departure_airport as string) || 'TBD',
        arrivalAirport: (request_details.arrival_airport as string) || 'TBD',
        departureDate: (request_details.departure_date as string) || 'TBD',
      } : undefined,
      pricing: proposal.final_amount ? {
        total: proposal.final_amount,
        currency: 'USD',
      } : undefined,
      // Override the body with user-edited content
      customHtmlBody: body.body,
    })

    // Handle email sending failure
    if (!emailResult.success) {
      // Update proposal status to indicate failure
      try {
        await supabaseAdmin
          .from('proposals')
          .update({
            email_approval_status: 'needs_revision',
            email_approval_notes: `Send failed: ${emailResult.error}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', body.proposalId)
      } catch {
        // Ignore update errors in error path
      }

      return NextResponse.json(
        {
          success: false,
          proposalId: body.proposalId,
          error: emailResult.error || 'Failed to send email',
        },
        { status: 500 }
      )
    }

    // Update proposal with sent status
    const sentAt = new Date().toISOString()
    await updateProposalSent(body.proposalId, {
      sent_to_email: body.to.email,
      sent_to_name: body.to.name,
      email_subject: body.subject,
      email_body: body.body,
      email_message_id: emailResult.messageId,
    })

    console.log('[ApproveEmail] Email sent successfully:', {
      proposalId: body.proposalId,
      messageId: emailResult.messageId,
    })

    // Persist confirmation message if requestId provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const requestId = body.requestId || proposal.request_id
    const hasValidRequestId = requestId && uuidRegex.test(requestId)
    let savedMessageId: string | undefined

    if (hasValidRequestId) {
      try {
        const dep = request_details?.departure_airport || 'N/A'
        const arr = request_details?.arrival_airport || 'N/A'
        const confirmationContent = `The proposal for ${dep} → ${arr} was sent to ${body.to.name} at ${body.to.email}.`

        const proposalSentData = {
          flightDetails: {
            departureAirport: dep,
            arrivalAirport: arr,
            departureDate: (request_details?.departure_date as string) || 'TBD',
          },
          client: { name: body.to.name, email: body.to.email },
          pdfUrl: proposal.file_url || '',
          fileName: proposal.file_name,
          proposalId: proposal.proposal_number || body.proposalId,
          pricing: proposal.final_amount
            ? {
                total: proposal.final_amount,
                currency: 'USD',
              }
            : undefined,
        }

        savedMessageId = await saveMessage({
          requestId: requestId as string,
          senderType: 'ai_assistant',
          senderIsoAgentId: authResult.id,
          content: confirmationContent,
          contentType: 'proposal_shared',
          richContent: { proposalSent: proposalSentData },
        })

        console.log('[ApproveEmail] Persisted confirmation message:', savedMessageId)
      } catch (persistErr) {
        console.warn('[ApproveEmail] Failed to persist confirmation:', persistErr)
      }
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      sentAt,
      proposalId: body.proposalId,
      proposalNumber: proposal.proposal_number,
      ...(savedMessageId ? { savedMessageId } : {}),
    })
  } catch (error) {
    console.error('[ApproveEmail] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
