/**
 * @vitest-environment node
 */

/**
 * Contract Service — UUID Validation & createContract Tests (ONEK-387)
 *
 * Verifies that non-UUID values passed to UUID FK columns (quote_id,
 * proposal_id) are silently set to null and stored in reference_quote_number,
 * while valid UUIDs pass through unchanged.
 *
 * AC-1: Non-UUID quote_id values are set to null in the quote_id column
 * AC-2: Non-UUID values are stored in reference_quote_number
 * AC-3: Valid UUIDs pass through unchanged
 * AC-4: Coverage ≥ 75%
 *
 * @see lib/services/contract-service.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CreateContractInput } from '@/lib/types/contract';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockRpc = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
const mockFindRequestByTripId = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
  findRequestByTripId: (...args: unknown[]) => mockFindRequestByTripId(...args),
}));

// =============================================================================
// TEST DATA
// =============================================================================

const VALID_UUID_1 = 'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb';
const VALID_UUID_2 = 'cccccccc-4444-5555-6666-dddddddddddd';
const VALID_UUID_REQUEST = 'eeeeeeee-7777-8888-9999-ffffffffffff';
const VALID_UUID_AGENT = '00000000-aaaa-bbbb-cccc-111111111111';

const NON_UUID_QUOTE_ID = 'aquote-398402531';
const NON_UUID_PROPOSAL_ID = 'aproposal-12345678';
const MIXED_CASE_UUID = 'AAAAAAAA-1111-2222-3333-BBBBBBBBBBBB';

/** Minimal valid CreateContractInput with UUIDs for all FK fields */
function makeInput(overrides: Partial<CreateContractInput> = {}): CreateContractInput {
  return {
    request_id: VALID_UUID_REQUEST,
    iso_agent_id: VALID_UUID_AGENT,
    customer: {
      name: 'Test Customer',
      email: 'test@example.com',
    },
    flightDetails: {
      departureAirport: { icao: 'KTEB' },
      arrivalAirport: { icao: 'KLAX' },
      departureDate: '2026-04-01',
      aircraftType: 'Gulfstream G650',
      passengers: 4,
    },
    pricing: {
      flightCost: 50000,
      federalExciseTax: 3750,
      domesticSegmentFee: 20.80,
      subtotal: 53770.80,
      creditCardFeePercentage: 5.0,
      totalAmount: 53770.80,
      currency: 'USD',
    },
    ...overrides,
  };
}

/** Mock DB contract result returned by Supabase insert */
const MOCK_DB_RESULT = {
  id: VALID_UUID_1,
  contract_number: 'CONTRACT-2026-001',
  status: 'draft',
  created_at: '2026-03-01T12:00:00Z',
};

// =============================================================================
// HELPERS
// =============================================================================

/** Capture the insertData object passed to supabase.from().insert() */
function captureInsertData(): Record<string, unknown> | null {
  if (mockInsert.mock.calls.length === 0) return null;
  return mockInsert.mock.calls[0][0] as Record<string, unknown>;
}

function setupSuccessfulInsert() {
  mockRpc.mockResolvedValue({ data: 'CONTRACT-2026-001', error: null });
  mockSingle.mockResolvedValue({ data: MOCK_DB_RESULT, error: null });
}

// =============================================================================
// TESTS
// =============================================================================

describe('Contract Service — createContract()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
    setupSuccessfulInsert();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ---------------------------------------------------------------------------
  // AC-3: Valid UUIDs pass through unchanged
  // ---------------------------------------------------------------------------

  describe('AC-3 — Valid UUIDs pass through to DB insert unchanged', () => {
    it('passes a valid quote_id UUID directly to the insert data', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({ quote_id: VALID_UUID_1 }));

      const inserted = captureInsertData();
      expect(inserted).not.toBeNull();
      expect(inserted!.quote_id).toBe(VALID_UUID_1);
    });

    it('passes a valid proposal_id UUID directly to the insert data', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({ proposal_id: VALID_UUID_2 }));

      const inserted = captureInsertData();
      expect(inserted!.proposal_id).toBe(VALID_UUID_2);
    });

    it('handles uppercase UUID correctly (case-insensitive regex)', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({ quote_id: MIXED_CASE_UUID }));

      const inserted = captureInsertData();
      // UUID regex is case-insensitive — should pass through
      expect(inserted!.quote_id).toBe(MIXED_CASE_UUID);
    });

    it('passes both valid quote_id and proposal_id through together', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({ quote_id: VALID_UUID_1, proposal_id: VALID_UUID_2 }));

      const inserted = captureInsertData();
      expect(inserted!.quote_id).toBe(VALID_UUID_1);
      expect(inserted!.proposal_id).toBe(VALID_UUID_2);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-1: Non-UUID quote_id values are set to null
  // ---------------------------------------------------------------------------

  describe('AC-1 — Non-UUID quote_id is set to null in DB insert', () => {
    it('sets quote_id to null when given an Avinode-style aquote ID', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({ quote_id: NON_UUID_QUOTE_ID }));

      const inserted = captureInsertData();
      expect(inserted!.quote_id).toBeNull();
    });

    it('sets quote_id to null for any string that is not a UUID', async () => {
      const nonUuids = [
        'aquote-123',
        'flight-search-id',
        '12345',
        'CONTRACT-MM7XPEY4-QADB',
        'aaaaaaaa-1111-2222-3333', // too short
      ];

      const { createContract } = await import('@/lib/services/contract-service');

      for (const nonUuid of nonUuids) {
        vi.clearAllMocks();
        setupSuccessfulInsert();

        await createContract(makeInput({ quote_id: nonUuid }));

        const inserted = captureInsertData();
        expect(inserted!.quote_id).toBeNull();
      }
    });

    it('sets proposal_id to null when given a non-UUID proposal identifier', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({ proposal_id: NON_UUID_PROPOSAL_ID }));

      const inserted = captureInsertData();
      expect(inserted!.proposal_id).toBeNull();
    });

    it('sets quote_id to null when quote_id is undefined', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({ quote_id: undefined }));

      const inserted = captureInsertData();
      expect(inserted!.quote_id).toBeNull();
    });

    it('sets proposal_id to null when proposal_id is undefined', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({ proposal_id: undefined }));

      const inserted = captureInsertData();
      expect(inserted!.proposal_id).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2: Non-UUID values are stored in reference_quote_number
  // ---------------------------------------------------------------------------

  describe('AC-2 — Non-UUID quote_id stored in reference_quote_number', () => {
    it('stores the non-UUID quote_id in reference_quote_number as fallback', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({ quote_id: NON_UUID_QUOTE_ID }));

      const inserted = captureInsertData();
      expect(inserted!.reference_quote_number).toBe(NON_UUID_QUOTE_ID);
    });

    it('uses caller-supplied reference_quote_number over the non-UUID quote_id', async () => {
      const { createContract } = await import('@/lib/services/contract-service');
      const EXPLICIT_REF = 'my-explicit-reference-number';

      await createContract(makeInput({
        quote_id: NON_UUID_QUOTE_ID,
        reference_quote_number: EXPLICIT_REF,
      }));

      const inserted = captureInsertData();
      // Explicit reference_quote_number takes precedence over non-UUID quote_id
      expect(inserted!.reference_quote_number).toBe(EXPLICIT_REF);
    });

    it('leaves reference_quote_number null when quote_id is a valid UUID', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({
        quote_id: VALID_UUID_1,
        reference_quote_number: undefined,
      }));

      const inserted = captureInsertData();
      expect(inserted!.reference_quote_number).toBeNull();
    });

    it('leaves reference_quote_number null when both quote_id and reference_quote_number are absent', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      await createContract(makeInput({
        quote_id: undefined,
        reference_quote_number: undefined,
      }));

      const inserted = captureInsertData();
      expect(inserted!.reference_quote_number).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Error propagation (ONEK-385 AC-1)
  // ---------------------------------------------------------------------------

  describe('Error Propagation (ONEK-385 AC-1)', () => {
    it('throws when Supabase insert returns an error', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Foreign key constraint violation', code: '23503' },
      });

      const { createContract } = await import('@/lib/services/contract-service');

      await expect(createContract(makeInput())).rejects.toThrow(
        'Failed to create contract'
      );
    });

    it('includes the Supabase error message in the thrown error', async () => {
      const supabaseMsg = 'insert or update on table "contracts" violates foreign key constraint';
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: supabaseMsg, code: '23503' },
      });

      const { createContract } = await import('@/lib/services/contract-service');

      await expect(createContract(makeInput())).rejects.toThrow(supabaseMsg);
    });

    it('returns the created contract result on success', async () => {
      const { createContract } = await import('@/lib/services/contract-service');

      const result = await createContract(makeInput({ quote_id: VALID_UUID_1 }));

      expect(result.id).toBe(MOCK_DB_RESULT.id);
      expect(result.contract_number).toBe(MOCK_DB_RESULT.contract_number);
      expect(result.status).toBe('draft');
    });
  });

  // ---------------------------------------------------------------------------
  // createContractWithResolution
  // ---------------------------------------------------------------------------

  describe('createContractWithResolution()', () => {
    it('returns null when tripId cannot be resolved to a request', async () => {
      mockFindRequestByTripId.mockResolvedValue(null);

      const { createContractWithResolution } = await import('@/lib/services/contract-service');

      const result = await createContractWithResolution(
        makeInput({ request_id: undefined }),
        'atrip-999999999'
      );

      expect(result).toBeNull();
    });

    it('throws when no request_id and no tripId are provided', async () => {
      const { createContractWithResolution } = await import('@/lib/services/contract-service');

      await expect(
        createContractWithResolution(makeInput({ request_id: undefined }))
      ).rejects.toThrow('request_id is required');
    });

    it('resolves request_id from tripId and creates contract', async () => {
      mockFindRequestByTripId.mockResolvedValue({ id: VALID_UUID_REQUEST });

      const { createContractWithResolution } = await import('@/lib/services/contract-service');

      const result = await createContractWithResolution(
        makeInput({ request_id: undefined }),
        'atrip-123456'
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(MOCK_DB_RESULT.id);
      expect(mockFindRequestByTripId).toHaveBeenCalledWith('atrip-123456', VALID_UUID_AGENT);
    });

    it('uses provided request_id directly without resolving via tripId', async () => {
      const { createContractWithResolution } = await import('@/lib/services/contract-service');

      const result = await createContractWithResolution(
        makeInput({ request_id: VALID_UUID_REQUEST })
      );

      expect(result).not.toBeNull();
      expect(mockFindRequestByTripId).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // generateContractNumber fallback
  // ---------------------------------------------------------------------------

  describe('generateContractNumber() fallback', () => {
    it('uses timestamp-based fallback when rpc returns an error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'function not found', code: 'PGRST202' },
      });
      mockSingle.mockResolvedValue({ data: MOCK_DB_RESULT, error: null });

      const { createContract } = await import('@/lib/services/contract-service');

      const result = await createContract(makeInput());

      // Should still succeed despite rpc error — fallback number used
      expect(result.id).toBe(MOCK_DB_RESULT.id);

      const inserted = captureInsertData();
      // Fallback number starts with 'CONTRACT-<year>-'
      expect(inserted!.contract_number).toMatch(/^CONTRACT-\d{4}-/);
    });
  });

  // ---------------------------------------------------------------------------
  // Payment method normalization
  // ---------------------------------------------------------------------------

  describe('Payment method normalization', () => {
    it('maps "wire" to "wire"', async () => {
      const { createContract } = await import('@/lib/services/contract-service');
      await createContract(makeInput({ paymentMethod: 'wire' }));

      const inserted = captureInsertData();
      expect(inserted!.payment_method).toBe('wire');
    });

    it('maps "credit_card" to "credit_card"', async () => {
      const { createContract } = await import('@/lib/services/contract-service');
      await createContract(makeInput({ paymentMethod: 'credit_card' }));

      const inserted = captureInsertData();
      expect(inserted!.payment_method).toBe('credit_card');
    });

    it('maps undefined payment_method to null', async () => {
      const { createContract } = await import('@/lib/services/contract-service');
      await createContract(makeInput({ paymentMethod: undefined }));

      const inserted = captureInsertData();
      expect(inserted!.payment_method).toBeNull();
    });
  });
});
