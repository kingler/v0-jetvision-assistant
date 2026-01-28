/**
 * Contract API Route
 *
 * GET /api/contract/[id]
 * PATCH /api/contract/[id]
 *
 * Retrieve and update contract details by ID or contract number.
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
  getContractByNumber,
  updateContractStatus,
} from '@/lib/services/contract-service';
import type { ContractStatus } from '@/lib/types/contract';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// =============================================================================
// TYPES
// =============================================================================

interface GetContractResponse {
  success: boolean;
  contract?: {
    id: string;
    contract_number: string;
    status: ContractStatus;
    client_name: string;
    client_email: string;
    departure_airport: string;
    arrival_airport: string;
    departure_date: string;
    aircraft_type: string;
    total_amount: number;
    currency: string;
    file_url: string | null;
    created_at: string;
    sent_at: string | null;
    signed_at: string | null;
    payment_received_at: string | null;
  };
  error?: string;
}

interface UpdateContractRequest {
  status: ContractStatus;
}

interface UpdateContractResponse {
  success: boolean;
  contract?: {
    id: string;
    contract_number: string;
    status: ContractStatus;
  };
  error?: string;
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/contract/[id]
 *
 * Retrieve contract details by ID or contract number.
 *
 * The [id] parameter can be:
 * - A UUID (database ID)
 * - A contract number (e.g., 'CONTRACT-2026-001')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<GetContractResponse> | NextResponse<ErrorResponse>> {
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

    // Determine if ID is a UUID or contract number
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // Fetch contract
    const contract = isUuid
      ? await getContractById(id)
      : await getContractByNumber(id);

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

    // Return contract details
    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        contract_number: contract.contract_number,
        status: contract.status as ContractStatus,
        client_name: contract.client_name,
        client_email: contract.client_email,
        departure_airport: contract.departure_airport,
        arrival_airport: contract.arrival_airport,
        departure_date: contract.departure_date,
        aircraft_type: contract.aircraft_type,
        total_amount: Number(contract.total_amount),
        currency: contract.currency || 'USD',
        file_url: contract.file_url,
        created_at: contract.created_at || '',
        sent_at: contract.sent_at,
        signed_at: contract.signed_at,
        payment_received_at: contract.payment_received_at,
      },
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contract' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contract/[id]
 *
 * Update contract status.
 *
 * Valid status transitions:
 * - draft -> sent (when email is sent)
 * - sent -> viewed (when client opens contract)
 * - sent/viewed -> signed (when client signs)
 * - signed -> payment_pending (awaiting payment)
 * - payment_pending -> paid (payment received)
 * - paid -> completed (contract executed)
 * - any -> cancelled (contract cancelled)
 * - any -> expired (contract expired)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateContractResponse> | NextResponse<ErrorResponse>> {
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
    const bodyResult = await parseJsonBody<UpdateContractRequest>(request);
    if (isErrorNextResponse(bodyResult)) {
      return bodyResult;
    }

    const body = bodyResult;

    // Validate status
    const validStatuses: ContractStatus[] = [
      'draft', 'sent', 'viewed', 'signed', 'payment_pending', 'paid', 'completed', 'cancelled', 'expired'
    ];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch contract to verify ownership
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

    // Update status
    const updatedContract = await updateContractStatus(id, body.status);

    return NextResponse.json({
      success: true,
      contract: {
        id: updatedContract.id,
        contract_number: updatedContract.contract_number,
        status: updatedContract.status as ContractStatus,
      },
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update contract' },
      { status: 500 }
    );
  }
}
