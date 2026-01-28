/**
 * Contract Send API Route
 *
 * POST /api/contract/send
 *
 * Generates a PDF contract, stores it, and sends it via email to the customer.
 * Creates and updates contract records in the database for tracking.
 * Used when the "Send Contract" button is clicked in the Book Flight modal.
 *
 * Database Integration:
 * 1. Creates contract record with status='draft' after PDF generation
 * 2. Updates with file metadata after storage upload
 * 3. Updates with email tracking data and status='sent' after email send
 *
 * @see lib/pdf/contract-generator.ts
 * @see lib/services/email-service.ts
 * @see lib/services/contract-service.ts
 * @see components/avinode/book-flight-modal.tsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateContract } from '@/lib/pdf';
import { sendContractEmail } from '@/lib/services/email-service';
import { uploadContractPdf } from '@/lib/supabase/admin';
import {
  getAuthenticatedAgent,
  isErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api';
import {
  createContractWithResolution,
  updateContractGenerated,
  updateContractSent,
  updateContractStatus,
} from '@/lib/services/contract-service';
import { saveMessage } from '@/lib/conversation/message-persistence';
import type {
  ContractCustomer,
  ContractFlightDetails,
  ContractPricing,
  ContractAmenities,
} from '@/lib/types/contract';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

// =============================================================================
// TYPES
// =============================================================================

interface SendContractRequest {
  /** Request UUID (for linking to existing request) */
  requestId: string;
  /** Optional proposal UUID */
  proposalId?: string;
  /** Optional quote UUID */
  quoteId?: string;
  /** Reference quote number (e.g., from Avinode) */
  referenceQuoteNumber?: string;
  /** Trip ID for request resolution */
  tripId?: string;
  /** Customer information */
  customer: ContractCustomer;
  /** Flight details */
  flightDetails: ContractFlightDetails;
  /** Pricing breakdown */
  pricing: ContractPricing;
  /** Aircraft amenities */
  amenities?: ContractAmenities;
  /** Payment method selection */
  paymentMethod?: 'wire' | 'credit_card';
  /** Custom email subject */
  emailSubject?: string;
  /** Custom email message */
  emailMessage?: string;
  /**
   * Conversation ID for persisting the contract-sent confirmation message.
   * When provided, the API persists the message to the DB so it survives browser refresh.
   */
  conversationId?: string;
}

interface SendContractResponse {
  success: boolean;
  /** Local contract ID (e.g., 'CONTRACT-ABC123-XYZ') */
  contractId?: string;
  /** Database contract UUID */
  dbContractId?: string;
  /** Database contract number (e.g., 'CONTRACT-2026-001') */
  contractNumber?: string;
  emailSent: boolean;
  messageId?: string;
  sentAt?: string;
  pricing?: ContractPricing;
  pdfUrl?: string;
  fileName?: string;
  /**
   * ID of the persisted contract-sent confirmation message (messages table).
   * Present when conversationId was provided and persistence succeeded.
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

function validateRequest(body: SendContractRequest): string | null {
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

  // Flight details validation
  if (!body.flightDetails) {
    return 'Flight details are required';
  }
  if (!body.flightDetails.departureAirport?.icao) {
    return 'Departure airport ICAO code is required';
  }
  if (!body.flightDetails.arrivalAirport?.icao) {
    return 'Arrival airport ICAO code is required';
  }
  if (!body.flightDetails.departureDate) {
    return 'Departure date is required';
  }
  if (!body.flightDetails.aircraftType) {
    return 'Aircraft type is required';
  }
  if (typeof body.flightDetails.passengers !== 'number' || body.flightDetails.passengers < 1) {
    return 'Number of passengers must be at least 1';
  }

  // Pricing validation
  if (!body.pricing) {
    return 'Pricing information is required';
  }
  if (typeof body.pricing.flightCost !== 'number' || body.pricing.flightCost < 0) {
    return 'Flight cost must be a non-negative number';
  }
  if (typeof body.pricing.totalAmount !== 'number' || body.pricing.totalAmount < 0) {
    return 'Total amount must be a non-negative number';
  }

  // Request ID is required
  if (!body.requestId || body.requestId.trim() === '') {
    return 'Request ID is required';
  }

  return null;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/contract/send
 *
 * Generate a PDF contract, store it, and send it to the customer via email.
 *
 * Database Integration Flow:
 * 1. Generate PDF contract
 * 2. Resolve foreign keys (request_id, client_profile_id, quote_id)
 * 3. Create contract record (status='draft')
 * 4. Upload PDF to storage
 * 5. Update contract (file metadata)
 * 6. Send email
 * 7. Update contract (status='sent', email tracking)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<SendContractResponse>> {
  let dbContractId: string | undefined;
  let contractNumber: string | undefined;

  try {
    // Authenticate user
    const authResult = await getAuthenticatedAgent();
    if (isErrorResponse(authResult)) {
      return authResult as NextResponse<SendContractResponse>;
    }

    // Parse request body
    const bodyResult = await parseJsonBody<SendContractRequest>(request);
    if (isErrorResponse(bodyResult)) {
      return bodyResult as NextResponse<SendContractResponse>;
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

    // Generate PDF contract
    let contractResult;
    try {
      contractResult = await generateContract({
        requestId: body.requestId,
        isoAgentId: authResult.id,
        proposalId: body.proposalId,
        quoteId: body.quoteId,
        referenceQuoteNumber: body.referenceQuoteNumber,
        customer: body.customer,
        flightDetails: body.flightDetails,
        pricing: body.pricing,
        amenities: body.amenities,
        paymentMethod: body.paymentMethod,
      });
    } catch (error) {
      console.error('Error generating contract PDF:', error);
      return NextResponse.json(
        {
          success: false,
          emailSent: false,
          error: 'Failed to generate contract PDF',
        },
        { status: 500 }
      );
    }

    // Upload PDF to Supabase storage
    const uploadResult = await uploadContractPdf(
      contractResult.pdfBuffer,
      contractResult.fileName,
      authResult.id
    );

    if (!uploadResult.success) {
      console.error('Error uploading PDF to storage:', uploadResult.error);
      // Continue with email sending even if upload fails
    }

    // Create contract record in database
    try {
      // Create contract with automatic request/client resolution
      const createResult = await createContractWithResolution(
        {
          request_id: body.requestId,
          iso_agent_id: authResult.id,
          proposal_id: body.proposalId,
          quote_id: body.quoteId,
          reference_quote_number: body.referenceQuoteNumber,
          customer: body.customer,
          flightDetails: body.flightDetails,
          pricing: body.pricing,
          amenities: body.amenities,
          paymentMethod: body.paymentMethod,
          metadata: {
            localContractId: contractResult.contractId,
            generatedAt: contractResult.generatedAt,
          },
        },
        body.tripId,
        body.customer.email
      );

      if (createResult) {
        dbContractId = createResult.id;
        contractNumber = createResult.contract_number;

        // Update with file metadata if upload succeeded
        if (uploadResult.success && uploadResult.publicUrl && uploadResult.filePath) {
          await updateContractGenerated(dbContractId, {
            file_name: contractResult.fileName,
            file_url: uploadResult.publicUrl,
            file_path: uploadResult.filePath,
            file_size_bytes: uploadResult.fileSizeBytes ?? contractResult.pdfBuffer.length,
          });
        }

        console.log('[SendContract] Created contract record:', {
          dbId: dbContractId,
          contractNumber,
          requestId: body.requestId,
        });
      } else {
        console.warn('[SendContract] Could not create contract record - request not found');
      }
    } catch (dbError) {
      // Log error but don't fail the request - DB tracking is secondary
      console.error('[SendContract] Error creating contract record:', dbError);
    }

    // Build email subject and body
    const dep = body.flightDetails.departureAirport.icao;
    const arr = body.flightDetails.arrivalAirport.icao;
    const emailSubject = body.emailSubject ||
      `Your Flight Contract: ${dep} → ${arr}`;
    const emailBody = body.emailMessage || '';

    // Send email with PDF attachment
    const emailResult = await sendContractEmail({
      to: body.customer.email,
      customerName: body.customer.name,
      subject: emailSubject,
      body: emailBody,
      contractNumber: contractNumber || contractResult.contractNumber || 'N/A',
      pdfBase64: contractResult.pdfBase64,
      pdfFilename: contractResult.fileName,
      flightDetails: {
        departureAirport: dep,
        arrivalAirport: arr,
        departureDate: body.flightDetails.departureDate,
        aircraftType: body.flightDetails.aircraftType,
      },
      pricing: {
        total: body.pricing.totalAmount,
        currency: body.pricing.currency,
      },
    });

    // Handle email sending failure
    if (!emailResult.success) {
      // If we have a DB record, it stays at 'draft' status
      if (dbContractId) {
        console.warn('[SendContract] Email failed, contract stays at draft status:', dbContractId);
      }

      return NextResponse.json(
        {
          success: false,
          contractId: contractResult.contractId,
          dbContractId,
          contractNumber,
          emailSent: false,
          pricing: contractResult.pricing,
          pdfUrl: uploadResult.publicUrl,
          fileName: contractResult.fileName,
          error: emailResult.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }

    // Update contract record with email tracking data
    if (dbContractId) {
      try {
        await updateContractSent(dbContractId, {
          sent_to_email: body.customer.email,
          email_message_id: emailResult.messageId,
        });
        console.log('[SendContract] Updated contract to sent status:', dbContractId);
      } catch (updateError) {
        // Log error but don't fail - email was sent successfully
        console.error('[SendContract] Error updating contract sent status:', updateError);
      }
    }

    // Persist contract-sent confirmation message so it survives browser refresh
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hasValidConversationId =
      typeof body.conversationId === 'string' &&
      body.conversationId.trim() !== '' &&
      uuidRegex.test(body.conversationId);
    let savedMessageId: string | undefined;

    const isoAgentId = authResult.id;

    if (hasValidConversationId && body.conversationId) {
      try {
        if (isoAgentId) {
          const confirmationContent = emailResult.success
            ? `The contract for ${dep} → ${arr} was sent to ${body.customer.name} at ${body.customer.email}.`
            : `The contract for ${dep} → ${arr} was generated. Email could not be sent.`;
          const contractSentData = {
            flightDetails: {
              departureAirport: dep,
              arrivalAirport: arr,
              departureDate: body.flightDetails.departureDate,
              aircraftType: body.flightDetails.aircraftType,
            },
            client: { name: body.customer.name, email: body.customer.email },
            pdfUrl: uploadResult.publicUrl ?? '',
            fileName: contractResult.fileName,
            contractId: contractResult.contractId,
            contractNumber,
            pricing: {
              total: body.pricing.totalAmount,
              currency: body.pricing.currency,
            },
          };
          const msgId = await saveMessage({
            requestId: body.requestId,
            senderType: 'ai_assistant',
            senderIsoAgentId: isoAgentId,
            content: confirmationContent,
            contentType: 'contract_shared',
            richContent: { contractSent: contractSentData },
          });
          savedMessageId = msgId;
          console.log('[SendContract] Persisted contract-sent confirmation:', {
            requestId: body.requestId,
            messageId: msgId,
          });
        }
      } catch (persistErr) {
        console.warn('[SendContract] Failed to persist contract-sent message:', persistErr);
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      contractId: contractResult.contractId,
      dbContractId,
      contractNumber,
      emailSent: true,
      messageId: emailResult.messageId,
      sentAt: new Date().toISOString(),
      pricing: contractResult.pricing,
      pdfUrl: uploadResult.publicUrl,
      fileName: contractResult.fileName,
      ...(savedMessageId != null ? { savedMessageId } : {}),
    });
  } catch (error) {
    console.error('Error sending contract:', error);

    // If we have a DB record, try to update status
    if (dbContractId) {
      try {
        await updateContractStatus(dbContractId, 'draft');
      } catch {
        // Ignore errors in error handler
      }
    }

    return NextResponse.json(
      {
        success: false,
        emailSent: false,
        dbContractId,
        contractNumber,
        error: 'Failed to send contract',
      },
      { status: 500 }
    );
  }
}
