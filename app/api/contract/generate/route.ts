/**
 * Contract Generate API Route
 *
 * POST /api/contract/generate
 *
 * Generates a PDF contract from flight booking data.
 * Used when the "Book Flight" button is clicked in the RFQ workflow.
 *
 * Optionally creates a draft contract record in the database if
 * saveDraft=true is set.
 *
 * @see lib/pdf/contract-generator.ts
 * @see lib/services/contract-service.ts
 * @see components/avinode/book-flight-modal.tsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateContract } from '@/lib/pdf';
import { downloadProposalPdf } from '@/lib/supabase/admin';
import {
  getAuthenticatedAgent,
  isErrorNextResponse,
  parseJsonBody,
  type ErrorResponse,
} from '@/lib/utils/api';
import {
  createContractWithResolution,
} from '@/lib/services/contract-service';
import { getProposalsByRequest } from '@/lib/services/proposal-service';
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

interface GenerateContractRequest {
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
  /** If true, creates a draft contract record in the database */
  saveDraft?: boolean;
}

interface GenerateContractResponse {
  success: boolean;
  /** Local contract ID (e.g., 'CONTRACT-ABC123-XYZ') */
  contractId?: string;
  /** Database contract UUID (if draft was saved) */
  dbContractId?: string;
  /** Database contract number (e.g., 'CONTRACT-2026-001') */
  contractNumber?: string;
  fileName?: string;
  pdfBase64?: string;
  generatedAt?: string;
  pricing?: ContractPricing;
  error?: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateRequest(body: GenerateContractRequest): string | null {
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
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.customer.email.trim())) {
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
 * POST /api/contract/generate
 *
 * Generate a PDF contract from flight booking data.
 * Returns base64-encoded PDF for client-side preview/download.
 *
 * If saveDraft=true, creates a draft contract record in the database
 * for tracking purposes.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<GenerateContractResponse> | NextResponse<ErrorResponse>> {
  try {
    // Authenticate user
    const authResult = await getAuthenticatedAgent();
    if (isErrorNextResponse(authResult)) {
      return authResult;
    }

    // Parse request body
    const bodyResult = await parseJsonBody<GenerateContractRequest>(request);
    if (isErrorNextResponse(bodyResult)) {
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

    // Fetch proposal PDF to include as first pages (if available)
    let proposalPdfBuffer: Buffer | undefined;
    try {
      const proposals = await getProposalsByRequest(body.requestId);
      const latestProposal = proposals.find((p) => p.file_path);
      if (latestProposal?.file_path) {
        const buffer = await downloadProposalPdf(latestProposal.file_path);
        if (buffer) {
          proposalPdfBuffer = buffer;
          console.log('[GenerateContract] Found proposal PDF to prepend:', latestProposal.proposal_number);
        }
      }
    } catch (proposalErr) {
      console.warn('[GenerateContract] Could not fetch proposal PDF:', proposalErr);
    }

    // Generate PDF contract
    const result = await generateContract({
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
      saveDraft: body.saveDraft,
      proposalPdfBuffer,
    });

    // Prepare response
    const response: GenerateContractResponse = {
      success: true,
      contractId: result.contractId,
      fileName: result.fileName,
      pdfBase64: result.pdfBase64,
      generatedAt: result.generatedAt,
      pricing: result.pricing,
    };

    // Optionally create a draft contract record in the database
    if (body.saveDraft) {
      try {
        // Create contract with automatic request/client resolution
        const draftResult = await createContractWithResolution(
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
              localContractId: result.contractId,
              generatedAt: result.generatedAt,
            },
          },
          body.tripId,
          body.customer.email
        );

        if (draftResult) {
          response.dbContractId = draftResult.id;
          response.contractNumber = draftResult.contract_number;
          console.log('[GenerateContract] Created draft contract record:', {
            dbId: draftResult.id,
            contractNumber: draftResult.contract_number,
          });
        } else {
          console.warn('[GenerateContract] Could not create draft contract - request not found');
        }
      } catch (draftError) {
        // Log error but don't fail the request - draft saving is optional
        console.error('[GenerateContract] Error creating draft contract:', draftError);
      }
    }

    // Return success response with PDF data
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating contract:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate contract',
      },
      { status: 500 }
    );
  }
}
