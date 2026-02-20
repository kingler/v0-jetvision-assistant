/**
 * Shared test fixtures for payment confirmation flow tests
 *
 * @see app/api/contract/[id]/payment/route.ts
 * @see lib/services/contract-service.ts
 * @see lib/utils/map-db-message-to-ui.ts
 */

import type { ContractStatus } from '@/lib/types/contract';

// =============================================================================
// CONSTANTS
// =============================================================================

export const MOCK_AGENT_ID = 'agent-uuid-123';
export const MOCK_CONTRACT_ID = 'contract-uuid-456';
export const MOCK_REQUEST_ID = 'request-uuid-789';

// =============================================================================
// CONTRACT DATA
// =============================================================================

/**
 * Full contract DB row (status: 'sent', owned by MOCK_AGENT_ID)
 */
export const mockContractRow = {
  id: MOCK_CONTRACT_ID,
  contract_number: 'CONTRACT-2026-001',
  request_id: MOCK_REQUEST_ID,
  iso_agent_id: MOCK_AGENT_ID,
  proposal_id: null,
  quote_id: null,
  client_profile_id: null,
  reference_quote_number: null,
  client_name: 'John Smith',
  client_email: 'john@example.com',
  client_company: 'Acme Corp',
  client_phone: null,
  departure_airport: 'KTEB',
  arrival_airport: 'KVNY',
  departure_date: '2026-02-15',
  departure_time: '09:00',
  aircraft_type: 'Heavy Jet',
  aircraft_model: 'Gulfstream G650',
  tail_number: 'N650EJ',
  passengers: 6,
  flight_cost: 40000,
  federal_excise_tax: 3000,
  domestic_segment_fee: 31.2,
  subtotal: 43031.2,
  credit_card_fee_percentage: 5,
  total_amount: 45182.76,
  currency: 'USD',
  amenities: {},
  payment_method: 'wire',
  file_name: null,
  file_url: null,
  file_path: null,
  file_size_bytes: null,
  sent_to_email: 'john@example.com',
  email_message_id: null,
  client_signature_data: null,
  client_signed_name: null,
  client_signed_date: null,
  payment_reference: null,
  payment_amount: null,
  payment_date: null,
  cc_last_four: null,
  payment_received_at: null,
  completed_at: null,
  cancelled_at: null,
  expired_at: null,
  sent_at: '2026-02-10T10:00:00Z',
  signed_at: null,
  viewed_at: null,
  status: 'sent' as ContractStatus,
  metadata: {},
  created_at: '2026-02-10T09:00:00Z',
  updated_at: '2026-02-10T10:00:00Z',
};

/**
 * Valid API request body for recording payment
 */
export const mockPaymentRequestBody = {
  payment_reference: 'WT-2026-001',
  payment_amount: 45182.76,
  payment_method: 'wire' as const,
  markComplete: true,
  requestId: MOCK_REQUEST_ID,
  customerName: 'John Smith',
  flightRoute: 'KTEB to KVNY',
};

/**
 * UpdateContractPaymentResult shape
 */
export const mockPaymentResult = {
  id: MOCK_CONTRACT_ID,
  contract_number: 'CONTRACT-2026-001',
  status: 'paid' as ContractStatus,
  payment_reference: 'WT-2026-001',
  payment_amount: 45182.76,
  payment_received_at: '2026-02-10T12:00:00Z',
};

/**
 * Full Contract with status='completed' (after completeContract)
 */
export const mockCompletedContract = {
  ...mockContractRow,
  status: 'completed' as ContractStatus,
  payment_reference: 'WT-2026-001',
  payment_amount: 45182.76,
  payment_received_at: '2026-02-10T12:00:00Z',
  completed_at: '2026-02-10T12:00:01Z',
  updated_at: '2026-02-10T12:00:01Z',
};

// =============================================================================
// RICH CONTENT PAYLOADS
// =============================================================================

/**
 * richContent for payment_confirmed messages
 */
export const mockPaymentConfirmedRichContent = {
  paymentConfirmed: {
    contractId: MOCK_CONTRACT_ID,
    contractNumber: 'CONTRACT-2026-001',
    paymentAmount: 45182.76,
    paymentMethod: 'wire',
    paymentReference: 'WT-2026-001',
    paidAt: '2026-02-10T12:00:00Z',
    currency: 'USD',
  },
};

/**
 * richContent for deal_closed messages
 */
export const mockDealClosedRichContent = {
  dealClosed: {
    contractNumber: 'CONTRACT-2026-001',
    customerName: 'John Smith',
    flightRoute: 'KTEB to KVNY',
    dealValue: 45182.76,
    currency: 'USD',
    paymentReceivedAt: '2026-02-10T12:00:00Z',
  },
};

// =============================================================================
// FULL TIMELINE RICH CONTENT (with all 3 timestamps)
// =============================================================================

/**
 * richContent for deal_closed messages with full timeline
 */
export const mockDealClosedFullTimelineRichContent = {
  dealClosed: {
    contractNumber: 'CONTRACT-2026-001',
    customerName: 'John Smith',
    flightRoute: 'KTEB to KVNY',
    dealValue: 45182.76,
    currency: 'USD',
    proposalSentAt: '2026-02-08T14:30:00Z',
    contractSentAt: '2026-02-09T10:00:00Z',
    paymentReceivedAt: '2026-02-10T12:00:00Z',
  },
};

// =============================================================================
// CREDIT CARD PAYMENT VARIANT
// =============================================================================

/**
 * richContent for payment_confirmed via credit card
 */
export const mockCreditCardPaymentRichContent = {
  paymentConfirmed: {
    contractId: MOCK_CONTRACT_ID,
    contractNumber: 'CONTRACT-2026-002',
    paymentAmount: 92500,
    paymentMethod: 'credit_card',
    paymentReference: 'CC-4242-2026-001',
    paidAt: '2026-02-14T16:30:00Z',
    currency: 'USD',
  },
};

// =============================================================================
// EUR CURRENCY VARIANT
// =============================================================================

/**
 * richContent for payment in EUR
 */
export const mockEurPaymentRichContent = {
  paymentConfirmed: {
    contractId: MOCK_CONTRACT_ID,
    contractNumber: 'CONTRACT-2026-003',
    paymentAmount: 185000,
    paymentMethod: 'wire',
    paymentReference: 'WT-EUR-2026-001',
    paidAt: '2026-02-15T09:00:00Z',
    currency: 'EUR',
  },
};
