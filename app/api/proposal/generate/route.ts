/**
 * Proposal Generate API Route
 *
 * POST /api/proposal/generate
 *
 * Generates a PDF proposal from selected RFQ flights.
 * Used in Step 4 of the RFP workflow for previewing proposals.
 *
 * Optionally creates a draft proposal record in the database if
 * tripId is provided and the request can be resolved.
 *
 * @see lib/pdf/proposal-generator.ts
 * @see lib/services/proposal-service.ts
 * @see components/avinode/send-proposal-step.tsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateProposal } from '@/lib/pdf';
import {
  getAuthenticatedAgent,
  isErrorNextResponse,
  parseJsonBody,
  type ErrorResponse,
} from '@/lib/utils/api';
import {
  createProposalWithResolution,
} from '@/lib/services/proposal-service';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';

// Force dynamic rendering - API routes should not be statically generated
export const dynamic = 'force-dynamic';

// =============================================================================
// TYPES
// =============================================================================

interface GenerateProposalRequest {
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
    passengers: number;
    tripId?: string;
  };
  selectedFlights: RFQFlight[];
  jetvisionFeePercentage?: number;
  /** If true, creates a draft proposal record in the database */
  saveDraft?: boolean;
}

interface GenerateProposalResponse {
  success: boolean;
  /** Local proposal ID (e.g., 'JV-ABC123-XYZ') */
  proposalId?: string;
  /** Database proposal UUID (if draft was saved) */
  dbProposalId?: string;
  /** Database proposal number (e.g., 'PROP-2025-001') */
  proposalNumber?: string;
  fileName?: string;
  pdfBase64?: string;
  generatedAt?: string;
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
  error?: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateRequest(body: GenerateProposalRequest): string | null {
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
  // Validate passengers: must exist, be an integer, and >= 1
  if (body.tripDetails.passengers === undefined || body.tripDetails.passengers === null) {
    return 'Passengers must be an integer >= 1';
  }
  // Check if it's a number type, then validate it's an integer >= 1
  if (typeof body.tripDetails.passengers !== 'number' || !Number.isInteger(body.tripDetails.passengers) || body.tripDetails.passengers < 1) {
    return 'Passengers must be an integer >= 1';
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
 * POST /api/proposal/generate
 *
 * Generate a PDF proposal from selected RFQ flights.
 * Returns base64-encoded PDF for client-side preview/download.
 *
 * If saveDraft=true and tripId is provided, creates a draft proposal
 * record in the database for tracking purposes.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<GenerateProposalResponse> | NextResponse<ErrorResponse>> {
  try {
    // Authenticate user
    const authResult = await getAuthenticatedAgent();
    if (isErrorNextResponse(authResult)) {
      return authResult;
    }

    // Parse request body
    const bodyResult = await parseJsonBody<GenerateProposalRequest>(request);
    if (isErrorNextResponse(bodyResult)) {
      return bodyResult;
    }

    // TypeScript has narrowed bodyResult to GenerateProposalRequest after the type guard
    const body = bodyResult;

    // Validate request
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // Generate PDF proposal
    const result = await generateProposal({
      customer: body.customer,
      tripDetails: body.tripDetails,
      selectedFlights: body.selectedFlights,
      jetvisionFeePercentage: body.jetvisionFeePercentage ?? 10,
    });

    // Prepare response
    const response: GenerateProposalResponse = {
      success: true,
      proposalId: result.proposalId,
      fileName: result.fileName,
      pdfBase64: result.pdfBase64,
      generatedAt: result.generatedAt,
      pricing: result.pricing,
    };

    // Optionally create a draft proposal record in the database
    if (body.saveDraft && body.tripDetails.tripId) {
      try {
        // Build proposal title
        const title = `Flight Proposal: ${body.tripDetails.departureAirport.icao} → ${body.tripDetails.arrivalAirport.icao}`;
        const description = `Proposal for ${body.customer.name} - ${body.tripDetails.departureDate}`;

        // Extract quote_id from first selected flight if available
        const quoteId = body.selectedFlights[0]?.quoteId;

        // Create draft proposal with automatic request/client resolution
        const draftResult = await createProposalWithResolution(
          {
            iso_agent_id: authResult.id,
            quote_id: quoteId,
            title,
            description,
            total_amount: result.pricing.subtotal,
            margin_applied: body.jetvisionFeePercentage ?? 10,
            final_amount: result.pricing.total,
            file_name: result.fileName,
            // File URL is placeholder until actual upload happens in /send
            file_url: '',
            metadata: {
              localProposalId: result.proposalId,
              generatedAt: result.generatedAt,
              pricing: result.pricing,
              flightCount: body.selectedFlights.length,
            },
          },
          body.tripDetails.tripId,
          body.customer.email
        );

        if (draftResult) {
          response.dbProposalId = draftResult.id;
          response.proposalNumber = draftResult.proposal_number;
          console.log('[Generate] Created draft proposal record:', {
            dbId: draftResult.id,
            proposalNumber: draftResult.proposal_number,
          });
        } else {
          console.warn('[Generate] Could not create draft proposal - request not found for tripId:', body.tripDetails.tripId);
        }
      } catch (draftError) {
        // Log error but don't fail the request - draft saving is optional
        console.error('[Generate] Error creating draft proposal:', draftError);
      }
    }

    // Return success response with PDF data
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating proposal:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate proposal',
      },
      { status: 500 }
    );
  }
}
