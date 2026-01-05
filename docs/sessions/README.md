# Chat Session Tracking

Chat conversation sessions tied to trip requests, RFQs, and proposals are tracked in the Supabase database.

## Overview

Chat session tracking provides:
- ✅ Conversation session tracking (tied to conversations table)
- ✅ Trip request linking (trip IDs, RFP IDs, RFQ IDs)
- ✅ Quote and proposal tracking
- ✅ Workflow step tracking (understanding_request → requesting_quotes → proposal_ready)
- ✅ Activity monitoring
- ✅ Session statistics (message count, quotes received, etc.)

## Quick Links

- **[Implementation Guide](./CHAT_SESSION_TRACKING.md)** - Complete technical documentation
- **[Database Migration](../supabase/migrations/017_create_chat_sessions.sql)** - SQL schema

## Database Table

**Table**: `chat_sessions`

Sessions are linked to:
- `conversations` (chat conversation thread)
- `requests` (trip request)
- `quotes` (primary quote being discussed)
- `proposals` (generated proposal)

Key fields:
- `conversation_id` - Links to conversations table
- `request_id` - Links to requests table (trip request)
- `avinode_trip_id` - Avinode trip ID
- `avinode_rfp_id` - Avinode RFP ID
- `avinode_rfq_id` - Avinode RFQ ID
- `primary_quote_id` - Primary quote being discussed
- `proposal_id` - Generated proposal
- `current_step` - Current workflow step
- `workflow_state` - Full workflow state (JSONB)

## Setup

1. **Run Migrations**:
   ```bash
   # Create chat_sessions table
   supabase migration up 017_create_chat_sessions
   
   # Drop deprecated chatkit_sessions table (optional)
   supabase migration up 018_drop_chatkit_sessions
   ```

2. **Use API Endpoint**:
   - `GET /api/chat-sessions` - List sessions for logged-in user
   - `GET /api/chat-sessions?trip_id=xxx` - Filter by Trip ID
   - See [Usage Guide](./USAGE_GUIDE.md) for details

3. **Integrate in Application Code**:
   - Chat API routes - Create/update sessions
   - Trip creation - Update with trip IDs
   - Quote reception - Update with quote info
   - Proposal generation - Update with proposal ID

See [Implementation Guide](./CHAT_SESSION_TRACKING.md) and [Usage Guide](./USAGE_GUIDE.md) for details.

## Usage

```typescript
import {
  createOrUpdateChatSession,
  updateChatSessionWithTripInfo,
  updateChatSessionWithQuote,
  completeChatSession,
} from '@/lib/sessions/track-chat-session';

// Create session
const session = await createOrUpdateChatSession({
  conversation_id: conversationId,
  request_id: requestId,
  iso_agent_id: isoAgentId,
  status: 'active',
  current_step: 'understanding_request',
});

// Update with trip info
await updateChatSessionWithTripInfo(session.id, {
  avinode_trip_id: 'atrip-64956150',
  avinode_rfp_id: 'rfp-123',
  current_step: 'requesting_quotes',
});

// Update with quote
await updateChatSessionWithQuote(session.id, quoteId, {
  quotes_received_count: 3,
});

// Complete session
await completeChatSession(session.id);
```

## Files

- `supabase/migrations/017_create_chat_sessions.sql` - Database schema
- `supabase/migrations/018_drop_chatkit_sessions.sql` - Drop deprecated table
- `app/api/chat-sessions/route.ts` - API endpoint for listing sessions
- `lib/sessions/track-chat-session.ts` - Session tracking utilities
- `docs/sessions/CHAT_SESSION_TRACKING.md` - Technical documentation
- `docs/sessions/USAGE_GUIDE.md` - Usage guide with examples
- `docs/sessions/README.md` - This file

---

**Note**: This tracks chat conversation sessions (conversations → trip requests → RFQs → proposals), not user login sessions.
