---
name: demo-record
description: Use when recording video demos of the Jetvision charter flight lifecycle for sprint demos, stakeholder reviews, or documentation. Runs Playwright E2E tests with video capture (WebM), converts to MP4/GIF, and optionally records interactive sessions via Claude-in-Chrome gif_creator.
---

# Demo Recording Skill

## Overview

Records video demos of the complete charter flight lifecycle by running Playwright E2E tests with always-on video capture at 720p. Each test scenario produces a WebM recording that can be converted to MP4 or GIF for sharing.

Two recording modes:
1. **Playwright (automated)** — Runs headless or headed browser tests, captures video per scenario
2. **Interactive (Claude-in-Chrome)** — Step-by-step browser automation with GIF recording via `gif_creator`

## When to Use

- Before sprint demos to record the full workflow
- After feature changes to document new UI behavior
- For stakeholder presentations and documentation
- To verify the E2E flow works end-to-end with video evidence

## When NOT to Use

- For API-only testing (use `/avinode-test`)
- For interactive debugging (use `/avinode-sandbox-test`)
- For unit/integration tests (use `npm test`)

## Architecture

```
playwright.config.ts          # "demo" project: video=on, slowMo=500, 720p
__tests__/e2e/demo/
  helpers.ts                   # Auth (clerk.signIn), navigation, chat, assertions
  phase1-flight-requests.demo.spec.ts    # Scenarios 1-3
  phase2-ambiguous-requests.demo.spec.ts # Scenarios 4-6
  phase3-avinode-rfq.demo.spec.ts        # Scenarios 7-8
  phase4-update-rfq.demo.spec.ts         # Scenario 9
  phase5-proposal-to-close.demo.spec.ts  # Scenarios 10-13
scripts/convert-recordings.sh  # WebM → MP4/GIF via ffmpeg
```

## Prerequisites

Before running demo recordings, verify:

1. **Dev server is running:**
   ```bash
   npm run dev:app
   ```
   The Playwright config has `webServer` that auto-starts it, but a pre-running server is faster.

2. **Clerk test credentials are set** in `.env.local`:
   ```env
   E2E_CLERK_USER_USERNAME=<test email>
   E2E_CLERK_USER_PASSWORD=<test password>
   CLERK_SECRET_KEY=sk_test_...
   ```
   The `clerk.signIn` helper uses `CLERK_SECRET_KEY` to programmatically create a sign-in token via Clerk's Backend API, bypassing the UI and email OTP flow entirely.

3. **Playwright browsers installed:**
   ```bash
   npx playwright install chromium
   ```

4. **ffmpeg installed** (for conversion only):
   ```bash
   brew install ffmpeg
   ```

5. **For Phase 3+ (Avinode Marketplace):** Valid sandbox credentials and Avinode MCP server configured.

---

## Mode 1: Playwright Recording (Automated)

### Run All Phases

```bash
# Headless (faster, CI-friendly)
npm run test:e2e:demo

# With visible browser (for watching live)
npm run test:e2e:demo:headed
```

### Run Specific Phase

```bash
# Phase 1: Flight Requests (Scenarios 1-3)
npx playwright test --project=demo phase1-flight-requests --timeout 120000

# Phase 2: Ambiguous Requests (Scenarios 4-6)
npx playwright test --project=demo phase2-ambiguous --timeout 120000

# Phase 3: Avinode RFQ (Scenarios 7-8)
npx playwright test --project=demo phase3-avinode-rfq --timeout 120000

# Phase 4: Update RFQ (Scenario 9)
npx playwright test --project=demo phase4-update-rfq --timeout 120000

# Phase 5: Proposal to Close (Scenarios 10-13)
npx playwright test --project=demo phase5-proposal-to-close --timeout 180000
```

### Run Specific Scenario

```bash
# Scenario 1 only (one-way flight)
npx playwright test --project=demo phase1 -g "One-way" --timeout 120000

# Scenario 4 only (ambiguous — tomorrow to Canada)
npx playwright test --project=demo phase2 -g "Scenario 4" --timeout 120000
```

### Run with Headed Browser

Append `--headed` to any command:

```bash
npx playwright test --project=demo phase1 --headed --timeout 120000
```

### View Test Report

```bash
npx playwright show-report
```

### Convert Recordings

After tests complete, WebM files are in `test-results/`:

```bash
# Convert to MP4
bash scripts/convert-recordings.sh

# Convert to MP4 + GIF
bash scripts/convert-recordings.sh --gif

# Convert to custom output directory
bash scripts/convert-recordings.sh --output-dir ./demo-videos
```

Output goes to `e2e-screenshots/recordings/`.

---

## Mode 2: Interactive Recording (Claude-in-Chrome)

For step-by-step recording with manual control, use Claude-in-Chrome's `gif_creator`:

### Start Recording

```txt
Tool: mcp__claude-in-chrome__gif_creator
Action: start_recording
tabId: <tab-id>
```

### Execute Scenario Steps

Follow the steps from the `/avinode-sandbox-test` skill for any phase. Between steps, capture extra frames for smooth playback.

### Stop and Export

```txt
Tool: mcp__claude-in-chrome__gif_creator
Action: stop_recording
tabId: <tab-id>
```

```txt
Tool: mcp__claude-in-chrome__gif_creator
Action: export
tabId: <tab-id>
filename: "phase1-one-way-flight.gif"
download: true
```

---

## Test Scenarios Reference

### Phase 1: Flight Requests (Jetvision localhost:3000)

| Scenario | Request | What to Verify |
|----------|---------|----------------|
| 1. One-way | "I need a one way flight from KTEB to KVNY for 4 passengers on March 25, 2026 at 4:00pm EST" | TripRequestCard, deep link button, route KTEB→KVNY |
| 2. Round-trip | "I need a round trip flight from EGGW to KVNY for 4 passengers. Departing March 2, 2026 at 9:00am EST, returning March 5, 2026 at 2:00pm EST" | TripRequestCard with both legs, deep link |
| 3. Multi-city | "I need a multi-city trip for 4 passengers: Leg 1: KTEB to EGGW on March 10, 2026 at 8:00am EST. Leg 2: EGGW to LFPB on March 12, 2026 at 10:00am GMT. Leg 3: LFPB to KTEB on March 15, 2026 at 2:00pm CET." | TripRequestCard with 3 legs, deep link |

### Phase 2: Ambiguous Requests (Jetvision localhost:3000)

| Scenario | Request | What to Verify |
|----------|---------|----------------|
| 4. Vague cities | "Book a flight for tomorrow for three people from New York to Canada" | Agent asks clarifying questions, NO trip card before resolution |
| 5. States | "I need a flight from Florida to California tomorrow" | Agent asks for airports, pax, time, trip type |
| 6. Vague date | "I need a round trip flight from New York to Kansas for 4 passengers in March" | Agent asks for specific date, airports, time |

### Phase 3: Avinode RFQ (Multi-tab: Jetvision + Avinode Marketplace)

| Scenario | What Happens |
|----------|-------------|
| 7. Send RFQ | Open Avinode deep link, login to sandbox, select operator, send RFP |
| 8. Operator quote | Switch to Operator role, find RFP, submit $45K quote |

### Phase 4: Update RFQ (Jetvision)

| Scenario | What Happens |
|----------|-------------|
| 9. Pull quotes | Ask agent to update RFQ status, verify quote data appears |

### Phase 5: Proposal to Close (Jetvision)

| Scenario | What Happens |
|----------|-------------|
| 10. Proposal | Generate proposal PDF, review email preview, send |
| 11. Contract | Generate contract with pricing breakdown, send to client |
| 12. Payment | Record wire payment ($45K), verify PaymentConfirmedCard |
| 13. Close & Archive | Verify ClosedWonConfirmation, archive session |

---

## Output Files

| Type | Location | Format |
|------|----------|--------|
| Video recordings | `test-results/*/video.webm` | WebM (Playwright native) |
| Step screenshots | `e2e-screenshots/recordings/<scenario>/` | PNG |
| Converted video | `e2e-screenshots/recordings/` | MP4 and/or GIF |
| HTML report | `playwright-report/index.html` | HTML |
| Error context | `test-results/*/error-context.md` | Markdown (ARIA snapshot) |

---

## Troubleshooting

### Authentication Fails

| Symptom | Cause | Fix |
|---------|-------|-----|
| "CLERK_SECRET_KEY environment variable is required" | Missing env var | Add `CLERK_SECRET_KEY=sk_test_...` to `.env.local` |
| "No user found with email" | Test user doesn't exist in Clerk | Create user in Clerk Dashboard or verify email in `E2E_CLERK_USER_USERNAME` |
| Still on sign-in page after `clerk.signIn()` | Token not applying | Verify `clerkSetup()` runs in global setup, check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| Email OTP verification page appears | Using UI-based auth instead of `clerk.signIn` | The helpers use `clerk.signIn({ emailAddress })` which bypasses UI entirely |

### Selector Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| "waiting for textarea" timeout | Landing page uses `<input>`, not `<textarea>` | Selector includes `input[placeholder*="message" i]` (case-insensitive) |
| "strict mode violation: resolved to N elements" | Multiple matches in sidebar + main content | Use `.first()` or scope to `main` content area |
| "waiting for [data-testid='trip-request-card']" | Agent asked clarification instead of creating trip | Provide all details upfront in the request message |

### Recording Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| No WebM files after test | Tests failed before completion | Check `test-results/` for error context |
| Video is too fast | `slowMo` not applied | Verify running with `--project=demo` (has `slowMo: 500`) |
| ffmpeg not found | Not installed | `brew install ffmpeg` |
| GIF too large | High resolution / long recording | Use `--gif` flag which scales to 800px width |

### Phase-Specific Issues

| Phase | Issue | Fix |
|-------|-------|-----|
| Phase 3 | Avinode login page appears | Sandbox session expired. Login manually first or credentials may have rotated (Monday reset) |
| Phase 3 | No operators listed | Route/dates don't match sandbox fleet availability |
| Phase 5 | Proposal generation fails | Requires Phase 3+4 to complete first (need received quotes) |
| Phase 5 | "Target page closed" | Test timeout too low. Increase with `test.setTimeout(180_000)` |

---

## Key Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Demo project config (video on, slowMo 500, 720p) |
| `__tests__/e2e/demo/helpers.ts` | Shared utilities (auth, navigation, chat, assertions) |
| `__tests__/e2e/demo/phase*.demo.spec.ts` | Test specs for each phase |
| `__tests__/e2e/global.setup.ts` | Clerk global setup (`clerkSetup()`) |
| `scripts/convert-recordings.sh` | WebM to MP4/GIF converter |
| `package.json` | npm scripts (`test:e2e:demo`, `demo:convert`) |

## Related Skills

- `/avinode-sandbox-test` — Interactive E2E test via Claude-in-Chrome (full lifecycle)
- `/e2e-test` — E2E test runbook (13 scenarios, manual walkthrough)
- `/avinode-sandbox-reset` — Reset sandbox data after API key rotation
