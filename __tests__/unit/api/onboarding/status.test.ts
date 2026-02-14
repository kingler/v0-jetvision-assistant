/**
 * GET /api/onboarding/status — Unit Tests
 *
 * Tests the status API route which returns the authenticated user's
 * onboarding status and next action.
 *
 * @see app/api/onboarding/status/route.ts
 * @see lib/services/onboarding-service.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// MOCKS
// =============================================================================

// Mock Clerk auth — returns { userId } or { userId: null }
const mockAuth = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}));

// Mock onboarding service
const mockGetOnboardingStatus = vi.fn();
vi.mock('@/lib/services/onboarding-service', () => ({
  getOnboardingStatus: (...args: unknown[]) => mockGetOnboardingStatus(...args),
}));

// =============================================================================
// HELPERS
// =============================================================================

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/onboarding/status', {
    method: 'GET',
  });
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  return response.json();
}

// =============================================================================
// TESTS
// =============================================================================

describe('GET /api/onboarding/status', () => {
  let GET: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import the route handler fresh for each test so mocks are clean
    const mod = await import('@/app/api/onboarding/status/route');
    GET = mod.GET;
  });

  it('should return the onboarding status for an authenticated user', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_123' });
    mockGetOnboardingStatus.mockResolvedValue({
      onboardingStatus: 'pending',
      agentId: 'agent-1',
      email: 'jane@example.com',
      fullName: 'Jane Doe',
      hasContract: false,
      contractSigned: false,
    });

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);

    const body = await parseJson(response);
    expect(body.onboardingStatus).toBe('pending');
    expect(body.agentId).toBe('agent-1');
    expect(body.nextAction).toBe('complete_profile');

    // Verify the service was called with the Clerk user ID
    expect(mockGetOnboardingStatus).toHaveBeenCalledWith('clerk_user_123');
  });

  it('should return 401 for an unauthenticated request', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(makeRequest());
    expect(response.status).toBe(401);

    const body = await parseJson(response);
    expect(body.error).toBeDefined();

    // Service should never be called
    expect(mockGetOnboardingStatus).not.toHaveBeenCalled();
  });

  it('should return 404 when the ISO agent is not found', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_unknown' });
    mockGetOnboardingStatus.mockResolvedValue(null);

    const response = await GET(makeRequest());
    expect(response.status).toBe(404);

    const body = await parseJson(response);
    expect(body.error).toContain('not found');
  });

  // ---------------------------------------------------------------------------
  // nextAction mapping per status
  // ---------------------------------------------------------------------------

  it('should return nextAction "complete_profile" for status "pending"', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_1' });
    mockGetOnboardingStatus.mockResolvedValue({
      onboardingStatus: 'pending',
      agentId: 'a-1',
      email: 'a@b.com',
      fullName: 'Test',
      hasContract: false,
      contractSigned: false,
    });

    const response = await GET(makeRequest());
    const body = await parseJson(response);
    expect(body.nextAction).toBe('complete_profile');
  });

  it('should return nextAction "generate_contract" for status "profile_complete"', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_2' });
    mockGetOnboardingStatus.mockResolvedValue({
      onboardingStatus: 'profile_complete',
      agentId: 'a-2',
      email: 'b@b.com',
      fullName: 'Test',
      hasContract: false,
      contractSigned: false,
    });

    const response = await GET(makeRequest());
    const body = await parseJson(response);
    expect(body.nextAction).toBe('generate_contract');
  });

  it('should return nextAction "check_email" for status "contract_sent"', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_3' });
    mockGetOnboardingStatus.mockResolvedValue({
      onboardingStatus: 'contract_sent',
      agentId: 'a-3',
      email: 'c@b.com',
      fullName: 'Test',
      hasContract: true,
      contractSigned: false,
    });

    const response = await GET(makeRequest());
    const body = await parseJson(response);
    expect(body.nextAction).toBe('check_email');
  });

  it('should return nextAction "done" for status "contract_signed"', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_4' });
    mockGetOnboardingStatus.mockResolvedValue({
      onboardingStatus: 'contract_signed',
      agentId: 'a-4',
      email: 'd@b.com',
      fullName: 'Test',
      hasContract: true,
      contractSigned: true,
    });

    const response = await GET(makeRequest());
    const body = await parseJson(response);
    expect(body.nextAction).toBe('done');
  });

  it('should return nextAction "done" for status "completed"', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_5' });
    mockGetOnboardingStatus.mockResolvedValue({
      onboardingStatus: 'completed',
      agentId: 'a-5',
      email: 'e@b.com',
      fullName: 'Test',
      hasContract: true,
      contractSigned: true,
    });

    const response = await GET(makeRequest());
    const body = await parseJson(response);
    expect(body.nextAction).toBe('done');
  });

  it('should default nextAction to "complete_profile" for an unknown status', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_6' });
    mockGetOnboardingStatus.mockResolvedValue({
      onboardingStatus: 'some_unexpected_value',
      agentId: 'a-6',
      email: 'f@b.com',
      fullName: 'Test',
      hasContract: false,
      contractSigned: false,
    });

    const response = await GET(makeRequest());
    const body = await parseJson(response);
    expect(body.nextAction).toBe('complete_profile');
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  it('should return 500 when the service throws', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk_user_err' });
    mockGetOnboardingStatus.mockRejectedValue(new Error('DB connection lost'));

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
  });
});
