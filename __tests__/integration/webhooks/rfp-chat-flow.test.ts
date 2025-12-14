/**
 * RFP Chat Flow Integration Tests
 *
 * Tests the complete end-to-end flow from Avinode webhook receipt
 * through database storage to ProposalAnalysisAgent triggering.
 *
 * @module __tests__/integration/webhooks/rfp-chat-flow.test.ts
 * @see ONEK-130
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Types we expect to exist
import type { AvinodeWebhookPayload } from '@/lib/types/avinode-webhooks';

// Functions we expect to implement
import {
  fetchMessageDetails,
  storeOperatorQuote,
  triggerProposalAnalysis,
  validateWebhookPayload,
} from '@/app/api/webhooks/avinode/webhook-utils';

// Mock data we expect to create
import {
  mockAcceptedQuoteWebhook,
  mockDeclinedQuoteWebhook,
  mockCounterOfferWebhook,
  mockPartialAvailabilityWebhook,
  mockOperatorChatWebhook,
  mockAcceptedQuoteDetails,
} from '@/lib/mock-data/avinode-webhook-payloads';

// ============================================================================
// Test Setup
// ============================================================================

// Use vi.hoisted to ensure mock functions are available before vi.mock
const { mockSingle, mockSelect, mockUpsert, mockFrom, mockCreateClient } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ single: mockSingle }));
  const mockUpsert = vi.fn(() => ({ select: mockSelect }));
  const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));
  const mockCreateClient = vi.fn(() => ({ from: mockFrom }));
  return { mockSingle, mockSelect, mockUpsert, mockFrom, mockCreateClient };
});

// Mock Supabase client - must mock the actual package
vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

// Mock MessageBus with hoisted functions
const { mockPublish, mockSubscribe, mockReset } = vi.hoisted(() => ({
  mockPublish: vi.fn(),
  mockSubscribe: vi.fn(() => () => {}),
  mockReset: vi.fn(),
}));

vi.mock('@agents/coordination', () => ({
  messageBus: {
    publish: mockPublish,
    subscribe: mockSubscribe,
    reset: mockReset,
  },
  MessageType: {
    TASK_CREATED: 'TASK_CREATED',
    TASK_COMPLETED: 'TASK_COMPLETED',
  },
}));

// Mock global fetch for Avinode API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RFP Chat Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Set up default mock responses for Supabase chain
    mockSingle.mockResolvedValue({
      data: { id: 'test-quote-id' },
      error: null,
    });
    mockPublish.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Task 1: Webhook Payload Validation
  // =========================================================================
  describe('Webhook Payload Validation', () => {
    it('should validate a well-formed TripRequestSellerResponse webhook', () => {
      const result = validateWebhookPayload(mockAcceptedQuoteWebhook);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.event).toBe('TripRequestSellerResponse');
    });

    it('should reject malformed webhook payload', () => {
      const malformed = { invalid: 'data' };

      const result = validateWebhookPayload(malformed as unknown as AvinodeWebhookPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate TripChatSeller webhook', () => {
      const result = validateWebhookPayload(mockOperatorChatWebhook);

      expect(result.success).toBe(true);
      expect(result.data?.event).toBe('TripChatSeller');
    });

    it('should extract quote ID from webhook payload', () => {
      const result = validateWebhookPayload(mockAcceptedQuoteWebhook);

      expect(result.success).toBe(true);
      // @ts-expect-error - accessing nested data
      expect(result.data?.data?.quote?.id).toBe('aquote-386512791');
    });
  });

  // =========================================================================
  // Task 2: Fetch Message Details from Avinode API
  // =========================================================================
  describe('Fetch Message Details', () => {
    it('should fetch full quote details from Avinode API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAcceptedQuoteDetails),
      });

      const result = await fetchMessageDetails(
        'https://sandbox.avinode.com/api/quotes/aquote-386512791'
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.data.id).toBe('aquote-386512791');
    });

    it('should retry on rate limit (429) with exponential backoff', async () => {
      mockFetch
        .mockResolvedValueOnce({ status: 429, ok: false })
        .mockResolvedValueOnce({ status: 429, ok: false })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAcceptedQuoteDetails),
        });

      const result = await fetchMessageDetails(
        'https://sandbox.avinode.com/api/quotes/aquote-386512791'
      );

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });

    it('should throw after max retries exceeded', async () => {
      mockFetch.mockResolvedValue({ status: 429, ok: false });

      await expect(
        fetchMessageDetails(
          'https://sandbox.avinode.com/api/quotes/aquote-386512791',
          { maxRetries: 3 }
        )
      ).rejects.toThrow(/rate limit|max retries/i);
    });

    it('should handle API errors gracefully', async () => {
      // Mock all 3 retry attempts with 500 error
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      mockFetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse);

      await expect(
        fetchMessageDetails('https://sandbox.avinode.com/api/quotes/invalid')
      ).rejects.toThrow(/500|Internal Server Error/);
    });

    it('should include correct authentication headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAcceptedQuoteDetails),
      });

      await fetchMessageDetails(
        'https://sandbox.avinode.com/api/quotes/aquote-386512791'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer /),
            'X-Avinode-ApiToken': expect.any(String),
          }),
        })
      );
    });
  });

  // =========================================================================
  // Task 3: Store Operator Quote in Database
  // =========================================================================
  describe('Store Operator Quote', () => {
    it('should store accepted quote in database', async () => {
      const quoteId = await storeOperatorQuote({
        webhookPayload: mockAcceptedQuoteWebhook,
        messageDetails: mockAcceptedQuoteDetails,
        requestId: 'test-request-id',
      });

      expect(quoteId).toBeDefined();
      expect(typeof quoteId).toBe('string');
    });

    it('should store quote with correct fields', async () => {
      await storeOperatorQuote({
        webhookPayload: mockAcceptedQuoteWebhook,
        messageDetails: mockAcceptedQuoteDetails,
        requestId: 'test-request-id',
      });

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          avinode_quote_id: 'aquote-386512791',
          operator_name: expect.any(String),
          status: 'received',
        }),
        expect.any(Object)
      );
    });

    it('should store declined quote with reason', async () => {
      const quoteId = await storeOperatorQuote({
        webhookPayload: mockDeclinedQuoteWebhook,
        messageDetails: null,
        requestId: 'test-request-id',
      });

      expect(quoteId).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      // Override the mock to return an error
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        storeOperatorQuote({
          webhookPayload: mockAcceptedQuoteWebhook,
          messageDetails: mockAcceptedQuoteDetails,
          requestId: 'test-request-id',
        })
      ).rejects.toThrow(/Database error/);
    });

    it('should upsert on duplicate avinode_quote_id', async () => {
      // First insert
      await storeOperatorQuote({
        webhookPayload: mockAcceptedQuoteWebhook,
        messageDetails: mockAcceptedQuoteDetails,
        requestId: 'test-request-id',
      });

      // Second insert with same quote ID should upsert
      const quoteId = await storeOperatorQuote({
        webhookPayload: mockAcceptedQuoteWebhook,
        messageDetails: mockAcceptedQuoteDetails,
        requestId: 'test-request-id',
      });

      expect(quoteId).toBeDefined();
    });
  });

  // =========================================================================
  // Task 4: Trigger ProposalAnalysisAgent
  // =========================================================================
  describe('Trigger ProposalAnalysisAgent', () => {
    it('should publish TASK_CREATED to MessageBus', async () => {
      const { messageBus, MessageType } = await import('@agents/coordination');

      await triggerProposalAnalysis({
        rfpId: 'test-request-id',
        quoteId: 'test-quote-id',
        context: { userId: 'test-user-id' },
      });

      expect(messageBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.TASK_CREATED,
          targetAgent: 'proposal-analysis-agent',
          payload: expect.objectContaining({
            taskType: 'analyze_quote',
            rfpId: 'test-request-id',
            quoteId: 'test-quote-id',
          }),
        })
      );
    });

    it('should include correct context in MessageBus event', async () => {
      const { messageBus } = await import('@agents/coordination');

      await triggerProposalAnalysis({
        rfpId: 'test-request-id',
        quoteId: 'test-quote-id',
        context: { userId: 'test-user-id', sessionId: 'test-session' },
      });

      expect(messageBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            userId: 'test-user-id',
            sessionId: 'test-session',
          }),
        })
      );
    });

    it('should set high priority for quote analysis', async () => {
      const { messageBus } = await import('@agents/coordination');

      await triggerProposalAnalysis({
        rfpId: 'test-request-id',
        quoteId: 'test-quote-id',
        context: { userId: 'test-user-id' },
      });

      expect(messageBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            priority: 'high',
          }),
        })
      );
    });
  });

  // =========================================================================
  // End-to-End Flow Tests
  // =========================================================================
  describe('End-to-End Flow', () => {
    it('should process accepted quote webhook end-to-end', async () => {
      // Setup mocks for full flow
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAcceptedQuoteDetails),
      });

      const { messageBus } = await import('@agents/coordination');

      // Validate webhook
      const validation = validateWebhookPayload(mockAcceptedQuoteWebhook);
      expect(validation.success).toBe(true);

      // Fetch details
      const details = await fetchMessageDetails(
        'https://sandbox.avinode.com/api/quotes/aquote-386512791'
      );
      expect(details).toBeDefined();

      // Store quote
      const quoteId = await storeOperatorQuote({
        webhookPayload: mockAcceptedQuoteWebhook,
        messageDetails: details,
        requestId: 'test-request-id',
      });
      expect(quoteId).toBeDefined();

      // Trigger analysis
      await triggerProposalAnalysis({
        rfpId: 'test-request-id',
        quoteId: quoteId,
        context: { userId: 'test-user-id' },
      });

      expect(messageBus.publish).toHaveBeenCalled();
    });

    it('should handle declined quote without fetching details', async () => {
      const validation = validateWebhookPayload(mockDeclinedQuoteWebhook);
      expect(validation.success).toBe(true);

      // Declined quotes don't have quote details to fetch
      const quoteId = await storeOperatorQuote({
        webhookPayload: mockDeclinedQuoteWebhook,
        messageDetails: null,
        requestId: 'test-request-id',
      });

      expect(quoteId).toBeDefined();
      // Should NOT trigger analysis for declined quotes
      const { messageBus } = await import('@agents/coordination');
      expect(messageBus.publish).not.toHaveBeenCalled();
    });

    it('should handle counter-offer quote', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAcceptedQuoteDetails),
      });

      const validation = validateWebhookPayload(mockCounterOfferWebhook);
      expect(validation.success).toBe(true);
    });

    it('should handle partial availability quote', async () => {
      const validation = validateWebhookPayload(mockPartialAvailabilityWebhook);
      expect(validation.success).toBe(true);
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================
  describe('Error Handling', () => {
    it('should handle network errors during API fetch', async () => {
      // Mock all 3 retry attempts with network error
      const networkError = new Error('Network error');
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError);

      await expect(
        fetchMessageDetails('https://sandbox.avinode.com/api/quotes/test')
      ).rejects.toThrow(/Network error/);
    });

    it('should handle malformed API response', async () => {
      // Mock all 3 retry attempts with invalid JSON
      const malformedResponse = {
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      };
      mockFetch
        .mockResolvedValueOnce(malformedResponse)
        .mockResolvedValueOnce(malformedResponse)
        .mockResolvedValueOnce(malformedResponse);

      await expect(
        fetchMessageDetails('https://sandbox.avinode.com/api/quotes/test')
      ).rejects.toThrow();
    });
  });
});
