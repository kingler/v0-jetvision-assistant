/**
 * @vitest-environment node
 */

/**
 * Proposal Generate API Route Tests
 *
 * Tests for POST /api/proposal/generate endpoint.
 * Generates PDF proposals from selected RFQ flights.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { RFQFlight } from '@/lib/mcp/clients/avinode-client';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock PDF generator
const mockGenerateProposal = vi.fn();
vi.mock('@/lib/pdf', () => ({
  generateProposal: (...args: unknown[]) => mockGenerateProposal(...args),
}));

// Import after mocks
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';

// =============================================================================
// TEST DATA
// =============================================================================

const mockFlight: RFQFlight = {
  id: 'flight-001',
  quoteId: 'quote-abc123',
  departureAirport: {
    icao: 'KTEB',
    name: 'Teterboro Airport',
    city: 'Teterboro, NJ',
  },
  arrivalAirport: {
    icao: 'KVNY',
    name: 'Van Nuys Airport',
    city: 'Van Nuys, CA',
  },
  departureDate: '2025-01-15',
  departureTime: '09:00',
  flightDuration: '5h 30m',
  aircraftType: 'Heavy Jet',
  aircraftModel: 'Gulfstream G650',
  tailNumber: 'N650EJ',
  yearOfManufacture: 2022,
  passengerCapacity: 16,
  operatorName: 'Executive Jet Management',
  operatorRating: 4.8,
  price: 45000,
  currency: 'USD',
  priceBreakdown: {
    base: 40000,
    taxes: 3000,
    fees: 2000,
  },
  validUntil: '2025-01-10',
  amenities: {
    wifi: true,
    pets: true,
    smoking: false,
    galley: true,
    lavatory: true,
    medical: true,
  },
  rfqStatus: 'quoted',
  lastUpdated: '2025-01-05T10:30:00Z',
  isSelected: true,
};

const validRequestBody = {
  customer: {
    name: 'John Smith',
    email: 'john.smith@example.com',
    company: 'Acme Corp',
  },
  tripDetails: {
    departureAirport: {
      icao: 'KTEB',
      name: 'Teterboro Airport',
      city: 'Teterboro, NJ',
    },
    arrivalAirport: {
      icao: 'KVNY',
      name: 'Van Nuys Airport',
      city: 'Van Nuys, CA',
    },
    departureDate: '2025-01-15',
    departureTime: '09:00',
    passengers: 6,
    tripId: 'atrip-64956151',
  },
  selectedFlights: [mockFlight],
};

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/proposal/generate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function setupAuthMock(userId: string | null = 'user_test123') {
  vi.mocked(auth).mockResolvedValue({
    userId,
    sessionId: userId ? 'session-123' : null,
    sessionClaims: null,
    actor: null,
    has: () => !!userId,
    debug: () => null,
  });
}

function setupSupabaseMock(userData: { id: string } | null = { id: 'agent-uuid-123' }) {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: userData,
          error: userData ? null : { message: 'Not found', code: 'PGRST116' },
        }),
      }),
    }),
  });
  vi.mocked(supabase.from).mockImplementation(mockFrom as any);
}

// =============================================================================
// TESTS
// =============================================================================

describe('POST /api/proposal/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthMock();
    setupSupabaseMock();
    mockGenerateProposal.mockResolvedValue({
      proposalId: 'JV-ABC123-XYZ',
      pdfBuffer: Buffer.from('mock-pdf-content'),
      pdfBase64: 'bW9jay1wZGYtY29udGVudA==',
      fileName: 'Jetvision_Proposal_KTEB_KVNY_20250115_JV-ABC123-XYZ.pdf',
      generatedAt: '2025-01-05T12:00:00Z',
      pricing: {
        subtotal: 40000,
        jetvisionFee: 4000,
        taxes: 5000,
        total: 49000,
        currency: 'USD',
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Successful Requests', () => {
    it('generates a PDF proposal with valid input', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest(validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.proposalId).toBe('JV-ABC123-XYZ');
      expect(data.fileName).toContain('Jetvision_Proposal');
      expect(data.pdfBase64).toBe('bW9jay1wZGYtY29udGVudA==');
    });

    it('calls generateProposal with correct parameters', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest(validRequestBody);

      await POST(request);

      expect(mockGenerateProposal).toHaveBeenCalledWith({
        customer: validRequestBody.customer,
        tripDetails: validRequestBody.tripDetails,
        selectedFlights: validRequestBody.selectedFlights,
        jetvisionFeePercentage: 10,
      });
    });

    it('includes pricing information in response', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest(validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(data.pricing).toBeDefined();
      expect(data.pricing.subtotal).toBe(40000);
      expect(data.pricing.total).toBe(49000);
      expect(data.pricing.currency).toBe('USD');
    });

    it('includes generatedAt timestamp', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest(validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(data.generatedAt).toBeDefined();
      expect(typeof data.generatedAt).toBe('string');
    });

    it('accepts custom jetvisionFeePercentage', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest({
        ...validRequestBody,
        jetvisionFeePercentage: 15,
      });

      await POST(request);

      expect(mockGenerateProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          jetvisionFeePercentage: 15,
        })
      );
    });
  });

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      setupAuthMock(null);

      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest(validRequestBody);

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('returns 404 when user not found in database', async () => {
      setupSupabaseMock(null);

      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest(validRequestBody);

      const response = await POST(request);

      expect(response.status).toBe(404);
    });
  });

  describe('Validation Errors', () => {
    it('returns 400 when customer name is missing', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest({
        ...validRequestBody,
        customer: { email: 'test@example.com' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('name');
    });

    it('returns 400 when customer email is missing', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest({
        ...validRequestBody,
        customer: { name: 'John Smith' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('email');
    });

    it('returns 400 when selectedFlights is empty', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest({
        ...validRequestBody,
        selectedFlights: [],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('flight');
    });

    it('returns 400 when tripDetails is missing', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest({
        customer: validRequestBody.customer,
        selectedFlights: validRequestBody.selectedFlights,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('tripDetails');
    });

    it('returns 400 for invalid JSON body', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = new NextRequest('http://localhost:3000/api/proposal/generate', {
        method: 'POST',
        body: 'invalid-json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('returns 500 when PDF generation fails', async () => {
      mockGenerateProposal.mockRejectedValue(new Error('PDF generation failed'));

      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest(validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('returns 500 with error details when generator throws', async () => {
      mockGenerateProposal.mockRejectedValue(new Error('Buffer allocation failed'));

      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest(validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    it('returns proper content type', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest(validRequestBody);

      const response = await POST(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('returns all required fields in success response', async () => {
      const { POST } = await import('@/app/api/proposal/generate/route');
      const request = createMockRequest(validRequestBody);

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('proposalId');
      expect(data).toHaveProperty('fileName');
      expect(data).toHaveProperty('pdfBase64');
      expect(data).toHaveProperty('generatedAt');
      expect(data).toHaveProperty('pricing');
    });
  });
});
