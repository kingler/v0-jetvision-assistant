/**
 * Unit tests for request-to-chat-session.ts mapping functions
 *
 * Tests the conversion of database Request objects to UI ChatSession format,
 * verifying all workflow stages map to correct status and step numbers.
 *
 * Related issues: ONEK-256, ONEK-275
 */
import { describe, it, expect } from 'vitest';
import { requestToChatSession } from '@/lib/utils/request-to-chat-session';
import type { Request } from '@/lib/types/database';

/**
 * Minimal Request factory for testing.
 * Only required fields are set; optional fields default to null.
 */
function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    id: 'test-request-id',
    iso_agent_id: 'agent-1',
    client_profile_id: null,
    departure_airport: 'KTEB',
    arrival_airport: 'KVNY',
    departure_date: '2026-03-01',
    return_date: null,
    trip_type: 'one_way',
    passengers: 4,
    aircraft_type: null,
    budget: null,
    special_requirements: null,
    status: 'pending' as Request['status'],
    metadata: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    avinode_trip_id: null,
    avinode_rfq_id: null,
    avinode_deep_link: null,
    avinode_session_started_at: null,
    avinode_session_ended_at: null,
    avinode_thread_id: null,
    operators_contacted: null,
    quotes_expected: null,
    quotes_received: null,
    session_status: null,
    conversation_type: null,
    current_step: null,
    workflow_state: null,
    session_started_at: null,
    session_ended_at: null,
    last_activity_at: null,
    subject: null,
    last_message_at: null,
    last_message_by: null,
    message_count: null,
    unread_count_iso: null,
    unread_count_operator: null,
    is_priority: null,
    is_pinned: null,
    segment_count: null,
    ...overrides,
  } as Request;
}

describe('requestToChatSession', () => {
  describe('status mapping: all DB statuses → correct UI status', () => {
    // Some statuses (proposal_sent, contract_generated, etc.) are handled by
    // the mapping function at runtime but not yet in the Supabase request_status
    // enum. We use `string` for the first tuple element to cover both DB-enum
    // and extended statuses.
    const STATUS_MAP: Array<[string, string, number]> = [
      // [db status, expected UI status, expected step]
      ['draft', 'understanding_request', 1],
      ['pending', 'understanding_request', 1],
      ['analyzing', 'understanding_request', 1],
      ['fetching_client_data', 'understanding_request', 1],
      ['trip_created', 'searching_aircraft', 2],
      ['searching_flights', 'searching_aircraft', 2],
      ['awaiting_user_action', 'searching_aircraft', 2],
      ['avinode_session_active', 'searching_aircraft', 2],
      ['monitoring_for_quotes', 'requesting_quotes', 3],
      ['awaiting_quotes', 'requesting_quotes', 3],
      ['analyzing_proposals', 'analyzing_options', 4],
      ['generating_email', 'analyzing_options', 4],
      ['sending_proposal', 'proposal_ready', 5],
      ['proposal_sent', 'proposal_sent', 6],
      ['contract_generated', 'contract_generated', 7],
      ['contract_sent', 'contract_sent', 8],
      ['payment_pending', 'payment_pending', 9],
      ['completed', 'closed_won', 10],
      ['closed_won', 'closed_won', 10],
      ['failed', 'understanding_request', 1],
      ['cancelled', 'understanding_request', 1],
    ];

    it.each(STATUS_MAP)(
      'request.status="%s" → status="%s", step=%d',
      (dbStatus, expectedStatus, expectedStep) => {
        const request = makeRequest({ status: dbStatus as Request['status'] });
        const result = requestToChatSession(request);

        expect(result.status).toBe(expectedStatus);
        expect(result.currentStep).toBe(expectedStep);
      }
    );
  });

  describe('totalSteps is always 10', () => {
    it('returns totalSteps=10 for any status', () => {
      const request = makeRequest({ status: 'pending' });
      const result = requestToChatSession(request);
      expect(result.totalSteps).toBe(10);
    });

    it('returns totalSteps=10 for completed status', () => {
      const request = makeRequest({ status: 'completed' });
      const result = requestToChatSession(request);
      expect(result.totalSteps).toBe(10);
    });
  });

  describe('route generation', () => {
    it('generates route from departure and arrival airports', () => {
      const request = makeRequest({
        departure_airport: 'KJFK',
        arrival_airport: 'KLAX',
      });
      const result = requestToChatSession(request);
      expect(result.route).toBe('KJFK → KLAX');
    });
  });

  describe('trip type detection', () => {
    it('detects round_trip when trip_type is round_trip', () => {
      const request = makeRequest({
        trip_type: 'round_trip',
        return_date: '2026-03-05',
      });
      const result = requestToChatSession(request);
      expect(result.tripType).toBe('round_trip');
      expect(result.returnDate).toBe('2026-03-05');
    });

    it('infers round_trip when return_date exists even with single_leg trip_type', () => {
      const request = makeRequest({
        trip_type: 'single_leg',
        return_date: '2026-03-05',
      });
      const result = requestToChatSession(request);
      expect(result.tripType).toBe('round_trip');
    });

    it('detects one_way when trip_type is one_way', () => {
      const request = makeRequest({
        trip_type: 'one_way',
        return_date: null,
      });
      const result = requestToChatSession(request);
      expect(result.tripType).toBe('one_way');
    });
  });

  describe('progress bar math', () => {
    it('completed status yields 100% progress', () => {
      const request = makeRequest({ status: 'completed' });
      const result = requestToChatSession(request);

      const progress = Math.min(
        (result.currentStep / result.totalSteps) * 100,
        100
      );
      expect(progress).toBe(100);
    });

    it('pending status yields 10% progress', () => {
      const request = makeRequest({ status: 'pending' });
      const result = requestToChatSession(request);

      const progress = Math.min(
        (result.currentStep / result.totalSteps) * 100,
        100
      );
      expect(progress).toBe(10);
    });
  });

  describe('Avinode fields', () => {
    it('maps Avinode trip and RFQ IDs', () => {
      const request = makeRequest({
        avinode_trip_id: 'T6WWSV',
        avinode_rfq_id: 'RFQ123',
        avinode_deep_link: 'https://avinode.com/trip/T6WWSV',
      });
      const result = requestToChatSession(request);

      expect(result.tripId).toBe('T6WWSV');
      expect(result.rfqId).toBe('RFQ123');
      expect(result.deepLink).toBe('https://avinode.com/trip/T6WWSV');
    });

    it('leaves Avinode fields undefined when null', () => {
      const request = makeRequest({
        avinode_trip_id: null,
        avinode_rfq_id: null,
        avinode_deep_link: null,
      });
      const result = requestToChatSession(request);

      expect(result.tripId).toBeUndefined();
      expect(result.rfqId).toBeUndefined();
      expect(result.deepLink).toBeUndefined();
    });
  });
});
