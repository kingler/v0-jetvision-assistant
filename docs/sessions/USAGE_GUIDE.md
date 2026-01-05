# Chat Sessions Usage Guide

**Purpose**: Display a list of flight request chats for logged-in users, filterable by Trip ID

---

## Overview

The `chat_sessions` table tracks chat conversation sessions tied to:
- Chat conversation threads (`conversations` table)
- Trip requests (`requests` table)
- Avinode trip IDs, RFP IDs, and RFQ IDs
- Quotes and proposals

This replaces the deprecated `chatkit_sessions` table which was used for ChatKit workflow integration.

---

## API Endpoint

### GET `/api/chat-sessions`

Lists chat sessions for the authenticated user.

**Query Parameters**:
- `trip_id` (optional): Filter sessions by Avinode trip ID
- `status` (optional): Filter by status (`active`, `paused`, `completed`, `archived`)
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

**Example Requests**:

```bash
# Get all active/paused sessions for user
GET /api/chat-sessions

# Get sessions for a specific trip
GET /api/chat-sessions?trip_id=atrip-64956150

# Get completed sessions
GET /api/chat-sessions?status=completed

# Get sessions for a trip with specific status
GET /api/chat-sessions?trip_id=atrip-64956150&status=active
```

---

## Frontend Integration

### Fetch Chat Sessions

```typescript
async function loadChatSessions(tripId?: string) {
  try {
    const url = tripId 
      ? `/api/chat-sessions?trip_id=${tripId}`
      : '/api/chat-sessions';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load chat sessions');
    }
    
    const { sessions } = await response.json();
    return sessions;
  } catch (error) {
    console.error('Error loading chat sessions:', error);
    return [];
  }
}
```

### Use in React Component (Sidebar Cards)

The chat sessions appear as cards in the sidebar (DOM: `main#main-content > div... > sidebar > cards`).

```typescript
import { useEffect, useState } from 'react';
import type { ChatSession } from '@/components/chat-sidebar';
import { chatSessionsToUIFormat } from '@/lib/utils/chat-session-to-ui';

function ChatSidebar() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      const url = selectedTripId 
        ? `/api/chat-sessions?trip_id=${selectedTripId}`
        : '/api/chat-sessions';
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Failed to load chat sessions');
        return;
      }
      
      const { sessions: sessionRows } = await response.json();
      
      // Convert database format to UI format (ChatSession)
      const uiSessions = chatSessionsToUIFormat(sessionRows);
      setSessions(uiSessions);
    }
    loadSessions();
  }, [selectedTripId]);

  return (
    <div>
      {/* Filter by trip ID */}
      <input
        type="text"
        placeholder="Filter by Trip ID"
        onChange={(e) => setSelectedTripId(e.target.value || null)}
      />
      
      {/* Display sessions as cards (matching sidebar format) */}
      {sessions.map((session) => (
        <div key={session.id} className="card">
          {/* Trip ID badge or Flight Request title */}
          {session.tripId ? (
            <AvinodeTripBadge tripId={session.tripId} deepLink={session.deepLink} />
          ) : (
            <h3>Flight Request #{session.id}</h3>
          )}
          
          {/* Route */}
          <p>{session.route}</p>
          
          {/* Passengers and date */}
          <p>{session.passengers} passengers • {session.date}</p>
          
          {/* Status badge */}
          <span>{session.status}</span>
          
          {/* Quotes count (if available) */}
          {session.quotesReceived !== undefined && session.quotesTotal !== undefined && (
            <p>Quotes {session.quotesReceived}/{session.quotesTotal}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Card Display Format** (matches sidebar):
- **Title**: Trip ID (e.g., "T6WWSV") or "Flight Request #..."
- **Status**: "Quotes 0/5", "Requesting Quotes", etc.
- **Route**: "KTEB → KVNY"
- **Passengers**: "10 passengers"
- **Date**: "2026-01-20"
- **Status Badge**: "Requesting Quotes"
- **Timestamp**: "Just now"

---

## Database Queries

### Get All Sessions for a User

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
  AND cs.status IN ('active', 'paused')
ORDER BY cs.last_activity_at DESC;
```

### Get Sessions by Trip ID

```sql
SELECT 
  cs.*,
  c.subject,
  r.*
FROM chat_sessions cs
JOIN conversations c ON c.id = cs.conversation_id
LEFT JOIN requests r ON r.id = cs.request_id
WHERE cs.avinode_trip_id = 'atrip-64956150'
  AND cs.iso_agent_id = 'agent-uuid'
ORDER BY cs.last_activity_at DESC;
```

### Get Sessions with Request Details

```sql
SELECT 
  cs.id as session_id,
  cs.avinode_trip_id,
  cs.current_step,
  cs.message_count,
  cs.quotes_received_count,
  r.departure_airport,
  r.arrival_airport,
  r.departure_date,
  r.passengers,
  c.subject as conversation_subject,
  c.message_count as conversation_message_count
FROM chat_sessions cs
LEFT JOIN requests r ON r.id = cs.request_id
LEFT JOIN conversations c ON c.id = cs.conversation_id
WHERE cs.iso_agent_id = 'agent-uuid'
  AND cs.status = 'active'
ORDER BY cs.last_activity_at DESC;
```

---

## Migration from chatkit_sessions

The `chatkit_sessions` table has been deprecated and should be dropped. The new `chat_sessions` table serves a different purpose:

**Old (chatkit_sessions)**:
- Tracked ChatKit workflow sessions
- Had `device_id`, `workflow_id`, `session_token`
- Used for ChatKit integration (no longer needed)

**New (chat_sessions)**:
- Tracks chat conversation sessions
- Linked to conversations, requests, quotes, proposals
- Includes trip IDs, RFP IDs, workflow steps
- Used for displaying user's chat history

**Migration Steps**:

1. Run migration to drop `chatkit_sessions`:
   ```bash
   supabase migration up 018_drop_chatkit_sessions
   ```

2. Update code to use `/api/chat-sessions` instead of ChatKit session endpoints

3. Ensure chat sessions are created when conversations/requests are created

---

## Session Creation

Sessions should be created when:
- A conversation is started (linked to `conversations` table)
- A trip request is created (linked to `requests` table)
- A trip is created in Avinode (update with `avinode_trip_id`)

See `lib/sessions/track-chat-session.ts` for helper functions.

---

## Utility Functions

### Convert Database Format to UI Format

The `chatSessionsToUIFormat` utility converts `chat_sessions` table data to the `ChatSession` format used by the sidebar cards:

```typescript
import { chatSessionsToUIFormat } from '@/lib/utils/chat-session-to-ui';

// After fetching from API
const { sessions: sessionRows } = await response.json();

// Convert to UI format (ChatSession[])
const uiSessions = chatSessionsToUIFormat(sessionRows);

// Use in sidebar
setChatSessions(uiSessions);
```

This ensures:
- ✅ Route format: "KTEB → KVNY"
- ✅ Date format: "Jan 20, 2026"
- ✅ Status mapping: Maps `current_step` to ChatSession status
- ✅ Workflow steps: Maps to step numbers (1-5)
- ✅ Quote counts: Uses `quotes_received_count` and `quotes_expected_count`
- ✅ Trip ID display: Uses `avinode_trip_id` for badges

## Files

- `app/api/chat-sessions/route.ts` - API endpoint for listing sessions
- `lib/sessions/track-chat-session.ts` - Session tracking utilities
- `lib/utils/chat-session-to-ui.ts` - Convert database format to UI format
- `supabase/migrations/017_create_chat_sessions.sql` - Database schema
- `supabase/migrations/018_drop_chatkit_sessions.sql` - Drop old table
- `docs/sessions/USAGE_GUIDE.md` - This file
