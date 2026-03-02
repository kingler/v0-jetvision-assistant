/**
 * Unit tests for ONEK-362: Webhook stores real Avinode quote IDs
 *
 * Tests that storeOperatorQuote() extracts real quote IDs from
 * messageDetails when webhookData.quote is null (declined responses).
 *
 * @see app/api/webhooks/avinode/webhook-utils.ts
 * @see ONEK-362
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storeOperatorQuote } from '@/app/api/webhooks/avinode/webhook-utils';
import type { AvinodeWebhookPayload } from '@/lib/types/avinode-webhooks';

// Mock Supabase client
const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: mockUpsert,
    })),
  })),
}));

// Set required env vars
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');

describe('ONEK-362: storeOperatorQuote — Avinode quote ID extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup chain: upsert -> select -> single
    mockSingle.mockResolvedValue({ data: { id: 'quote-uuid-123' }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockUpsert.mockReturnValue({ select: mockSelect });
  });

  it('should store real quote ID from webhookData.quote.id for quoted responses', async () => {
    const payload: AvinodeWebhookPayload = {
      event: 'TripRequestSellerResponse',
      eventId: 'evt-001',
      timestamp: new Date().toISOString(),
      data: {
        type: 'TripRequestSellerResponse',
        trip: { id: 'atrip-123', href: 'https://api.avinode.com/trips/123' },
        request: { id: 'arfq-456', href: 'https://api.avinode.com/rfqs/456', status: 'quoted' },
        seller: { id: 'seller-1', name: 'Test Operator', companyId: 'comp-1' },
        quote: {
          id: 'aquote-398402416',
          href: 'https://api.avinode.com/quotes/398402416',
          totalPrice: { amount: 45000, currency: 'USD' },
          validUntil: '2025-02-01T00:00:00Z',
        },
      },
    };

    await storeOperatorQuote({
      webhookPayload: payload,
      messageDetails: null,
      requestId: 'request-uuid-789',
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertedRecord = mockUpsert.mock.calls[0][0];
    expect(upsertedRecord.avinode_quote_id).toBe('aquote-398402416');
  });

  it('should extract real quote ID from messageDetails.data.id for declined responses', async () => {
    const payload: AvinodeWebhookPayload = {
      event: 'TripRequestSellerResponse',
      eventId: 'evt-002',
      timestamp: new Date().toISOString(),
      data: {
        type: 'TripRequestSellerResponse',
        trip: { id: 'atrip-123', href: 'https://api.avinode.com/trips/123' },
        request: { id: 'arfq-456', href: 'https://api.avinode.com/rfqs/456', status: 'declined' },
        seller: { id: 'seller-1', name: 'Test Operator', companyId: 'comp-1' },
        // quote is undefined for declined responses
        declineReason: 'Aircraft unavailable',
      },
    };

    // messageDetails fetched from API contains the real quote ID
    const messageDetails = {
      data: {
        id: 'aquote-real-declined-id',
        status: 'declined',
        sellerPrice: { price: 0, currency: 'USD' },
      },
    };

    await storeOperatorQuote({
      webhookPayload: payload,
      messageDetails: messageDetails as any,
      requestId: 'request-uuid-789',
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertedRecord = mockUpsert.mock.calls[0][0];
    // ONEK-362: Should use real ID from messageDetails, not pseudo-ID
    expect(upsertedRecord.avinode_quote_id).toBe('aquote-real-declined-id');
    expect(upsertedRecord.avinode_quote_id).not.toMatch(/^decline-/);
  });

  it('should extract real quote ID from messageDetails.id (top-level) when data.id unavailable', async () => {
    const payload: AvinodeWebhookPayload = {
      event: 'TripRequestSellerResponse',
      eventId: 'evt-003',
      timestamp: new Date().toISOString(),
      data: {
        type: 'TripRequestSellerResponse',
        trip: { id: 'atrip-123', href: 'https://api.avinode.com/trips/123' },
        request: { id: 'arfq-456', href: 'https://api.avinode.com/rfqs/456', status: 'declined' },
        seller: { id: 'seller-1', name: 'Test Operator', companyId: 'comp-1' },
      },
    };

    // Some API responses put the ID at top level
    const messageDetails = {
      id: 'aquote-top-level-id',
      sellerPrice: { price: 0, currency: 'USD' },
    };

    await storeOperatorQuote({
      webhookPayload: payload,
      messageDetails: messageDetails as any,
      requestId: 'request-uuid-789',
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertedRecord = mockUpsert.mock.calls[0][0];
    expect(upsertedRecord.avinode_quote_id).toBe('aquote-top-level-id');
  });

  it('should fall back to pseudo-ID only when no real ID exists anywhere', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const payload: AvinodeWebhookPayload = {
      event: 'TripRequestSellerResponse',
      eventId: 'evt-fallback-004',
      timestamp: new Date().toISOString(),
      data: {
        type: 'TripRequestSellerResponse',
        trip: { id: 'atrip-123', href: 'https://api.avinode.com/trips/123' },
        request: { id: 'arfq-456', href: 'https://api.avinode.com/rfqs/456', status: 'declined' },
        seller: { id: 'seller-1', name: 'Test Operator', companyId: 'comp-1' },
      },
    };

    // No real quote ID available anywhere
    await storeOperatorQuote({
      webhookPayload: payload,
      messageDetails: null,
      requestId: 'request-uuid-789',
    });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const upsertedRecord = mockUpsert.mock.calls[0][0];
    expect(upsertedRecord.avinode_quote_id).toBe('decline-evt-fallback-004');

    // Should log warning about pseudo-ID fallback
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No real Avinode quote ID found'),
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });

  it('should set status to declined for declined responses', async () => {
    const payload: AvinodeWebhookPayload = {
      event: 'TripRequestSellerResponse',
      eventId: 'evt-005',
      timestamp: new Date().toISOString(),
      data: {
        type: 'TripRequestSellerResponse',
        trip: { id: 'atrip-123', href: 'https://api.avinode.com/trips/123' },
        request: { id: 'arfq-456', href: 'https://api.avinode.com/rfqs/456', status: 'declined' },
        seller: { id: 'seller-1', name: 'Declining Operator', companyId: 'comp-1' },
        declineReason: 'No availability',
      },
    };

    await storeOperatorQuote({
      webhookPayload: payload,
      messageDetails: { data: { id: 'aquote-declined-999' } } as any,
      requestId: 'request-uuid-789',
    });

    const upsertedRecord = mockUpsert.mock.calls[0][0];
    expect(upsertedRecord.status).toBe('declined');
    expect(upsertedRecord.decline_reason).toBe('No availability');
  });
});
