# UAT: ONEK-175 — RFQ Price Updates Refresh in Chat UI

| Field | Value |
|-------|-------|
| **Issue** | [ONEK-175](https://linear.app/designthru-ai/issue/ONEK-175) |
| **Status** | Done |
| **Priority** | High |
| **Date** | 2026-02-08 |
| **Branch** | `kinglerbercy/onek-175-bug-rfq-price-updates-by-operator-do-not-refresh-in-chat-ui` |

## Overview

Previously, when an operator updated the RFQ price in Avinode, the chat UI continued to show the stale price. This fix ensures the chat UI displays the latest RFQ price after the user refreshes the RFQ data.

---

## Acceptance Criteria

### AC-1: Updated Price Shown After Refresh

**Given** an operator has updated the RFQ price in Avinode
**When** the user refreshes the RFQ data (clicks refresh or asks "check RFQ status")
**Then** the chat UI displays the updated price, not the original stale price

### AC-2: Quote Card Shows Current Price

**Given** the RFQ price has been updated by the operator
**When** the user views the quote card in the chat thread
**Then** the quote card shows the latest price from the operator

### AC-3: Regression — Initial Quote Display Unchanged

**Given** a new RFQ quote arrives via webhook
**When** the quote card is first displayed in the chat
**Then** the initial price is shown correctly, same as before

---

## Test Steps

### Test 1 — Price Refresh (AC-1, AC-2)

1. Open a chat session with an active trip that has received operator quotes
2. Note the current price shown on the quote card(s)
3. Have the operator update the price in Avinode (or simulate via webhook)
4. In the chat, ask "Check the status of the RFQs" or click the refresh action
5. **Expected:** Quote card(s) now show the updated price
6. **Expected:** The old price is no longer visible

### Test 2 — Initial Quote Unchanged (AC-3)

1. Create a new trip and send RFPs to operators
2. Wait for an operator to respond with a quote
3. **Expected:** Quote card appears with the correct initial price

---

## Environment

- **URL:** Development environment
- **Prerequisites:** Active Avinode connection with valid API token; operator must have responded to an RFP

## Sign-Off

| Tester | Result | Date | Notes |
|--------|--------|------|-------|
| @AB | ⬜ Pass / ⬜ Fail | | |
| @Kham | ⬜ Pass / ⬜ Fail | | |
