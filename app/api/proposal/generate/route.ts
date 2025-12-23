/**
 * Proposal Generate API Route
 *
 * POST /api/proposal/generate
 *
 * Generates a PDF proposal from selected RFQ flights.
 * Used in Step 4 of the RFP workflow for previewing proposals.
 *
 * @see lib/pdf/proposal-generator.ts
 * @see components/avinode/send-proposal-step.tsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateProposal } from '@/lib/pdf';
import {
  getAuthenticatedAgent,
  isErrorResponse,
  ErrorResponses,
  parseJsonBody,
} from '@/lib/utils/api';
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
}

interface GenerateProposalResponse {
  success: boolean;
  proposalId?: string;
  fileName?: string;
  pdfBase64?: string;
  generatedAt?: string;
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
 * POST /api/proposal/generate
 *
 * Generate a PDF proposal from selected RFQ flights.
 * Returns base64-encoded PDF for client-side preview/download.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<GenerateProposalResponse>> {
  try {
    // Authenticate user
    const authResult = await getAuthenticatedAgent();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse request body
    const bodyResult = await parseJsonBody<GenerateProposalRequest>(request);
    if (isErrorResponse(bodyResult)) {
      return bodyResult;
    }

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

    // Return success response with PDF data
    return NextResponse.json({
      success: true,
      proposalId: result.proposalId,
      fileName: result.fileName,
      pdfBase64: result.pdfBase64,
      generatedAt: result.generatedAt,
      pricing: result.pricing,
    });
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
