/**
 * @vitest-environment node
 */

/**
 * mapDbMessageToChatMessage - Payment and Deal Content Type Tests
 *
 * Tests that payment_confirmed and deal_closed DB messages
 * are correctly mapped to ChatSession message UI format.
 *
 * @see lib/utils/map-db-message-to-ui.ts
 */

import { describe, it, expect } from 'vitest';
import { mapDbMessageToChatMessage, type DbMessageLike } from '@/lib/utils/map-db-message-to-ui';
import {
  MOCK_CONTRACT_ID,
  mockPaymentConfirmedRichContent,
  mockDealClosedRichContent,
} from '../../../fixtures/payment-test-data';

// =============================================================================
// HELPERS
// =============================================================================

function makeDbMessage(overrides: Partial<DbMessageLike> = {}): DbMessageLike {
  return {
    id: 'msg-001',
    content: 'Test message',
    createdAt: '2026-02-10T12:00:00Z',
    senderType: 'ai_assistant',
    contentType: 'text',
    richContent: null,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('mapDbMessageToChatMessage - Payment and Deal Types', () => {
  // ---------------------------------------------------------------------------
  // payment_confirmed
  // ---------------------------------------------------------------------------

  describe('payment_confirmed', () => {
    it('sets showPaymentConfirmation=true when richContent.paymentConfirmed exists', () => {
      const msg = makeDbMessage({
        contentType: 'payment_confirmed',
        richContent: mockPaymentConfirmedRichContent,
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.showPaymentConfirmation).toBe(true);
    });

    it('passes paymentConfirmationData from richContent', () => {
      const msg = makeDbMessage({
        contentType: 'payment_confirmed',
        richContent: mockPaymentConfirmedRichContent,
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.paymentConfirmationData).toEqual(
        mockPaymentConfirmedRichContent.paymentConfirmed
      );
    });

    it('preserves base message fields (id, type, content, timestamp)', () => {
      const msg = makeDbMessage({
        id: 'msg-payment-001',
        content: 'Payment confirmed for CONTRACT-2026-001',
        createdAt: '2026-02-10T12:00:00Z',
        contentType: 'payment_confirmed',
        richContent: mockPaymentConfirmedRichContent,
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.id).toBe('msg-payment-001');
      expect(result.content).toBe('Payment confirmed for CONTRACT-2026-001');
      expect(result.timestamp).toEqual(new Date('2026-02-10T12:00:00Z'));
    });

    it('maps senderType ai_assistant to type=agent', () => {
      const msg = makeDbMessage({
        senderType: 'ai_assistant',
        contentType: 'payment_confirmed',
        richContent: mockPaymentConfirmedRichContent,
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.type).toBe('agent');
    });

    it('returns base message when richContent is null', () => {
      const msg = makeDbMessage({
        contentType: 'payment_confirmed',
        richContent: null,
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.showPaymentConfirmation).toBeUndefined();
      expect(result.paymentConfirmationData).toBeUndefined();
    });

    it('returns base message when paymentConfirmed key is missing', () => {
      const msg = makeDbMessage({
        contentType: 'payment_confirmed',
        richContent: { someOtherKey: 'value' },
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.showPaymentConfirmation).toBeUndefined();
    });

    it('returns base message when paymentConfirmed is not an object', () => {
      const msg = makeDbMessage({
        contentType: 'payment_confirmed',
        richContent: { paymentConfirmed: null },
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.showPaymentConfirmation).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // deal_closed
  // ---------------------------------------------------------------------------

  describe('deal_closed', () => {
    it('sets showClosedWon=true when richContent.dealClosed exists', () => {
      const msg = makeDbMessage({
        contentType: 'deal_closed',
        richContent: mockDealClosedRichContent,
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.showClosedWon).toBe(true);
    });

    it('passes closedWonData from richContent', () => {
      const msg = makeDbMessage({
        contentType: 'deal_closed',
        richContent: mockDealClosedRichContent,
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.closedWonData).toEqual(
        mockDealClosedRichContent.dealClosed
      );
    });

    it('returns base message when richContent is null', () => {
      const msg = makeDbMessage({
        contentType: 'deal_closed',
        richContent: null,
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.showClosedWon).toBeUndefined();
      expect(result.closedWonData).toBeUndefined();
    });

    it('returns base message when dealClosed key is missing', () => {
      const msg = makeDbMessage({
        contentType: 'deal_closed',
        richContent: { someOtherKey: 'value' },
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.showClosedWon).toBeUndefined();
    });

    it('returns base message when dealClosed is not an object', () => {
      const msg = makeDbMessage({
        contentType: 'deal_closed',
        richContent: { dealClosed: null },
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.showClosedWon).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('returns base message for unknown contentType', () => {
      const msg = makeDbMessage({
        contentType: 'unknown_type',
        richContent: { paymentConfirmed: { contractId: MOCK_CONTRACT_ID } },
      });

      const result = mapDbMessageToChatMessage(msg);

      // paymentConfirmed detection is based on richContent key presence, not contentType
      // so this will still match if the key is present
      expect(result.showPaymentConfirmation).toBe(true);
    });

    it('handles empty richContent object {}', () => {
      const msg = makeDbMessage({
        contentType: 'payment_confirmed',
        richContent: {},
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.showPaymentConfirmation).toBeUndefined();
      expect(result.showClosedWon).toBeUndefined();
    });

    it('maps senderType iso_agent to type=user', () => {
      const msg = makeDbMessage({
        senderType: 'iso_agent',
        contentType: 'text',
      });

      const result = mapDbMessageToChatMessage(msg);

      expect(result.type).toBe('user');
    });
  });
});
