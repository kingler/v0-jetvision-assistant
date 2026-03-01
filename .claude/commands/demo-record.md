# Demo Recording

Record video demos of the Jetvision charter flight lifecycle using Playwright browser automation. Produces MP4/WebM recordings of each test scenario — useful for sprint demos, stakeholder reviews, and documentation.

## Parameters

- **Phase** (optional): Run a specific phase only
  - `1` - Flight requests (one-way, round-trip, multi-city) — Scenarios 1-3
  - `2` - Ambiguous requests with clarification flows — Scenarios 4-6
  - `3` - Avinode RFQ send + operator quote — Scenarios 7-8
  - `4` - Update RFQ in Jetvision — Scenario 9
  - `5` - Proposal, contract, payment, closure — Scenarios 10-13
  - `all` - All phases (default)
- **Mode** (optional): How to run the tests
  - `headless` - Run headless (default, faster)
  - `headed` - Run with visible browser (for watching live)
  - `interactive` - Use Claude-in-Chrome for manual step-through with GIF recording
- **Convert** (optional): Post-processing
  - `mp4` - Convert WebM to MP4
  - `gif` - Convert to both MP4 and GIF
- Usage: `/demo-record [--phase N] [--headed] [--convert mp4|gif]`

## Actions to Execute

**IMPORTANT:** You MUST invoke the `demo-record` skill using the Skill tool BEFORE taking any action. The skill contains the full recording workflow, troubleshooting, and conversion steps.

```txt
Skill: demo-record
Args: $ARGUMENTS
```

Follow the skill's instructions exactly. Do not proceed without loading it first.

### Quick Reference

| Command | What it does |
|---------|-------------|
| `npm run test:e2e:demo` | Record all scenarios headless |
| `npm run test:e2e:demo:headed` | Record all scenarios with visible browser |
| `npx playwright test --project=demo phase1` | Record Phase 1 only |
| `bash scripts/convert-recordings.sh` | Convert WebM to MP4 |
| `bash scripts/convert-recordings.sh --gif` | Convert to MP4 + GIF |

### Test Results by Phase

| Phase | Scenarios | Status | Notes |
|-------|-----------|--------|-------|
| Phase 1: Flight Requests | 1-3 | Stable | One-way, round-trip, multi-city |
| Phase 2: Ambiguous Requests | 4-6 | Stable | Clarification flow testing |
| Phase 3: Avinode RFQ | 7-8 | Requires sandbox | Needs live Avinode Marketplace |
| Phase 4: Update RFQ | 9 | Stable | Jetvision-only |
| Phase 5: Proposal to Close | 10-13 | Requires Phase 3 | Depends on received quotes |

### Output Locations

- **WebM recordings**: `test-results/*/video.webm` (Playwright native)
- **Screenshots**: `e2e-screenshots/recordings/<scenario>/` (per-step PNG)
- **Converted MP4/GIF**: `e2e-screenshots/recordings/` (after conversion)
- **HTML report**: `playwright-report/index.html`

## Prerequisites

1. Jetvision dev server running (`npm run dev:app`)
2. Valid Clerk test credentials in `.env.local` (`E2E_CLERK_USER_USERNAME`, `E2E_CLERK_USER_PASSWORD`, `CLERK_SECRET_KEY`)
3. Playwright browsers installed (`npx playwright install chromium`)
4. ffmpeg installed for conversion (`brew install ffmpeg`)
5. For Phase 3+: Valid Avinode Sandbox credentials

## Next Step: Generate Presentation

After recording, generate a branded slide deck from the videos:

```bash
/demo-presentation [--phase N] [--title "Sprint Demo"]
```

This creates a Google Slides-compatible PPTX with video thumbnails, scenario descriptions, and verification checklists embedded in each slide.

## Related Commands

- `/demo-presentation` - Generate PPTX presentation from recorded demos
- `/avinode-sandbox-test` - Interactive browser-driven E2E test (Claude-in-Chrome)
- `/e2e-test` - Full E2E test runbook (13 scenarios, manual walkthrough)
- `/avinode-sandbox-reset` - Reset sandbox data after API key rotation
