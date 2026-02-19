# Task ID: TASK219
# Task Name: Filter Realtime Events by Trip ID
# Parent User Story: [[US115-subscribe-webhook-by-trip|US115 - Avinode Webhook Realtime Events]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Implement trip_id filtering on the Supabase Realtime subscription so that only events relevant to the current trip are received. This prevents unnecessary event processing and reduces bandwidth.

## Acceptance Criteria
- Subscription filters events by trip_id column using Supabase Realtime filter
- Only events matching the provided tripId are received by the hook
- Filter is applied at the Supabase server level (not client-side)
- Changing tripId tears down old subscription and creates new filtered one
- Null/undefined tripId disables the subscription (no events received)
- Filter syntax uses Supabase Realtime eq filter: `trip_id=eq.${tripId}`
- Events for other trips are not received (verified in tests)

## Implementation Details
- **File(s)**: lib/chat/hooks/use-webhook-subscription.ts
- **Approach**: Use Supabase Realtime's filter parameter when creating the channel subscription. Apply `filter: 'trip_id=eq.${tripId}'` to the postgres_changes subscription config. When tripId changes, remove the existing channel and create a new one with the updated filter. Guard against null/undefined tripId by skipping subscription setup.

## Dependencies
- [[TASK218-supabase-realtime-sub|TASK218]] (supabase-realtime-sub)
- Supabase Realtime filter feature
