/**
 * Contract Payment API Route
 *
 * POST /api/contract/[id]/payment
 *
 * Record payment information for a contract.
 * Updates contract status to 'paid'.
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
  updateContractPayment,
  completeContract,
} from '@/lib/services/contract-service';
import type { ContractPaymentData, ContractStatus } from '@/lib/types/contract';
import { saveMessage } from '@/lib/conversation/message-persistence';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// =============================================================================
// TYPES
// =============================================================================

interface RecordPaymentRequest {
  /** Payment reference (wire ref or CC transaction ID) */
  payment_reference: string;
  /** Amount paid */
  payment_amount: number;
  /** Payment date (ISO string) */
  payment_date?: string;
  /** Payment method used */
  payment_method: 'wire' | 'credit_card' | 'check';
  /** Last 4 digits of credit card (if applicable) */
  cc_last_four?: string;
  /** If true, also marks the contract as completed */
  markComplete?: boolean;
  /** Request ID for message persistence */
  requestId?: string;
  /** Customer name for closed-won card */
  customerName?: string;
  /** Flight route for closed-won card */
  flightRoute?: string;
}

interface RecordPaymentResponse {
  success: boolean;
  contract?: {
    id: string;
    contract_number: string;
    status: ContractStatus;
    payment_reference: string | null;
    payment_amount: number | null;
    payment_received_at: string | null;
  };
  error?: string;
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateRequest(body: RecordPaymentRequest): string | null {
  if (!body.payment_reference || body.payment_reference.trim() === '') {
    return 'Payment reference is required';
  }

  if (typeof body.payment_amount !== 'number' || body.payment_amount <= 0) {
    return 'Payment amount must be a positive number';
  }

  if (!body.payment_method || !['wire', 'credit_card', 'check'].includes(body.payment_method)) {
    return 'Payment method must be "wire", "credit_card", or "check"';
  }

  if (body.payment_method === 'credit_card' && body.cc_last_four) {
    if (!/^\d{4}$/.test(body.cc_last_four)) {
      return 'CC last four must be exactly 4 digits';
    }
  }

  return null;
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

/**
 * POST /api/contract/[id]/payment
 *
 * Record payment for a contract.
 *
 * Request body:
 * - payment_reference: Wire transfer reference or CC transaction ID
 * - payment_amount: Amount paid
 * - payment_date: Optional ISO timestamp (defaults to now)
 * - payment_method: 'wire' or 'credit_card'
 * - cc_last_four: Last 4 digits of CC (if credit_card payment)
 * - markComplete: If true, also marks contract as completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<RecordPaymentResponse> | NextResponse<ErrorResponse>> {
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
    const bodyResult = await parseJsonBody<RecordPaymentRequest>(request);
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

    // Verify contract is in a payable state (signed or payment_pending)
    const payableStatuses: ContractStatus[] = ['sent', 'signed', 'payment_pending'];
    if (!payableStatuses.includes(contract.status as ContractStatus)) {
      return NextResponse.json(
        { success: false, error: `Cannot record payment for contract in '${contract.status}' status` },
        { status: 400 }
      );
    }

    // Prepare payment data
    const paymentData: ContractPaymentData = {
      payment_reference: body.payment_reference,
      payment_amount: body.payment_amount,
      payment_date: body.payment_date || new Date().toISOString(),
      payment_method: body.payment_method,
      cc_last_four: body.cc_last_four,
    };

    // Update contract with payment
    let result = await updateContractPayment(id, paymentData);

    console.log('[RecordPayment] Payment recorded:', {
      id: result.id,
      contractNumber: result.contract_number,
      paymentRef: result.payment_reference,
      amount: result.payment_amount,
    });

    // Optionally mark contract as completed
    if (body.markComplete) {
      const completedContract = await completeContract(id);
      result = {
        id: completedContract.id,
        contract_number: completedContract.contract_number,
        status: completedContract.status as ContractStatus,
        payment_reference: completedContract.payment_reference,
        payment_amount: completedContract.payment_amount ? Number(completedContract.payment_amount) : null,
        payment_received_at: completedContract.payment_received_at,
      };
      console.log('[RecordPayment] Contract marked as completed:', id);
    }

    // Persist messages to chat history if requestId is provided
    if (body.requestId) {
      try {
        // Persist payment confirmation message
        await saveMessage({
          requestId: body.requestId,
          senderType: 'ai_assistant',
          content: `Payment confirmed for contract ${result.contract_number}`,
          contentType: 'payment_confirmed',
          richContent: {
            paymentConfirmed: {
              contractId: result.id,
              contractNumber: result.contract_number,
              paymentAmount: result.payment_amount,
              paymentMethod: body.payment_method,
              paymentReference: result.payment_reference,
              paidAt: result.payment_received_at,
              currency: 'USD',
            },
          },
        });

        console.log('[RecordPayment] Payment confirmation message persisted');

        // Persist deal closed message if contract was marked complete
        if (body.markComplete) {
          await saveMessage({
            requestId: body.requestId,
            senderType: 'ai_assistant',
            content: `Deal closed for contract ${result.contract_number}`,
            contentType: 'deal_closed',
            richContent: {
              dealClosed: {
                contractNumber: result.contract_number,
                customerName: body.customerName || 'Customer',
                flightRoute: body.flightRoute || 'N/A',
                dealValue: result.payment_amount,
                currency: 'USD',
                paymentReceivedAt: result.payment_received_at,
              },
            },
          });

          console.log('[RecordPayment] Deal closed message persisted');
        }
      } catch (messagePersistenceError) {
        // Don't fail the payment response if message persistence fails
        console.error('[RecordPayment] Failed to persist messages:', messagePersistenceError);
      }
    }

    return NextResponse.json({
      success: true,
      contract: {
        id: result.id,
        contract_number: result.contract_number,
        status: result.status,
        payment_reference: result.payment_reference,
        payment_amount: result.payment_amount,
        payment_received_at: result.payment_received_at,
      },
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}
