# Chat Sessions Migration Summary

**Date**: 2025-01-XX  
**Status**: ✅ Complete  
**Purpose**: Replace deprecated `chatkit_sessions` with `chat_sessions` for tracking chat conversation threads

---

## What Changed

### Deprecated
- ❌ `chatkit_sessions` table - Used for ChatKit workflow integration (no longer needed)
- ❌ ChatKit-specific session tracking endpoints

### New Implementation
- ✅ `chat_sessions` table - Tracks chat conversation sessions tied to:
  - Conversations (chat threads)
  - Trip requests
  - Avinode trip IDs, RFP IDs, RFQ IDs
  - Quotes and proposals
- ✅ `/api/chat-sessions` endpoint - List sessions for logged-in users
- ✅ Trip ID filtering support

---

## Database Changes

### New Table: `chat_sessions`

Created in migration `017_create_chat_sessions.sql`:

- Links to `conversations` table (chat threads)
- Links to `requests` table (trip requests)
- Tracks Avinode identifiers (trip_id, rfp_id, rfq_id)
- Tracks workflow state and statistics
- Includes session status (active, paused, completed, archived)

### Deprecated Table: `chatkit_sessions`

Migration `018_drop_chatkit_sessions.sql` removes:
- `chatkit_sessions` table
- Related functions and triggers
- Related indexes

**Note**: Run this migration only after confirming no code depends on `chatkit_sessions`.

---

## API Endpoint

### GET `/api/chat-sessions`

Lists chat sessions for the authenticated user.

**Query Parameters**:
- `trip_id` (optional): Filter by Avinode trip ID
- `status` (optional): Filter by status (active, paused, completed, archived)
  - Default: Returns `active` and `paused` sessions only

**Response**:
```json
{
  "sessions": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "request_id": "uuid",
      "iso_agent_id": "uuid",
      "status": "active",
      "avinode_trip_id": "atrip-64956150",
      "avinode_rfp_id": "rfp-123",
      "current_step": "requesting_quotes",
      "message_count": 15,
      "quotes_received_count": 3,
      "last_activity_at": "2025-01-XX...",
      "conversation": { ... },
      "request": { ... }
    }
  ],
  "count": 1
}
```

**Example Usage**:

```bash
# Get all active sessions for user
GET /api/chat-sessions

# Get sessions for a specific trip
GET /api/chat-sessions?trip_id=atrip-64956150

# Get completed sessions
GET /api/chat-sessions?status=completed
```

---

## Current vs New Approach

### Current (Still Works)

The app currently loads flight requests via `/api/requests` and converts them to ChatSession format:

```typescript
// app/page.tsx
const response = await fetch('/api/requests?limit=50')
const { requests, messages } = await response.json()
const sessions = requestsToChatSessions(requests, messagesMap)
```

This approach:
- ✅ Works with existing code
- ✅ Loads requests and messages together
- ✅ No migration needed

### New (Recommended for Future)

Use the new `/api/chat-sessions` endpoint:

```typescript
// Load chat sessions directly
const response = await fetch('/api/chat-sessions')
const { sessions } = await response.json()
// Sessions already include conversation and request data
```

Benefits:
- ✅ Sessions are explicitly tracked in database
- ✅ Can filter by Trip ID easily
- ✅ Includes workflow state and statistics
- ✅ Better for session management features

---

## Migration Steps

### 1. Run Database Migrations

```bash
# Create chat_sessions table
supabase migration up 017_create_chat_sessions

# Optionally drop deprecated chatkit_sessions (if no dependencies)
supabase migration up 018_drop_chatkit_sessions
```

### 2. Update Code (Optional)

You can continue using `/api/requests` for now, or migrate to `/api/chat-sessions`:

**Option A: Keep Current Approach**
- No changes needed
- Continue using `/api/requests` endpoint
- Chat sessions table is available for future use

**Option B: Migrate to New Endpoint**
- Update `app/page.tsx` to use `/api/chat-sessions`
- Ensure sessions are created when conversations/requests are created
- Update ChatSession interface if needed

### 3. Create Sessions

Ensure chat sessions are created when:
- Conversations are started
- Trip requests are created
- Trips are created in Avinode

See `lib/sessions/track-chat-session.ts` for helper functions.

---

## Integration Example

### Create Session on Conversation Start

```typescript
import { createOrUpdateChatSession } from '@/lib/sessions/track-chat-session';

// When conversation is created
const session = await createOrUpdateChatSession({
  conversation_id: conversationId,
  iso_agent_id: isoAgentId,
  status: 'active',
  current_step: 'understanding_request',
});
```

### Update Session with Trip ID

```typescript
import { updateChatSessionWithTripInfo } from '@/lib/sessions/track-chat-session';

// When trip is created in Avinode
await updateChatSessionWithTripInfo(sessionId, {
  avinode_trip_id: 'atrip-64956150',
  avinode_rfp_id: 'rfp-123',
  request_id: requestId,
  current_step: 'requesting_quotes',
});
```

---

## Query Examples

### Get All Sessions for User

```sql
SELECT 
  cs.*,
  c.subject as conversation_subject,
  r.departure_airport,
  r.arrival_airport
FROM chat_sessions cs
JOIN conversations c ON c.id = cs.conversation_id
LEFT JOIN requests r ON r.id = cs.request_id
WHERE cs.iso_agent_id = 'agent-uuid'
  AND cs.status IN ('active', 'paused')
ORDER BY cs.last_activity_at DESC;
```

### Get Sessions by Trip ID

```sql
SELECT *
FROM chat_sessions
WHERE avinode_trip_id = 'atrip-64956150'
  AND iso_agent_id = 'agent-uuid'
ORDER BY last_activity_at DESC;
```

---

## Files

**Created**:
- ✅ `supabase/migrations/017_create_chat_sessions.sql` - New table
- ✅ `supabase/migrations/018_drop_chatkit_sessions.sql` - Drop old table
- ✅ `app/api/chat-sessions/route.ts` - API endpoint
- ✅ `lib/sessions/track-chat-session.ts` - Session utilities
- ✅ `docs/sessions/CHAT_SESSION_TRACKING.md` - Technical docs
- ✅ `docs/sessions/USAGE_GUIDE.md` - Usage guide
- ✅ `docs/sessions/MIGRATION_SUMMARY.md` - This file

**Updated**:
- ✅ `app/api/webhooks/clerk/route.ts` - Removed session event handlers
- ✅ `docs/sessions/README.md` - Updated overview

---

## Next Steps

1. ✅ Run migration `017_create_chat_sessions`
2. ⏳ (Optional) Run migration `018_drop_chatkit_sessions` if safe
3. ⏳ Integrate session creation in conversation/request flows
4. ⏳ (Optional) Migrate frontend to use `/api/chat-sessions`
5. ⏳ Set up scheduled cleanup for archived sessions

---

## Notes

- The current `/api/requests` endpoint continues to work
- Chat sessions table is ready for use but not required immediately
- Sessions can be created retroactively if needed
- Trip ID filtering is available via `/api/chat-sessions?trip_id=xxx`

---

**Status**: ✅ Implementation complete. Database ready. API endpoint available. Optional migration path documented.
