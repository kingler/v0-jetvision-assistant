/**
 * POST /api/onboarding/register — Unit Tests
 *
 * Tests the register API route which accepts ISO agent personal details
 * from the onboarding form and transitions status from 'pending' to
 * 'profile_complete'.
 *
 * @see app/api/onboarding/register/route.ts
 * @see lib/validations/onboarding.ts
 * @see lib/services/onboarding-service.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// MOCKS
// =============================================================================

const mockAuth = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}));

const mockRegisterAgent = vi.fn();
vi.mock('@/lib/services/onboarding-service', () => ({
  registerAgent: (...args: unknown[]) => mockRegisterAgent(...args),
}));

// =============================================================================
// HELPERS
// =============================================================================

const validBody = {
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1990-05-15',
  phone: '(555) 123-4567',
  addressLine1: '123 Main St',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  acknowledgeCommissionTerms: true,
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/onboarding/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  return response.json();
}

// =============================================================================
// TESTS
// =============================================================================

describe('POST /api/onboarding/register', () => {
  let POST: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/onboarding/register/route');
    POST = mod.POST;
  });

  // ---------------------------------------------------------------------------
  // Module exports
  // ---------------------------------------------------------------------------

  it('should export a POST handler', async () => {
    const mod = await import('@/app/api/onboarding/register/route');
    expect(typeof mod.POST).toBe('function');
  });

  it('should not export a GET handler', async () => {
    const mod = await import('@/app/api/onboarding/register/route');
    expect((mod as Record<string, unknown>).GET).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  it('should return 401 when user is not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(401);

    // Service should not be called
    expect(mockRegisterAgent).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  it('should return 400 when required fields are missing', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_123' });

    const response = await POST(makeRequest({ firstName: 'Jane' }));
    expect(response.status).toBe(400);

    const body = await parseJson(response);
    expect(body.error).toContain('Validation failed');
    expect(body.details).toBeDefined();

    // Service should not be called for invalid input
    expect(mockRegisterAgent).not.toHaveBeenCalled();
  });

  it('should return 400 when firstName is empty', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_123' });

    const response = await POST(makeRequest({ ...validBody, firstName: '' }));
    expect(response.status).toBe(400);

    const body = await parseJson(response);
    expect(body.details).toBeDefined();
  });

  it('should return 400 when zipCode is invalid', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_123' });

    const response = await POST(makeRequest({ ...validBody, zipCode: 'ABCDE' }));
    expect(response.status).toBe(400);
  });

  it('should return 400 when acknowledgeCommissionTerms is false', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_123' });

    const response = await POST(
      makeRequest({ ...validBody, acknowledgeCommissionTerms: false })
    );
    expect(response.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // Successful registration
  // ---------------------------------------------------------------------------

  it('should return 200 with agentId and status on success', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_123' });
    mockRegisterAgent.mockResolvedValue({
      success: true,
      agentId: 'agent-abc',
      onboardingStatus: 'profile_complete',
    });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(200);

    const body = await parseJson(response);
    expect(body.agentId).toBe('agent-abc');
    expect(body.onboardingStatus).toBe('profile_complete');

    // Verify service was called with the Clerk userId and parsed form data
    expect(mockRegisterAgent).toHaveBeenCalledWith(
      'clerk_user_123',
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        zipCode: '10001',
      })
    );
  });

  // ---------------------------------------------------------------------------
  // Service failure
  // ---------------------------------------------------------------------------

  it('should return 500 when registerAgent returns success: false', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_123' });
    mockRegisterAgent.mockResolvedValue({
      success: false,
      agentId: '',
      onboardingStatus: 'pending',
      error: 'ISO agent not found for this user',
    });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(500);

    const body = await parseJson(response);
    expect(body.error).toBeDefined();
  });

  it('should return 500 when the service throws an unhandled error', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_123' });
    mockRegisterAgent.mockRejectedValue(new Error('Unexpected DB error'));

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(500);
  });
});
