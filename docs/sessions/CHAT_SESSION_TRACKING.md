# Chat Session Tracking Implementation

**Date**: 2025-01-XX  
**Status**: ✅ Implemented  
**Purpose**: Track chat conversation sessions tied to trip requests, RFQs, and proposals

---

## Overview

Chat session tracking allows the application to:
- Track chat conversation sessions tied to trip requests
- Monitor sessions for specific Avinode trip IDs, RFP IDs, and RFQ IDs
- Track workflow progression (understanding_request → searching_aircraft → requesting_quotes → proposal_ready)
- Link sessions to quotes and proposals
- Monitor session activity and statistics

---

## Architecture

### Database Schema

**Table**: `chat_sessions`

```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  request_id UUID REFERENCES requests(id),
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id),
  status chat_session_status NOT NULL DEFAULT 'active',
  
  -- Trip/RFQ identifiers
  avinode_trip_id TEXT,
  avinode_rfp_id TEXT,
  avinode_rfq_id TEXT,
  
  -- Related entities
  primary_quote_id UUID REFERENCES quotes(id),
  proposal_id UUID REFERENCES proposals(id),
  
  -- Timestamps
  session_started_at TIMESTAMPTZ NOT NULL,
  session_ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL,
  
  -- Workflow tracking
  current_step TEXT,
  workflow_state JSONB,
  
  -- Statistics
  message_count INTEGER DEFAULT 0,
  quotes_received_count INTEGER DEFAULT 0,
  quotes_expected_count INTEGER DEFAULT 0,
  operators_contacted_count INTEGER DEFAULT 0,
  
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

**Status Values**:
- `active` - Session is currently active
- `paused` - Session is paused (user away)
- `completed` - Session completed (proposal sent)
- `archived` - Session archived (older than 90 days)

### Components

1. **Database Migration** (`017_create_chat_sessions.sql`)
   - Creates `chat_sessions` table
   - Sets up RLS policies
   - Adds indexes for performance
   - Includes helper functions

2. **Session Tracking Utilities** (`lib/sessions/track-chat-session.ts`)
   - `createOrUpdateChatSession()` - Create or update session
   - `getActiveChatSession()` - Get active session by conversation ID
   - `getChatSessionByRequest()` - Get session by request ID
   - `getChatSessionsByTripId()` - Get sessions by Avinode trip ID
   - `updateChatSessionActivity()` - Update last activity timestamp
   - `updateChatSessionWithTripInfo()` - Update with trip/RFQ info
   - `updateChatSessionWithQuote()` - Update with quote information
   - `updateChatSessionWithProposal()` - Update with proposal information
   - `completeChatSession()` - Mark session as completed
   - `getUserActiveChatSessions()` - Get all active sessions for a user

---

## How It Works

### 1. Session Creation

When a conversation is started or a trip request is created:

```typescript
import { createOrUpdateChatSession } from '@/lib/sessions/track-chat-session';

// Create session when conversation starts
const session = await createOrUpdateChatSession({
  conversation_id: conversationId,
  request_id: requestId, // Optional - added when trip request is created
  iso_agent_id: isoAgentId,
  status: 'active',
  current_step: 'understanding_request',
  workflow_state: { /* chat context */ },
});
```

### 2. Update with Trip Information

When a trip is created in Avinode:

```typescript
import { updateChatSessionWithTripInfo } from '@/lib/sessions/track-chat-session';

await updateChatSessionWithTripInfo(sessionId, {
  avinode_trip_id: 'atrip-64956150',
  avinode_rfp_id: 'rfp-123',
  request_id: requestId,
  current_step: 'requesting_quotes',
  workflow_state: { /* updated context */ },
});
```

### 3. Update with Quote Information

When quotes are received:

```typescript
import { updateChatSessionWithQuote } from '@/lib/sessions/track-chat-session';

await updateChatSessionWithQuote(sessionId, quoteId, {
  quotes_received_count: 3,
  quotes_expected_count: 5,
  primary_quote_id: quoteId,
});
```

### 4. Update with Proposal

When a proposal is generated:

```typescript
import { updateChatSessionWithProposal } from '@/lib/sessions/track-chat-session';

await updateChatSessionWithProposal(sessionId, proposalId);
```

### 5. Complete Session

When proposal is sent and workflow is complete:

```typescript
import { completeChatSession } from '@/lib/sessions/track-chat-session';

await completeChatSession(sessionId);
```

---

## Usage Examples

### Get Active Session for Conversation

```typescript
import { getActiveChatSession } from '@/lib/sessions/track-chat-session';

const session = await getActiveChatSession(conversationId);
if (session) {
  console.log(`Session ${session.id} is active, step: ${session.current_step}`);
}
```

### Get Sessions for a Trip

```typescript
import { getChatSessionsByTripId } from '@/lib/sessions/track-chat-session';

const sessions = await getChatSessionsByTripId('atrip-64956150');
console.log(`Found ${sessions.length} sessions for this trip`);
```

### Get User's Active Sessions

```typescript
import { getUserActiveChatSessions } from '@/lib/sessions/track-chat-session';

const sessions = await getUserActiveChatSessions(isoAgentId);
console.log(`User has ${sessions.length} active chat sessions`);
```

---

## Database Queries

### Get Active Sessions for a User

```sql
SELECT 
  cs.*,
  c.subject as conversation_subject,
  r.departure_airport,
  r.arrival_airport,
  r.departure_date
FROM chat_sessions cs
JOIN conversations c ON c.id = cs.conversation_id
LEFT JOIN requests r ON r.id = cs.request_id
WHERE cs.iso_agent_id = 'agent-uuid'
  AND cs.status = 'active'
ORDER BY cs.last_activity_at DESC;
```

### Get Sessions for a Trip

```sql
SELECT *
FROM chat_sessions
WHERE avinode_trip_id = 'atrip-64956150'
ORDER BY last_activity_at DESC;
```

### Get Sessions with Quotes

```sql
SELECT 
  cs.*,
  q.operator_name,
  q.total_price,
  q.aircraft_type
FROM chat_sessions cs
LEFT JOIN quotes q ON q.id = cs.primary_quote_id
WHERE cs.status = 'active'
  AND cs.primary_quote_id IS NOT NULL;
```

---

## Integration Points

### 1. Chat API Route

When a message is sent via `/api/chat`, update session activity:

```typescript
// In app/api/chat/route.ts
import { updateChatSessionActivity } from '@/lib/sessions/track-chat-session';

// After processing message
if (sessionId) {
  await updateChatSessionActivity(sessionId);
}
```

### 2. Trip Creation

When `create_trip` is called and returns trip ID:

```typescript
// In app/api/chat/route.ts or orchestrator
import { updateChatSessionWithTripInfo } from '@/lib/sessions/track-chat-session';

if (tripId && sessionId) {
  await updateChatSessionWithTripInfo(sessionId, {
    avinode_trip_id: tripId,
    avinode_rfp_id: rfpId,
    current_step: 'requesting_quotes',
  });
}
```

### 3. Quote Reception

When quotes are received via Avinode webhook:

```typescript
// In app/api/webhooks/avinode/route.ts
import { updateChatSessionWithQuote } from '@/lib/sessions/track-chat-session';

// Find session by trip ID
const sessions = await getChatSessionsByTripId(tripId);
for (const session of sessions) {
  await updateChatSessionWithQuote(session.id, quoteId, {
    quotes_received_count: quotesCount,
  });
}
```

### 4. Proposal Generation

When a proposal is generated:

```typescript
// In proposal generation code
import { updateChatSessionWithProposal } from '@/lib/sessions/track-chat-session';

await updateChatSessionWithProposal(sessionId, proposalId);
```

---

## Maintenance

### Archive Old Sessions

Run periodically (weekly/monthly):

```sql
SELECT archive_old_chat_sessions();
```

This archives sessions that:
- Status is `completed`
- `session_ended_at` is older than 90 days

### Query Active Sessions

```sql
-- All active sessions
SELECT COUNT(*) FROM chat_sessions WHERE status = 'active';

-- Sessions by current step
SELECT current_step, COUNT(*) 
FROM chat_sessions 
WHERE status = 'active'
GROUP BY current_step;
```

---

## Related Files

- `supabase/migrations/017_create_chat_sessions.sql` - Database schema
- `lib/sessions/track-chat-session.ts` - Session tracking utilities
- `docs/sessions/CHAT_SESSION_TRACKING.md` - This file

---

## Next Steps

1. Run migration: `supabase migration up 017_create_chat_sessions`
2. Integrate session tracking in chat API routes
3. Integrate session tracking in trip creation flow
4. Integrate session tracking in quote/proposal workflows
5. Set up scheduled cleanup for archived sessions

---

**Note**: Chat sessions are different from user login sessions. Chat sessions track conversation workflows, while login sessions track authentication state. This implementation focuses on chat conversation sessions.
