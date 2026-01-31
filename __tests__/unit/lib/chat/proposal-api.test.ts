/**
 * Proposal API Service Unit Tests
 *
 * Tests for lib/chat/api/proposal-api.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateAndSend,
  persistConfirmation,
  buildProposalSentData,
  buildConfirmationContent,
  isValidRequestId,
  findValidRequestId,
} from '@/lib/chat/api/proposal-api';
import type {
  ProposalCustomer,
  ProposalTripDetails,
  ProposalResult,
} from '@/lib/chat/api/proposal-api';
import type { RFQFlight } from '@/lib/chat/types';
import { RFQStatus } from '@/lib/chat/constants';

// =============================================================================
// MOCKS
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// TEST DATA
// =============================================================================

const mockCustomer: ProposalCustomer = {
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Corp',
  phone: '+1234567890',
};

const mockTripDetails: ProposalTripDetails = {
  departureAirport: { icao: 'KTEB', name: 'Teterboro', city: 'Teterboro' },
  arrivalAirport: { icao: 'KLAX', name: 'Los Angeles Intl', city: 'Los Angeles' },
  departureDate: '2026-02-15',
  passengers: 4,
  tripId: 'trip-123',
};

const mockFlight: RFQFlight = {
  id: 'flight-1',
  quoteId: 'quote-1',
  departureAirport: { icao: 'KTEB', name: 'Teterboro', city: 'Teterboro' },
  arrivalAirport: { icao: 'KLAX', name: 'Los Angeles Intl', city: 'Los Angeles' },
  departureDate: '2026-02-15',
  flightDuration: '5h 30m',
  aircraftType: 'Gulfstream G650',
  aircraftModel: 'G650',
  passengerCapacity: 14,
  operatorName: 'NetJets',
  totalPrice: 50000,
  currency: 'USD',
  amenities: { wifi: true, pets: false, smoking: false, galley: true, lavatory: true, medical: false },
  rfqStatus: RFQStatus.QUOTED,
  lastUpdated: '2026-01-31T10:00:00Z',
};

// =============================================================================
// generateAndSend TESTS
// =============================================================================

describe('generateAndSend', () => {
  it('should generate and send a proposal successfully', async () => {
    const mockResult: ProposalResult = {
      success: true,
      proposalId: 'prop-123',
      pdfUrl: 'https://storage.example.com/proposal.pdf',
      fileName: 'proposal.pdf',
      emailSent: true,
      messageId: 'msg-456',
      pricing: { total: 65000, currency: 'USD' },
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResult), { status: 200 })
    );

    const result = await generateAndSend({
      customer: mockCustomer,
      tripDetails: mockTripDetails,
      selectedFlights: [mockFlight],
      jetvisionFeePercentage: 30,
    });

    expect(result.success).toBe(true);
    expect(result.proposalId).toBe('prop-123');
    expect(result.pdfUrl).toBe('https://storage.example.com/proposal.pdf');
    expect(result.emailSent).toBe(true);
  });

  it('should include requestId when provided', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await generateAndSend({
      customer: mockCustomer,
      tripDetails: mockTripDetails,
      selectedFlights: [mockFlight],
      jetvisionFeePercentage: 30,
      requestId: 'req-789',
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.requestId).toBe('req-789');
  });

  it('should not include requestId when not provided', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await generateAndSend({
      customer: mockCustomer,
      tripDetails: mockTripDetails,
      selectedFlights: [mockFlight],
      jetvisionFeePercentage: 30,
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);

    expect(body.requestId).toBeUndefined();
  });

  it('should throw error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Invalid data' }), { status: 400 })
    );

    await expect(
      generateAndSend({
        customer: mockCustomer,
        tripDetails: mockTripDetails,
        selectedFlights: [mockFlight],
        jetvisionFeePercentage: 30,
      })
    ).rejects.toThrow('Invalid data');
  });

  it('should throw error when success is false', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: 'Email failed' }), { status: 200 })
    );

    await expect(
      generateAndSend({
        customer: mockCustomer,
        tripDetails: mockTripDetails,
        selectedFlights: [mockFlight],
        jetvisionFeePercentage: 30,
      })
    ).rejects.toThrow('Email failed');
  });
});

// =============================================================================
// persistConfirmation TESTS
// =============================================================================

describe('persistConfirmation', () => {
  it('should persist confirmation and return message ID', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, messageId: 'msg-123' }), { status: 200 })
    );

    const result = await persistConfirmation({
      requestId: 'req-456',
      content: 'Proposal sent',
      proposalSentData: {
        flightDetails: { departureAirport: 'KTEB', arrivalAirport: 'KLAX', departureDate: '2026-02-15' },
        client: { name: 'John Doe', email: 'john@example.com' },
        pdfUrl: 'https://example.com/proposal.pdf',
      },
    });

    expect(result).toBe('msg-123');
  });

  it('should return null on API failure', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status: 500 })
    );

    const result = await persistConfirmation({
      requestId: 'req-456',
      content: 'Proposal sent',
      proposalSentData: {
        flightDetails: { departureAirport: 'KTEB', arrivalAirport: 'KLAX', departureDate: '2026-02-15' },
        client: { name: 'John Doe', email: 'john@example.com' },
        pdfUrl: '',
      },
    });

    expect(result).toBeNull();
  });

  it('should return null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await persistConfirmation({
      requestId: 'req-456',
      content: 'Proposal sent',
      proposalSentData: {
        flightDetails: { departureAirport: 'KTEB', arrivalAirport: 'KLAX', departureDate: '2026-02-15' },
        client: { name: 'John Doe', email: 'john@example.com' },
        pdfUrl: '',
      },
    });

    expect(result).toBeNull();
  });
});

// =============================================================================
// buildProposalSentData TESTS
// =============================================================================

describe('buildProposalSentData', () => {
  it('should build proposal sent data correctly', () => {
    const result: ProposalResult = {
      success: true,
      pdfUrl: 'https://example.com/proposal.pdf',
      fileName: 'proposal.pdf',
      proposalId: 'prop-123',
      pricing: { total: 65000, currency: 'USD' },
    };

    const data = buildProposalSentData(result, mockTripDetails, mockCustomer);

    expect(data.flightDetails.departureAirport).toBe('KTEB');
    expect(data.flightDetails.arrivalAirport).toBe('KLAX');
    expect(data.flightDetails.departureDate).toBe('2026-02-15');
    expect(data.client.name).toBe('John Doe');
    expect(data.client.email).toBe('john@example.com');
    expect(data.pdfUrl).toBe('https://example.com/proposal.pdf');
    expect(data.pricing?.total).toBe(65000);
  });

  it('should handle missing pdfUrl', () => {
    const result: ProposalResult = { success: true };

    const data = buildProposalSentData(result, mockTripDetails, mockCustomer);

    expect(data.pdfUrl).toBe('');
  });
});

// =============================================================================
// buildConfirmationContent TESTS
// =============================================================================

describe('buildConfirmationContent', () => {
  it('should build success message when email was sent', () => {
    const result: ProposalResult = { success: true, emailSent: true };

    const content = buildConfirmationContent(result, mockTripDetails, mockCustomer);

    expect(content).toBe('The proposal for KTEB → KLAX was sent to John Doe at john@example.com.');
  });

  it('should build fallback message when email was not sent', () => {
    const result: ProposalResult = { success: true, emailSent: false };

    const content = buildConfirmationContent(result, mockTripDetails, mockCustomer);

    expect(content).toBe(
      'The proposal for KTEB → KLAX was generated. Email could not be sent (check Gmail configuration).'
    );
  });
});

// =============================================================================
// isValidRequestId TESTS
// =============================================================================

describe('isValidRequestId', () => {
  it('should return true for valid UUID', () => {
    expect(isValidRequestId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidRequestId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('should return false for invalid UUID', () => {
    expect(isValidRequestId('not-a-uuid')).toBe(false);
    expect(isValidRequestId('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isValidRequestId('')).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isValidRequestId(null)).toBe(false);
    expect(isValidRequestId(undefined)).toBe(false);
  });
});

// =============================================================================
// findValidRequestId TESTS
// =============================================================================

describe('findValidRequestId', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  it('should return requestId if valid', () => {
    const result = findValidRequestId({
      requestId: validUUID,
      conversationId: 'invalid',
      id: 'also-invalid',
    });

    expect(result).toBe(validUUID);
  });

  it('should fall back to conversationId if requestId invalid', () => {
    const result = findValidRequestId({
      requestId: 'invalid',
      conversationId: validUUID,
      id: 'also-invalid',
    });

    expect(result).toBe(validUUID);
  });

  it('should fall back to id if both requestId and conversationId invalid', () => {
    const result = findValidRequestId({
      requestId: 'invalid',
      conversationId: 'also-invalid',
      id: validUUID,
    });

    expect(result).toBe(validUUID);
  });

  it('should return null if no valid UUID found', () => {
    const result = findValidRequestId({
      requestId: 'invalid',
      conversationId: 'also-invalid',
      id: 'still-invalid',
    });

    expect(result).toBeNull();
  });

  it('should handle empty object', () => {
    const result = findValidRequestId({});
    expect(result).toBeNull();
  });
});
