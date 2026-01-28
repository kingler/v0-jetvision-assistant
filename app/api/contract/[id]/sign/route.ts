/**
 * Contract Sign API Route
 *
 * POST /api/contract/[id]/sign
 *
 * Record client signature data for a contract.
 * Updates contract status to 'signed'.
 *
 * @see lib/services/contract-service.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedAgent,
  isErrorNextResponse,
  parseJsonBody,
  type ErrorResponse,
} from '@/lib/utils/api';
import {
  getContractById,
  updateContractSigned,
} from '@/lib/services/contract-service';
import type { ContractSignatureData, ContractStatus } from '@/lib/types/contract';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// =============================================================================
// TYPES
// =============================================================================

interface SignContractRequest {
  /** Signature image data (base64 or signature pad JSON) */
  signature_data: string;
  /** Name as signed by client */
  signed_name: string;
  /** Signature timestamp (ISO string) */
  signed_date?: string;
}

interface SignContractResponse {
  success: boolean;
  contract?: {
    id: string;
    contract_number: string;
    status: ContractStatus;
    client_signed_name: string | null;
    signed_at: string | null;
  };
  error?: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateRequest(body: SignContractRequest): string | null {
  if (!body.signature_data || body.signature_data.trim() === '') {
    return 'Signature data is required';
  }

  if (!body.signed_name || body.signed_name.trim() === '') {
    return 'Signed name is required';
  }

  return null;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/contract/[id]/sign
 *
 * Record client signature for a contract.
 *
 * Request body:
 * - signature_data: Base64-encoded signature image or signature pad JSON
 * - signed_name: Name as signed by the client
 * - signed_date: Optional ISO timestamp (defaults to now)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SignContractResponse> | NextResponse<ErrorResponse>> {
  try {
    // Authenticate user
    const authResult = await getAuthenticatedAgent();
    if (isErrorNextResponse(authResult)) {
      return authResult;
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Contract ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const bodyResult = await parseJsonBody<SignContractRequest>(request);
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

    // Fetch contract to verify ownership and status
    const contract = await getContractById(id);
    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Verify the contract belongs to the authenticated agent
    if (contract.iso_agent_id !== authResult.id) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      );
    }

    // Verify contract is in a signable state (sent or viewed)
    const signableStatuses: ContractStatus[] = ['sent', 'viewed'];
    if (!signableStatuses.includes(contract.status as ContractStatus)) {
      return NextResponse.json(
        { success: false, error: `Contract cannot be signed in '${contract.status}' status` },
        { status: 400 }
      );
    }

    // Prepare signature data
    const signatureData: ContractSignatureData = {
      signature_data: body.signature_data,
      signed_name: body.signed_name,
      signed_date: body.signed_date || new Date().toISOString(),
    };

    // Update contract with signature
    const result = await updateContractSigned(id, signatureData);

    console.log('[SignContract] Contract signed:', {
      id: result.id,
      contractNumber: result.contract_number,
      signedBy: result.client_signed_name,
    });

    return NextResponse.json({
      success: true,
      contract: {
        id: result.id,
        contract_number: result.contract_number,
        status: result.status,
        client_signed_name: result.client_signed_name,
        signed_at: result.signed_at,
      },
    });
  } catch (error) {
    console.error('Error signing contract:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sign contract' },
      { status: 500 }
    );
  }
}
