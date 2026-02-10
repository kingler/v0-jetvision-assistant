/**
 * Tests for POST /api/onboarding/submit and GET /api/onboarding/status
 *
 * Verifies that:
 * - Route handlers are exported
 * - Submit returns 401 when unauthenticated
 * - Submit returns 400 for invalid form data
 * - Submit returns 400 when onboarding already completed
 * - Submit returns 200 on success with correct payload
 * - Status returns the agent's onboarding status
 * - Status returns 401 when unauthenticated
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — must be before importing route modules
// ---------------------------------------------------------------------------

const mockAuth = vi.fn().mockResolvedValue({ userId: 'clerk-user-123' });

vi.mock('@clerk/nextjs/server', () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// Build a chainable Supabase mock that records calls
const createChainableMock = () => {
  const results: { data: unknown; error: unknown } = { data: null, error: null };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.single = vi.fn().mockImplementation(() => results);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);

  // Allow test to configure return value
  (chain as Record<string, unknown>)._setResult = (data: unknown, error: unknown = null) => {
    results.data = data;
    results.error = error;
  };

  return chain;
};

let supaChain = createChainableMock();

const mockFrom = vi.fn().mockImplementation(() => supaChain);

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
  uploadContractPdf: vi.fn().mockResolvedValue({
    success: true,
    publicUrl: 'https://storage.example.com/contract.pdf',
    filePath: 'onboarding/agent-id/contract.pdf',
  }),
}));

vi.mock('@/lib/services/email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-123' }),
}));

vi.mock('@/lib/pdf/onboarding-contract-generator', () => ({
  generateOnboardingContract: vi.fn().mockResolvedValue({
    pdfBuffer: Buffer.from('fake-pdf'),
    pdfBase64: 'ZmFrZS1wZGY=',
    fileName: 'commission-contract-20260209.pdf',
  }),
}));

vi.mock('@/lib/mcp/clients/gmail-mcp-client', () => ({
  default: { sendEmail: vi.fn() },
}));

vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-pdf')),
  Document: vi.fn(),
  Page: vi.fn(),
  View: vi.fn(),
  Text: vi.fn(),
  StyleSheet: { create: vi.fn((s: unknown) => s) },
}));

vi.mock('@/lib/validations/onboarding-form-schema', () => {
  const { z } = require('zod');
  const schema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string(),
    phone: z.string(),
    streetAddress: z.string().min(1),
    addressLine2: z.string().optional().default(''),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string(),
    country: z.string().default('US'),
  });
  return { onboardingFormSchema: schema };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_FORM_DATA = {
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1990-05-15',
  phone: '+1-555-123-4567',
  streetAddress: '123 Main St',
  addressLine2: '',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  country: 'US',
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/onboarding/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Tests: POST /api/onboarding/submit
// ---------------------------------------------------------------------------

describe('POST /api/onboarding/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supaChain = createChainableMock();
    mockFrom.mockImplementation(() => supaChain);
    mockAuth.mockResolvedValue({ userId: 'clerk-user-123' });
  });

  it('should export a POST handler', async () => {
    const mod = await import('@/app/api/onboarding/submit/route');
    expect(mod.POST).toBeDefined();
    expect(typeof mod.POST).toBe('function');
  });

  it('should return 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const { POST } = await import('@/app/api/onboarding/submit/route');
    const req = makeRequest(VALID_FORM_DATA);
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it('should return 400 when form data is invalid (missing firstName)', async () => {
    // Auth succeeds, agent lookup succeeds
    (supaChain as Record<string, unknown>)._setResult(
      { id: 'agent-1', email: 'jane@example.com', onboarding_status: 'pending', commission_percentage: 10 },
      null
    );

    const { POST } = await import('@/app/api/onboarding/submit/route');
    const req = makeRequest({ ...VALID_FORM_DATA, firstName: '' });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Validation failed');
  });

  it('should return 400 when onboarding is already completed', async () => {
    (supaChain as Record<string, unknown>)._setResult(
      { id: 'agent-1', email: 'jane@example.com', onboarding_status: 'completed', commission_percentage: 10 },
      null
    );

    const { POST } = await import('@/app/api/onboarding/submit/route');
    const req = makeRequest(VALID_FORM_DATA);
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Onboarding already completed');
  });

  it('should return 200 with success message on valid submission', async () => {
    // All DB operations succeed
    (supaChain as Record<string, unknown>)._setResult(
      { id: 'agent-1', email: 'jane@example.com', onboarding_status: 'pending', commission_percentage: 10 },
      null
    );

    const { POST } = await import('@/app/api/onboarding/submit/route');
    const req = makeRequest(VALID_FORM_DATA);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe('Contract sent! Check your email.');
    expect(json.onboardingStatus).toBe('contract_sent');
  });

  it('should call generateOnboardingContract with agent data', async () => {
    (supaChain as Record<string, unknown>)._setResult(
      { id: 'agent-1', email: 'jane@example.com', onboarding_status: 'pending', commission_percentage: 15 },
      null
    );

    const { POST } = await import('@/app/api/onboarding/submit/route');
    const { generateOnboardingContract } = await import('@/lib/pdf/onboarding-contract-generator');
    const req = makeRequest(VALID_FORM_DATA);
    await POST(req);

    expect(generateOnboardingContract).toHaveBeenCalledWith(
      expect.objectContaining({
        agentName: 'Jane Doe',
        agentEmail: 'jane@example.com',
        commissionPercentage: 15,
      })
    );
  });

  it('should call sendEmail with contract attachment', async () => {
    (supaChain as Record<string, unknown>)._setResult(
      { id: 'agent-1', email: 'jane@example.com', onboarding_status: 'pending', commission_percentage: 10 },
      null
    );

    const { POST } = await import('@/app/api/onboarding/submit/route');
    const { sendEmail } = await import('@/lib/services/email-service');
    const req = makeRequest(VALID_FORM_DATA);
    await POST(req);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: 'Your Jetvision ISO Agent Commission Agreement',
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: 'commission-contract-20260209.pdf',
            contentType: 'application/pdf',
          }),
        ]),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: GET /api/onboarding/status
// ---------------------------------------------------------------------------

describe('GET /api/onboarding/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supaChain = createChainableMock();
    mockFrom.mockImplementation(() => supaChain);
    mockAuth.mockResolvedValue({ userId: 'clerk-user-123' });
  });

  it('should export a GET handler', async () => {
    const mod = await import('@/app/api/onboarding/status/route');
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe('function');
  });

  it('should return 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const { GET } = await import('@/app/api/onboarding/status/route');
    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('should return onboarding status for authenticated agent', async () => {
    (supaChain as Record<string, unknown>)._setResult(
      { onboarding_status: 'contract_sent' },
      null
    );

    const { GET } = await import('@/app/api/onboarding/status/route');
    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.onboardingStatus).toBe('contract_sent');
  });
});
