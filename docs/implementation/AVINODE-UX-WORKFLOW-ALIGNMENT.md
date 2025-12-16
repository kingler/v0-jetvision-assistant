# Avinode API Workflow - Frontend UX Alignment

**Date**: 2025-12-16
**Status**: Analysis Complete
**Branch**: `claude/update-avinode-api-integration-nlUeM`

---

## Executive Summary

Due to Avinode API restrictions, the JetVision Assistant cannot display flight availability directly in the chat interface. Instead, the API returns a **Trip ID** and **deep link** for Sales Reps to manually search flights in the Avinode Web UI. This document outlines the required frontend UX changes to align with this workflow.

---

## The New Avinode Workflow

### What Changed

| Before (Original Design) | After (API Reality) |
|--------------------------|---------------------|
| Agent searches flights via API | Agent creates a "trip container" |
| Agent displays flight options in chat | Agent provides deep link to Avinode |
| Agent requests quotes from operators | Sales Rep manually selects flights in Avinode |
| Agent receives quotes in real-time | Quotes received via webhooks |

### Why This Workflow Exists

Avinode's API has **restrictions on viewing/searching flights**:

1. **Proprietary Data**: Flight availability is proprietary marketplace data
2. **Licensing**: Displaying operator/flight data requires special licensing
3. **Human-in-Loop**: Avinode's broker workflow is designed for human interaction
4. **Regulatory**: Aviation industry requirements for quote handling

### API Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: User Submits Request                                       │
│  ─────────────────────────────────────────────────────────────────  │
│  User: "I need a flight from Teterboro to Miami, Dec 20, 6 pax"     │
│                                                                     │
│  ↓                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Agent Creates Trip in Avinode                              │
│  ─────────────────────────────────────────────────────────────────  │
│  Agent calls: POST /trips with flight criteria                      │
│  API returns: { tripId: "atrip-12345", deepLink: "https://..." }    │
│                                                                     │
│  Agent displays:                                                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ✅ Trip Created: atrip-12345                                   │ │
│  │                                                                │ │
│  │ [🔍 Search in Avinode]  ← PRIMARY ACTION (opens new tab)       │ │
│  │                                                                │ │
│  │ Next: Click the button above to search for available flights  │ │
│  │ in the Avinode Marketplace.                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Sales Rep Searches in Avinode (Manual)                     │
│  ─────────────────────────────────────────────────────────────────  │
│  Sales Rep clicks deep link → Opens Avinode Web UI                  │
│  Sales Rep enters/confirms flight details                           │
│  Sales Rep browses available flights from operators                 │
│  Sales Rep selects one or more flights                              │
│  Sales Rep submits RFQ to operators                                 │
│                                                                     │
│  JetVision shows:                                                   │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ⏳ Waiting for your flight selection in Avinode               │ │
│  │                                                                │ │
│  │ Once you've selected flights and submitted RFQs to operators, │ │
│  │ I'll receive their responses here automatically.              │ │
│  │                                                                │ │
│  │ [View Trip in Avinode]  [I've Submitted RFQs]                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Operator Responds (Webhook-Driven)                         │
│  ─────────────────────────────────────────────────────────────────  │
│  Operator sees RFQ in Avinode → Submits quote                       │
│  Avinode sends webhook: TripRequestSellerResponse                   │
│  JetVision processes webhook → Stores quote in database             │
│                                                                     │
│  JetVision displays:                                                │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 📨 New Quote Received from Vista Global                       │ │
│  │                                                                │ │
│  │ Aircraft: Citation X | Price: $28,500 USD                     │ │
│  │ Operator: Vista Global (★★★★☆)                                │ │
│  │ Valid Until: Dec 22, 2025                                     │ │
│  │                                                                │ │
│  │ [View Details]  [Compare Quotes]                              │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: Review & Generate Proposal                                 │
│  ─────────────────────────────────────────────────────────────────  │
│  Sales Rep reviews quotes                                           │
│  Agent scores and ranks quotes                                      │
│  Sales Rep selects preferred quote                                  │
│  Agent generates client proposal with margin                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Required Frontend UX Changes

### 1. Update Workflow Visualization States

**File**: `components/workflow-visualization.tsx`

Current workflow steps are flight-search centric. Update to reflect the new human-in-loop workflow:

| Current Step | New Step | Description |
|--------------|----------|-------------|
| Step 1: Understanding Request | Step 1: Understanding Request | Same - parse user input |
| Step 2: Searching Aircraft | Step 2: Creating Trip | Create trip container in Avinode |
| Step 3: Requesting Quotes | Step 3: Awaiting Selection | Wait for manual selection in Avinode |
| Step 4: Analyzing Options | Step 4: Receiving Quotes | Process webhook quote responses |
| Step 5: Generate Proposal | Step 5: Generate Proposal | Same - create client proposal |

### 2. Create New "Avinode Action Required" Component

**File**: `components/avinode/avinode-action-required.tsx`

A prominent component that:
- Displays the Trip ID and deep link
- Has a large, obvious CTA button for "Search in Avinode"
- Shows step-by-step instructions
- Tracks when user clicks the link (for analytics/UX flow)

```typescript
interface AvinodeActionRequiredProps {
  tripId: string;
  searchLink: string;
  viewLink: string;
  status: 'pending' | 'searching' | 'selected' | 'quotes_received';
  instructions: string[];
  onSearchClick?: () => void;
  onMarkComplete?: () => void;
}
```

### 3. Update ChatSession Interface

**File**: `components/chat-sidebar.tsx`

Add new fields to track Avinode workflow state:

```typescript
export interface ChatSession {
  // ... existing fields ...

  // Avinode trip tracking
  tripId?: string;              // atrip-64956153
  deepLink?: string;            // searchInAvinode URL
  viewLink?: string;            // viewInAvinode URL

  // Workflow state
  avinodeStatus?: 'created' | 'searching' | 'rfq_submitted' | 'quotes_pending' | 'quotes_received';
  rfqsSubmittedAt?: Date;
  quotesReceived?: QuoteFromWebhook[];
}
```

### 4. Implement Webhook-to-Frontend Bridge

**Files**:
- `app/api/webhooks/avinode/route.ts` (update)
- `lib/hooks/use-avinode-quotes.ts` (new)
- `lib/types/avinode-webhooks.ts` (update)

The webhook handler needs to:
1. Store quote data in Supabase
2. Update the request status
3. Trigger real-time updates to frontend

```typescript
// use-avinode-quotes.ts
export function useAvinodeQuotes(tripId: string) {
  // Subscribe to Supabase real-time updates for this trip
  // Returns quotes as they arrive via webhook
}
```

### 5. Update Chat Interface Message Flow

**File**: `components/chat-interface.tsx`

Replace the simulated workflow with real Avinode integration:

```typescript
// Current: simulateWorkflowProgress()
// New: handleAvinodeTripCreation()

const handleAvinodeTripCreation = async (flightRequest: FlightRequest) => {
  // 1. Call API to create trip via MCP
  const tripResult = await createAvinodeTrip(flightRequest);

  // 2. Update chat with trip info and deep link
  onUpdateChat(activeChat.id, {
    tripId: tripResult.tripId,
    deepLink: tripResult.actions.searchInAvinode.href,
    viewLink: tripResult.actions.viewInAvinode.href,
    avinodeStatus: 'created',
  });

  // 3. Display action-required component
  addAgentMessage({
    content: "I've created a trip in Avinode. Click below to search for available flights.",
    showAvinodeAction: true,
  });
};
```

### 6. Add Quote Notification Component

**File**: `components/avinode/quote-notification.tsx`

When webhooks deliver operator quotes:

```typescript
interface QuoteNotificationProps {
  quote: {
    operatorName: string;
    aircraftType: string;
    price: { amount: number; currency: string };
    validUntil: string;
  };
  onViewDetails: () => void;
  onCompare: () => void;
}
```

### 7. Update Message Renderer Types

**File**: `components/message-components/types.ts`

Add new component types:

```typescript
type MessageComponent =
  | TextComponent
  | QuoteCardComponent
  // ... existing types ...
  | AvinodeActionRequiredComponent  // NEW
  | QuoteNotificationComponent      // NEW
  | AvinodeStatusUpdateComponent    // NEW
```

---

## Implementation Priority

### Phase 1: Core Workflow (High Priority)

1. ✅ `AvinodeDeepLinks` component exists
2. ✅ `AvinodeTripBadge` component exists
3. 🔲 Create `AvinodeActionRequired` component
4. 🔲 Update workflow visualization states
5. 🔲 Update chat interface for trip creation flow

### Phase 2: Webhook Integration (High Priority)

1. ✅ Webhook handler exists (needs enhancement)
2. 🔲 Store webhook data in Supabase
3. 🔲 Create real-time subscription hook
4. 🔲 Create quote notification component
5. 🔲 Bridge webhook events to chat thread

### Phase 3: UX Polish (Medium Priority)

1. 🔲 Add progress tracking for Avinode actions
2. 🔲 Create operator message display in chat
3. 🔲 Add quote comparison from webhook data
4. 🔲 Implement proposal generation with real quotes

---

## Component Mapping

| Workflow Stage | Component(s) | Status |
|----------------|--------------|--------|
| Trip Created | `AvinodeDeepLinks`, `AvinodeTripBadge` | ✅ Exists |
| Awaiting Selection | `AvinodeActionRequired` | 🔲 Needed |
| Operator Messages | `AvinodeChatThread`, `AvinodeMessageCard` | ✅ Exists |
| Quote Received | `RfqQuoteDetailsCard`, `QuoteCard` | ✅ Exists |
| Quote Comparison | `QuoteComparison` | ✅ Exists |

---

## Database Schema Requirements

The following fields already exist in the `requests` table (migration 015):

```sql
-- Already available:
avinode_trip_id TEXT
avinode_rfp_id TEXT
avinode_deep_link TEXT

-- May need to add:
avinode_view_link TEXT
avinode_status TEXT  -- 'created', 'searching', 'rfq_submitted', 'quotes_pending'
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `components/workflow-visualization.tsx` | Update step labels and states |
| `components/chat-interface.tsx` | Replace simulated workflow with real Avinode flow |
| `components/chat-sidebar.tsx` | Extend ChatSession interface |
| `app/api/webhooks/avinode/route.ts` | Store data in Supabase, trigger real-time |
| `components/message-components/types.ts` | Add new component types |
| `components/message-components/message-renderer.tsx` | Add new component renderers |

## Files to Create

| File | Purpose |
|------|---------|
| `components/avinode/avinode-action-required.tsx` | Prominent CTA for Avinode action |
| `components/avinode/quote-notification.tsx` | Webhook quote notification display |
| `lib/hooks/use-avinode-quotes.ts` | Real-time quote subscription |
| `lib/hooks/use-avinode-trip-status.ts` | Trip status tracking |

---

## User Journey Summary

### For Sales Reps

1. **Submit Request** → Chat with Jetvision Agent about flight needs
2. **Get Deep Link** → Agent provides prominent button to open Avinode
3. **Search in Avinode** → Manually browse flights, select options
4. **Submit RFQs** → Request quotes from operators in Avinode
5. **Communicate** → Use Avinode chat with operators if needed
6. **Return to JetVision** → Quotes appear automatically via webhooks
7. **Review & Select** → Compare quotes, select preferred option
8. **Generate Proposal** → Agent creates client-ready proposal

### Key UX Principles

1. **Clear Handoff**: Make it obvious when action is needed in Avinode
2. **Seamless Return**: Quotes appear in JetVision automatically
3. **Status Visibility**: Always show current workflow state
4. **No Dead Ends**: Provide next actions at every step
5. **Real-Time Updates**: Webhook data appears immediately

---

## Next Steps

1. **Create feature branch** for implementation
2. **Start with Phase 1** - Core workflow components
3. **Test webhook integration** with Avinode sandbox
4. **Implement Phase 2** - Real-time quote notifications
5. **Polish UX** - Ensure smooth user experience

---

**Document Version**: 1.0
**Last Updated**: 2025-12-16
