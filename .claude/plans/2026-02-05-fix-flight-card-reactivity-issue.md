# Fix Flight Card Reactivity Issue

## Problem Summary

The flight card component in the sidebar does not display updated flight information automatically - it only shows updated data after being clicked. This indicates a reactivity/data synchronization problem.

## Root Cause Analysis

After thorough investigation, the root cause is a **disconnected update cycle** in the data flow:

### Current Data Flow:
```
page.tsx (chatSessions state)
    ├── ChatSidebar receives chatSessions as props
    │   └── FlightRequestCard receives session as prop
    │
    └── ChatInterface receives activeChat as prop
        └── useRFQPolling / handleTripIdSubmit updates data
            └── onUpdateChat() called to update parent
```

### The Problem:

1. **Polling updates don't always trigger sidebar re-renders properly** - When `handleTripIdSubmit` or webhook events update flight data (RFQ flights, quotes, status), `onUpdateChat()` is called which updates `chatSessions` in `page.tsx`.

2. **React reference equality issue** - The `handleUpdateChat` function in `page.tsx:1232-1340` correctly creates new object references for `rfqFlights` and other nested properties. However, when the sidebar card renders, it may not detect changes because:
   - The FlightRequestCard receives `session` as a prop
   - React uses reference equality for shallow comparison
   - If the session object reference changes but the component doesn't re-render (due to React's reconciliation), updates appear stale

3. **Why clicking "fixes" it** - When you click on a card:
   - `handleSelectChat()` is called which sets `activeChatId`
   - This triggers a state change in page.tsx
   - React re-renders the entire component tree
   - The sidebar receives fresh props and re-renders

4. **Key insight from code analysis** - The `FlightRequestCard` component at `components/chat/flight-request-card.tsx:54-57` is a standard React component that re-renders when `session` prop changes. The issue is that the parent `ChatSidebar` may not be triggering re-renders when `chatSessions` is updated.

### Specific Code Issues:

**Issue 1: chat-sidebar.tsx renders cards without a key based on changing data**
```tsx
// Line 266-274
<FlightRequestCard
  key={session.id}  // Key is only session.id - doesn't change when data updates
  session={session}
  ...
/>
```

**Issue 2: No forced re-render mechanism when data updates**
The sidebar doesn't have any mechanism to force a re-render when specific session data (like rfqFlights or quotesReceived) changes.

## Proposed Solution

### Approach A: Add a composite key that includes changing data (Recommended)

Modify `chat-sidebar.tsx` to use a composite key that includes `lastUpdated` or `rfqsLastFetchedAt`:

```tsx
<FlightRequestCard
  key={`${session.id}-${session.rfqsLastFetchedAt || ''}-${session.rfqFlights?.length || 0}`}
  session={session}
  ...
/>
```

This forces React to re-create the component when flight data changes.

### Approach B: Force session object reference change in handleUpdateChat

In `page.tsx`, ensure the session object is fully replaced (not shallow-merged) when rfqFlights changes:

```tsx
const handleUpdateChat = (chatId: string, updates: Partial<ChatSession>) => {
  setChatSessions((prevSessions) => {
    return prevSessions.map((session) => {
      if (session.id === chatId) {
        // Create a completely new session object with spread
        // Ensure rfqFlights gets a new array reference
        return {
          ...session,
          ...updates,
          // Force new reference for nested arrays/objects
          rfqFlights: updates.rfqFlights ? [...updates.rfqFlights] : session.rfqFlights,
        }
      }
      return session
    })
  })
}
```

Note: Looking at the existing code (page.tsx:1303-1339), this is already being done. The issue is likely in React's shallow comparison at the FlightRequestCard level.

### Approach C: Use React.memo with custom comparison (Most robust)

Wrap FlightRequestCard with `React.memo` and a custom comparison function that deep-compares relevant fields:

```tsx
export const FlightRequestCard = React.memo(
  function FlightRequestCard({ session, isActive, onClick, onDelete, onCancel, onArchive }: FlightRequestCardProps) {
    // ... existing component code
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render), false otherwise
    return (
      prevProps.session.id === nextProps.session.id &&
      prevProps.session.rfqFlights?.length === nextProps.session.rfqFlights?.length &&
      prevProps.session.quotesReceived === nextProps.session.quotesReceived &&
      prevProps.session.quotesTotal === nextProps.session.quotesTotal &&
      prevProps.session.status === nextProps.session.status &&
      prevProps.session.currentStep === nextProps.session.currentStep &&
      prevProps.session.rfqsLastFetchedAt === nextProps.session.rfqsLastFetchedAt &&
      prevProps.isActive === nextProps.isActive
    )
  }
)
```

## Implementation Plan

### Step 1: Add composite key to FlightRequestCard in chat-sidebar.tsx (Quick Fix)

**File:** `components/chat-sidebar.tsx`
**Location:** Lines 266-274

Change:
```tsx
<FlightRequestCard
  key={session.id}
```

To:
```tsx
<FlightRequestCard
  key={`${session.id}-${session.rfqsLastFetchedAt || ''}-${session.quotesReceived || 0}-${session.rfqFlights?.length || 0}`}
```

### Step 2: Apply same fix to GeneralChatCard for consistency

**File:** `components/chat-sidebar.tsx`
**Location:** Lines 257-264

### Step 3: Verify handleUpdateChat creates new references (Already implemented)

**File:** `app/page.tsx`
**Location:** Lines 1303-1339

The existing code already handles this correctly with spread operators.

### Step 4: Add React.memo with custom comparison to FlightRequestCard (Optional enhancement)

**File:** `components/chat/flight-request-card.tsx`

Add memoization to prevent unnecessary re-renders and ensure re-renders happen when relevant props change.

## Verification Plan

1. **Start the dev server:** `npm run dev`
2. **Create a new flight request** in the chat interface
3. **Observe the sidebar card** - it should initially show "Pending" status
4. **Trigger RFQ updates** (submit trip ID, wait for webhook events, or simulate quote updates)
5. **Verify the sidebar card updates automatically** without needing to click on it
6. **Check console logs** for `handleUpdateChat` calls to confirm data propagation
7. **Verify no duplicate cards appear** (existing deduplication logic should still work)

## Critical Files

| File | Purpose |
|------|---------|
| `components/chat-sidebar.tsx` | Renders FlightRequestCard list - needs composite key |
| `components/chat/flight-request-card.tsx` | Card component - optionally add React.memo |
| `app/page.tsx` | State management - handleUpdateChat already handles references |
| `components/chat-interface.tsx` | Calls onUpdateChat - no changes needed |
| `lib/chat/hooks/use-rfq-polling.ts` | Polling hook - no changes needed |

## Risk Assessment

- **Low risk:** Adding composite key is a minimal change with well-understood React behavior
- **Testing:** Verify deduplication still works (tripId-based deduplication in page.tsx)
- **Performance:** React.memo optimization is optional but recommended for larger lists
