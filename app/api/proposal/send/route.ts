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
    /** Number of passengers (simple count) or array of passenger details */
    passengers: number | Passenger[];
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
  pdfBase64?: string;
  fileName?: string;
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

    // Return success response with PDF for preview
    return NextResponse.json({
      success: true,
      proposalId: proposalResult.proposalId,
      emailSent: true,
      messageId: emailResult.messageId,
      sentAt: new Date().toISOString(),
      pricing: proposalResult.pricing,
      pdfBase64: proposalResult.pdfBase64,
      fileName: proposalResult.fileName,
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
