# E2E Test Report: ONEK-144 Multi-City Trips & Empty Leg Subscriptions

**Date:** 2026-02-09 (Session 5 — Full E2E re-verification after PR #106 merge)
**Branch:** `fix/ONEK-210-211-multi-city-agent-support` (merged to main via PR #106)
**Tester:** Claude Code (automated browser E2E)
**Environment:** localhost:3000 (Next.js dev server)
**Feature Flag:** `NEXT_PUBLIC_ENABLE_MCP_UI=true` (enabled)

---

## Summary

| Test | Description | Status | Notes |
|------|-------------|--------|-------|
| 1 | One-way backward compatibility | PASS | Trip Details card: "One-Way" + "Active" badges, KTEB→KMIA with airport names |
| 2 | Round-trip creation | PASS | "Round-Trip" badge, outbound + return routes, both dates displayed |
| 3 | Multi-city trip via segments[] | PASS | "Multi-City" badge, all 3 legs rendered, segments[] sent to Avinode API |
| 4 | Session persistence & regression | PASS | Session reloads with all workflow steps, Trip Details card, no errors |

**Overall: 4 PASS, 0 FAIL**

**Unit Tests: 85/85 PASS** (tool-ui-registry: 9, trip-summary-card: 14, avinode-client unit: 36, round-trip: 7, integration: 19 via multi-segment-trips.test.ts)

---

## Key Improvement: Feature Flag Enabled

Setting `NEXT_PUBLIC_ENABLE_MCP_UI=true` activates the **new rendering path**:

`AgentMessageV2` → `ToolUIRenderer` → `extractCreateTripProps()` → `TripCreatedUI` → `TripSummaryCard`

This fixes:
- **Round-trip detection** via `input.return_date` fallback (previously FAIL, now PASS)
- **New Trip Details card** with rich layout: trip ID, airport names, Avinode Actions (Search, View, Cancel)
- **Airport enrichment** via `getAirportByIcao()` for US airports (KTEB, KVNY, KMIA)

---

## Session 5 Test Details (Post PR #106 Merge)

### Test 1: One-Way Backward Compatibility (AC-4)

**Session:** 89M8L9
**Input:** "I need a one-way flight from KTEB to KMIA on March 25 for 4 passengers"

**Expected:**
- Trip card with "One-Way" badge
- Route: KTEB -> KMIA with city names
- Date: March 25, Passengers: 4

**Actual:**
- **New Trip Details card** rendered via MCP UI path
- **"One-Way"** badge (blue) + **"Active"** badge (green)
- **TRIP ID:** 89M8L9 with Copy button
- **Route:** KTEB (Teterboro Airport, Teterboro) → KMIA (Miami International Airport, Miami)
- **DEPARTURE:** March 25, 2026 | **PASSENGERS:** 4
- **Avinode Actions:** Search in Avinode, View Trip, Cancel Trip
- **Step 2:** Flight & RFQ Selected with "Open in Avinode Marketplace" button

**Server Log:** `create_trip` called with flat params (departure_airport: 'KTEB', arrival_airport: 'KMIA')

**Status:** PASS

---

### Test 2: Round-Trip Creation (AC-2, AC-3)

**Session:** B8YA7A
**Input:** "Round trip from KTEB to KVNY, departing April 5, returning April 8, 5 passengers"

**Expected:**
- Trip card with "Round-Trip" badge
- Outbound: KTEB -> KVNY, April 5
- Return: KVNY -> KTEB, April 8

**Actual:**
- **"Round-Trip"** badge (blue) + **"Active"** badge (green)
- **TRIP ID:** B8YA7A with Copy button
- **OUTBOUND:** KTEB (Teterboro Airport, Teterboro) → KVNY (Van Nuys Airport, Van Nuys)
- **RETURN:** KVNY (Van Nuys Airport, Van Nuys) → KTEB (Teterboro Airport, Teterboro)
- **OUTBOUND:** April 5, 2026 | **RETURN:** April 8, 2026 | **PASSENGERS:** 5
- Agent text: "Your round-trip trip has been created successfully"

**Root Cause Fix:** `extractCreateTripProps()` falls back to `input.return_date` when MCP server doesn't return `trip_type`. Since `return_date: '2026-04-08'` is in the tool input, the function correctly derives `tripType: 'round_trip'`.

**Status:** PASS

---

### Test 3: Multi-City Trip via segments[] (AC-1, AC-1b, AC-3)

**Session:** ERB0SA
**Input:** "I need a multi-city trip for 5 passengers: Leg 1 - KTEB to EGLL on March 20 at 08:00, Leg 2 - EGLL to LFPB on March 23 at 10:00, Leg 3 - LFPB to KTEB on March 26 at 14:00. Please create the trip with all 3 segments."

**Expected:**
- Trip card with "Multi-City" badge
- All 3 segments displayed
- `create_trip` called with `segments[]` array

**Actual:**
- **"Multi-City"** badge (blue) + **"Active"** badge (green) — **FIXED!**
- **TRIP ID:** ERB0SA with Copy button
- **LEG 1:** KTEB (Teterboro Airport, Teterboro) → EGLL (London Heathrow Airport, London) — March 20, 2026
- **LEG 2:** EGLL (London Heathrow Airport, London) → LFPB (Paris Le Bourget Airport, Paris) — March 23, 2026
- **LEG 3:** LFPB (Paris Le Bourget Airport, Paris) → KTEB (Teterboro Airport, Teterboro) — March 26, 2026
- **FIRST LEG:** March 20, 2026 | **LAST LEG:** March 26, 2026 | **PASSENGERS:** 5
- Agent text: "Your multi-city trip has been created successfully... submit RFQs to operators for all 3 segments"
- **Avinode Actions:** Search in Avinode, View Trip, Cancel Trip
- Airport enrichment working for EGLL and LFPB (city names displayed)

**Server Log Evidence:**
- `[JetvisionAgent] Detected intent: create_rfp`
- `[JetvisionAgent] Forcing create_trip tool call based on message pattern`
- `[JetvisionAgent] Executing: create_trip { segments: [...] }` (3 segments)
- `[Avinode Client] Trip created successfully` — tripId: `5Z96Z8`
- Deep link: `sandbox.avinode.com/marketplace/mvc/search/load/atrip-65837985`
- Workflow stage: `trip_created`

**Key Improvement:** The Trip Details card now renders **all 3 legs** with the **"Multi-City" badge**. The `extractCreateTripProps()` function correctly detects multi-city trips from the `segments[]` in the tool input and passes them to `TripSummaryCard`.

**Minor Issue (Step 1 card only):**
- The Step 1 "Trip Request Created" card still shows "One-Way" with first leg only — this is a separate WorkflowStepUI component, not the Trip Details card

**Status:** PASS

---

### Test 4: Session Persistence & Regression (AC-6)

**Session:** 89M8L9 (re-opened from sidebar session list)

**Expected:**
- Previously created session loads without errors
- Trip card and workflow steps render correctly

**Actual:**
- Session loaded successfully from sidebar
- User message preserved: "I need a one-way flight from KTEB to KMIA on March 25 for 4 passengers"
- **Step 1: Trip Request Created** — "One-Way" badge, KTEB (Teterboro, NJ) → KMIA (Miami, FL)
- **Step 2: Flight & RFQ Selected** — "Open in Avinode Marketplace" button with instructions
- **Step 3: View RFQ Flights** — "Update RFQs" button, "Trip ID verified successfully!"
- Agent conversation text fully preserved
- No rendering errors or missing data

**Status:** PASS

---

## Progression: Session 1 → Session 5

| Test | Session 1 (flag OFF) | Session 3 (flag ON) | Session 4 (segments[]) | Session 5 (post-merge) |
|------|---------------------|---------------------|------------------------|------------------------|
| 1. One-Way | PASS (old card) | PASS (new card) | PASS | **PASS** |
| 2. Round-Trip | **FAIL** (One-Way badge) | **PASS** (Round-Trip) | PASS | **PASS** |
| 3. Multi-City | FAIL (first leg only) | PARTIAL (MCP gap) | PARTIAL (UI gap) | **PASS** (Multi-City badge + 3 legs) |
| 4. Regression | PASS | PASS | PASS | **PASS** |
| **Overall** | **2 PASS, 2 FAIL** | **3 PASS, 1 PARTIAL** | **3 PASS, 1 PARTIAL** | **4 PASS, 0 FAIL** |

---

## Remaining Issues

### 1. Step 1 Card Multi-Segment Display

The Step 1 "Trip Request Created" card (WorkflowStepUI) still shows "One-Way" with the first leg only for multi-city trips. This is a minor cosmetic issue — the Trip Details card correctly shows all segments with the "Multi-City" badge. Low priority follow-up.

### 2. European Airport Enrichment

EGLL and LFPB now display with city names (London, Paris). EGGW (London Luton) from earlier sessions displayed without city name. Airport enrichment coverage has improved but may still have gaps for less common European airports.

---

## Acceptance Criteria Status

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Multi-city trip creation via segments[] | **MET** (backend — AvinodeClient sends 3 segments, Avinode accepts) |
| AC-1b | Multi-city trip card shows all segments with "Multi-City" badge | **MET** (Trip Details card shows all 3 legs with Multi-City badge) |
| AC-2 | Round-trip card shows "Round-Trip" badge and return route | **MET** (fixed by feature flag + extractCreateTripProps fallback) |
| AC-3 | Airport enrichment shows city names | **MET** (US + major European airports: KTEB, KVNY, KMIA, EGLL, LFPB) |
| AC-4 | One-way trip card backward compatible | **MET** |
| AC-6 | Existing sessions load without regression | **MET** |

---

## Unit Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| `__tests__/unit/lib/mcp-ui/tool-ui-registry.test.ts` | 9 | ALL PASS |
| `__tests__/unit/components/avinode/trip-summary-card.test.tsx` | 14 | ALL PASS |
| `__tests__/unit/lib/mcp/avinode-client.test.ts` | 36 | ALL PASS |
| `__tests__/unit/lib/mcp/avinode-round-trip.test.ts` | 7 | ALL PASS |
| `__tests__/integration/mcp/multi-segment-trips.test.ts` | 19 | ALL PASS |
| **Total** | **85** | **ALL PASS** |

---

## AvinodeClient.createTrip() Fix Summary

**File:** `lib/mcp/clients/avinode-client.ts`
**Commit:** `fix/ONEK-210-211-multi-city-agent-support` branch

**Changes:**
1. Made flat params (`departure_airport`, `arrival_airport`, etc.) optional
2. Added `segments?: Array<{...}>` parameter
3. When `segments[]` is provided, builds API segments from array (multi-city path)
4. When flat params are provided, uses legacy one-way/round-trip path (backward compatible)
5. Return value derives `departure_airport`/`arrival_airport` from first segment when flat params absent

**Backward Compatibility:** All 36 existing unit tests + 7 round-trip tests pass without modification.

---

## Recommendation

**All acceptance criteria are MET.** The feature is ready for UAT review.

**Keep `NEXT_PUBLIC_ENABLE_MCP_UI=true`** as the default. The new rendering path:
- Fixes round-trip display (AC-2)
- Supports multi-city trips with all segments displayed (AC-1, AC-1b)
- Provides richer Trip Details card with Avinode Actions
- Is fully unit-tested (85/85 pass)
- No regressions observed in E2E testing (4/4 PASS)

Minor follow-up items (non-blocking):
1. Update Step 1 "Trip Request Created" card to also show multi-city data (cosmetic — Trip Details card already shows it correctly)
2. Expand European airport enrichment database for less common airports (EGGW etc.)
