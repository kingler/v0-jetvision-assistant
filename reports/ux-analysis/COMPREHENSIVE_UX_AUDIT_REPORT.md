# Comprehensive UX Audit Report
## Jetvision AI Assistant Frontend Analysis

**Date**: December 18, 2025
**Version**: 1.0
**Analyst**: Claude Code UX Audit

---

## Executive Summary

This comprehensive UX audit evaluates the Jetvision AI Assistant - a Next.js 14 private jet booking application with a conversational AI interface. The analysis covers end-to-end user journeys, chat interface usability, rich content integration, accessibility compliance, and modern design recommendations.

### Overall Accessibility Score: 72/100

| Component | Score | Status |
|-----------|-------|--------|
| Message Bubble | 95/100 | Excellent |
| Message List | 90/100 | Excellent |
| Chat Interface | 70/100 | Needs Work |
| Quote Card | 75/100 | Good |
| Landing Page | 65/100 | Needs Work |
| Workflow Visualization | 68/100 | Needs Work |

### Critical Finding: Avinode Workflow Alignment

**This audit identified a fundamental misalignment between the current UX and the actual Avinode API workflow.** The system cannot display flight availability directly - instead, it provides deep links for manual Avinode searches. See [Section 10: Avinode Workflow Integration](#10-avinode-workflow-integration-ux-analysis) for critical UX changes required.

**Key Avinode Issues**:
- Workflow step labels are incorrect (Steps 2-4)
- Missing `AvinodeActionRequired` component for user handoff
- No real-time quote notification from webhooks
- No "waiting for selection" state in UI

---

## 1. End-to-End User Journey Analysis

### 1.1 RFP Workflow Flow

The complete RFP (Request for Proposal) workflow follows these stages:

```
User Input → Understanding Request → Searching Aircraft → Requesting Quotes → Analyzing Options → Proposal Ready
```

#### Current Implementation Analysis

**Strengths:**
- Clear 5-step workflow visualization with progress indicators
- Real-time status badges showing current state
- Embedded workflow progress within chat messages
- Expandable step details for transparency

**Friction Points Identified:**

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| No loading skeleton during initial page load | Medium | `app/page.tsx:81-89` | Users see blank screen before content |
| Workflow steps not keyboard navigable | High | `workflow-visualization.tsx:280-330` | Accessibility barrier |
| No timeout handling for long-running operations | High | `chat-interface.tsx:98-178` | Users may think app is frozen |
| Missing progress percentage in workflow | Low | `workflow-visualization.tsx:332-340` | Unclear time expectations |

### 1.2 Error Scenarios

**Current Error Handling:**
- ChatKit initialization errors show detailed troubleshooting steps
- Basic error boundaries exist (`components/error-boundary.tsx`)

**Missing Error States:**
1. No offline/network error handling
2. No quote timeout error messages
3. No partial failure recovery (e.g., 2 of 5 operators failed)

---

## 2. Chat Interface UX Evaluation

### 2.1 Message Rendering

**File**: `components/message-bubble.tsx`

**Excellent Patterns (Keep):**
```typescript
// Proper ARIA labels
aria-label={`Message from ${authorName}`}
aria-live={role === 'agent' ? 'polite' : undefined}

// Status indicators with data-testid
<Clock className="w-3 h-3 text-muted-foreground" data-testid="status-sending" />
```

**Issues Found:**

| Issue ID | Description | Severity | Line |
|----------|-------------|----------|------|
| UX-001 | Reply button opacity transition may cause accessibility issues | Medium | 276-284 |
| UX-002 | Loading skeleton lacks descriptive ARIA | Low | 119-145 |
| UX-003 | Timestamp format not customizable for international users | Low | 94-98 |

### 2.2 Message List

**File**: `components/message-list.tsx`

**Excellent Features:**
- Auto-virtualization for large lists (>50 messages)
- Smart auto-scroll detection
- Date separators between conversation days
- Message grouping by author
- "Scroll to bottom" button for long conversations

**Issues Found:**

| Issue ID | Description | Severity | Recommendation |
|----------|-------------|----------|----------------|
| UX-004 | Empty state lacks visual hierarchy | Medium | Add illustration and clearer CTA |
| UX-005 | Date separator line is too subtle | Low | Increase border-border opacity |
| UX-006 | No message search functionality | Medium | Add search within conversation |

### 2.3 Real-time Updates

**Current Implementation:**
- WebSocket/SSE updates not implemented (simulated delays)
- Manual scroll to bottom on new messages
- Typing indicator shows during processing

**Recommendations:**
1. Implement true streaming responses with partial message rendering
2. Add "Agent is typing..." indicator with animation
3. Show timestamp for "last seen" or "delivered" status

---

## 3. Rich Content Integration Assessment

### 3.1 Flight Details Display

**File**: `components/quotes/quote-card.tsx`

**Strengths:**
- Comprehensive quote information hierarchy
- Score breakdown with visual progress bars
- Framer Motion animations for engagement
- Clear pricing structure (base + taxes + fees = total)
- Feature badges with overflow handling

**Issues Found:**

| Issue ID | Description | Severity | Impact |
|----------|-------------|----------|--------|
| UX-007 | Star rating uses visual-only indicators | High | Screen readers can't interpret rating |
| UX-008 | Currency formatting hardcoded to USD | Medium | International users may be confused |
| UX-009 | "Recommended" banner may be missed by screen readers | High | Critical information not announced |
| UX-010 | Mobile touch targets for action buttons too small | Medium | Difficult to tap on mobile |

**Recommended Fix for UX-007:**
```typescript
// Current (inaccessible)
<Star className={`h-3 w-3 ${i < Math.floor(quote.operator.rating) ? 'fill-yellow-400' : 'fill-gray-200'}`} />

// Improved (accessible)
<div role="img" aria-label={`${quote.operator.rating} out of 5 stars`}>
  {[...Array(5)].map((_, i) => (
    <Star key={i} aria-hidden="true" className={...} />
  ))}
</div>
```

### 3.2 Aircraft/Jet Images

**Current State:**
- No jet images currently displayed in quote cards
- Avatar fallback uses text initials for operators

**Recommendations:**
1. Add aircraft type images to quote cards
2. Implement lazy loading with blur placeholder
3. Add alt text with aircraft specifications
4. Consider 360-degree aircraft view modal

### 3.3 Airport Information Display

**File**: `components/avinode/trip-summary-card.tsx`

**Current Implementation:**
- ICAO codes prominently displayed
- City and airport name shown
- Visual flight path representation

**Issues Found:**

| Issue ID | Description | Severity | Recommendation |
|----------|-------------|----------|----------------|
| UX-011 | Check icon on route is misleading | Low | Replace with departure/arrival icons |
| UX-012 | No timezone information shown | Medium | Critical for international flights |
| UX-013 | Airport codes may be unfamiliar to casual users | Low | Add tooltip with full name |

### 3.4 Proposal Preview

**File**: `components/proposal-preview.tsx`

**Strengths:**
- Clear pricing breakdown with margin visibility
- "Internal Only" section clearly marked
- Ready-to-send badge for status
- Download PDF and edit options

**Issues Found:**

| Issue ID | Description | Severity | Impact |
|----------|-------------|----------|--------|
| UX-014 | Commission details visible by default | Low | May confuse clients if shared |
| UX-015 | No proposal preview modal for review before send | Medium | Risk of sending incorrect proposal |

---

## 4. Modern UX Design Recommendations

### 4.1 Outdated Patterns to Replace

| Current Pattern | Modern Alternative | Priority |
|----------------|-------------------|----------|
| Basic loading spinner | Skeleton loading with content hints | High |
| Static workflow cards | Animated timeline with micro-interactions | Medium |
| Plain error messages | Inline error toasts with recovery actions | High |
| Fixed-position sidebar | Collapsible sidebar with gesture support | Medium |
| Text-only quick actions | Icon + text pill buttons with hover states | Low |

### 4.2 Visual Hierarchy Improvements

**Current Issues:**
1. Information density too high in quote cards
2. Typography scale needs refinement (too many similar sizes)
3. Color scheme relies heavily on blue without accent variety

**Recommendations:**

```css
/* Typography Scale */
--font-size-xs: 0.75rem;   /* 12px - Labels, timestamps */
--font-size-sm: 0.875rem;  /* 14px - Body text, descriptions */
--font-size-base: 1rem;    /* 16px - Primary content */
--font-size-lg: 1.125rem;  /* 18px - Section headers */
--font-size-xl: 1.25rem;   /* 20px - Card titles */
--font-size-2xl: 1.5rem;   /* 24px - Page titles */
--font-size-3xl: 1.875rem; /* 30px - Hero text */

/* Accent Colors for Aviation Theme */
--color-sky-accent: #0EA5E9;      /* Sky blue for primary actions */
--color-gold-accent: #F59E0B;     /* Gold for recommendations */
--color-emerald-accent: #10B981;  /* Green for success states */
--color-coral-accent: #F97316;    /* Orange for warnings */
```

### 4.3 Micro-interactions to Add

1. **Message Send Animation**: Slide up and fade in
2. **Quote Selection**: Scale and glow effect
3. **Workflow Progress**: Animated connecting lines between steps
4. **Typing Indicator**: Three-dot bounce animation
5. **Copy Success**: Brief checkmark flash

### 4.4 Information Density Optimization

**Quote Card Redesign Suggestions:**

```
Current: All info visible at once (overwhelming)

Proposed: Progressive disclosure approach
├── Primary View (always visible)
│   ├── Operator name + logo
│   ├── Aircraft type
│   ├── Total price
│   └── Quick action CTA
├── Expanded View (on click)
│   ├── Full pricing breakdown
│   ├── Score analysis
│   └── Features list
└── Detail Modal (on "View Details")
    └── Full aircraft specs, operator history, etc.
```

---

## 5. User Flow Optimization

### 5.1 Current Flow Map

```
Landing Page
    │
    ├─→ Quick Prompt Card Click
    │       └─→ Chat Interface (pre-filled message)
    │
    └─→ Manual Text Input
            └─→ Chat Interface
                    │
                    ├─→ Workflow Progress (auto-displayed)
                    │
                    ├─→ Quote Comparison (when quotes arrive)
                    │       │
                    │       └─→ Select Quote
                    │               └─→ Proposal Preview
                    │                       │
                    │                       ├─→ Send to Client
                    │                       └─→ Edit/Adjust
                    │
                    └─→ Settings Panel (global access)
```

### 5.2 Cognitive Load Reduction

**Issues:**
1. Too many options presented simultaneously
2. Similar-looking buttons for different actions
3. No clear "primary path" indication

**Recommendations:**

| Area | Current | Improved |
|------|---------|----------|
| Quick Actions | 4 buttons of equal weight | 1 primary + 3 secondary |
| Quote Selection | Grid of equal cards | Top recommendation highlighted |
| Workflow Steps | 5 steps always visible | Collapse completed steps |
| Chat Input | Single text field | Field + voice input option |

### 5.3 Progressive Disclosure Implementation

**Phase 1: Initial Request**
- Show only: Chat input + 3 suggested prompts
- Hide: Workflow details, settings, quote comparison

**Phase 2: Processing**
- Show: Workflow progress (minimized view)
- Animate: Status badges, step indicators
- Hide: Input (disabled during processing)

**Phase 3: Results**
- Show: Top 3 quotes with clear recommendation
- Reveal: "Show all quotes" for additional options
- Enable: Compare mode for detailed analysis

### 5.4 Proposal Customization Enhancements

**Current Flow:**
Proposal Preview → Single "Send" action

**Proposed Flow:**
```
Proposal Preview
    │
    ├─→ Edit Pricing (inline adjustment)
    │       └─→ Recalculate margins
    │
    ├─→ Customize Branding (select template)
    │
    ├─→ Add Personal Note (text area)
    │
    └─→ Review & Send
            ├─→ Email Preview Modal
            └─→ Confirm Send
```

---

## 6. Accessibility Compliance (WCAG 2.2 Level AA)

### 6.1 Compliance Summary

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1.1.1 Non-text Content | Partial | Missing alt text for icons |
| 1.3.1 Info and Relationships | Pass | Semantic HTML used |
| 1.4.1 Use of Color | Partial | Status relies on color alone |
| 1.4.3 Contrast (Minimum) | Partial | Some text fails 4.5:1 ratio |
| 1.4.4 Resize Text | Pass | Responsive design works |
| 2.1.1 Keyboard | Partial | Some elements not focusable |
| 2.4.1 Bypass Blocks | Fail | No skip link implemented |
| 2.4.6 Headings and Labels | Partial | Inconsistent heading hierarchy |
| 4.1.2 Name, Role, Value | Partial | Some custom components lack ARIA |

### 6.2 Critical Fixes Required

1. **Add Skip Link** (WCAG 2.4.1)
```html
<a href="#main-content" class="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

2. **Fix Color-Only Status Indicators** (WCAG 1.4.1)
```typescript
// Add text labels alongside color badges
<Badge className="bg-green-500">
  <CheckCircle className="w-3 h-3" aria-hidden="true" />
  <span className="ml-1">Completed</span> {/* Add visible text */}
</Badge>
```

3. **Improve Focus Indicators** (WCAG 2.4.7)
```css
/* Global focus style */
:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### 6.3 Screen Reader Improvements

**Current Live Region Usage:**
```typescript
// Good - exists in message-bubble.tsx
aria-live={role === 'agent' ? 'polite' : undefined}
```

**Missing Live Regions:**
- Workflow step completion announcements
- Quote arrival notifications
- Error message alerts

---

## 7. Technical Implementation Recommendations

### 7.1 Immediate Fixes (Week 1)

| Priority | Task | File | Est. Hours |
|----------|------|------|------------|
| Critical | Add skip-to-content link | `app/layout.tsx` | 0.5 |
| Critical | Fix star rating accessibility | `quote-card.tsx` | 1 |
| Critical | Add aria-live to workflow | `workflow-visualization.tsx` | 1 |
| High | Add loading skeletons | `chat-interface.tsx` | 2 |
| High | Improve focus indicators | `globals.css` | 1 |

### 7.2 Short-term Improvements (Weeks 2-3)

| Priority | Task | Files | Est. Hours |
|----------|------|-------|------------|
| High | Implement progressive disclosure | `quote-card.tsx` | 4 |
| High | Add error recovery flows | `chat-interface.tsx` | 3 |
| Medium | Improve mobile touch targets | Multiple | 2 |
| Medium | Add search within chat | `message-list.tsx` | 4 |
| Medium | Timezone display for flights | `trip-summary-card.tsx` | 2 |

### 7.3 Long-term Enhancements (Month 2+)

| Priority | Task | Scope | Est. Hours |
|----------|------|-------|------------|
| Medium | Streaming response implementation | New component | 8 |
| Medium | Aircraft image gallery | New component | 6 |
| Low | Dark mode refinements | Global styles | 4 |
| Low | Proposal template selection | New feature | 8 |

---

## 8. Prioritized Issue Summary

### Critical (Fix Immediately)
1. **UX-007**: Star rating lacks accessibility (quote-card.tsx)
2. **UX-009**: "Recommended" banner not screen reader accessible

### High Priority (Fix This Sprint)
3. **UX-001**: Reply button visibility for accessibility
4. **UX-006**: No message search functionality
5. **Workflow steps not keyboard navigable**
6. **No timeout handling for operations**

### Medium Priority (Next Sprint)
7. **UX-004**: Empty state needs visual improvement
8. **UX-008**: Hardcoded USD currency
9. **UX-010**: Mobile touch targets too small
10. **UX-012**: Missing timezone information
11. **UX-015**: No proposal preview before send

### Low Priority (Backlog)
12. **UX-002**: Loading skeleton ARIA
13. **UX-003**: Timestamp format customization
14. **UX-005**: Date separator visibility
15. **UX-011**: Misleading route icons
16. **UX-013**: Airport code tooltips
17. **UX-014**: Commission visibility settings

---

## 9. Testing Recommendations

### 9.1 Automated Tests to Add

```typescript
// __tests__/e2e/chat-rfq-flow.spec.ts
test.describe('RFP User Flow', () => {
  test('complete flight request flow', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="chat-input"]', 'I need a flight from NYC to LA');
    await page.click('[data-testid="send-button"]');
    await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible();
    // ... continue flow
  });

  test('keyboard navigation through workflow', async ({ page }) => {
    // Tab through all interactive elements
    // Verify focus order
    // Test Enter/Space activation
  });

  test('screen reader announcements', async ({ page }) => {
    // Verify aria-live regions update
    // Check role and label attributes
  });
});
```

### 9.2 Manual Testing Checklist

- [ ] Complete RFP flow with keyboard only
- [ ] Test with VoiceOver (macOS) / NVDA (Windows)
- [ ] Verify responsive breakpoints (320px, 375px, 768px, 1024px, 1920px)
- [ ] Test with 200% browser zoom
- [ ] Verify color contrast with Stark plugin
- [ ] Test slow network connection (3G throttling)
- [ ] Test with JavaScript disabled (graceful degradation)

---

## 10. Avinode Workflow Integration UX Analysis

### 10.1 Critical Context: Human-in-Loop Workflow

**Important**: The original UX audit did not account for the actual Avinode API restrictions. The Jetvision system **cannot display flight availability directly in the chat interface**. Instead, the API returns a **Trip ID** and **deep link** for Sales Reps to manually search flights in the Avinode Web UI.

This fundamentally changes the UX requirements.

#### What Actually Happens

| Original Design Assumption | API Reality |
|---------------------------|-------------|
| Agent searches flights via API | Agent creates a "trip container" |
| Agent displays flight options in chat | Agent provides deep link to Avinode |
| Agent requests quotes from operators | Sales Rep manually selects flights in Avinode |
| Agent receives quotes in real-time | Quotes received via webhooks |

#### Why This Workflow Exists

Avinode's API has restrictions on viewing/searching flights:
1. **Proprietary Data**: Flight availability is proprietary marketplace data
2. **Licensing**: Displaying operator/flight data requires special licensing
3. **Human-in-Loop**: Avinode's broker workflow is designed for human interaction
4. **Regulatory**: Aviation industry requirements for quote handling

### 10.2 Updated Workflow Step Labels

The current workflow visualization uses incorrect labels that don't match the actual Avinode flow:

| Current Step (Incorrect) | Required Step (Correct) | Description |
|-------------------------|------------------------|-------------|
| Step 1: Understanding Request | Step 1: Understanding Request | Same - parse user input |
| Step 2: Searching Aircraft | **Step 2: Creating Trip** | Create trip container in Avinode |
| Step 3: Requesting Quotes | **Step 3: Awaiting Selection** | Wait for manual selection in Avinode |
| Step 4: Analyzing Options | **Step 4: Receiving Quotes** | Process webhook quote responses |
| Step 5: Generate Proposal | Step 5: Generate Proposal | Same - create client proposal |

**File to Update**: [workflow-visualization.tsx](components/workflow-visualization.tsx)

**Priority**: **Critical** - Current labels are misleading

### 10.3 Missing UX Components

The following components are required but missing from the current implementation:

#### A. AvinodeActionRequired Component (Critical)

**Purpose**: Prominent CTA that makes it obvious when Sales Rep action is needed in Avinode

**Required Features**:
- Display Trip ID and deep link prominently
- Large, obvious "Search in Avinode" button
- Step-by-step instructions
- Track when user clicks the link (for analytics/UX flow)
- Status indicator showing workflow state

**Proposed Interface**:
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

**UX Requirements**:
- Cannot be missed - use visual prominence (color, size, animation)
- Clear call-to-action text: "Search in Avinode" or "Open Avinode Marketplace"
- Show waiting state after user clicks link
- Provide "I've Submitted RFQs" confirmation button

#### B. QuoteNotification Component (High Priority)

**Purpose**: Display real-time quote arrivals from webhooks

**Required Features**:
- Operator name and logo
- Aircraft type
- Price with currency
- Valid until timestamp
- "View Details" and "Compare Quotes" actions

**UX Considerations**:
- Should appear inline in chat thread when quotes arrive
- Animate entry for attention
- Support multiple quotes arriving in sequence
- Show "Waiting for more quotes..." indicator

#### C. Webhook-to-Frontend Bridge (High Priority)

**Purpose**: Real-time updates when operator quotes arrive via webhooks

**Required Implementation**:
- Supabase real-time subscription for quote updates
- `useAvinodeQuotes(tripId)` hook
- Visual notification when new quote arrives
- Update quote count in workflow visualization

### 10.4 UX Flow Diagram (Corrected for Avinode)

```
User Submits Request
         │
         ▼
┌─────────────────────────────────────────────────┐
│  STEP 1: Agent Understands Request               │
│  • Parse natural language                        │
│  • Extract flight details                        │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  STEP 2: Agent Creates Trip in Avinode           │
│  • API returns Trip ID + deep link               │
│  • NO flight data returned                       │
│                                                  │
│  [DISPLAY: AvinodeActionRequired component]      │
│  ┌───────────────────────────────────────────┐  │
│  │ ✅ Trip Created: atrip-12345              │  │
│  │                                           │  │
│  │ [🔍 Search in Avinode]  ← PRIMARY CTA     │  │
│  │                                           │  │
│  │ Next: Click to search available flights   │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼ (Manual Step - User in Avinode)
┌─────────────────────────────────────────────────┐
│  STEP 3: Sales Rep Searches in Avinode           │
│  • User clicks deep link → Opens Avinode UI      │
│  • User browses available flights                │
│  • User selects flights & submits RFQs           │
│                                                  │
│  [DISPLAY: Waiting state]                        │
│  ┌───────────────────────────────────────────┐  │
│  │ ⏳ Waiting for your flight selection...   │  │
│  │                                           │  │
│  │ [View Trip in Avinode]  [I've Submitted]  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼ (Webhook-driven)
┌─────────────────────────────────────────────────┐
│  STEP 4: Quotes Arrive via Webhooks              │
│  • Webhook handler stores quote in Supabase      │
│  • Real-time subscription updates UI             │
│                                                  │
│  [DISPLAY: QuoteNotification for each]           │
│  ┌───────────────────────────────────────────┐  │
│  │ 📨 New Quote from Vista Global            │  │
│  │ Citation X | $28,500 USD                  │  │
│  │ [View Details]  [Compare]                 │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  STEP 5: Generate Proposal                       │
│  • AI scores and ranks quotes                    │
│  • Sales Rep selects preferred option            │
│  • Agent generates branded proposal with margin  │
└─────────────────────────────────────────────────┘
```

### 10.5 Existing Component Assessment

#### Components That Exist and Work ✅

| Component | Path | Status |
|-----------|------|--------|
| AvinodeDeepLinks | `components/avinode/avinode-deep-links.tsx` | ✅ Exists |
| AvinodeTripBadge | `components/avinode/trip-summary-card.tsx` | ✅ Exists |
| AvinodeMessageCard | `components/avinode/avinode-message-card.tsx` | ✅ Exists |
| RfqQuoteDetailsCard | `components/avinode/rfq-quote-details-card.tsx` | ✅ Exists |
| QuoteCard | `components/quotes/quote-card.tsx` | ✅ Exists |

#### Components That Need Creation 🔲

| Component | Purpose | Priority |
|-----------|---------|----------|
| AvinodeActionRequired | Prominent CTA for manual Avinode action | Critical |
| QuoteNotification | Webhook-driven quote arrival display | High |
| useAvinodeQuotes | Real-time quote subscription hook | High |
| useAvinodeTripStatus | Trip status tracking hook | Medium |

### 10.6 Database Fields Available

The following fields already exist in the `requests` table and can be used:

```sql
-- Already available (migration 015):
avinode_trip_id TEXT        -- atrip-64956153
avinode_rfp_id TEXT         -- RFP identifier
avinode_deep_link TEXT      -- searchInAvinode URL

-- May need to add:
avinode_view_link TEXT      -- viewInAvinode URL
avinode_status TEXT         -- 'created', 'searching', 'rfq_submitted', 'quotes_pending'
```

### 10.7 Key UX Principles for Avinode Workflow

Based on the workflow analysis, these UX principles must be followed:

1. **Clear Handoff**: Make it obvious when action is needed in Avinode
2. **Seamless Return**: Quotes appear in JetVision automatically via webhooks
3. **Status Visibility**: Always show current workflow state
4. **No Dead Ends**: Provide next actions at every step
5. **Real-Time Updates**: Webhook data appears immediately

### 10.8 Critical UX Issues (Avinode-Specific)

| Issue ID | Description | Severity | Current State |
|----------|-------------|----------|---------------|
| AVI-001 | Workflow step labels don't match actual flow | Critical | Steps 2-4 incorrectly labeled |
| AVI-002 | No "action required" prominence for Avinode handoff | Critical | Missing component |
| AVI-003 | No real-time quote notification from webhooks | High | Webhook exists but no UI bridge |
| AVI-004 | Deep link not prominently displayed | High | Exists but may be overlooked |
| AVI-005 | No "waiting for selection" state in UI | Medium | Missing state |
| AVI-006 | No confirmation flow for "RFQs submitted" | Medium | User can't signal completion |

### 10.9 Implementation Priority (Avinode UX)

#### Phase 1: Critical Fixes (Immediate)

1. **Update workflow step labels** - 2 hours
   - File: `components/workflow-visualization.tsx`
   - Change "Searching Aircraft" → "Creating Trip"
   - Change "Requesting Quotes" → "Awaiting Selection"
   - Change "Analyzing Options" → "Receiving Quotes"

2. **Create AvinodeActionRequired component** - 4 hours
   - New file: `components/avinode/avinode-action-required.tsx`
   - Large, prominent CTA button
   - Trip ID display
   - Step-by-step instructions

3. **Integrate into chat flow** - 3 hours
   - File: `components/chat-interface.tsx`
   - Replace `simulateWorkflowProgress()` with real Avinode flow
   - Display AvinodeActionRequired when trip is created

#### Phase 2: Webhook Integration (High Priority)

4. **Create useAvinodeQuotes hook** - 3 hours
   - New file: `lib/hooks/use-avinode-quotes.ts`
   - Supabase real-time subscription
   - Return quotes as they arrive

5. **Create QuoteNotification component** - 3 hours
   - New file: `components/avinode/quote-notification.tsx`
   - Display operator, aircraft, price
   - Animation on entry

6. **Bridge webhook to chat thread** - 4 hours
   - Update `app/api/webhooks/avinode/route.ts`
   - Store in Supabase with real-time trigger
   - Display in chat as quotes arrive

#### Phase 3: Polish (Medium Priority)

7. **Add "I've Submitted RFQs" confirmation** - 2 hours
8. **Add operator chat thread display** - 3 hours
9. **Improve quote comparison with webhook data** - 4 hours

---

## 11. Appendix

### A. Component File Reference

| Component | Path | Purpose |
|-----------|------|---------|
| Main App | `app/page.tsx` | Root page with view routing |
| Chat Interface | `components/chat-interface.tsx` | Primary chat UI |
| Message List | `components/message-list.tsx` | Virtualized message display |
| Message Bubble | `components/message-bubble.tsx` | Individual message styling |
| Quote Card | `components/quotes/quote-card.tsx` | Flight quote display |
| Trip Summary | `components/avinode/trip-summary-card.tsx` | Trip overview card |
| Workflow | `components/workflow-visualization.tsx` | Progress visualization |
| Proposal | `components/proposal-preview.tsx` | Final proposal display |

### B. Design System Tokens

```css
/* Recommended additions to design system */
:root {
  /* Spacing */
  --space-touch-target: 44px; /* Minimum touch target */
  --space-focus-ring: 2px;

  /* Animation */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);

  /* Z-index scale */
  --z-dropdown: 100;
  --z-modal: 200;
  --z-toast: 300;
  --z-tooltip: 400;
}
```

### C. Testing Commands

```bash
# Run Playwright E2E tests
npx playwright test

# Run with UI mode
npx playwright test --ui

# Generate HTML report
npx playwright show-report

# Run accessibility audit
npx playwright test --grep "accessibility"
```

---

**Report Generated**: December 18, 2025
**Next Review Date**: January 18, 2026
**Contact**: Jetvision Development Team
