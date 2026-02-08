# UAT: ONEK-144 — Multi-City Trips & Empty Leg Subscriptions

| Field | Value |
|-------|-------|
| **Issue** | [ONEK-144](https://linear.app/designthru-ai/issue/ONEK-144) |
| **Status** | Done |
| **Priority** | High |
| **Date** | 2026-02-08 |
| **Branch** | `kinglerbercy/onek-144-epic-multi-city-trips-empty-leg-subscriptions` |

## Overview

This epic enhances the Jetvision AI Assistant to support complex flight itineraries beyond one-way trips. Users can now create multi-city trips (3+ segments) and round-trips with full return leg details. The system stores segments in a `trip_segments` database table.

---

## Acceptance Criteria

### AC-1: Create Multi-City Trip via Chat

**Given** the user is in a chat session
**When** the user requests a multi-city trip (e.g., "I need a flight from KTEB to EGLL, then EGLL to LFPG, then LFPG to KTEB")
**Then** the agent creates a trip with 3 segments and returns a deep link to Avinode

### AC-2: Create Round-Trip via Chat

**Given** the user is in a chat session
**When** the user requests a round-trip (e.g., "Round trip KTEB to KVNY, depart March 2, return March 5")
**Then** the agent creates a trip with 2 segments (outbound + return) with correct dates

### AC-3: Trip Summary Card Shows All Segments

**Given** a multi-city or round-trip has been created
**When** the trip summary card appears in the chat
**Then** the card displays all segments with correct airports, dates, and route indicator (⇄ for round-trip)

### AC-4: Backward Compatibility — One-Way Trips

**Given** the user requests a simple one-way flight
**When** the trip is created
**Then** the trip is created successfully with a single segment, same behavior as before

### AC-5: Segments Stored in Database

**Given** a multi-segment trip has been created
**When** the trip data is queried from Supabase
**Then** the `trip_segments` table contains one row per segment with correct leg sequence numbers

### AC-6: Regression — Existing One-Way Sessions Load Correctly

**Given** an existing one-way chat session created before this feature
**When** the user opens that session
**Then** the session loads correctly with all original data intact

---

## Test Steps

### Test 1 — Multi-City Trip (AC-1, AC-3)

1. Open a new chat session
2. Type: "I need a flight from Teterboro to London Luton, then London to Paris Le Bourget, then Paris back to Teterboro. 4 passengers, departing March 10."
3. **Expected:** Agent acknowledges multi-city request
4. **Expected:** Trip is created with 3 segments
5. **Expected:** Trip summary card shows all 3 legs: KTEB → EGGW → LFPB → KTEB

### Test 2 — Round-Trip (AC-2, AC-3)

1. Open a new chat session
2. Type: "Round trip from KTEB to KVNY, departing March 2, returning March 5, 6 passengers"
3. **Expected:** Trip created with 2 segments
4. **Expected:** Summary card shows KTEB ⇄ KVNY with both dates

### Test 3 — One-Way Backward Compatibility (AC-4)

1. Open a new chat session
2. Type: "I need a one-way flight from KTEB to KMIA on March 15 for 3 passengers"
3. **Expected:** Trip created with 1 segment, same behavior as before

### Test 4 — Open Existing Session (AC-6)

1. Open an older chat session that was created before the multi-city feature
2. **Expected:** Session loads without errors, all data intact

---

## Environment

- **URL:** Development environment
- **Prerequisites:** Avinode API token must be valid (renewal needed if expired)

## Sign-Off

| Tester | Result | Date | Notes |
|--------|--------|------|-------|
| @AB | ⬜ Pass / ⬜ Fail | | |
| @Kham | ⬜ Pass / ⬜ Fail | | |
