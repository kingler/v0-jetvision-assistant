/**
 * @vitest-environment node
 */

/**
 * Contract Send API Route Tests
 *
 * Tests that POST /api/contract/send persists the contract to the DB
 * before sending email. Verifies that DB creation failures block the
 * entire flow (ONEK-349: contract not persisted to database).
 *
 * @see app/api/contract/send/route.ts
 * @see lib/services/contract-service.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// MOCK SETUP — all mock fns hoisted so vi.mock factories can reference them
// =============================================================================

// Auth
const mockGetAuthenticatedAgent = vi.fn();
const mockIsErrorResponse = vi.fn();
const mockParseJsonBody = vi.fn();

vi.mock('@/lib/utils/api', () => ({
  getAuthenticatedAgent: (...args: unknown[]) => mockGetAuthenticatedAgent(...args),
  isErrorResponse: (...args: unknown[]) => mockIsErrorResponse(...args),
  parseJsonBody: (...args: unknown[]) => mockParseJsonBody(...args),
}));

// Contract service
const mockCreateContractWithResolution = vi.fn();
const mockUpdateContractGenerated = vi.fn();
const mockUpdateContractSent = vi.fn();
const mockUpdateContractStatus = vi.fn();

vi.mock('@/lib/services/contract-service', () => ({
  createContractWithResolution: (...args: unknown[]) => mockCreateContractWithResolution(...args),
  updateContractGenerated: (...args: unknown[]) => mockUpdateContractGenerated(...args),
  updateContractSent: (...args: unknown[]) => mockUpdateContractSent(...args),
  updateContractStatus: (...args: unknown[]) => mockUpdateContractStatus(...args),
}));

// Proposal service
const mockGetProposalsByRequest = vi.fn();
vi.mock('@/lib/services/proposal-service', () => ({
  getProposalsByRequest: (...args: unknown[]) => mockGetProposalsByRequest(...args),
}));

// PDF generator
const mockGenerateContract = vi.fn();
vi.mock('@/lib/pdf', () => ({
  generateContract: (...args: unknown[]) => mockGenerateContract(...args),
}));

// Email service
const mockSendContractEmail = vi.fn();
vi.mock('@/lib/services/email-service', () => ({
  sendContractEmail: (...args: unknown[]) => mockSendContractEmail(...args),
}));

// Supabase admin — all named exports hoisted
const mockUploadContractPdf = vi.fn();
const mockDownloadProposalPdf = vi.fn();
const mockFindRequestByTripId = vi.fn();
const mockSupabaseFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockSupabaseFrom(...args) },
  uploadContractPdf: (...args: unknown[]) => mockUploadContractPdf(...args),
  downloadProposalPdf: (...args: unknown[]) => mockDownloadProposalPdf(...args),
  findRequestByTripId: (...args: unknown[]) => mockFindRequestByTripId(...args),
}));

// Message persistence
const mockSaveMessage = vi.fn();
vi.mock('@/lib/conversation/message-persistence', () => ({
  saveMessage: (...args: unknown[]) => mockSaveMessage(...args),
}));

// =============================================================================
// TEST DATA
// =============================================================================

const MOCK_AUTH_RESULT = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Test Agent',
};

const MOCK_REQUEST_ID = '11111111-1111-1111-1111-111111111111';

const MOCK_REQUEST_BODY = {
  requestId: MOCK_REQUEST_ID,
  customer: {
    name: 'Willy Bercy',
    email: 'willy@example.com',
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
};

const MOCK_CONTRACT_RESULT = {
  contractId: 'CONTRACT-MMAQZE26-K6EF',
  contractNumber: 'CONTRACT-2026-007',
  pdfBuffer: Buffer.from('mock-pdf-content'),
  pdfBase64: Buffer.from('mock-pdf-content').toString('base64'),
  fileName: 'contract-KTEB-KLAX.pdf',
  generatedAt: new Date().toISOString(),
  pricing: MOCK_REQUEST_BODY.pricing,
};

const MOCK_DB_CONTRACT = {
  id: '22222222-2222-2222-2222-222222222222',
  contract_number: 'CONTRACT-2026-007',
  status: 'draft',
  created_at: new Date().toISOString(),
};

// =============================================================================
// HELPERS
// =============================================================================

function createRequest(body: Record<string, unknown> = MOCK_REQUEST_BODY): NextRequest {
  return new NextRequest('http://localhost:3000/api/contract/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe('POST /api/contract/send', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy-path mocks
    mockGetAuthenticatedAgent.mockResolvedValue(MOCK_AUTH_RESULT);
    mockIsErrorResponse.mockReturnValue(false);
    mockParseJsonBody.mockResolvedValue(MOCK_REQUEST_BODY);
    mockGetProposalsByRequest.mockResolvedValue([]);
    mockGenerateContract.mockResolvedValue(MOCK_CONTRACT_RESULT);
    mockUploadContractPdf.mockResolvedValue({
      success: true,
      publicUrl: 'https://storage.example.com/contract.pdf',
      filePath: 'contracts/contract.pdf',
      fileSizeBytes: 12345,
    });
    mockCreateContractWithResolution.mockResolvedValue(MOCK_DB_CONTRACT);
    mockUpdateContractGenerated.mockResolvedValue({});
    mockUpdateContractSent.mockResolvedValue({});
    mockSendContractEmail.mockResolvedValue({
      success: true,
      messageId: 'email-msg-123',
    });
    mockSaveMessage.mockResolvedValue('msg-123');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy Path
  // -------------------------------------------------------------------------

  it('should persist contract to DB and send email on success', async () => {
    const { POST } = await import('@/app/api/contract/send/route');

    const response = await POST(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.emailSent).toBe(true);
    expect(data.dbContractId).toBe(MOCK_DB_CONTRACT.id);
    expect(data.contractNumber).toBe(MOCK_DB_CONTRACT.contract_number);

    // Verify DB creation was called
    expect(mockCreateContractWithResolution).toHaveBeenCalledTimes(1);
    // Verify email was sent AFTER DB creation
    expect(mockSendContractEmail).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // ONEK-349: Contract DB creation failures must block email send
  // -------------------------------------------------------------------------

  it('should return error when createContractWithResolution returns null', async () => {
    mockCreateContractWithResolution.mockResolvedValue(null);

    const { POST } = await import('@/app/api/contract/send/route');

    const response = await POST(createRequest());
    const data = await response.json();

    // ONEK-349: Must fail — not silently continue
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.emailSent).toBe(false);

    // Email must NOT be sent if contract wasn't persisted
    expect(mockSendContractEmail).not.toHaveBeenCalled();
  });

  it('should return error when createContractWithResolution throws', async () => {
    mockCreateContractWithResolution.mockRejectedValue(
      new Error('Foreign key constraint violation on request_id')
    );

    const { POST } = await import('@/app/api/contract/send/route');

    const response = await POST(createRequest());
    const data = await response.json();

    // ONEK-349: Must fail — not silently continue
    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.emailSent).toBe(false);

    // Email must NOT be sent if contract wasn't persisted
    expect(mockSendContractEmail).not.toHaveBeenCalled();
  });

  it('should include dbContractId in the response when creation succeeds', async () => {
    const { POST } = await import('@/app/api/contract/send/route');

    const response = await POST(createRequest());
    const data = await response.json();

    expect(data.dbContractId).toBe(MOCK_DB_CONTRACT.id);
    expect(data.dbContractId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('should update contract to sent status after email is delivered', async () => {
    const { POST } = await import('@/app/api/contract/send/route');

    const response = await POST(createRequest());
    const data = await response.json();

    expect(data.emailSent).toBe(true);
    expect(mockUpdateContractSent).toHaveBeenCalledWith(
      MOCK_DB_CONTRACT.id,
      expect.objectContaining({
        sent_to_email: 'willy@example.com',
      })
    );
  });
});
