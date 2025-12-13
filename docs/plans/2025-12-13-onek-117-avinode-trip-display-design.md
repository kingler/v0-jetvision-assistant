# ONEK-117: Avinode Trip Display Component Design

**Date**: 2025-12-13
**Issue**: [ONEK-117](https://linear.app/designthru-ai/issue/ONEK-117)
**Status**: Design Complete - Ready for Implementation

## Overview

Add Trip ID and deep link display to the existing chat UI, allowing users to:

1. See their active Avinode Trip ID in the chat header and sidebar
2. Click to open the Avinode Web UI via deep link
3. View all open trips in the existing sidebar

## Design Decisions

### 1. No New Sidebar

- **Decision**: Update existing `chat-sidebar.tsx` and `chat-interface.tsx`
- **Rationale**: Maintains consistent UX, avoids UI fragmentation

### 2. Database Schema Already Complete

- **Decision**: Use existing `requests` table fields from migration 015
- **Fields available**: `avinode_trip_id`, `avinode_rfp_id`, `avinode_deep_link`
- **Rationale**: No new migration needed, data model already supports this

### 3. Persistence Strategy

- **Decision**: Supabase as source of truth + local state for UI
- **Rationale**: Trips persist across sessions; local state for fast rendering

### 4. Component Naming

- **Decision**: `avinode-trip-badge.tsx` instead of `rfq-id-input.tsx`
- **Rationale**: Better describes the component's purpose (display, not input)

## Architecture

### Data Flow

```text
FlightSearchAgent calls create_trip MCP tool
         ↓
MCP returns { trip_id, deep_link }
         ↓
Agent saves to Supabase requests table
         ↓
Frontend fetches/subscribes to request data
         ↓
ChatSession populated with tripId, deepLink
         ↓
UI renders trip badge in sidebar + header
```

### Component Structure

```text
components/
├── chat-sidebar.tsx          # Modified - add trip info to cards
├── chat-interface.tsx        # Modified - add trip badge to header
└── avinode-trip-badge.tsx    # New - reusable badge component

lib/
└── hooks/
    └── use-avinode-trips.ts  # New - fetch/subscribe to trip data
```

## Interface Changes

### ChatSession Interface Extension

```typescript
// In components/chat-sidebar.tsx
export interface ChatSession {
  // ... existing fields ...

  // Avinode trip fields (from requests table)
  tripId?: string        // → requests.avinode_trip_id
  rfqId?: string         // → requests.avinode_rfp_id
  deepLink?: string      // → requests.avinode_deep_link
}
```

## UI Components

### 1. AvinodeTripBadge Component

Reusable badge showing Trip ID with clickable deep link.

**Props:**

```typescript
interface AvinodeTripBadgeProps {
  tripId?: string
  deepLink?: string
  size?: 'sm' | 'md'
  className?: string
}
```

**Behavior:**

- Shows "No trip" when `tripId` is null/undefined
- Clicking opens `deepLink` in new tab
- Includes external link icon indicator

### 2. Chat Sidebar Card Update

Add trip info line to existing card layout:

```text
┌──────────────────────────────────┐
│ 💬 Flight Request #123           │
│    KTEB → KLAX                   │
│    8 passengers • Dec 20         │
│    ✈️ Trip: trp456789 [🔗]       │  ← NEW
│    ⏳ Requesting Quotes          │
│    ████████░░░░░ 60%             │
└──────────────────────────────────┘
```

### 3. Chat Header Update

Add trip badge next to status badges:

```text
┌─────────────────────────────────────────────────────────────┐
│ Flight Request #123                          [trp456789 🔗] │
│ KTEB → KLAX • 8 passengers • Dec 20    [Requesting Quotes ⏳]│
└─────────────────────────────────────────────────────────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `components/chat-sidebar.tsx` | Add `tripId`, `rfqId`, `deepLink` to interface; render trip line on cards |
| `components/chat-interface.tsx` | Add `AvinodeTripBadge` to header |
| `agents/implementations/flight-search-agent.ts` | Save trip data to Supabase after `create_trip` |

## Files to Create

| File | Purpose |
|------|---------|
| `components/avinode-trip-badge.tsx` | Reusable badge component |
| `lib/hooks/use-avinode-trips.ts` | Hook for trip data fetching |
| `__tests__/unit/components/avinode-trip-badge.test.tsx` | Unit tests |

## Database

**No migration needed.** Using existing fields from `015_modify_existing_tables.sql`:

```sql
-- Already in requests table:
avinode_rfp_id TEXT
avinode_trip_id TEXT
avinode_deep_link TEXT
```

## Acceptance Criteria Mapping

| Original Criteria | Implementation |
|-------------------|----------------|
| Create `components/rfq-id-input.tsx` | `components/avinode-trip-badge.tsx` |
| Manual RFQ ID entry with validation | Auto-populated from agent workflow |
| Auto-populate from `create_trip` results | FlightSearchAgent saves to DB |
| Display clickable deep link | Badge includes external link icon |
| Store active RFQ ID in state | Data from Supabase, no separate store |
| Integrate with chat interface | Header + sidebar updates |

## Testing Strategy

1. **Unit tests** for `AvinodeTripBadge` component

   - Renders trip ID correctly
   - Shows "No trip" state when empty
   - Opens deep link on click
   - Handles missing deep link gracefully

2. **Integration tests** for data flow

   - Trip data populates from Supabase
   - Real-time updates when trip is created

## Implementation Order

1. Create `AvinodeTripBadge` component with tests (TDD)
2. Extend `ChatSession` interface
3. Update `chat-sidebar.tsx` to show trip info
4. Update `chat-interface.tsx` header
5. Update `FlightSearchAgent` to save trip data
6. Create `useAvinodeTrips` hook if needed for realtime

## Out of Scope

- Manual trip ID entry (agents handle creation)
- Separate trips sidebar (use existing sidebar)
- New database tables (schema complete)

---

**Design approved**: 2025-12-13
**Ready for implementation**
