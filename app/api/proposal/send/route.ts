/**
 * Proposal Send API Route
 *
 * POST /api/proposal/send
 *
 * Generates a PDF proposal, stores it, and sends it via email to the customer.
 * Creates and updates proposal records in the database for tracking.
 * Used in Step 4 of the RFP workflow.
 *
 * Database Integration:
 * 1. Creates proposal record with status='generated' after PDF generation
 * 2. Updates with file metadata after storage upload
 * 3. Updates with email tracking data and status='sent' after email send
 *
 * @see lib/pdf/proposal-generator.ts
 * @see lib/services/email-service.ts
 * @see lib/services/proposal-service.ts
 * @see components/avinode/send-proposal-step.tsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateProposal } from '@/lib/pdf';
import { sendProposalEmail } from '@/lib/services/email-service';
import { uploadProposalPdf } from '@/lib/supabase/admin';
import {
  getAuthenticatedAgent,
  isErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api';
import {
  createProposalWithResolution,
  updateProposalGenerated,
  updateProposalSent,
  updateProposalStatus,
} from '@/lib/services/proposal-service';
import { saveMessage } from '@/lib/conversation/message-persistence';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';
import type { Passenger } from '@/lib/types/quotes';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

// =============================================================================
// TYPES
// =============================================================================

interface SendProposalRequest {
  customer: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
  };
  tripDetails: {
    /** Trip type: 'one_way' or 'round_trip' */
    tripType?: 'one_way' | 'round_trip';
    departureAirport: {
      icao: string;
      name?: string;
      city?: string;
    };
    arrivalAirport: {
      icao: string;
      name?: string;
      city?: string;
    };
    departureDate: string;
    departureTime?: string;
    /** Return date for round-trip (ISO format YYYY-MM-DD) */
    returnDate?: string;
    /** Return time for round-trip */
    returnTime?: string;
    /** Return airport (defaults to departure airport if not specified) */
    returnAirport?: {
      icao: string;
      name?: string;
      city?: string;
    };
    /** Number of passengers (simple count) or array of passenger details */
    passengers: number | Passenger[];
    tripId?: string;
  };
  selectedFlights: RFQFlight[];
  jetvisionFeePercentage?: number;
  emailSubject?: string;
  emailMessage?: string;
  /**
   * Request ID (UUID) for the chat session.
   * When provided, the API persists the proposal-sent confirmation message to the DB
   * so it survives browser refresh. Must be a valid UUID.
   */
  requestId?: string;
}

interface SendProposalResponse {
  success: boolean;
  /** Local proposal ID (e.g., 'JV-ABC123-XYZ') */
  proposalId?: string;
  /** Database proposal UUID */
  dbProposalId?: string;
  /** Database proposal number (e.g., 'PROP-2025-001') */
  proposalNumber?: string;
  emailSent: boolean;
  messageId?: string;
  sentAt?: string;
  pricing?: {
    subtotal: number;
    jetvisionFee: number;
    taxes: number;
    total: number;
    currency: string;
    /** Cost for outbound leg (round-trip only) */
    outboundCost?: number;
    /** Cost for return leg (round-trip only) */
    returnCost?: number;
  };
  pdfUrl?: string;
  fileName?: string;
  /**
   * ID of the persisted proposal-sent confirmation message (messages table).
   * Present when requestId was provided and persistence succeeded.
   * Client uses this for the confirmation message id so it matches DB on reload.
   */
  savedMessageId?: string;
  error?: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateRequest(body: SendProposalRequest): string | null {
  // Customer validation
  if (!body.customer) {
    return 'Customer information is required';
  }
  if (!body.customer.name || body.customer.name.trim() === '') {
    return 'Customer name is required';
  }
  if (!body.customer.email || body.customer.email.trim() === '') {
    return 'Customer email is required';
  }
  if (!isValidEmail(body.customer.email)) {
    return 'Invalid customer email format';
  }

  // Trip details validation
  if (!body.tripDetails) {
    return 'Trip details (tripDetails) are required';
  }
  if (!body.tripDetails.departureAirport?.icao) {
    return 'Departure airport ICAO code is required';
  }
  if (!body.tripDetails.arrivalAirport?.icao) {
    return 'Arrival airport ICAO code is required';
  }
  if (!body.tripDetails.departureDate) {
    return 'Departure date is required';
  }

  // Passengers validation
  // Support both number (simple count) and array (detailed passenger objects)
  if (body.tripDetails.passengers === undefined || body.tripDetails.passengers === null) {
    return 'At least one passenger is required';
  }

  // If passengers is a number, validate it's a positive integer
  if (typeof body.tripDetails.passengers === 'number') {
    if (!Number.isInteger(body.tripDetails.passengers) || body.tripDetails.passengers < 1) {
      return 'At least one passenger is required';
    }
  }
  // If passengers is an array, validate each passenger object
  else if (Array.isArray(body.tripDetails.passengers)) {
    if (body.tripDetails.passengers.length < 1) {
      return 'At least one passenger is required';
    }
    
    // Validate each passenger object has required fields
    for (let i = 0; i < body.tripDetails.passengers.length; i++) {
      const passenger = body.tripDetails.passengers[i];
      
      // Validate name is present and non-empty
      if (!passenger.name || typeof passenger.name !== 'string' || passenger.name.trim().length === 0) {
        return `Passenger ${i + 1}: name is required and must be a non-empty string`;
      }
      
      // Validate type is one of the allowed values
      if (!passenger.type || !['adult', 'child', 'infant'].includes(passenger.type)) {
        return `Passenger ${i + 1}: type must be one of: 'adult', 'child', or 'infant'`;
      }
      
      // Validate dateOfBirth format if provided (YYYY-MM-DD)
      if (passenger.dateOfBirth !== undefined && passenger.dateOfBirth !== null) {
        if (typeof passenger.dateOfBirth !== 'string') {
          return `Passenger ${i + 1}: dateOfBirth must be a string in ISO format (YYYY-MM-DD)`;
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(passenger.dateOfBirth)) {
          return `Passenger ${i + 1}: dateOfBirth must be in ISO format (YYYY-MM-DD)`;
        }
      }
      
      // Validate seatPreference if provided
      if (passenger.seatPreference !== undefined && passenger.seatPreference !== null) {
        const validSeatPreferences = ['window', 'aisle', 'middle', 'no-preference'];
        if (!validSeatPreferences.includes(passenger.seatPreference)) {
          return `Passenger ${i + 1}: seatPreference must be one of: ${validSeatPreferences.join(', ')}`;
        }
      }
    }
  }
  // If it's neither a number nor an array, it's invalid
  else {
    return 'Passengers must be either a number (count) or an array of passenger objects';
  }

  // Flights validation
  if (!body.selectedFlights || !Array.isArray(body.selectedFlights)) {
    return 'At least one flight must be selected';
  }
  if (body.selectedFlights.length === 0) {
    return 'At least one flight must be selected';
  }

  // Round-trip validation
  if (body.tripDetails.tripType === 'round_trip') {
    // Return date is required for round-trip
    if (!body.tripDetails.returnDate) {
      return 'Return date is required for round-trip proposals';
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.tripDetails.returnDate)) {
      return 'Return date must be in ISO format (YYYY-MM-DD)';
    }

    // Validate return date is on or after departure date
    const departureDate = new Date(body.tripDetails.departureDate);
    const returnDate = new Date(body.tripDetails.returnDate);
    if (returnDate < departureDate) {
      return 'Return date must be on or after departure date';
    }

    // Validate at least one return flight is selected
    const returnFlights = body.selectedFlights.filter(
      (f) => f.legType === 'return' || f.legSequence === 2
    );
    if (returnFlights.length === 0) {
      return 'At least one return flight must be selected for round-trip proposals';
    }

    // Validate at least one outbound flight is selected
    const outboundFlights = body.selectedFlights.filter(
      (f) => !f.legType || f.legType === 'outbound' || f.legSequence === 1
    );
    if (outboundFlights.length === 0) {
      return 'At least one outbound flight must be selected for round-trip proposals';
    }

    // Validate return airport ICAO if provided
    if (body.tripDetails.returnAirport && !body.tripDetails.returnAirport.icao) {
      return 'Return airport ICAO code is required when return airport is specified';
    }
  }

  return null;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/proposal/send
 *
 * Generate a PDF proposal, store it, and send it to the customer via email.
 *
 * Database Integration Flow:
 * 1. Generate PDF proposal
 * 2. Resolve foreign keys (request_id, client_profile_id, quote_id)
 * 3. Create proposal record (status='draft')
 * 4. Upload PDF to storage
 * 5. Update proposal (status='generated', file metadata)
 * 6. Send email
 * 7. Update proposal (status='sent', email tracking)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<SendProposalResponse>> {
  let dbProposalId: string | undefined;
  let proposalNumber: string | undefined;

  try {
    // Authenticate user
    const authResult = await getAuthenticatedAgent();
    if (isErrorResponse(authResult)) {
      return authResult as NextResponse<SendProposalResponse>;
    }

    // Parse request body
    const bodyResult = await parseJsonBody<SendProposalRequest>(request);
    if (isErrorResponse(bodyResult)) {
      return bodyResult as NextResponse<SendProposalResponse>;
    }

    const body = bodyResult;

    // Validate request
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, emailSent: false, error: validationError },
        { status: 400 }
      );
    }

    // Determine trip type for use throughout the function
    const isRoundTrip = body.tripDetails.tripType === 'round_trip';
    const returnAirport = body.tripDetails.returnAirport || body.tripDetails.departureAirport;

    // Normalize passengers value for generateProposal
    // Convert array to count, or use number directly
    const passengersCount =
      typeof body.tripDetails.passengers === 'number'
        ? body.tripDetails.passengers
        : body.tripDetails.passengers.length;

    // Generate PDF proposal
    let proposalResult;
    try {
      proposalResult = await generateProposal({
        customer: body.customer,
        tripDetails: {
          ...body.tripDetails,
          passengers: passengersCount,
        },
        selectedFlights: body.selectedFlights,
        jetvisionFeePercentage: body.jetvisionFeePercentage ?? 10,
      });
    } catch (error) {
      console.error('Error generating proposal PDF:', error);
      return NextResponse.json(
        {
          success: false,
          emailSent: false,
          error: 'Failed to generate proposal PDF',
        },
        { status: 500 }
      );
    }

    // Upload PDF to Supabase storage for viewing in browser
    const uploadResult = await uploadProposalPdf(
      proposalResult.pdfBuffer,
      proposalResult.fileName,
      authResult.id
    );

    if (!uploadResult.success) {
      console.error('Error uploading PDF to storage:', uploadResult.error);
      // Continue with email sending even if upload fails
    }

    // Create proposal record in database (if tripId is available)
    if (body.tripDetails.tripId) {
      try {
        // Build proposal title with round-trip indicator
        const title = isRoundTrip
          ? `Round-Trip Proposal: ${body.tripDetails.departureAirport.icao} ⇄ ${body.tripDetails.arrivalAirport.icao}`
          : `Flight Proposal: ${body.tripDetails.departureAirport.icao} → ${body.tripDetails.arrivalAirport.icao}`;
        const description = isRoundTrip
          ? `Round-trip proposal for ${body.customer.name} - ${body.tripDetails.departureDate} to ${body.tripDetails.returnDate}`
          : `Proposal for ${body.customer.name} - ${body.tripDetails.departureDate}`;

        // Extract quote_id from first selected flight if available
        const quoteId = body.selectedFlights[0]?.quoteId;

        // Create proposal with automatic request/client resolution
        const createResult = await createProposalWithResolution(
          {
            iso_agent_id: authResult.id,
            quote_id: quoteId,
            title,
            description,
            total_amount: proposalResult.pricing.subtotal,
            margin_applied: body.jetvisionFeePercentage ?? 10,
            final_amount: proposalResult.pricing.total,
            file_name: proposalResult.fileName,
            file_url: uploadResult.publicUrl ?? '',
            file_path: uploadResult.filePath,
            file_size_bytes: uploadResult.fileSizeBytes,
            metadata: {
              localProposalId: proposalResult.proposalId,
              generatedAt: proposalResult.generatedAt,
              pricing: proposalResult.pricing,
              flightCount: body.selectedFlights.length,
              selectedFlights: body.selectedFlights.map(f => ({
                aircraftType: f.aircraftType,
                operatorName: f.operatorName,
                totalPrice: f.totalPrice,
                currency: f.currency,
              })),
            },
          },
          body.tripDetails.tripId,
          body.customer.email
        );

        if (createResult) {
          dbProposalId = createResult.id;
          proposalNumber = createResult.proposal_number;

          // Update to 'generated' status if upload succeeded
          if (uploadResult.success && uploadResult.publicUrl && uploadResult.filePath) {
            await updateProposalGenerated(dbProposalId, {
              file_name: proposalResult.fileName,
              file_url: uploadResult.publicUrl,
              file_path: uploadResult.filePath,
              file_size_bytes: uploadResult.fileSizeBytes ?? proposalResult.pdfBuffer.length,
            });
          }

          console.log('[Send] Created proposal record:', {
            dbId: dbProposalId,
            proposalNumber,
            tripId: body.tripDetails.tripId,
          });
        } else {
          console.warn('[Send] Could not create proposal record - request not found for tripId:', body.tripDetails.tripId);
        }
      } catch (dbError) {
        // Log error but don't fail the request - DB tracking is secondary
        console.error('[Send] Error creating proposal record:', dbError);
      }
    }

    // Build email subject and body
    const defaultSubject = isRoundTrip
      ? `Your Round-Trip Flight Proposal: ${body.tripDetails.departureAirport.icao} ⇄ ${body.tripDetails.arrivalAirport.icao}`
      : `Your Flight Proposal: ${body.tripDetails.departureAirport.icao} → ${body.tripDetails.arrivalAirport.icao}`;
    const emailSubject = body.emailSubject || defaultSubject;
    const emailBody = body.emailMessage || '';

    // Send email with PDF attachment
    const emailResult = await sendProposalEmail({
      to: body.customer.email,
      customerName: body.customer.name,
      subject: emailSubject,
      body: emailBody,
      proposalId: proposalResult.proposalId,
      pdfBase64: proposalResult.pdfBase64,
      pdfFilename: proposalResult.fileName,
      tripDetails: {
        departureAirport: body.tripDetails.departureAirport.icao,
        arrivalAirport: body.tripDetails.arrivalAirport.icao,
        departureDate: body.tripDetails.departureDate,
      },
      pricing: {
        total: proposalResult.pricing.total,
        currency: proposalResult.pricing.currency,
      },
    });

    // Handle email sending failure
    if (!emailResult.success) {
      // If we have a DB record, it stays at 'generated' status
      if (dbProposalId) {
        console.warn('[Send] Email failed, proposal stays at generated status:', dbProposalId);
      }

      return NextResponse.json(
        {
          success: false,
          proposalId: proposalResult.proposalId,
          dbProposalId,
          proposalNumber,
          emailSent: false,
          pricing: proposalResult.pricing,
          pdfUrl: uploadResult.publicUrl,
          fileName: proposalResult.fileName,
          error: emailResult.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }

    // Update proposal record with email tracking data
    if (dbProposalId) {
      try {
        await updateProposalSent(dbProposalId, {
          sent_to_email: body.customer.email,
          sent_to_name: body.customer.name,
          email_subject: emailSubject,
          email_body: emailBody,
          email_message_id: emailResult.messageId,
        });
        console.log('[Send] Updated proposal to sent status:', dbProposalId);
      } catch (updateError) {
        // Log error but don't fail - email was sent successfully
        console.error('[Send] Error updating proposal sent status:', updateError);
      }
    }

    // Persist proposal-sent confirmation message so it survives browser refresh.
    // When requestId (UUID) is provided, save to messages table with contentType 'proposal_shared'
    // and richContent.proposalSent; map-db-message-to-ui restores it on load.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hasValidRequestId =
      typeof body.requestId === 'string' &&
      body.requestId.trim() !== '' &&
      uuidRegex.test(body.requestId);
    let savedMessageId: string | undefined;

    // authResult.id from getAuthenticatedAgent() is already the iso_agent UUID
    // (it queries iso_agents by clerk_user_id and returns the id)
    const isoAgentId = authResult.id;

    console.log('[Send] Persistence check:', {
      'body.requestId': body.requestId,
      hasValidRequestId,
      isoAgentId,
    });

    if (hasValidRequestId && body.requestId) {
      try {
        if (isoAgentId) {
          const dep = body.tripDetails.departureAirport.icao;
          const arr = body.tripDetails.arrivalAirport.icao;
          const tripTypeLabel = isRoundTrip ? 'round-trip proposal' : 'proposal';
          const routeSymbol = isRoundTrip ? '⇄' : '→';
          const confirmationContent = emailResult.success
            ? `The ${tripTypeLabel} for ${dep} ${routeSymbol} ${arr} was sent to ${body.customer.name} at ${body.customer.email}.`
            : `The ${tripTypeLabel} for ${dep} ${routeSymbol} ${arr} was generated. Email could not be sent (check Gmail configuration).`;
          const proposalSentData = {
            flightDetails: {
              departureAirport: dep,
              arrivalAirport: arr,
              departureDate: body.tripDetails.departureDate,
              tripType: body.tripDetails.tripType,
              returnDate: body.tripDetails.returnDate,
              returnAirport: body.tripDetails.returnAirport?.icao,
            },
            client: { name: body.customer.name, email: body.customer.email },
            pdfUrl: uploadResult.publicUrl ?? '',
            fileName: proposalResult.fileName,
            proposalId: proposalResult.proposalId,
            pricing: proposalResult.pricing
              ? {
                  total: proposalResult.pricing.total,
                  currency: proposalResult.pricing.currency,
                }
              : undefined,
          };
          const msgId = await saveMessage({
            requestId: body.requestId,
            senderType: 'ai_assistant',
            senderIsoAgentId: isoAgentId,
            content: confirmationContent,
            contentType: 'proposal_shared',
            richContent: { proposalSent: proposalSentData },
          });
          savedMessageId = msgId;
          console.log('[Send] Persisted proposal-sent confirmation:', {
            requestId: body.requestId,
            messageId: msgId,
          });
        } else {
          console.warn('[Send] Skipping proposal-sent persistence: could not resolve iso_agent_id');
        }
      } catch (persistErr) {
        console.warn('[Send] Failed to persist proposal-sent message:', persistErr);
      }
    }

    // Return success response with PDF URL for browser viewing
    return NextResponse.json({
      success: true,
      proposalId: proposalResult.proposalId,
      dbProposalId,
      proposalNumber,
      emailSent: true,
      messageId: emailResult.messageId,
      sentAt: new Date().toISOString(),
      pricing: proposalResult.pricing,
      pdfUrl: uploadResult.publicUrl,
      fileName: proposalResult.fileName,
      ...(savedMessageId != null ? { savedMessageId } : {}),
    });
  } catch (error) {
    console.error('Error sending proposal:', error);

    // If we have a DB record, try to update status
    if (dbProposalId) {
      try {
        await updateProposalStatus(dbProposalId, 'draft');
      } catch {
        // Ignore errors in error handler
      }
    }

    return NextResponse.json(
      {
        success: false,
        emailSent: false,
        dbProposalId,
        proposalNumber,
        error: 'Failed to send proposal',
      },
      { status: 500 }
    );
  }
}
