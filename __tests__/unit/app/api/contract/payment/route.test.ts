/**
 * @vitest-environment node
 */

/**
 * Contract Payment API Route — Comprehensive Tests (ONEK-386)
 *
 * Tests all 5 contract-resolution strategies, auto-promotion of draft
 * contracts, and the full payment recording flow.
 *
 * Resolution strategies tested:
 *   Strategy 1 — Look up by contract_number (non-UUID id)
 *   Strategy 2 — Look up by metadata.localContractId
 *   Strategy 3 — Look up by reference_quote_number
 *   Strategy 4 — Look up by requestId (body) when url id is unresolved
 *   Strategy 5 — On-demand contract creation when all strategies fail
 *
 * @see app/api/contract/[id]/payment/route.ts
 * @see lib/services/contract-service.ts
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// MOCK SETUP — all vi.fn() created before vi.mock() factories
// =============================================================================

const mockGetAuthenticatedAgent = vi.fn();
vi.mock('@/lib/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/api')>();
  return {
    ...actual,
    getAuthenticatedAgent: (...args: unknown[]) => mockGetAuthenticatedAgent(...args),
  };
});

const mockGetContractById = vi.fn();
const mockGetContractByNumber = vi.fn();
const mockUpdateContractPayment = vi.fn();
const mockCompleteContract = vi.fn();
const mockCreateContractWithResolution = vi.fn();
vi.mock('@/lib/services/contract-service', () => ({
  getContractById: (...args: unknown[]) => mockGetContractById(...args),
  getContractByNumber: (...args: unknown[]) => mockGetContractByNumber(...args),
  updateContractPayment: (...args: unknown[]) => mockUpdateContractPayment(...args),
  completeContract: (...args: unknown[]) => mockCompleteContract(...args),
  createContractWithResolution: (...args: unknown[]) => mockCreateContractWithResolution(...args),
}));

// Central supabase mock — returns configurable chain per test
const mockSupabaseFrom = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

const mockSaveMessage = vi.fn();
vi.mock('@/lib/conversation/message-persistence', () => ({
  saveMessage: (...args: unknown[]) => mockSaveMessage(...args),
}));

// =============================================================================
// TEST CONSTANTS
// =============================================================================

const AGENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CONTRACT_UUID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const REQUEST_UUID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const NON_UUID_ID = 'CONTRACT-MM7XPEY4-QADB'; // contract_number format
const AQUOTE_ID = 'aquote-398402531'; // Avinode-style non-UUID
const LOCAL_CONTRACT_ID = 'local-contract-abc123'; // local UI contract ID

const BASE_PAYMENT_BODY = {
  payment_reference: 'WT-2026-TEST-001',
  payment_amount: 45000,
  payment_method: 'wire' as const,
};

const MOCK_CONTRACT_ROW = {
  id: CONTRACT_UUID,
  contract_number: 'CONTRACT-2026-001',
  request_id: REQUEST_UUID,
  iso_agent_id: AGENT_ID,
  status: 'sent',
  client_name: 'Jane Doe',
  client_email: 'jane@example.com',
  payment_reference: null,
  payment_amount: null,
  payment_received_at: null,
  completed_at: null,
};

const MOCK_PAYMENT_RESULT = {
  id: CONTRACT_UUID,
  contract_number: 'CONTRACT-2026-001',
  status: 'paid',
  payment_reference: 'WT-2026-TEST-001',
  payment_amount: 45000,
  payment_received_at: new Date().toISOString(),
};

const MOCK_COMPLETED_CONTRACT = {
  ...MOCK_CONTRACT_ROW,
  ...MOCK_PAYMENT_RESULT,
  status: 'completed',
  completed_at: new Date().toISOString(),
};

// =============================================================================
// HELPERS
// =============================================================================

/** Build a supabase chain that returns null for all lookups (no contract found) */
function buildNullChain() {
  const nullMaybeSingle = vi.fn().mockResolvedValue({ data: null });
  const nullLimit = vi.fn().mockReturnValue({ maybeSingle: nullMaybeSingle });
  const nullOrder = vi.fn().mockReturnValue({ limit: nullLimit });
  const nullNot = vi.fn().mockReturnValue({ order: nullOrder });
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: nullOrder,
          not: nullNot,
          limit: nullLimit,
          maybeSingle: nullMaybeSingle,
        }),
        limit: nullLimit,
        maybeSingle: nullMaybeSingle,
        not: nullNot,
        order: nullOrder,
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    maybeSingle: nullMaybeSingle,
  };
}

/** Build a supabase chain that returns `row` for any lookup */
function buildFoundChain(row: Record<string, unknown>) {
  const maybeSingleOk = vi.fn().mockResolvedValue({ data: row });
  const limitFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleOk });
  const orderFn = vi.fn().mockReturnValue({ limit: limitFn });
  const notFn = vi.fn().mockReturnValue({ order: orderFn });
  const eqInner = vi.fn().mockReturnValue({
    limit: limitFn,
    maybeSingle: maybeSingleOk,
    order: orderFn,
    not: notFn,
  });
  const eqOuter = vi.fn().mockReturnValue({
    eq: eqInner,
    limit: limitFn,
    maybeSingle: maybeSingleOk,
    order: orderFn,
    not: notFn,
  });
  return {
    select: vi.fn().mockReturnValue({ eq: eqOuter }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

/** Build a supabase chain that supports update (for auto-promotion) */
function buildUpdateChain() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

function makeRequest(contractId: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/contract/${contractId}/payment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

// =============================================================================
// MODULE IMPORT
// =============================================================================

let POST: typeof import('@/app/api/contract/[id]/payment/route')['POST'];

// =============================================================================
// TESTS
// =============================================================================

describe('POST /api/contract/[id]/payment', () => {
  beforeAll(async () => {
    const mod = await import('@/app/api/contract/[id]/payment/route');
    POST = mod.POST;
  }, 30_000);

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated agent
    mockGetAuthenticatedAgent.mockResolvedValue({ id: AGENT_ID });

    // Default: UUID id resolves directly (no metadata lookup needed)
    mockSupabaseFrom.mockReturnValue(buildNullChain());

    // Default: contract found
    mockGetContractById.mockResolvedValue(MOCK_CONTRACT_ROW);
    mockGetContractByNumber.mockResolvedValue(null);

    // Default: payment and completion succeed
    mockUpdateContractPayment.mockResolvedValue(MOCK_PAYMENT_RESULT);
    mockCompleteContract.mockResolvedValue(MOCK_COMPLETED_CONTRACT);
    mockSaveMessage.mockResolvedValue('msg-uuid-001');
    mockCreateContractWithResolution.mockResolvedValue({
      id: CONTRACT_UUID,
      contract_number: 'CONTRACT-2026-001',
      status: 'draft',
      created_at: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // AUTHENTICATION
  // ===========================================================================

  describe('Authentication', () => {
    it('returns 401 response when user is not authenticated', async () => {
      const { NextResponse } = await import('next/server');
      mockGetAuthenticatedAgent.mockResolvedValue(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(response.status).toBe(401);
    });

    it('returns 404 response when agent record is not found', async () => {
      const { NextResponse } = await import('next/server');
      mockGetAuthenticatedAgent.mockResolvedValue(
        NextResponse.json({ error: 'ISO agent not found' }, { status: 404 })
      );

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(response.status).toBe(404);
    });
  });

  // ===========================================================================
  // REQUEST VALIDATION
  // ===========================================================================

  describe('Request Validation', () => {
    it('returns 400 when payment_reference is empty', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, payment_reference: '' }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/reference/i);
    });

    it('returns 400 when payment_amount is zero', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, payment_amount: 0 }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/amount/i);
    });

    it('returns 400 when payment_amount is negative', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, payment_amount: -1 }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/amount/i);
    });

    it('returns 400 when payment_method is invalid', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, payment_method: 'bitcoin' }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/method/i);
    });

    it('returns 400 when cc_last_four is not exactly 4 digits', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, {
          ...BASE_PAYMENT_BODY,
          payment_method: 'credit_card',
          cc_last_four: '12',
        }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/4 digits/i);
    });

    it('accepts valid cc_last_four with credit_card method', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, {
          ...BASE_PAYMENT_BODY,
          payment_method: 'credit_card',
          cc_last_four: '4242',
        }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // STRATEGY 1 — Lookup by contract_number (non-UUID id in URL)
  // ===========================================================================

  describe('Strategy 1 — Lookup by contract_number', () => {
    it('resolves contract via getContractByNumber when URL id is not a UUID', async () => {
      mockGetContractByNumber.mockResolvedValue(MOCK_CONTRACT_ROW);

      const response = await POST(
        makeRequest(NON_UUID_ID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: NON_UUID_ID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGetContractByNumber).toHaveBeenCalledWith(NON_UUID_ID);
    });

    it('falls through to Strategy 2 when contract_number lookup returns null', async () => {
      // Strategy 1 fails → Strategy 2 is tried (metadata lookup via supabase)
      mockGetContractByNumber.mockResolvedValue(null);

      // Strategy 2 finds it via metadata
      mockSupabaseFrom.mockReturnValue(
        buildFoundChain({ id: CONTRACT_UUID })
      );

      const response = await POST(
        makeRequest(NON_UUID_ID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: NON_UUID_ID }) }
      );

      expect(response.status).toBe(200);
      expect(mockGetContractByNumber).toHaveBeenCalledWith(NON_UUID_ID);
    });
  });

  // ===========================================================================
  // STRATEGY 2 — Lookup by metadata.localContractId
  // ===========================================================================

  describe('Strategy 2 — Lookup by metadata.localContractId', () => {
    it('resolves contract via metadata when contract_number lookup fails', async () => {
      // S1 fails
      mockGetContractByNumber.mockResolvedValue(null);

      // S2 succeeds: supabase.from().select().eq(metadata, id).limit(1).maybeSingle()
      mockSupabaseFrom.mockReturnValue(
        buildFoundChain({ id: CONTRACT_UUID })
      );

      const response = await POST(
        makeRequest(LOCAL_CONTRACT_ID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: LOCAL_CONTRACT_ID }) }
      );

      expect(response.status).toBe(200);
    });

    it('returns 404 when no strategy resolves the id and no requestId given', async () => {
      mockGetContractByNumber.mockResolvedValue(null);
      mockSupabaseFrom.mockReturnValue(buildNullChain());

      const response = await POST(
        makeRequest('totally-invalid-id', BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: 'totally-invalid-id' }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toMatch(/not found/i);
    });
  });

  // ===========================================================================
  // STRATEGY 3 — Lookup by reference_quote_number
  // ===========================================================================

  describe('Strategy 3 — Lookup by reference_quote_number', () => {
    it('resolves contract via reference_quote_number for aquote-style ids', async () => {
      // S1 fails (contract_number lookup)
      mockGetContractByNumber.mockResolvedValue(null);

      // S2 fails (metadata lookup) → returns null
      // S3 succeeds (reference_quote_number lookup) → returns contract
      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          // S2: metadata lookup — fails
          return buildNullChain();
        }
        // S3: reference_quote_number lookup — succeeds
        return buildFoundChain({ id: CONTRACT_UUID });
      });

      const response = await POST(
        makeRequest(AQUOTE_ID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: AQUOTE_ID }) }
      );

      expect(response.status).toBe(200);
    });

    it('falls through to Strategy 4 when reference_quote_number lookup also fails', async () => {
      mockGetContractByNumber.mockResolvedValue(null);
      // All supabase lookups fail
      mockSupabaseFrom.mockReturnValue(buildNullChain());

      // Strategy 4 requires requestId in the body and the id to still be unresolved
      // Without requestId, it should return 404
      const response = await POST(
        makeRequest(AQUOTE_ID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: AQUOTE_ID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toMatch(/not found/i);
    });
  });

  // ===========================================================================
  // STRATEGY 4 — Lookup by requestId in body
  // ===========================================================================

  describe('Strategy 4 — Lookup by requestId (body fallback)', () => {
    it('resolves contract via request_id when URL id is unresolved', async () => {
      // All upstream strategies fail
      mockGetContractByNumber.mockResolvedValue(null);

      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          // S2 and S3 fail
          return buildNullChain();
        }
        // S4: lookup by request_id — succeeds
        return buildFoundChain({ id: CONTRACT_UUID });
      });

      const response = await POST(
        makeRequest(AQUOTE_ID, { ...BASE_PAYMENT_BODY, requestId: REQUEST_UUID }),
        { params: Promise.resolve({ id: AQUOTE_ID }) }
      );

      expect(response.status).toBe(200);
    });

    it('skips Strategy 4 when requestId is not a valid UUID', async () => {
      mockGetContractByNumber.mockResolvedValue(null);
      mockSupabaseFrom.mockReturnValue(buildNullChain());

      const response = await POST(
        makeRequest(AQUOTE_ID, {
          ...BASE_PAYMENT_BODY,
          requestId: 'not-a-uuid',
        }),
        { params: Promise.resolve({ id: AQUOTE_ID }) }
      );

      // Should fall through and eventually return 404 (no strategy succeeded)
      expect(response.status).toBe(404);
    });
  });

  // ===========================================================================
  // STRATEGY 5 — On-demand contract creation (ONEK-383)
  // ===========================================================================

  describe('Strategy 5 — On-demand contract creation (ONEK-383)', () => {
    const bodyWithRequest = {
      ...BASE_PAYMENT_BODY,
      requestId: REQUEST_UUID,
      customerName: 'John Doe',
    };

    /** Supabase chain for Strategy 5: all lookups null, but requests fetch works */
    function buildStrategy5Chain(requestRow: Record<string, unknown> | null) {
      let callCount = 0;
      return vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          // S2, S3, S4 all fail
          return buildNullChain();
        }
        // S5: requests table fetch
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: requestRow }),
              }),
              maybeSingle: vi.fn().mockResolvedValue({ data: requestRow }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });
    }

    it('creates contract on-demand when all 4 strategies fail and request exists', async () => {
      mockGetContractByNumber.mockResolvedValue(null);

      const requestRow = {
        id: REQUEST_UUID,
        iso_agent_id: AGENT_ID,
        client_name: 'John Doe',
        client_email: 'john@example.com',
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-04-01',
        passengers: 4,
        avinode_trip_id: null,
      };
      mockSupabaseFrom.mockImplementation(buildStrategy5Chain(requestRow));

      const createdContract = {
        id: CONTRACT_UUID,
        contract_number: 'CONTRACT-2026-NEW',
        status: 'draft',
        created_at: new Date().toISOString(),
      };
      mockCreateContractWithResolution.mockResolvedValue(createdContract);
      mockGetContractById.mockResolvedValue({
        ...MOCK_CONTRACT_ROW,
        status: 'sent',
      });

      const response = await POST(
        makeRequest(AQUOTE_ID, bodyWithRequest),
        { params: Promise.resolve({ id: AQUOTE_ID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCreateContractWithResolution).toHaveBeenCalledTimes(1);
    });

    it('falls through to 404 when on-demand creation also fails (throws)', async () => {
      mockGetContractByNumber.mockResolvedValue(null);
      mockSupabaseFrom.mockImplementation(buildStrategy5Chain({
        id: REQUEST_UUID,
        iso_agent_id: AGENT_ID,
        departure_airport: 'KTEB',
        arrival_airport: 'KLAX',
        departure_date: '2026-04-01',
        passengers: 4,
      }));

      mockCreateContractWithResolution.mockRejectedValue(
        new Error('DB constraint violation')
      );
      // getContractById never resolves (no contract was created)
      mockGetContractById.mockResolvedValue(null);

      const response = await POST(
        makeRequest(AQUOTE_ID, bodyWithRequest),
        { params: Promise.resolve({ id: AQUOTE_ID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toMatch(/not found/i);
    });

    it('falls through to 404 when request row is not found during on-demand creation', async () => {
      mockGetContractByNumber.mockResolvedValue(null);
      mockSupabaseFrom.mockImplementation(buildStrategy5Chain(null));

      const response = await POST(
        makeRequest(AQUOTE_ID, bodyWithRequest),
        { params: Promise.resolve({ id: AQUOTE_ID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toMatch(/not found/i);
    });
  });

  // ===========================================================================
  // DIRECT UUID LOOKUP (happy path — no strategy resolution needed)
  // ===========================================================================

  describe('Direct UUID Lookup', () => {
    it('resolves contract directly by UUID id without calling getContractByNumber', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGetContractByNumber).not.toHaveBeenCalled();
    });

    it('returns 404 when UUID contract is not found', async () => {
      mockGetContractById.mockResolvedValue(null);

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toMatch(/not found/i);
    });

    it('returns 404 when contract belongs to a different agent', async () => {
      mockGetContractById.mockResolvedValue({
        ...MOCK_CONTRACT_ROW,
        iso_agent_id: 'other-agent-uuid',
      });

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
    });
  });

  // ===========================================================================
  // AUTO-PROMOTION OF DRAFT CONTRACTS (ONEK-383 AC-2)
  // ===========================================================================

  describe('Auto-promotion of draft contracts (ONEK-383 AC-2)', () => {
    it('auto-promotes draft contract to sent before recording payment', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });
      mockSupabaseFrom.mockReturnValue({
        ...buildNullChain(),
        update: mockUpdate,
      });

      mockGetContractById.mockResolvedValue({
        ...MOCK_CONTRACT_ROW,
        status: 'draft',
      });

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('rejects contract in paid status', async () => {
      mockGetContractById.mockResolvedValue({
        ...MOCK_CONTRACT_ROW,
        status: 'paid',
      });

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/paid/i);
    });

    it('rejects contract in completed status', async () => {
      mockGetContractById.mockResolvedValue({
        ...MOCK_CONTRACT_ROW,
        status: 'completed',
      });

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('rejects contract in cancelled status', async () => {
      mockGetContractById.mockResolvedValue({
        ...MOCK_CONTRACT_ROW,
        status: 'cancelled',
      });

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(response.status).toBe(400);
    });

    it('accepts contract in sent status', async () => {
      mockGetContractById.mockResolvedValue({ ...MOCK_CONTRACT_ROW, status: 'sent' });

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(response.status).toBe(200);
    });

    it('accepts contract in signed status', async () => {
      mockGetContractById.mockResolvedValue({ ...MOCK_CONTRACT_ROW, status: 'signed' });

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(response.status).toBe(200);
    });

    it('accepts contract in payment_pending status', async () => {
      mockGetContractById.mockResolvedValue({ ...MOCK_CONTRACT_ROW, status: 'payment_pending' });

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(response.status).toBe(200);
    });
  });

  // ===========================================================================
  // PAYMENT RECORDING
  // ===========================================================================

  describe('Payment Recording', () => {
    it('calls updateContractPayment with correct data', async () => {
      await POST(
        makeRequest(CONTRACT_UUID, {
          ...BASE_PAYMENT_BODY,
          payment_date: '2026-03-01T12:00:00Z',
        }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(mockUpdateContractPayment).toHaveBeenCalledWith(
        CONTRACT_UUID,
        expect.objectContaining({
          payment_reference: 'WT-2026-TEST-001',
          payment_amount: 45000,
          payment_method: 'wire',
          payment_date: '2026-03-01T12:00:00Z',
        })
      );
    });

    it('defaults payment_date to current ISO string when not provided', async () => {
      const before = Date.now();
      await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const after = Date.now();

      const [[, callArg]] = mockUpdateContractPayment.mock.calls;
      const paymentDate = new Date(callArg.payment_date).getTime();
      expect(paymentDate).toBeGreaterThanOrEqual(before);
      expect(paymentDate).toBeLessThanOrEqual(after);
    });

    it('returns payment data in response', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.contract.payment_reference).toBe('WT-2026-TEST-001');
      expect(data.contract.payment_amount).toBe(45000);
    });
  });

  // ===========================================================================
  // MARK COMPLETE
  // ===========================================================================

  describe('Mark Complete', () => {
    it('calls completeContract when markComplete=true', async () => {
      await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, markComplete: true }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(mockCompleteContract).toHaveBeenCalledWith(CONTRACT_UUID);
    });

    it('does not call completeContract when markComplete=false', async () => {
      await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, markComplete: false }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(mockCompleteContract).not.toHaveBeenCalled();
    });

    it('does not call completeContract when markComplete is absent', async () => {
      await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(mockCompleteContract).not.toHaveBeenCalled();
    });

    it('returns completed status when markComplete=true', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, markComplete: true }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(data.contract.status).toBe('completed');
    });

    it('returns paid status when markComplete=false', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, markComplete: false }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(data.contract.status).toBe('paid');
    });
  });

  // ===========================================================================
  // MESSAGE PERSISTENCE
  // ===========================================================================

  describe('Message Persistence', () => {
    it('saves payment_confirmed message when requestId is provided', async () => {
      await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, requestId: REQUEST_UUID }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(mockSaveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: REQUEST_UUID,
          contentType: 'payment_confirmed',
        })
      );
    });

    it('saves deal_closed message when markComplete=true and requestId is provided', async () => {
      await POST(
        makeRequest(CONTRACT_UUID, {
          ...BASE_PAYMENT_BODY,
          requestId: REQUEST_UUID,
          markComplete: true,
          customerName: 'Jane Doe',
        }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(mockSaveMessage).toHaveBeenCalledTimes(2);
      expect(mockSaveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'deal_closed',
          richContent: expect.objectContaining({
            dealClosed: expect.objectContaining({ customerName: 'Jane Doe' }),
          }),
        })
      );
    });

    it('saves only payment_confirmed (not deal_closed) when markComplete is absent', async () => {
      await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, requestId: REQUEST_UUID }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(mockSaveMessage).toHaveBeenCalledTimes(1);
      expect(mockSaveMessage).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'payment_confirmed' })
      );
    });

    it('skips message persistence when requestId is not provided', async () => {
      await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );

      expect(mockSaveMessage).not.toHaveBeenCalled();
    });

    it('does not fail the payment response when message persistence throws', async () => {
      mockSaveMessage.mockRejectedValue(new Error('DB unavailable'));

      const response = await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, requestId: REQUEST_UUID }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('includes savedMessageIds in response when messages are persisted', async () => {
      const response = await POST(
        makeRequest(CONTRACT_UUID, {
          ...BASE_PAYMENT_BODY,
          requestId: REQUEST_UUID,
          markComplete: true,
        }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(data.savedMessageIds).toBeDefined();
      expect(Array.isArray(data.savedMessageIds)).toBe(true);
      expect(data.savedMessageIds.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe('Error Handling', () => {
    it('returns 500 when updateContractPayment throws', async () => {
      mockUpdateContractPayment.mockRejectedValue(
        new Error('Supabase connection refused')
      );

      const response = await POST(
        makeRequest(CONTRACT_UUID, BASE_PAYMENT_BODY),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('returns 500 when completeContract throws', async () => {
      mockCompleteContract.mockRejectedValue(new Error('Unexpected DB error'));

      const response = await POST(
        makeRequest(CONTRACT_UUID, { ...BASE_PAYMENT_BODY, markComplete: true }),
        { params: Promise.resolve({ id: CONTRACT_UUID }) }
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
