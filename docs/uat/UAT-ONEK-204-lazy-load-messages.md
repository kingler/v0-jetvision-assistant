# UAT: ONEK-204 — Lazy-Load Session Messages on Demand

| Field | Value |
|-------|-------|
| **Issue** | [ONEK-204](https://linear.app/designthru-ai/issue/ONEK-204) |
| **Status** | Done |
| **Priority** | High |
| **Date** | 2026-02-08 |
| **Branch** | `kinglerbercy/onek-204-perf-app-eagerly-loads-messages-for-all-sessions-on-page` |

## Overview

Previously, the app loaded messages for ALL chat sessions (281 API requests) on page load. This fix implements lazy loading — messages are only fetched when a session is opened/clicked, dramatically improving initial load time.

---

## Acceptance Criteria

### AC-1: Page Load Does Not Fetch All Messages

**Given** the user has 30+ chat sessions
**When** the user loads the app (initial page load)
**Then** the network tab shows messages are NOT fetched for all sessions — only the active session's messages are loaded

### AC-2: Messages Load on Session Click

**Given** the user is viewing one chat session
**When** the user clicks a different session in the sidebar
**Then** messages for that session load on demand and display correctly

### AC-3: Previously Loaded Sessions Are Cached

**Given** the user has opened session A, then switched to session B
**When** the user switches back to session A
**Then** session A's messages appear instantly (from cache) without a new API call

### AC-4: Regression — Message Display Unchanged

**Given** the user opens a chat session
**When** the messages load
**Then** all messages display correctly with proper formatting, rich content cards, and chronological order

---

## Test Steps

### Test 1 — Reduced API Calls on Load (AC-1)

1. Open Chrome DevTools → Network tab
2. Navigate to the Jetvision app (fresh page load)
3. Filter network requests by `/api/chat-sessions/messages`
4. **Expected:** Only 1-2 message requests fire (for the active session), NOT 30+ requests
5. **Expected:** Page loads noticeably faster than before

### Test 2 — On-Demand Loading (AC-2)

1. With Network tab open, click a different session in the sidebar
2. **Expected:** A single API request fires for that session's messages
3. **Expected:** Messages appear in the chat area after loading

### Test 3 — Caching (AC-3)

1. Open Session A (note the network request)
2. Switch to Session B (note the network request)
3. Switch back to Session A
4. **Expected:** No new network request for Session A — messages load from cache

### Test 4 — Message Display (AC-4)

1. Open several different sessions
2. Verify messages display correctly in each
3. **Expected:** Rich content cards (trip summaries, quote cards, proposal cards) render properly
4. **Expected:** Messages are in correct chronological order

---

## Environment

- **URL:** Development environment
- **Tools:** Chrome DevTools Network tab for verifying API calls

## Sign-Off

| Tester | Result | Date | Notes |
|--------|--------|------|-------|
| @AB | ⬜ Pass / ⬜ Fail | | |
| @Kham | ⬜ Pass / ⬜ Fail | | |
