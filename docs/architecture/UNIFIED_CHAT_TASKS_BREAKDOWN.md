# Unified Chat Interface - Task Breakdown

**Project**: Unified Chat Interface Migration
**Epic**: DES-120 (Unified Chat Interface)
**Timeline**: 2 weeks
**Priority**: High

---

## Epic Structure

```
DES-120: Unified Chat Interface
├── Phase 1: Chat Interface Enhancement (1 week)
│   ├── DES-121: Message Component System
│   ├── DES-122: Interactive Action Buttons
│   ├── DES-123: Conversational RFP Flow
│   └── DES-124: Rich Message Renderer
├── Phase 2: Backend Integration (3 days)
│   ├── DES-125: Chat API Enhancement
│   ├── DES-126: Orchestrator Agent Updates
│   └── DES-127: Conversation State Manager
├── Phase 3: UI Migration (1 day)
│   ├── DES-128: Archive Dashboard Pages
│   ├── DES-129: Routing Updates
│   └── DES-130: Navigation Removal
└── Phase 4: Testing & Polish (2 days)
    ├── DES-131: E2E Chat Testing
    ├── DES-132: Mobile Responsiveness
    └── DES-133: Accessibility Audit
```

---

## Phase 1: Chat Interface Enhancement

### DES-121: Message Component System

**Epic**: DES-120
**Type**: Feature
**Priority**: High
**Estimate**: 8 points
**Assignee**: Frontend Developer

**Description**:
Create a rich message component system that allows rendering different types of content inline within chat messages (quote cards, proposals, workflow status, etc.)

**Acceptance Criteria**:
- [ ] Create `MessageComponent` TypeScript type union
- [ ] Implement base message renderer component
- [ ] Support 9 message component types:
  - [ ] `text` - Standard text messages
  - [ ] `quote_card` - Single quote display
  - [ ] `quote_comparison` - Multiple quotes side-by-side
  - [ ] `workflow_status` - Workflow progress indicator
  - [ ] `proposal_preview` - Embedded proposal view
  - [ ] `action_buttons` - Quick-reply buttons
  - [ ] `form_field` - Inline form inputs
  - [ ] `file_attachment` - File previews/downloads
  - [ ] `progress_indicator` - Loading/progress bars
- [ ] Write unit tests for each component type
- [ ] Document component API

**Files to Create/Modify**:
- `components/message-components/types.ts` (new)
- `components/message-components/message-renderer.tsx` (new)
- `components/message-components/index.ts` (new)
- `__tests__/unit/components/message-renderer.test.tsx` (new)

**Dependencies**: None

---

### DES-122: Interactive Action Buttons

**Epic**: DES-120
**Type**: Feature
**Priority**: High
**Estimate**: 5 points
**Assignee**: Frontend Developer

**Description**:
Implement interactive quick-reply button system for inline user responses (passenger count, aircraft type, yes/no, etc.)

**Acceptance Criteria**:
- [ ] Create `ActionButtons` component
- [ ] Support multiple button layouts (horizontal, vertical, grid)
- [ ] Handle button click events with callback
- [ ] Visual states: default, hover, active, disabled
- [ ] Keyboard navigation support
- [ ] Integrate with chat message system
- [ ] Write component tests

**Subtasks**:
1. Design button component API
2. Implement layout variants
3. Add click handlers and state management
4. Style buttons (hover, active, disabled states)
5. Add keyboard navigation (Tab, Enter, Space)
6. Write unit tests
7. Add Storybook stories

**Files to Create/Modify**:
- `components/message-components/action-buttons.tsx` (new)
- `components/message-components/action-button.tsx` (new)
- `__tests__/unit/components/action-buttons.test.tsx` (new)

**Dependencies**: DES-121

---

### DES-123: Conversational RFP Flow

**Epic**: DES-120
**Type**: Feature
**Priority**: High
**Estimate**: 13 points
**Assignee**: Full-stack Developer

**Description**:
Implement progressive disclosure RFP gathering flow where agent asks one question at a time and builds RFP data conversationally

**Acceptance Criteria**:
- [ ] Define RFP gathering flow (5 steps)
- [ ] Implement conversation state tracker
- [ ] Handle natural language responses
- [ ] Extract structured data from user input
- [ ] Track missing vs completed fields
- [ ] Generate contextual follow-up questions
- [ ] Support going back to previous questions
- [ ] Validate data at each step
- [ ] Write integration tests

**RFP Gathering Steps**:
1. Route (departure + arrival airports)
2. Date (departure + optional return)
3. Passengers (count)
4. Aircraft preference (optional)
5. Budget/special requirements (optional)

**Subtasks**:
1. Create conversation flow state machine
2. Implement NLP intent extraction (use GPT-4)
3. Build field validation logic
4. Create contextual question generator
5. Add data extraction from freeform text
6. Implement "go back" functionality
7. Add progress indicator
8. Write integration tests
9. Add error handling for invalid inputs

**Files to Create/Modify**:
- `lib/conversation/rfp-flow.ts` (new)
- `lib/conversation/intent-extractor.ts` (new)
- `lib/conversation/field-validator.ts` (new)
- `components/chat-interface.tsx` (modify)
- `__tests__/integration/rfp-flow.test.ts` (new)

**Dependencies**: DES-121, DES-122

---

### DES-124: Rich Message Renderer

**Epic**: DES-120
**Type**: Feature
**Priority**: High
**Estimate**: 8 points
**Assignee**: Frontend Developer

**Description**:
Create unified message renderer that handles all message types and renders appropriate components inline

**Acceptance Criteria**:
- [ ] Implement `MessageRenderer` component
- [ ] Route messages to correct component based on type
- [ ] Support mixed content (text + components)
- [ ] Handle message threading/replies
- [ ] Optimize rendering performance (virtualization)
- [ ] Add loading states for async components
- [ ] Support markdown in text messages
- [ ] Write snapshot tests

**Subtasks**:
1. Create base MessageRenderer component
2. Implement type routing logic
3. Add markdown support (react-markdown)
4. Implement message virtualization (react-window)
5. Add loading skeletons
6. Style message bubbles (user vs agent)
7. Add timestamp display
8. Write snapshot tests

**Files to Create/Modify**:
- `components/message-renderer.tsx` (new)
- `components/message-bubble.tsx` (new)
- `lib/markdown-renderer.ts` (new)
- `__tests__/unit/components/message-renderer.test.tsx` (new)

**Dependencies**: DES-121, DES-122

---

## Phase 2: Backend Integration

### DES-125: Chat API Enhancement

**Epic**: DES-120
**Type**: Backend
**Priority**: High
**Estimate**: 8 points
**Assignee**: Backend Developer

**Description**:
Enhance `/api/chat/message` endpoint to support rich message components, conversation state, and structured responses

**Acceptance Criteria**:
- [ ] Update API request schema (add context, action)
- [ ] Update API response schema (add components, suggestedActions)
- [ ] Implement conversation state persistence
- [ ] Add support for component rendering
- [ ] Handle workflow integration
- [ ] Add error handling for malformed requests
- [ ] Write API integration tests
- [ ] Document API changes

**API Schema**:

**Request**:
```typescript
{
  threadId: string
  message: string
  context?: {
    rfpData?: Partial<RFPData>
    selectedQuote?: string
    action?: 'submit_rfp' | 'select_quote' | 'request_proposal'
  }
}
```

**Response**:
```typescript
{
  messages: ChatMessage[]
  components: MessageComponent[]
  workflow?: WorkflowStatus
  suggestedActions?: Action[]
}
```

**Subtasks**:
1. Update API route handler
2. Add request validation (Zod schema)
3. Implement conversation state storage (Redis/Supabase)
4. Add component serialization
5. Integrate with agent orchestrator
6. Add rate limiting
7. Write integration tests
8. Update API documentation

**Files to Create/Modify**:
- `app/api/chat/message/route.ts` (modify)
- `lib/api/schemas/chat.ts` (new)
- `lib/conversation/state-manager.ts` (new)
- `__tests__/integration/api/chat.test.ts` (new)

**Dependencies**: None

---

### DES-126: Orchestrator Agent Updates

**Epic**: DES-120
**Type**: Backend
**Priority**: High
**Estimate**: 13 points
**Assignee**: Backend Developer

**Description**:
Update OrchestratorAgent to support conversational interactions, progressive data extraction, and rich component responses

**Acceptance Criteria**:
- [ ] Add natural language intent parsing
- [ ] Implement progressive data extraction
- [ ] Generate contextual questions
- [ ] Track conversation state (fields gathered, missing)
- [ ] Return structured responses with components
- [ ] Support suggested quick replies
- [ ] Handle ambiguous input
- [ ] Add conversation memory (track previous exchanges)
- [ ] Write agent unit tests

**Subtasks**:
1. Add GPT-4 prompt for intent classification
2. Implement data extraction logic (airports, dates, numbers)
3. Create question generation engine
4. Add conversation state tracking
5. Build component response formatter
6. Implement suggested actions generator
7. Add context-aware response logic
8. Write unit tests for each capability
9. Add error handling for unclear inputs

**Files to Create/Modify**:
- `agents/implementations/orchestrator-agent.ts` (modify)
- `agents/tools/intent-parser.ts` (new)
- `agents/tools/data-extractor.ts` (new)
- `agents/tools/question-generator.ts` (new)
- `__tests__/unit/agents/orchestrator-conversation.test.ts` (new)

**Dependencies**: DES-125

---

### DES-127: Conversation State Manager

**Epic**: DES-120
**Type**: Backend
**Priority**: Medium
**Estimate**: 5 points
**Assignee**: Backend Developer

**Description**:
Create conversation state management system to track RFP data, conversation history, and workflow status across messages

**Acceptance Criteria**:
- [ ] Define ConversationState interface
- [ ] Implement state persistence (Supabase)
- [ ] Add state retrieval by threadId
- [ ] Support partial updates
- [ ] Track field completion status
- [ ] Store conversation history
- [ ] Add state cleanup (old conversations)
- [ ] Write state manager tests

**State Schema**:
```typescript
interface ConversationState {
  threadId: string
  userId: string
  messages: Message[]
  currentRfp: Partial<RFPData>
  missingFields: string[]
  currentStage: 'gathering' | 'searching' | 'reviewing' | 'booking'
  quotes: Quote[]
  selectedQuote?: string
  workflow?: WorkflowStatus
  createdAt: Date
  updatedAt: Date
}
```

**Subtasks**:
1. Create Supabase table schema
2. Implement state CRUD operations
3. Add field completion tracking
4. Create state migration helper
5. Add TTL for old conversations
6. Write unit tests
7. Add migration script

**Files to Create/Modify**:
- `lib/conversation/state-manager.ts` (new)
- `supabase/migrations/010_conversation_state.sql` (new)
- `__tests__/unit/lib/conversation-state.test.ts` (new)

**Dependencies**: DES-125

---

## Phase 3: UI Migration

### DES-128: Archive Dashboard Pages

**Epic**: DES-120
**Type**: Refactor
**Priority**: Medium
**Estimate**: 3 points
**Assignee**: Frontend Developer

**Description**:
Move all existing dashboard pages to `_archived/` folder and update imports/references

**Acceptance Criteria**:
- [ ] Move `/dashboard` pages to `/app/_archived/dashboard/`
- [ ] Update imports in other files
- [ ] Remove dashboard route from sitemap
- [ ] Add redirect from old routes to `/chat`
- [ ] Update documentation
- [ ] Verify no broken references
- [ ] Create migration guide

**Files to Archive**:
```
app/dashboard/page.tsx → app/_archived/dashboard/page.tsx
app/dashboard/new-request/page.tsx → app/_archived/dashboard/new-request/page.tsx
app/dashboard/quotes/page.tsx → app/_archived/dashboard/quotes/page.tsx
app/dashboard/requests/page.tsx → app/_archived/dashboard/requests/page.tsx (if exists)
app/dashboard/clients/page.tsx → app/_archived/dashboard/clients/page.tsx (if exists)
```

**Subtasks**:
1. Create `app/_archived/dashboard/` directory
2. Move all dashboard page files
3. Search for imports referencing old pages
4. Update or remove broken imports
5. Add migration guide document
6. Commit with clear message

**Files to Create/Modify**:
- `app/_archived/dashboard/**` (move)
- `docs/MIGRATION_GUIDE.md` (new)

**Dependencies**: DES-121, DES-122, DES-123, DES-124

---

### DES-129: Routing Updates

**Epic**: DES-120
**Type**: Backend
**Priority**: High
**Estimate**: 3 points
**Assignee**: Full-stack Developer

**Description**:
Update Next.js routing to redirect all dashboard paths to `/chat` and establish chat as the primary application route

**Acceptance Criteria**:
- [ ] Add middleware redirect for `/dashboard/*` → `/chat`
- [ ] Update root page to redirect to `/chat`
- [ ] Remove dashboard from app router
- [ ] Update navigation links
- [ ] Add 301 redirects for SEO
- [ ] Test all redirect paths
- [ ] Update sitemap

**Subtasks**:
1. Create/update middleware.ts with redirects
2. Update root page.tsx
3. Remove dashboard layout if exists
4. Update navigation components
5. Test redirect chains
6. Add redirect tests
7. Update sitemap.xml

**Files to Create/Modify**:
- `middleware.ts` (modify/create)
- `app/page.tsx` (modify)
- `app/layout.tsx` (modify)
- `__tests__/integration/routing.test.ts` (new)

**Dependencies**: DES-128

---

### DES-130: Navigation Removal

**Epic**: DES-120
**Type**: Refactor
**Priority**: Low
**Estimate**: 2 points
**Assignee**: Frontend Developer

**Description**:
Remove or simplify navigation components since chat is now the only interface

**Acceptance Criteria**:
- [ ] Remove dashboard navigation sidebar
- [ ] Remove page header navigation
- [ ] Keep minimal header (logo, user menu)
- [ ] Remove breadcrumbs
- [ ] Update mobile navigation
- [ ] Clean up unused nav components
- [ ] Update Storybook stories

**Subtasks**:
1. Identify all navigation components
2. Remove dashboard sidebar
3. Simplify header (keep logo, user menu, settings)
4. Remove breadcrumb component
5. Update mobile navigation drawer
6. Clean up unused components
7. Update component stories

**Files to Create/Modify**:
- `components/navigation/dashboard-nav.tsx` (remove or archive)
- `components/navigation/header.tsx` (simplify)
- `components/navigation/breadcrumbs.tsx` (remove)
- `components/navigation/mobile-nav.tsx` (simplify)

**Dependencies**: DES-128, DES-129

---

## Phase 4: Testing & Polish

### DES-131: E2E Chat Testing

**Epic**: DES-120
**Type**: Testing
**Priority**: High
**Estimate**: 8 points
**Assignee**: QA Engineer / Full-stack Developer

**Description**:
Create comprehensive E2E tests for unified chat interface covering RFP creation, quote review, and proposal generation

**Acceptance Criteria**:
- [ ] Test conversational RFP creation flow
- [ ] Test inline quote card interactions
- [ ] Test proposal preview in chat
- [ ] Test action button clicks
- [ ] Test form field inputs in chat
- [ ] Test workflow status updates
- [ ] Test error handling
- [ ] Test keyboard navigation
- [ ] Achieve 90%+ coverage of chat flows

**Test Scenarios**:
1. **Happy Path**: User creates RFP through conversation → receives quotes → selects quote → gets proposal
2. **Error Handling**: Invalid inputs, API failures, network errors
3. **Navigation**: Back button, refresh, deep linking
4. **Multi-device**: Desktop, tablet, mobile
5. **Accessibility**: Screen reader, keyboard-only

**Subtasks**:
1. Create Playwright test suite
2. Write conversational RFP test
3. Write quote selection test
4. Write proposal generation test
5. Add error scenario tests
6. Add keyboard navigation tests
7. Add mobile responsiveness tests
8. Generate coverage report

**Files to Create/Modify**:
- `__tests__/e2e/chat-rfp-flow.spec.ts` (new)
- `__tests__/e2e/chat-quote-selection.spec.ts` (new)
- `__tests__/e2e/chat-proposal.spec.ts` (new)
- `__tests__/e2e/chat-accessibility.spec.ts` (new)

**Dependencies**: DES-121, DES-122, DES-123, DES-124, DES-125, DES-126

---

### DES-132: Mobile Responsiveness

**Epic**: DES-120
**Type**: Enhancement
**Priority**: High
**Estimate**: 5 points
**Assignee**: Frontend Developer

**Description**:
Ensure chat interface is fully responsive and optimized for mobile devices

**Acceptance Criteria**:
- [ ] Chat works on mobile (iOS/Android)
- [ ] Messages render correctly on small screens
- [ ] Action buttons fit within viewport
- [ ] Quote cards are mobile-optimized
- [ ] Forms are touch-friendly
- [ ] Keyboard doesn't hide chat input
- [ ] Test on multiple device sizes
- [ ] Lighthouse mobile score >90

**Breakpoints to Test**:
- Mobile S: 320px
- Mobile M: 375px
- Mobile L: 425px
- Tablet: 768px
- Laptop: 1024px

**Subtasks**:
1. Audit current mobile experience
2. Optimize message bubble widths
3. Make action buttons touch-friendly (min 44px)
4. Optimize quote cards for mobile
5. Fix keyboard overlap issues
6. Test on real devices (iOS/Android)
7. Run Lighthouse mobile audit
8. Fix performance issues

**Files to Create/Modify**:
- `components/chat-interface.tsx` (modify)
- `components/message-components/*.tsx` (modify styles)
- `styles/mobile.css` (new)

**Dependencies**: DES-121, DES-122, DES-124

---

### DES-133: Accessibility Audit

**Epic**: DES-120
**Type**: Quality
**Priority**: High
**Estimate**: 5 points
**Assignee**: QA Engineer / Frontend Developer

**Description**:
Perform comprehensive accessibility audit and fix all WCAG 2.1 Level AA violations

**Acceptance Criteria**:
- [ ] Chat interface is keyboard navigable
- [ ] All interactive elements have focus indicators
- [ ] Screen reader announces messages correctly
- [ ] ARIA labels on all components
- [ ] Color contrast meets WCAG AA standards
- [ ] No WCAG AA violations
- [ ] Lighthouse accessibility score 100
- [ ] Manual screen reader testing (NVDA/VoiceOver)

**Accessibility Checklist**:
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus management (message sent → focus on input)
- [ ] ARIA roles and labels
- [ ] Alt text for images
- [ ] Color contrast (4.5:1 for text)
- [ ] Screen reader announcements
- [ ] Skip to main content
- [ ] No keyboard traps

**Subtasks**:
1. Run axe DevTools audit
2. Test with NVDA (Windows)
3. Test with VoiceOver (Mac/iOS)
4. Fix keyboard navigation issues
5. Add ARIA labels
6. Fix color contrast issues
7. Test focus management
8. Generate accessibility report

**Files to Create/Modify**:
- All components (add ARIA labels)
- `components/skip-to-content.tsx` (new)
- `docs/ACCESSIBILITY_REPORT.md` (new)

**Dependencies**: DES-131, DES-132

---

## Additional Tasks

### DES-134: Performance Optimization

**Epic**: DES-120
**Type**: Enhancement
**Priority**: Medium
**Estimate**: 5 points
**Assignee**: Full-stack Developer

**Description**:
Optimize chat interface performance for fast message rendering and smooth scrolling

**Acceptance Criteria**:
- [ ] Message virtualization implemented
- [ ] Lazy load images in messages
- [ ] Debounce typing indicator
- [ ] Optimize re-renders
- [ ] Bundle size < 200KB
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Lighthouse performance score >90

**Optimizations**:
- Message list virtualization (react-window)
- Image lazy loading
- Code splitting
- Memoization (useMemo, useCallback)
- Debouncing/throttling
- Bundle analysis and reduction

**Dependencies**: DES-124

---

### DES-135: Documentation Update

**Epic**: DES-120
**Type**: Documentation
**Priority**: Medium
**Estimate**: 3 points
**Assignee**: Technical Writer / Developer

**Description**:
Update all documentation to reflect unified chat interface architecture

**Acceptance Criteria**:
- [ ] Update README with new architecture
- [ ] Update user guide
- [ ] Create chat interface guide
- [ ] Document message component API
- [ ] Update API documentation
- [ ] Add migration guide for developers
- [ ] Record demo video
- [ ] Update Storybook

**Documents to Update**:
- README.md
- docs/GETTING_STARTED.md
- docs/USER_GUIDE.md
- docs/API.md
- docs/MIGRATION_GUIDE.md
- docs/CHAT_COMPONENTS.md (new)

**Dependencies**: All above tasks

---

## Task Dependencies Graph

```
Phase 1 (Parallel):
├── DES-121 (Message Components) [no deps]
├── DES-122 (Action Buttons) → depends on DES-121
├── DES-123 (RFP Flow) → depends on DES-121, DES-122
└── DES-124 (Renderer) → depends on DES-121, DES-122

Phase 2 (Parallel):
├── DES-125 (Chat API) [no deps]
├── DES-126 (Orchestrator) → depends on DES-125
└── DES-127 (State Manager) → depends on DES-125

Phase 3 (Sequential):
├── DES-128 (Archive Pages) → depends on Phase 1
├── DES-129 (Routing) → depends on DES-128
└── DES-130 (Nav Removal) → depends on DES-128, DES-129

Phase 4 (Parallel):
├── DES-131 (E2E Tests) → depends on all Phase 1, 2
├── DES-132 (Mobile) → depends on Phase 1
└── DES-133 (Accessibility) → depends on DES-131, DES-132

Additional (Parallel):
├── DES-134 (Performance) → depends on DES-124
└── DES-135 (Docs) → depends on all tasks
```

---

## Timeline

### Week 1
- **Days 1-2**: DES-121, DES-122 (Frontend)
- **Days 3-4**: DES-123, DES-124 (Frontend)
- **Days 1-3**: DES-125, DES-126 (Backend, parallel)
- **Day 4**: DES-127 (Backend)

### Week 2
- **Day 1**: DES-128, DES-129, DES-130 (Migration)
- **Days 2-3**: DES-131 (Testing)
- **Days 2-3**: DES-132, DES-133 (Quality, parallel)
- **Days 3-4**: DES-134, DES-135 (Polish)

---

## Resource Allocation

**Required Team**:
- 2 Frontend Developers (Phase 1, 3, 4)
- 1 Backend Developer (Phase 2)
- 1 Full-stack Developer (Phase 1, 3, 4)
- 1 QA Engineer (Phase 4)
- 1 Technical Writer (Documentation)

**Total Effort**:
- Story Points: 88 points
- Estimated Hours: ~176 hours (2 person-weeks)
- Timeline: 2 weeks with 3-4 developers

---

## Success Criteria

**Must Have** (Release Blockers):
- ✅ All Phase 1 tasks completed (DES-121 to DES-124)
- ✅ All Phase 2 tasks completed (DES-125 to DES-127)
- ✅ All Phase 3 tasks completed (DES-128 to DES-130)
- ✅ E2E tests passing (DES-131)
- ✅ No critical bugs

**Should Have** (Important):
- ✅ Mobile responsive (DES-132)
- ✅ Accessibility compliant (DES-133)
- ✅ Documentation updated (DES-135)

**Nice to Have** (Post-launch):
- Performance optimized (DES-134)
- Advanced features (voice input, multi-language)

---

**Created**: 2025-11-12
**Status**: Ready for Linear Import
**Next Step**: Create Linear issues

🤖 Generated with [Claude Code](https://claude.com/claude-code)
