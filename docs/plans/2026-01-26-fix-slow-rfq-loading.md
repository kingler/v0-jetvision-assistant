# Implementation Plan: Fix Slow RFQ Loading Performance

**Date**: 2026-01-26
**Issue**: Flight request data loads slowly in chat interface
**Root Cause**: Session load query missing LEFT JOIN to quotes table
**Priority**: Critical (Performance Issue)
**Estimated Effort**: 1-2 hours

---

## Problem Statement

### Symptoms
1. FlightRequestCard displays "0 RFQs" until user clicks the card
2. Chat session request data takes 2-5 seconds to load after clicking
3. Unnecessary Avinode API calls during chat selection (blocking UI)
4. Stale UI state in sidebar cards

### Root Cause Analysis

**Investigation Method**: Systematic Debugging (Phase 1-3 Complete)

**Findings**:
1. ✅ **Webhooks work correctly** - Quote data IS persisted to `quotes` table
2. ❌ **Session load query incomplete** - `GET /api/chat-sessions` doesn't fetch quotes
3. ❌ **Unnecessary API calls** - `handleSelectChat` calls Avinode API instead of using DB data
4. ⚠️ **No real-time updates** - No SSE endpoint to push webhook events to frontend

**Evidence**:
- `app/api/chat-sessions/route.ts:60-102` - Query missing quotes JOIN
- `app/api/webhooks/avinode/route.ts:202` - Webhook correctly calls `storeOperatorQuote`
- `app/api/webhooks/avinode/webhook-utils.ts:388` - Quote persisted via upsert
- `app/page.tsx:1036` - Unnecessary `fetchTripDetailsFromAvinode` call

**Data Flow (Current - Broken)**:
```
Webhook → Quote persisted to quotes table ✅
    ↓
GET /api/chat-sessions → Only queries requests table ❌
    ↓
FlightRequestCard → rfqFlights undefined → Shows "0 RFQs" ❌
    ↓
User clicks card → fetchTripDetailsFromAvinode() → Slow Avinode API call ❌
    ↓
Finally shows quotes after 2-5s delay
```

**Data Flow (Fixed)**:
```
Webhook → Quote persisted to quotes table ✅
    ↓
GET /api/chat-sessions → LEFT JOIN quotes → Returns rfqFlights ✅
    ↓
FlightRequestCard → rfqFlights populated → Shows accurate count ✅
    ↓
User clicks card → Instant display (no API call) ✅
```

---

## Solution Overview

### Phase 1: Critical Fix (This Plan)

**Scope**: Fix query and remove unnecessary API calls

**Changes**:
1. Add LEFT JOIN to quotes table in session load query
2. Transform quotes to RFQFlight format in API response
3. Remove unnecessary Avinode API call in `handleSelectChat`
4. Add fallback logic for edge cases

**Impact**:
- ✅ 90-95% faster loading (2-5s → <100ms)
- ✅ Accurate RFQ counts in sidebar immediately
- ✅ No blocking API calls during user interaction

### Phase 2: Enhancement (Future)

**Scope**: Real-time updates via SSE

**Changes**:
1. Create `/api/avinode/events` SSE endpoint
2. Subscribe to webhook events in frontend
3. Auto-refresh sessions when new quotes arrive

**Impact**:
- ✅ No page refresh needed when quotes arrive
- ✅ Better UX with instant feedback

---

## Implementation Details

### Solution 1: Add Quotes to Session Load Query

**File**: `app/api/chat-sessions/route.ts`
**Lines**: 60-102 (query), 137-189 (transformation)
**Risk**: Low (additive change, no breaking changes)

#### Step 1: Update Query (Line 60)

**Before**:
```typescript
let query = supabaseAdmin
  .from('requests')
  .select(`
    id,
    iso_agent_id,
    client_profile_id,
    departure_airport,
    arrival_airport,
    departure_date,
    return_date,
    passengers,
    aircraft_type,
    budget,
    special_requirements,
    status,
    metadata,
    created_at,
    updated_at,
    avinode_rfq_id,
    avinode_trip_id,
    avinode_deep_link,
    operators_contacted,
    quotes_expected,
    quotes_received,
    session_status,
    conversation_type,
    current_step,
    workflow_state,
    session_started_at,
    session_ended_at,
    last_activity_at,
    subject,
    avinode_thread_id,
    last_message_at,
    last_message_by,
    message_count,
    unread_count_iso,
    unread_count_operator,
    is_priority,
    is_pinned
  `)
  .eq('iso_agent_id', agent.id)
  .order('last_activity_at', { ascending: false, nullsFirst: false });
```

**After**:
```typescript
let query = supabaseAdmin
  .from('requests')
  .select(`
    id,
    iso_agent_id,
    client_profile_id,
    departure_airport,
    arrival_airport,
    departure_date,
    return_date,
    passengers,
    aircraft_type,
    budget,
    special_requirements,
    status,
    metadata,
    created_at,
    updated_at,
    avinode_rfq_id,
    avinode_trip_id,
    avinode_deep_link,
    operators_contacted,
    quotes_expected,
    quotes_received,
    session_status,
    conversation_type,
    current_step,
    workflow_state,
    session_started_at,
    session_ended_at,
    last_activity_at,
    subject,
    avinode_thread_id,
    last_message_at,
    last_message_by,
    message_count,
    unread_count_iso,
    unread_count_operator,
    is_priority,
    is_pinned,
    quotes:quotes(
      id,
      avinode_quote_id,
      operator_id,
      operator_name,
      aircraft_type,
      aircraft_tail_number,
      base_price,
      total_price,
      status,
      schedule,
      availability,
      metadata,
      created_at,
      valid_until,
      decline_reason
    )
  `)
  .eq('iso_agent_id', agent.id)
  .order('last_activity_at', { ascending: false, nullsFirst: false });
```

**Changes**: Added `quotes:quotes(...)` relationship with relevant fields

#### Step 2: Add Quote Status Mapper (After Line 26)

**Location**: After `export const dynamic = 'force-dynamic';`

```typescript
/**
 * Map database quote status to RFQFlight status enum
 */
function mapQuoteStatusToRFQStatus(
  status: string
): 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired' {
  switch (status) {
    case 'received':
      return 'quoted';
    case 'declined':
    case 'rejected':
      return 'declined';
    case 'expired':
      return 'expired';
    case 'pending':
      return 'unanswered';
    case 'sent':
    default:
      return 'sent';
  }
}
```

#### Step 3: Transform Quotes in Response (Line 137)

**Before**:
```typescript
const sessions = (requests || []).map(req => ({
  // Session-level fields (previously from chat_sessions)
  id: req.id,
  request_id: req.id,
  // ... rest of fields
}));
```

**After**:
```typescript
const sessions = (requests || []).map(req => ({
  // Session-level fields (previously from chat_sessions)
  id: req.id,
  request_id: req.id,
  iso_agent_id: req.iso_agent_id,
  status: req.session_status || 'active',
  conversation_type: req.conversation_type || 'flight_request',
  avinode_trip_id: req.avinode_trip_id,
  avinode_rfq_id: req.avinode_rfq_id,
  primary_quote_id: null,
  proposal_id: null,
  session_started_at: req.session_started_at || req.created_at,
  session_ended_at: req.session_ended_at,
  last_activity_at: req.last_activity_at || req.updated_at,
  current_step: req.current_step,
  workflow_state: req.workflow_state || {},
  message_count: req.message_count || 0,
  quotes_received_count: req.quotes_received || 0,
  quotes_expected_count: req.quotes_expected || 0,
  operators_contacted_count: req.operators_contacted || 0,
  metadata: req.metadata || {},
  created_at: req.created_at,
  updated_at: req.updated_at,

  // Request details (embedded, previously from join)
  request: {
    id: req.id,
    departure_airport: req.departure_airport,
    arrival_airport: req.arrival_airport,
    departure_date: req.departure_date,
    return_date: req.return_date,
    passengers: req.passengers,
    aircraft_type: req.aircraft_type,
    budget: req.budget,
    status: req.status,
    avinode_trip_id: req.avinode_trip_id,
    avinode_rfq_id: req.avinode_rfq_id,
    avinode_deep_link: req.avinode_deep_link,
    created_at: req.created_at,
  },

  // Conversation metadata (previously from conversations join)
  conversation: {
    id: req.id,
    request_id: req.id,
    quote_id: null,
    type: req.conversation_type || 'flight_request',
    status: req.session_status || 'active',
    subject: req.subject,
    last_message_at: req.last_message_at,
    message_count: req.message_count || 0,
  },

  // [NEW] Transform quotes to rfqFlights format for frontend
  rfqFlights: ((req as any).quotes || []).map((quote: any) => ({
    id: quote.id,
    quoteId: quote.avinode_quote_id,
    operatorId: quote.operator_id,
    operatorName: quote.operator_name,
    aircraftType: quote.aircraft_type,
    aircraftTailNumber: quote.aircraft_tail_number,
    totalPrice: quote.total_price,
    basePrice: quote.base_price,
    rfqStatus: mapQuoteStatusToRFQStatus(quote.status),
    schedule: quote.schedule,
    availability: quote.availability,
    validUntil: quote.valid_until,
    declineReason: quote.decline_reason,
    createdAt: quote.created_at,
    // Merge any additional fields from metadata
    ...(quote.metadata || {}),
  })),
}));
```

**Changes**: Added `rfqFlights` array transformation from quotes

---

### Solution 2: Remove Unnecessary API Calls

**File**: `app/page.tsx`
**Lines**: 977-1127 (`handleSelectChat` function)
**Risk**: Low (only removes unnecessary calls, keeps fallback)

#### Step 1: Simplify handleSelectChat (Line 977)

**Before**:
```typescript
const handleSelectChat = async (chatId: string) => {
  setActiveChatId(chatId)
  setCurrentView("chat")

  // Find the current session
  const session = chatSessions.find((s) => s.id === chatId);
  if (!session) {
    console.warn('[handleSelectChat] Session not found:', chatId);
    return;
  }

  // Skip loading for temporary sessions
  if (chatId.startsWith('temp-')) {
    console.log('[handleSelectChat] Skipping load - temp session:', chatId);
    return;
  }

  // Track what needs to be loaded
  const needsMessages = !session.messages || session.messages.length === 0;
  const needsRFQFlights = session.tripId && (!session.rfqFlights || session.rfqFlights.length === 0);
  const needsOperatorThreads = session.tripId && (!session.operatorThreads || Object.keys(session.operatorThreads).length === 0);
  const needsTripDetails = session.tripId && (!session.route || session.route === 'Select route' || session.route === ' → ');

  console.log('[handleSelectChat] Loading data for session:', {
    chatId,
    requestId: session.requestId,
    tripId: session.tripId,
    needsMessages,
    needsRFQFlights,
    needsOperatorThreads,
    needsTripDetails,
    currentRoute: session.route,
    currentMessageCount: session.messages?.length || 0,
    currentRFQFlightCount: session.rfqFlights?.length || 0,
    currentOperatorThreadCount: session.operatorThreads ? Object.keys(session.operatorThreads).length : 0,
  });

  // Phase 1: Load messages from database
  let messages = (session.requestId || session.conversationId)
    ? await loadMessagesForSession(session)
    : (session.messages || []);

  // Phase 2: If tripId exists but no data from database, fetch from Avinode API
  let rfqFlights: RFQFlight[] = session.rfqFlights || [];
  let tripDetails: {
    departureAirport: string | null;
    arrivalAirport: string | null;
    departureDate: string | null;
    passengers: number | null;
    deepLink: string | null;
  } | null = null;

  // Fetch from Avinode API when:
  // 1. Session has tripId but no messages in DB (reconstruction needed)
  // 2. Session has tripId but route info is missing
  // 3. Session needs RFQ flights
  if (session.tripId && (needsTripDetails || (needsMessages && messages.length === 0) || needsRFQFlights)) {
    console.log('[handleSelectChat] 🔄 Fetching trip details from Avinode API (database data missing)');
    const avinodeData = await fetchTripDetailsFromAvinode(session.tripId);

    if (avinodeData) {
      tripDetails = avinodeData;
      rfqFlights = avinodeData.rfqFlights;
      console.log('[handleSelectChat] ✅ Loaded trip details from Avinode API');
    }
  } else if (needsRFQFlights && session.tripId) {
    // Just load RFQ flights if that's all we need
    rfqFlights = await loadRFQFlightsForSession(session.tripId);
  }

  // ... rest of function
};
```

**After**:
```typescript
const handleSelectChat = async (chatId: string) => {
  setActiveChatId(chatId)
  setCurrentView("chat")

  // Find the current session
  const session = chatSessions.find((s) => s.id === chatId);
  if (!session) {
    console.warn('[handleSelectChat] Session not found:', chatId);
    return;
  }

  // Skip loading for temporary sessions
  if (chatId.startsWith('temp-')) {
    console.log('[handleSelectChat] Skipping load - temp session:', chatId);
    return;
  }

  console.log('[handleSelectChat] Loading data for session:', {
    chatId,
    requestId: session.requestId,
    tripId: session.tripId,
    currentMessageCount: session.messages?.length || 0,
    currentRFQFlightCount: session.rfqFlights?.length || 0,
  });

  // Load messages from database
  let messages = (session.requestId || session.conversationId)
    ? await loadMessagesForSession(session)
    : (session.messages || []);

  // Only fetch from Avinode API if RFQ data is completely missing (fallback)
  // This handles edge cases where webhook data wasn't persisted or DB query failed
  let rfqFlights: RFQFlight[] = session.rfqFlights || [];
  let tripDetails: {
    departureAirport: string | null;
    arrivalAirport: string | null;
    departureDate: string | null;
    passengers: number | null;
    deepLink: string | null;
  } | null = null;

  if (session.tripId && (!session.rfqFlights || session.rfqFlights.length === 0)) {
    console.warn('[handleSelectChat] ⚠️ RFQ data missing from DB (unexpected), fetching from Avinode API as fallback');
    const avinodeData = await fetchTripDetailsFromAvinode(session.tripId);

    if (avinodeData) {
      tripDetails = avinodeData;
      rfqFlights = avinodeData.rfqFlights;
      console.log('[handleSelectChat] ✅ Loaded trip details from Avinode API (fallback)');
    }
  }

  // Load operator threads if needed
  const needsOperatorThreads = session.tripId && (!session.operatorThreads || Object.keys(session.operatorThreads).length === 0);
  const effectiveRfqFlights = rfqFlights.length > 0 ? rfqFlights : (session.rfqFlights || []);
  const operatorThreads = needsOperatorThreads && session.tripId
    ? await loadOperatorThreadsForSession(session.tripId, effectiveRfqFlights)
    : (session.operatorThreads || {});

  // ... rest of function (update session state)
};
```

**Changes**:
- Removed `needsTripDetails` check (route data from DB is sufficient)
- Simplified conditions for Avinode API call
- Made API call a fallback for edge cases only
- Added warning logs when fallback is triggered

---

## Testing Plan

### Unit Tests

**File**: `__tests__/unit/api/chat-sessions.test.ts` (new file)

```typescript
describe('mapQuoteStatusToRFQStatus', () => {
  it('maps received to quoted', () => {
    expect(mapQuoteStatusToRFQStatus('received')).toBe('quoted');
  });

  it('maps declined to declined', () => {
    expect(mapQuoteStatusToRFQStatus('declined')).toBe('declined');
  });

  it('maps rejected to declined', () => {
    expect(mapQuoteStatusToRFQStatus('rejected')).toBe('declined');
  });

  it('maps expired to expired', () => {
    expect(mapQuoteStatusToRFQStatus('expired')).toBe('expired');
  });

  it('maps pending to unanswered', () => {
    expect(mapQuoteStatusToRFQStatus('pending')).toBe('unanswered');
  });

  it('handles unknown status', () => {
    expect(mapQuoteStatusToRFQStatus('unknown')).toBe('sent');
  });
});

describe('session transformation with quotes', () => {
  it('transforms quotes to rfqFlights format', () => {
    const mockRequest = {
      id: 'req-123',
      avinode_trip_id: 'atrip-456',
      quotes: [{
        id: 'quote-1',
        avinode_quote_id: 'arfq-789',
        operator_id: 'op-1',
        operator_name: 'Test Operator',
        aircraft_type: 'Citation X',
        total_price: 50000,
        base_price: 45000,
        status: 'received',
      }],
    };

    // Transform mock request
    // ... test logic
  });

  it('handles requests with no quotes', () => {
    const mockRequest = {
      id: 'req-123',
      avinode_trip_id: 'atrip-456',
      quotes: [],
    };

    // Should return empty rfqFlights array
    // ... test logic
  });
});
```

### Integration Tests

**File**: `__tests__/integration/api/chat-sessions-quotes.test.ts` (new file)

```typescript
describe('GET /api/chat-sessions with quotes', () => {
  it('fetches quotes when loading sessions', async () => {
    // 1. Create test request
    const requestId = await createTestRequest({
      avinode_trip_id: 'atrip-test-123',
    });

    // 2. Create test quote
    await createTestQuote({
      request_id: requestId,
      avinode_quote_id: 'arfq-test-456',
      operator_name: 'Test Operator',
      total_price: 50000,
      status: 'received',
    });

    // 3. Call API
    const response = await fetch('/api/chat-sessions', {
      headers: {
        'Authorization': `Bearer ${testToken}`,
      },
    });

    // 4. Verify response
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.sessions).toBeDefined();
    expect(data.sessions[0].rfqFlights).toBeDefined();
    expect(data.sessions[0].rfqFlights.length).toBe(1);
    expect(data.sessions[0].rfqFlights[0].operatorName).toBe('Test Operator');
    expect(data.sessions[0].rfqFlights[0].rfqStatus).toBe('quoted');
  });

  it('handles requests with multiple quotes', async () => {
    // Test with 3 quotes from different operators
    // ... test logic
  });

  it('handles requests with declined quotes', async () => {
    // Test declined status mapping
    // ... test logic
  });
});
```

### Manual Testing Checklist

- [ ] **Test 1: Fresh Page Load**
  - [ ] Open app in browser
  - [ ] Check sidebar shows accurate RFQ counts immediately
  - [ ] Open Network tab, verify no Avinode API calls on page load
  - [ ] Expected: Sidebar shows "N RFQs" where N > 0 for trips with quotes

- [ ] **Test 2: Chat Selection (Happy Path)**
  - [ ] Click a flight request card with quotes
  - [ ] Verify instant display (no loading spinner)
  - [ ] Check Network tab: No Avinode API calls
  - [ ] Expected: Chat opens immediately, RFQ flights displayed

- [ ] **Test 3: Webhook Quote Receipt**
  - [ ] Trigger test webhook with quote data (use Postman or test script)
  - [ ] Verify quote persisted to database (check Supabase)
  - [ ] Refresh page
  - [ ] Expected: New quote appears in sidebar count

- [ ] **Test 4: Fallback Behavior (Edge Case)**
  - [ ] Manually delete quotes from database for a specific request
  - [ ] Click that chat card
  - [ ] Verify console shows fallback warning
  - [ ] Verify Avinode API is called as fallback
  - [ ] Expected: Data displays correctly after API call

- [ ] **Test 5: Multiple Sessions**
  - [ ] Create 3+ flight requests with varying quote counts (0, 1, 3)
  - [ ] Verify sidebar shows correct counts for each
  - [ ] Click through multiple sessions
  - [ ] Expected: Each session shows correct quote data instantly

- [ ] **Test 6: Session with No Quotes**
  - [ ] Create a new flight request (no quotes yet)
  - [ ] Verify sidebar shows "0 RFQs"
  - [ ] Click the card
  - [ ] Expected: Opens instantly, no errors, shows empty state

---

## Rollback Plan

If issues arise during deployment:

### Rollback Step 1: Revert Code Changes

```bash
git revert <commit-hash>
git push origin main
```

### Rollback Step 2: Emergency Feature Flag (if needed)

Add to `app/api/chat-sessions/route.ts`:

```typescript
const ENABLE_QUOTES_JOIN = process.env.ENABLE_QUOTES_JOIN !== 'false';

let query = supabaseAdmin
  .from('requests')
  .select(`
    *
    ${ENABLE_QUOTES_JOIN ? ',quotes:quotes(...)' : ''}
  `);
```

Set environment variable:
```bash
ENABLE_QUOTES_JOIN=false
```

### Rollback Step 3: Monitor Error Rates

```bash
# Check error logs
heroku logs --tail --app jetvision-prod | grep "chat-sessions"

# Check database slow queries
# Monitor Supabase dashboard for query performance
```

---

## Deployment Steps

### Pre-Deployment

1. [ ] Review code changes
2. [ ] Run unit tests: `npm run test:unit`
3. [ ] Run integration tests: `npm run test:integration`
4. [ ] Test locally with production-like data
5. [ ] Update CHANGELOG.md

### Deployment

1. [ ] Create feature branch: `git checkout -b fix/slow-rfq-loading`
2. [ ] Commit changes with descriptive message
3. [ ] Push to remote: `git push origin fix/slow-rfq-loading`
4. [ ] Create pull request
5. [ ] Request code review
6. [ ] Merge to main after approval
7. [ ] Deploy to production

### Post-Deployment

1. [ ] Monitor error logs for 24 hours
2. [ ] Check performance metrics (page load times)
3. [ ] Verify no increase in Avinode API calls
4. [ ] Collect user feedback
5. [ ] Document any issues in GitHub Issues

---

## Performance Metrics

### Before Fix (Baseline)

- **Initial sidebar load**: 500-800ms (no quote data)
- **Chat selection**: 2-5 seconds (Avinode API call)
- **Avinode API calls per session load**: 1-3 calls
- **User-perceived latency**: High (visible loading)

### After Fix (Target)

- **Initial sidebar load**: 600-900ms (includes quote data via JOIN)
- **Chat selection**: <100ms (no API call)
- **Avinode API calls per session load**: 0 (except fallback edge cases)
- **User-perceived latency**: Low (instant display)

### Success Criteria

- ✅ Chat selection latency reduced by >90%
- ✅ Avinode API calls reduced by >95%
- ✅ Sidebar shows accurate RFQ counts on first load
- ✅ No increase in database query time (JOIN overhead <100ms)
- ✅ No user-reported bugs or regressions

---

## Future Enhancements (Phase 2)

### Real-Time Updates via SSE

**Goal**: Push quote updates to frontend without page refresh

**Implementation**:
1. Create `/api/avinode/events` SSE endpoint
2. Subscribe in frontend with EventSource
3. Emit events from webhook handler
4. Auto-refresh session data on quote receipt

**Estimated Effort**: 4-6 hours

**Priority**: Medium (Enhancement, not critical)

### Client-Side Caching

**Goal**: Cache session data to reduce server requests

**Implementation**:
1. Integrate React Query or SWR
2. Set cache TTL to 5 minutes
3. Invalidate on quote receipt (via SSE)
4. Add optimistic updates

**Estimated Effort**: 6-8 hours

**Priority**: Low (Optimization)

---

## References

- **Root Cause Analysis**: Systematic debugging investigation (2026-01-26)
- **CLAUDE.md**: Section "RFP Processing Workflow" and "Avinode Deep Link Integration"
- **Database Schema**: `supabase/migrations/` (quotes table)
- **Webhook Handler**: `app/api/webhooks/avinode/route.ts`
- **Session Load API**: `app/api/chat-sessions/route.ts`

---

## Sign-Off

**Prepared By**: Claude (AI Assistant)
**Date**: 2026-01-26
**Approved By**: [Pending User Review]
**Status**: Ready for Implementation
