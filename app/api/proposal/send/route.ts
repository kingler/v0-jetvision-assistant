/**
 * Proposal Send API Route
 *
 * POST /api/proposal/send
 *
 * Generates a PDF proposal and sends it via email to the customer.
 * Used in Step 4 of the RFP workflow.
 *
 * @see lib/pdf/proposal-generator.ts
 * @see lib/services/email-service.ts
 * @see components/avinode/send-proposal-step.tsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateProposal } from '@/lib/pdf';
import { sendProposalEmail } from '@/lib/services/email-service';
import {
  getAuthenticatedAgent,
  isErrorResponse,
  parseJsonBody,
} from '@/lib/utils/api';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';

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
    passengers: number;
    tripId?: string;
  };
  selectedFlights: RFQFlight[];
  jetvisionFeePercentage?: number;
  emailSubject?: string;
  emailMessage?: string;
}

interface SendProposalResponse {
  success: boolean;
  proposalId?: string;
  emailSent: boolean;
  messageId?: string;
  sentAt?: string;
  pricing?: {
    subtotal: number;
    jetvisionFee: number;
    taxes: number;
    total: number;
    currency: string;
  };
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

  // Flights validation
  if (!body.selectedFlights || !Array.isArray(body.selectedFlights)) {
    return 'At least one flight must be selected';
  }
  if (body.selectedFlights.length === 0) {
    return 'At least one flight must be selected';
  }

  return null;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/proposal/send
 *
 * Generate a PDF proposal and send it to the customer via email.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<SendProposalResponse>> {
  try {
    // Authenticate user
    const authResult = await getAuthenticatedAgent();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse request body
    const bodyResult = await parseJsonBody<SendProposalRequest>(request);
    if (isErrorResponse(bodyResult)) {
      return bodyResult;
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

    // Generate PDF proposal
    let proposalResult;
    try {
      proposalResult = await generateProposal({
        customer: body.customer,
        tripDetails: body.tripDetails,
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

    // Send email with PDF attachment
    const emailResult = await sendProposalEmail({
      to: body.customer.email,
      customerName: body.customer.name,
      subject: body.emailSubject,
      body: body.emailMessage,
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
      return NextResponse.json(
        {
          success: false,
          proposalId: proposalResult.proposalId,
          emailSent: false,
          pricing: proposalResult.pricing,
          error: emailResult.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      proposalId: proposalResult.proposalId,
      emailSent: true,
      messageId: emailResult.messageId,
      sentAt: new Date().toISOString(),
      pricing: proposalResult.pricing,
    });
  } catch (error) {
    console.error('Error sending proposal:', error);

    return NextResponse.json(
      {
        success: false,
        emailSent: false,
        error: 'Failed to send proposal',
      },
      { status: 500 }
    );
  }
}
