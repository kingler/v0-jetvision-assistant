# UAT: ONEK-227 — Verify Deep Link Opens Correct Avinode Tab for All Trip Types

| Field | Value |
|-------|-------|
| **Issue** | [ONEK-227](https://linear.app/designthru-ai/issue/ONEK-227) |
| **Title** | Verify multi-leg/round-trip deep link opens correct Avinode tab after ONEK-144 fix |
| **Date** | 2026-02-10 |
| **Branch** | `fix/onek-223-224-225-book-flight-fixes` |
| **Status** | Backlog |
| **Priority** | Medium |
| **Labels** | Bug |
| **Related Fixes** | ONEK-144 (`c4ed8f5`), ONEK-210 (`e3b386f`), ONEK-211 (`e3b386f`) |

---

## Overview

After the ONEK-144 fix, the `create_trip` tool now sends a `segments[]` array to the Avinode API for all trip types (one-way, round-trip, multi-city). The Avinode deep link returned by the API should open the correct search tab based on segment count:

- 1 segment → "One way" tab
- 2 segments → "Round trip" tab
- 3+ segments → "Multi leg" tab

This UAT verifies end-to-end that creating each trip type via the Jetvision chat results in a correctly prefilled Avinode deep link.

---

## Prerequisites

- [ ] Dev server running (`npm run dev`)
- [ ] Avinode sandbox API key is valid (resets every Monday — use `/avinode-sandbox-reset` if needed)
- [ ] Logged into Avinode sandbox at `sandbox.avinode.com`
- [ ] Browser DevTools Network tab open (to inspect API requests)

---

## Acceptance Criteria & Test Steps

### AC-1: One-Way Trip Deep Link Opens "One way" Tab

**Given** the dev server is running and the user is on the chat page
**When** the user types: "I need a one-way flight from KTEB to KLAX on March 20, 4 passengers"
**Then** the agent creates a trip with 1 segment, the UI shows a "One-Way" badge, and clicking the deep link opens Avinode on the "One way" tab with KTEB → KLAX prefilled

#### Test Steps

1. Open `http://localhost:3000/chat` and start a new conversation
2. Type: **"I need a one-way flight from KTEB to KLAX on March 20, 4 passengers"**
3. Wait for the agent to call `create_trip` and display the trip card
4. **Verify UI**: Trip card shows:
   - "One-Way" badge or single-leg indicator
   - Route: KTEB → KLAX
   - Date: March 20, 2026
   - Passengers: 4
5. Open browser DevTools → Network tab, find the `POST /trips` request
6. **Verify API request body**: `segments` array has exactly **1 element** with `startAirport.icao: "KTEB"`, `endAirport.icao: "KLAX"`
7. Click the **"Open in Avinode Marketplace"** deep link button
8. **Verify Avinode**: Page loads on the **"One way"** tab with:
   - From: KTEB
   - To: KLAX
   - Date: 200326 (March 20)
   - PAX: 4

> **Expected**: Avinode "One way" tab is selected with all fields prefilled. Aircraft search results appear.

---

### AC-2: Round-Trip Deep Link Opens "Round trip" Tab

**Given** the dev server is running and the user is on the chat page
**When** the user types: "I need a round-trip flight from KTEB to KVNY, departing March 20, returning March 25, 6 passengers"
**Then** the agent creates a trip with 2 segments, the UI shows a "Round-Trip" badge with both legs, and clicking the deep link opens Avinode on the "Round trip" tab

#### Test Steps

1. Start a new conversation in the chat
2. Type: **"I need a round-trip flight from KTEB to KVNY, departing March 20, returning March 25, 6 passengers"**
3. Wait for the agent to call `create_trip` and display the trip card
4. **Verify UI**: Trip card shows:
   - "Round-Trip" badge
   - Route: KTEB ⇄ KVNY (bidirectional arrow)
   - Outbound date: March 20, 2026
   - Return date: March 25, 2026
   - Passengers: 6
5. Open browser DevTools → Network tab, find the `POST /trips` request
6. **Verify API request body**: `segments` array has exactly **2 elements**:
   - Segment 0: `startAirport.icao: "KTEB"` → `endAirport.icao: "KVNY"`, date: 2026-03-20
   - Segment 1: `startAirport.icao: "KVNY"` → `endAirport.icao: "KTEB"`, date: 2026-03-25
7. Click the **"Open in Avinode Marketplace"** deep link button
8. **Verify Avinode**: Page loads on the **"Round trip"** tab with:
   - From: KTEB
   - To: KVNY
   - Outbound date: March 20
   - Return date: March 25
   - PAX: 6

> **Expected**: Avinode "Round trip" tab is selected with both legs prefilled. Aircraft search results appear.

---

### AC-3: Multi-City Trip Deep Link Opens "Multi leg" Tab

**Given** the dev server is running and the user is on the chat page
**When** the user types: "I need a multi-city trip: KTEB to EGGW on March 20, then EGGW to LFPB on March 22, then LFPB back to KTEB on March 25, 4 passengers"
**Then** the agent creates a trip with 3 segments, the UI shows a "Multi-City" badge with all 3 legs, and clicking the deep link opens Avinode on the "Multi leg" tab

#### Test Steps

1. Start a new conversation in the chat
2. Type: **"I need a multi-city trip: KTEB to EGGW on March 20, then EGGW to LFPB on March 22, then LFPB back to KTEB on March 25, 4 passengers"**
3. Wait for the agent to call `create_trip` and display the trip card
4. **Verify UI**: Trip card shows:
   - "Multi-City" badge
   - 3 legs displayed:
     - Leg 1: KTEB → EGGW (March 20)
     - Leg 2: EGGW → LFPB (March 22)
     - Leg 3: LFPB → KTEB (March 25)
   - Passengers: 4
5. Open browser DevTools → Network tab, find the `POST /trips` request
6. **Verify API request body**: `segments` array has exactly **3 elements**:
   - Segment 0: KTEB → EGGW, date: 2026-03-20
   - Segment 1: EGGW → LFPB, date: 2026-03-22
   - Segment 2: LFPB → KTEB, date: 2026-03-25
   - All segments have `paxCount: "4"` and `sourcing: true` on the request
7. Click the **"Open in Avinode Marketplace"** deep link button
8. **Verify Avinode**: Page loads on the **"Multi leg"** tab with:
   - Leg 1: KTEB → EGGW, March 20
   - Leg 2: EGGW → LFPB, March 22
   - Leg 3: LFPB → KTEB, March 25
   - PAX: 4 on all legs

> **Expected**: Avinode "Multi leg" tab is selected with all 3 legs prefilled. Aircraft search results appear.

---

### AC-4: Existing Round-Trip (BHYA7A) Deep Link Verification

**Given** trip BHYA7A (KTEB ⇄ KVNY) was created post-ONEK-144 fix
**When** the user opens the deep link for trip BHYA7A from an existing chat session
**Then** Avinode opens on the "Round trip" tab with KTEB ⇄ KVNY prefilled

#### Test Steps

1. Open the existing chat session that contains trip **BHYA7A** (KTEB ⇄ KVNY)
2. Locate the trip card with the "Open in Avinode Marketplace" button
3. Click the deep link
4. **Verify Avinode**: Page loads on the **"Round trip"** tab with KTEB ⇄ KVNY and correct dates

> **Expected**: Confirms that previously created round-trip deep links work correctly.

---

### AC-5: Regression — One-Way Trips Still Work After Multi-Segment Changes

**Given** the ONEK-144/210/211 fixes added `segments[]` support
**When** a simple one-way trip is created using the chat
**Then** the trip creation succeeds, the UI renders correctly, and the deep link works — no regressions from multi-segment changes

#### Test Steps

1. This is covered by AC-1 above
2. Additionally verify:
   - No JavaScript console errors during trip creation
   - The trip card does NOT show "Multi-City" or "Round-Trip" badges for a one-way trip
   - The deep link URL is a valid `sandbox.avinode.com` URL

> **Expected**: One-way trips are unaffected by the multi-segment changes.

---

## Test Data & Environment

| Item | Value |
|------|-------|
| **App URL** | `http://localhost:3000/chat` |
| **Avinode Sandbox** | `https://sandbox.avinode.com` |
| **Existing Round-Trip** | Trip BHYA7A (KTEB ⇄ KVNY) |
| **Existing Multi-City (pre-fix)** | Trip 2RW3E8 (should show as one-way — this was the broken behavior) |
| **Test Airports** | KTEB, KLAX, KVNY, EGGW, LFPB |
| **API Key Reset** | Mondays — run `/avinode-sandbox-reset` if 401 errors |

## Documentation Verification

- [ ] `docs/api/AVINODE_API_INTEGRATION.md` updated to v2.1.0 with `segments[]` docs (commit `387bb79`)
- [ ] `create_trip` input schema shows `TripSegment` interface and `segments[]` array
- [ ] Deep link tab behavior documented
- [ ] Three usage examples (one-way, round-trip, multi-city)
- [ ] Changelog entry for ONEK-227

---

## Sign-Off

| Tester | Result | Date | Notes |
|--------|--------|------|-------|
| @AB | | | |
| @Kham | | | |
