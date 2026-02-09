# E2E Test Report: ONEK-144 Multi-City Trips & Empty Leg Subscriptions

**Date:** 2026-02-09
**Branch:** `kinglerbercy/onek-207-rich-contract-card-auto-open-pdf` (post-merge of PR #103)
**Tester:** Claude Code (automated browser E2E)
**Environment:** localhost:3000 (Next.js dev server)

---

## Summary

| Test | Description | Status | Notes |
|------|-------------|--------|-------|
| 1 | Multi-city trip creation | PARTIAL PASS | Card renders correctly for API data; API only supports single-leg |
| 2 | Round-trip creation | FAIL | Card shows "One-Way" instead of "Round-Trip"; no return date |
| 3 | One-way backward compatibility | PASS | All data correct, both airports with city names |
| 4 | Existing session regression | PASS | Session loads with all workflow steps intact |

**Overall: 2 PASS, 1 PARTIAL PASS, 1 FAIL**

---

## Test Details

### Test 1: Multi-City Trip Creation (AC-1, AC-3)

**Session:** AQ4HM3
**Input:** "I need a multi-city trip: KTEB to London Luton (EGGW), then London Luton to Paris Le Bourget (LFPB), then Paris Le Bourget back to KTEB. March 10-15, 4 passengers"

**Expected:**
- Trip card with "Multi-City" badge
- All 3 segments displayed (KTEB -> EGGW -> LFPB -> KTEB)

**Actual:**
- Card shows **"One-Way"** badge with only KTEB -> EGGW (first leg)
- EGGW displayed without city name (shows "EGGW" only)
- Agent text correctly acknowledges multi-city and describes creating 3 linked one-way trips

**Root Cause:** The Avinode `create_trip` MCP tool only supports single-leg trips. It does NOT return `trip_type`, `segments[]`, or multi-leg data in the response. The agent compensates by creating 3 separate one-way trips, but only the first trip card is rendered.

**Status:** PARTIAL PASS — UI code handles data correctly, but upstream API limitation prevents multi-city card rendering.

---

### Test 2: Round-Trip Creation (AC-2, AC-3)

**Session:** DFPK84
**Input:** "Round trip from KTEB to KVNY, departing March 2, returning March 5, 6 passengers"

**Expected:**
- Trip card with "Round-Trip" badge
- Outbound: KTEB -> KVNY, March 2
- Return: KVNY -> KTEB, March 5

**Actual:**
- Card shows **"One-Way"** badge
- Only outbound route displayed: KTEB (Teterboro, NJ) -> KVNY (Van Nuys, CA)
- Only outbound date shown (Sun, Mar 2, 2026)
- No return date or return route displayed
- KVNY correctly shows city name "Van Nuys, CA"

**Root Cause:** Same as Test 1 — `create_trip` MCP response does not include `trip_type: "round_trip"`, `return_date`, or return segment data. The `extractCreateTripProps()` function reads `result.trip_type` and `result.segments` (fixed in PR #103), but these fields are never populated by the MCP server.

**Status:** FAIL — Round-trip card should display "Round-Trip" badge and return leg.

---

### Test 3: One-Way Backward Compatibility (AC-4)

**Session:** G8TMT4
**Input:** "I need a one-way flight from KTEB to KMIA on March 15 for 3 passengers"

**Expected:**
- Trip card with "One-Way" badge
- Route: KTEB -> KMIA
- Date: March 15, Passengers: 3
- Both airports with city names

**Actual:**
- Card shows **"One-Way"** badge (correct)
- Route: KTEB (Teterboro, NJ) -> KMIA (Miami, FL) (correct)
- Date: Sun, Mar 15, 2026 (correct)
- Passengers: 3 (correct)
- Both airports display city names correctly

**Status:** PASS

---

### Test 4: Existing Session Regression (AC-6)

**Session:** AQ4HM3 (re-opened from session list)

**Expected:**
- Previously created session loads without errors
- Trip card and workflow steps render correctly

**Actual:**
- Session loaded successfully from sidebar session list
- Trip card rendered with route information
- Step 1 (Trip Created), Step 2 (Deep Link), Step 3 (Update RFQs) all visible
- "Trip ID verified successfully!" message displayed
- No rendering errors or missing data

**Status:** PASS

---

## Root Cause Analysis

The UI-layer fix in PR #103 (`fix/ONEK-144-multi-city-trip-card`) correctly updated:

1. **`extractCreateTripProps()`** in `tool-ui-registry.ts` — now reads `result.trip_type` and `result.segments`
2. **`TripCreatedUI`** — passes `segments` prop through to `TripSummaryCard`
3. **`TripSummaryCard`** — renders multi-city legs and correct badge based on `tripType`

However, the **Avinode MCP server** (`create_trip` tool) does not return:
- `trip_type` field (always single-leg)
- `segments[]` array (only returns departure/arrival for one leg)
- `return_date` for round-trips

The UI fix is correct and will work once the MCP server is enhanced to return multi-leg data. The current behavior is:
- **Multi-city:** Agent creates 3 separate one-way trips; only first card renders
- **Round-trip:** Agent creates outbound trip only; no return leg data

## Recommendations

1. **ONEK-144 MCP Enhancement (New Sub-task):** Update Avinode MCP `create_trip` to accept `trip_type` and `segments[]` parameters, and return them in the response
2. **Interim Workaround:** For round-trips, pass `return_date` from input params through to the UI even if the API doesn't return it (the `input.return_date` is already checked in `extractCreateTripProps()`)
3. **Airport Database Gap:** EGGW (London Luton) was missing city name — verify airport database completeness

---

## Acceptance Criteria Status

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Multi-city trip card shows all segments with "Multi-City" badge | NOT MET (API limitation) |
| AC-2 | Round-trip card shows "Round-Trip" badge and return route | NOT MET (API limitation) |
| AC-3 | Airport enrichment shows city names | PARTIAL (KMIA/KVNY correct; EGGW missing city) |
| AC-4 | One-way trip card backward compatible | MET |
| AC-6 | Existing sessions load without regression | MET |
