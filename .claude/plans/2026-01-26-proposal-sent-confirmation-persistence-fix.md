# Plan: Fix ProposalSentConfirmation Persistence After Reload

**Date**: 2026-01-26
**Status**: ✅ Implemented
**Priority**: High
**Affected Component**: ProposalSentConfirmation UI component

---

## Problem Statement

The `ProposalSentConfirmation` UI component disappears after a browser reload/refresh. The component should remain visible under the Jetvision agent's message after the page is refreshed.

---

## Root Cause Analysis

### Primary Root Cause

Persistence is **conditionally skipped** on the client-side when the session lacks a valid UUID `requestId`:

**Location**: `components/chat-interface.tsx:1501-1525`

```typescript
const requestId = activeChat.requestId || activeChat.conversationId || activeChat.id
const hasValidRequestId = !!requestId && uuidRegex.test(requestId)

if (hasValidRequestId) {
  // Save only happens here - skipped for temp sessions or missing IDs
  try {
    const saveRes = await fetch('/api/messages/save', { ... })
  } catch (saveErr) {
    console.warn('[ChatInterface] Failed to persist proposal-sent message:', saveErr)
  }
}
```

**Issues identified**:
1. **Conditional persistence**: Save is skipped when `hasValidRequestId` is false (temp sessions, missing IDs)
2. **Single point of failure**: All persistence relies on client-side save after proposal send
3. **Late persistence**: Message is saved after the UI shows confirmation, creating a race condition

### Secondary Issue: Content Type Mismatch

The code uses `contentType: 'proposal'` but the database enum only has `'proposal_shared'`:

| Location | Value Used | Database Enum |
|----------|------------|---------------|
| `chat-interface.tsx:1514` | `'proposal'` | ❌ Not in enum |
| `map-db-message-to-ui.ts:58` | checks `'proposal'` | ❌ Not in enum |
| Database (`message_content_type`) | - | `'proposal_shared'` ✅ |

**Result**: Even when persistence IS attempted, the insert fails with an enum constraint violation.

---

## Solution Overview

Move persistence from client-side (after send) to server-side (in `app/api/proposal/send/route.ts`) using the correct content type `'proposal_shared'`.

### Benefits

1. **Guaranteed persistence**: Happens server-side before confirmation is shown
2. **Uses existing requestId**: The API already has access to a valid `requestId`
3. **Leverages existing load path**: `mapDbMessageToChatMessage` already handles message restoration
4. **Atomic operation**: Persistence happens as part of the proposal send transaction

---

## Implementation Plan

### Phase 1: Update Server-Side Persistence

#### Step 1.1: Modify `app/api/proposal/send/route.ts`

Add message persistence after successful proposal send.

**Location**: After the email is sent successfully (around line 420)

**Changes**:
```typescript
import { saveMessage } from '@/lib/conversation/message-persistence';

// After successful email send, persist the confirmation message
if (requestId) {
  try {
    await saveMessage({
      requestId,
      senderType: 'ai_assistant',
      senderIsoAgentId: isoAgentId,
      content: `The proposal for ${departureAirport} → ${arrivalAirport} was sent to ${customerName} at ${customerEmail}.`,
      contentType: 'proposal_shared',
      richContent: {
        proposalSent: {
          flightDetails: {
            departureAirport,
            arrivalAirport,
            departureDate,
          },
          client: {
            name: customerName,
            email: customerEmail,
          },
          pdfUrl,
          fileName,
          proposalId,
          pricing: {
            total: finalAmount,
            currency: 'USD',
          },
        },
      },
    });
  } catch (error) {
    console.error('[Send] Error persisting proposal confirmation message:', error);
    // Don't fail the request - email was sent successfully
  }
}
```

**Data to extract from existing route context**:
- `requestId` - from request body or database lookup
- `departureAirport`, `arrivalAirport`, `departureDate` - from request data
- `customerName`, `customerEmail` - from client profile
- `pdfUrl`, `fileName` - from generated proposal
- `proposalId` - from created proposal record
- `finalAmount` - from proposal pricing

#### Step 1.2: Return message ID in API response

Update the response to include the saved message ID so the client can use it:

```typescript
return NextResponse.json({
  success: true,
  proposalId: dbProposalId,
  pdfUrl,
  emailSent: true,
  messageId: savedMessageId, // Add this
});
```

### Phase 2: Update Content Type Mapping

#### Step 2.1: Modify `lib/utils/map-db-message-to-ui.ts`

Update the content type check from `'proposal'` to `'proposal_shared'`.

**Current code** (line 57-61):
```typescript
if (
  msg.contentType === 'proposal' &&
  msg.richContent &&
  typeof msg.richContent === 'object' &&
  RICH_CONTENT_PROPOSAL_KEY in msg.richContent
)
```

**Updated code**:
```typescript
if (
  msg.contentType === 'proposal_shared' &&
  msg.richContent &&
  typeof msg.richContent === 'object' &&
  RICH_CONTENT_PROPOSAL_KEY in msg.richContent
)
```

### Phase 3: Update Client-Side Code (Optional Cleanup)

#### Step 3.1: Simplify `components/chat-interface.tsx`

The client-side persistence can be simplified since server-side now handles it. The client just needs to use the returned `messageId`.

**Option A**: Remove client-side persistence entirely (recommended)
```typescript
// Remove lines 1500-1525 (the hasValidRequestId check and fetch to /api/messages/save)

// Use messageId from API response
const confirmationMessage = {
  id: response.messageId ?? `agent-proposal-sent-${Date.now()}`,
  type: 'agent' as const,
  content: confirmationContent,
  timestamp: new Date(),
  showProposalSentConfirmation: true,
  proposalSentData,
}
```

**Option B**: Keep as fallback (defensive)
```typescript
// Only attempt client-side save if server didn't return a messageId
if (!response.messageId && hasValidRequestId) {
  // existing save logic with contentType: 'proposal_shared'
}
```

### Phase 4: Update Type Definitions (Optional)

#### Step 4.1: Fix type mismatch in `app/api/messages/save/route.ts`

Update the accepted content types to match database enum:

**Current** (line 28):
```typescript
contentType?: 'text' | 'rich' | 'system' | 'action' | 'quote' | 'proposal';
```

**Updated**:
```typescript
contentType?: 'text' | 'proposal_shared' | 'quote_shared' | 'rfp_created' | 'system_notification' | 'workflow_update';
```

#### Step 4.2: Fix type cast in `lib/conversation/message-persistence.ts`

**Current** (line 195):
```typescript
content_type: (params.contentType || 'text') as 'text' | 'rich' | 'system' | 'action' | 'quote' | 'proposal',
```

**Updated**:
```typescript
content_type: params.contentType || 'text',
```

(Remove the cast - let TypeScript infer from the database types)

---

## Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `app/api/proposal/send/route.ts` | Add message persistence | **Required** |
| `lib/utils/map-db-message-to-ui.ts` | Fix content type check | **Required** |
| `components/chat-interface.tsx` | Remove/simplify client-side persistence | Recommended |
| `app/api/messages/save/route.ts` | Fix type definitions | Optional |
| `lib/conversation/message-persistence.ts` | Fix type cast | Optional |

---

## Testing Plan

### Unit Tests

1. **Test message mapping with `proposal_shared` content type**
   - File: `__tests__/unit/utils/map-db-message-to-ui.test.ts`
   - Verify `mapDbMessageToChatMessage` correctly sets `showProposalSentConfirmation: true`

2. **Test proposal send API persists message**
   - File: `__tests__/unit/api/proposal-send.test.ts`
   - Verify message is saved with correct content type and rich content

### Integration Tests

1. **Test full proposal flow with reload**
   - Send proposal via API
   - Verify message appears in chat
   - Reload page
   - Verify ProposalSentConfirmation component still renders

### Manual Testing Checklist

- [ ] Send a proposal from the chat interface
- [ ] Verify ProposalSentConfirmation appears
- [ ] Refresh the browser
- [ ] Verify ProposalSentConfirmation still appears
- [ ] Verify all data is correct (flight details, client info, PDF link)
- [ ] Test with temp session (no requestId) - should still work via API
- [ ] Check database has message with `content_type = 'proposal_shared'`

---

## Rollback Plan

If issues arise:

1. Revert changes to `app/api/proposal/send/route.ts`
2. Revert changes to `lib/utils/map-db-message-to-ui.ts`
3. Keep client-side persistence as-is (with the understanding it won't work for all cases)

---

## Success Criteria

1. ProposalSentConfirmation persists across browser reloads
2. No console errors related to message persistence
3. Database contains messages with `content_type = 'proposal_shared'`
4. Existing proposal send functionality continues to work
5. All tests pass

---

## Dependencies

- `lib/conversation/message-persistence.ts` - `saveMessage` function
- Database table: `messages` with `content_type` enum
- Existing proposal send API structure

---

## Estimated Effort

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Server-side persistence | 30-45 min |
| Phase 2: Content type mapping | 5 min |
| Phase 3: Client-side cleanup | 15-20 min |
| Phase 4: Type definitions | 10 min |
| Testing | 30 min |
| **Total** | ~1.5-2 hours |

---

## Notes

- The `richContent.proposalSent` structure must match `ProposalSentConfirmationProps` interface
- The `RICH_CONTENT_PROPOSAL_KEY` constant in `map-db-message-to-ui.ts` is `'proposalSent'`
- Server-side persistence should not fail the overall request if it encounters an error (email was already sent)

---

## Implementation Verification (2026-01-26)

Upon review, **all phases were already implemented**. Below is the verification:

### Phase 1: Server-Side Persistence ✅
**File**: `app/api/proposal/send/route.ts` (lines 446-501)
- Validates `requestId` as UUID (lines 449-453)
- Saves message with `contentType: 'proposal_shared'` (line 487)
- Uses `richContent: { proposalSent: proposalSentData }` (line 488)
- Returns `savedMessageId` in response (line 515)

### Phase 2: Content Type Mapping ✅
**File**: `lib/utils/map-db-message-to-ui.ts` (line 58)
- Already checks for `contentType === 'proposal_shared'`
- Documentation updated to reflect `'proposal_shared'` (lines 6, 33, 39)

### Phase 3: Client-Side Code ✅
**File**: `components/chat-interface.tsx` (lines 1512-1544)
- Sends `requestId` to API (line 1455)
- Uses `savedMessageId` from server response (lines 1512-1516)
- Fallback persistence uses correct `contentType: 'proposal_shared'` (line 1527)
- Logs warning if persistence fails (lines 1539-1544)

### Phase 4: Type Definitions ✅
- `app/api/messages/save/route.ts:28`: Includes `'proposal_shared'`
- `lib/conversation/message-persistence.ts:15,195`: Includes `'proposal_shared'`
- `lib/types/database.ts:1347,1585`: Includes `'proposal_shared'`
- `lib/types/chat.ts:45,397`: Includes `'proposal_shared'`

### Verification Command
```bash
# Confirm no files use incorrect 'proposal' content type
grep -r "contentType.*:.*['\"]proposal['\"]" --include="*.ts" --include="*.tsx" .
# Result: No matches (all use 'proposal_shared')
```

**Status**: All implementation complete. Ready for testing.
