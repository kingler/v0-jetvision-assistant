# Plan: Update demo-record to cover full lifecycle for all 3 trip types

## Problem

The current `demo-record.md` runs Scenarios 1-3 (flight request creation for one-way, round-trip, multi-city) but only runs the full post-quote lifecycle (Scenarios 7-13: RFQ send, operator approval, proposal, contract, payment, closure) **once** for a single trip type. Phase 6 only does partial ID traceability for the other two trip types.

## Solution

Restructure into **3 full lifecycle tracks** — one per trip type — each running the complete Avinode RFQ → proposal → contract → payment → closure chain.

## New Scenario Map (27 scenarios)

| Range | Track | Trip Type | Description |
|-------|-------|-----------|-------------|
| 1-3 | — | All | Flight request creation (unchanged) |
| 4-6 | — | — | Ambiguous requests (unchanged) |
| 7-13 | A | One-Way | Full lifecycle: KTEB → KVNY |
| 14-20 | B | Round-Trip | Full lifecycle: EGGW → KVNY → EGGW |
| 21-27 | C | Multi-City | Full lifecycle: KTEB → EGGW → LFPB → KTEB |

### Per-Track Scenario Mapping

| Step | Track A (One-Way) | Track B (Round-Trip) | Track C (Multi-City) |
|------|-------------------|---------------------|---------------------|
| RFQ Send | 7 | 14 | 21 |
| Operator Approve | 8 | 15 | 22 |
| Update RFQ | 9 | 16 | 23 |
| Proposal | 10 | 17 | 24 |
| Contract | 11 | 18 | 25 |
| Payment | 12 | 19 | 26 |
| Closure | 13 | 20 | 27 |

### Track-Specific Parameters

| Parameter | Track A (One-Way) | Track B (Round-Trip) | Track C (Multi-City) |
|-----------|-------------------|---------------------|---------------------|
| Source Scenario | 1 | 2 | 3 |
| Route | KTEB → KVNY | EGGW → KVNY → EGGW | KTEB → EGGW → LFPB → KTEB |
| Legs | 1 | 2 | 3 |
| Payment Amount | $45,000 | $62,000 | $95,000 |
| Payment Reference | WT-2026-TEST-001 | WT-2026-TEST-002 | WT-2026-TEST-003 |
| Screenshot Folder | `one-way-lifecycle/` | `round-trip-lifecycle/` | `multi-city-lifecycle/` |

## Files to Modify

### 1. `.claude/commands/demo-record.md` (primary target)

Changes:
- Update "Full Scenario Map" from 13 to 27 scenarios
- Add lifecycle track concept and parameters table
- Add new Phase structure:
  - Phase 3: Ambiguous requests (renumber, was embedded in Phase 3)
  - Phase 4: One-Way Full Lifecycle (current Scenarios 7-13, now referencing Scenario 1 as prerequisite)
  - Phase 5: Round-Trip Full Lifecycle (new, Scenarios 14-20)
  - Phase 6: Multi-City Full Lifecycle (new, Scenarios 21-27)
- Add a **Lifecycle Track Template** section to avoid repeating identical steps 3 times — this section defines the shared steps (RFQ send, operator approve, etc.) with placeholders for trip-specific data
- Track B and C sections specify only the deltas (chat input, route verification, payment reference)
- Update Task List (Phase 2) to include all 27 scenarios + report task
- Update Ordering Dependencies to show 3 parallel lifecycle chains
- Update Browser Tab Management to cover 3 lifecycle runs
- Update E2E Test Report template to include all 27 scenarios + 3x DB verification
- Update screenshot directory list to include 3 lifecycle folders
- Remove Phase 6 (trip type ID traceability) — now fully covered by the lifecycle tracks
- Update the demo spec file reference table to include new spec files

### 2. `.claude/commands/e2e-test.md` (keep in sync)

Changes:
- Mirror the scenario map updates (27 scenarios)
- No detailed spec file changes needed since e2e-test is a manual runbook

### 3. New Playwright spec files (optional — can be deferred)

If needed, create:
- `__tests__/e2e/demo/phase5-roundtrip-lifecycle.demo.spec.ts` (Track B)
- `__tests__/e2e/demo/phase6-multicity-lifecycle.demo.spec.ts` (Track C)

These would reuse helpers and follow the same pattern as the existing phase3-5 specs but with round-trip and multi-city parameters.

**Decision:** The primary deliverable is the `demo-record.md` command update. The spec files can be deferred to a follow-up since the demo-record is primarily used as a Claude-in-Chrome interactive guide, not just a Playwright runner.

## Document Structure (demo-record.md)

```
# Demo Recording
## Parameters (updated phase options)
## Full Scenario Map (27 Scenarios)
## Lifecycle Track Parameters (NEW)
## Recording Mode
## Prerequisites
## ID Traceability (updated)
## Test Customer Profile
## Avinode Sandbox Credentials
## Complete Lifecycle Overview (updated mermaid)
## Phase 1: Authentication
## Phase 2: Task List (expanded to 28 tasks)
## Phase 3: Flight Request Scenarios (1-6, consolidated)
  ### Scenarios 1-3: Full-info
  ### Scenarios 4-6: Ambiguous
## Lifecycle Track Template (NEW — shared steps)
  ### Step T1: Send RFQ via Avinode Marketplace
  ### Step T2: Operator Approves Quote
  ### Step T3: Update RFQ in Jetvision
  ### Step T4: Proposal Generation & Send
  ### Step T5: Contract / Book Flight
  ### Step T6: Payment Confirmation
  ### Step T7: Deal Closure & Archive
## Phase 4: One-Way Full Lifecycle (Track A, Scenarios 7-13)
## Phase 5: Round-Trip Full Lifecycle (Track B, Scenarios 14-20)
## Phase 6: Multi-City Full Lifecycle (Track C, Scenarios 21-27)
## Phase 7: E2E Test Report (updated template)
## Ordering Dependencies (updated)
## Browser Tab Management (updated)
## Key Component Reference (unchanged)
## Output Locations
## Troubleshooting
```

## Implementation Approach

Rather than tripling the document size by copy-pasting the same detailed steps 3 times, I'll use a **template + parameters** approach:

1. The **Lifecycle Track Template** section contains the full detailed browser automation steps (currently in Scenarios 7-13) but uses `{PLACEHOLDER}` tokens for trip-specific values
2. Each lifecycle Phase (4/5/6) specifies the parameter values for that track and references the template
3. Only track-specific deviations are documented inline (e.g., multi-city may have per-leg quote cards)

This keeps the document maintainable and avoids drift between the 3 tracks.
