# ChatKit Interface Component - Design Document

**Issue**: ONEK-87 - Implement ChatKit Component
**Date**: 2025-11-01
**Status**: DESIGN PHASE
**Author**: Mouse (Frontend Developer Agent)

---

## Executive Summary

This document outlines the design and implementation strategy for integrating OpenAI's ChatKit React component into the Jetvision Multi-Agent System. The component will replace the current custom chat interface (`components/chat-interface.tsx`) while maintaining all existing functionality and adding new capabilities for chain-of-thought visualization and RFP document processing.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Design](#architecture-design)
3. [Component Specifications](#component-specifications)
4. [Integration Points](#integration-points)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Migration Path](#migration-path)

---

## 1. Current State Analysis

### 1.1 Existing Implementation

**Current Chat Interface** (`components/chat-interface.tsx`):
- 482 lines of custom React code
- Handles message display, user input, workflow visualization
- Integrates with ChatSidebar, WorkflowVisualization, ProposalPreview, QuoteCard
- Supports quote comparison, status badges, customer preferences
- Real-time workflow progress simulation
- Mobile-responsive design with Tailwind CSS

**Key Features to Preserve**:
- Flight request tracking with route, passengers, date
- Multi-step workflow visualization (5 steps)
- Live quote status display
- Quote comparison cards with AI scoring
- Customer preference display
- Proposal preview integration
- Quick action buttons
- Auto-scroll to latest message
- Typing indicators
- Status badges (Understanding → Searching → Requesting → Analyzing → Ready)

### 1.2 Already Implemented

✅ **Session API** (`app/api/chatkit/session/route.ts`):
- POST endpoint for creating/refreshing sessions
- Clerk authentication integration
- Device ID management
- Session token generation
- Supabase storage
- Automatic session refresh (24h expiration, 1h refresh threshold)

✅ **Type Definitions** (`lib/types/chatkit.ts`):
- `ChatKitSession` interface
- `CreateSessionRequest` / `CreateSessionResponse`
- `ChatKitSessionRow` (database schema)
- `SessionStatus` enum

### 1.3 Brand Theme (from `app/globals.css`)

**Jetvision Brand Colors**:
- **Primary**: `oklch(0.55 0.15 200)` - Cyan-600 (#0891b2)
- **Secondary**: `oklch(0.7 0.15 70)` - Yellow-Orange (#f59e0b)
- **Accent**: Same as secondary
- **Background (Light)**: `oklch(1 0 0)` - White
- **Background (Dark)**: `oklch(0.145 0 0)` - Near Black
- **Success**: Green-500
- **Error**: Red-600 (#dc2626)

**Typography**:
- Sans: Arial
- Mono: Courier New

---

## 2. Architecture Design

### 2.1 Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  ChatKitInterface                       │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Session Management Layer                        │   │
│  │  • Clerk Authentication Context                 │   │
│  │  • Session Token Fetching                       │   │
│  │  • Device ID Persistence                        │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ChatKit React Component (@openai/chatkit-react)│   │
│  │  • Message rendering                            │   │
│  │  • Input handling                               │   │
│  │  • File uploads                                 │   │
│  │  • Chain-of-thought display                     │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Custom Message Renderers                       │   │
│  │  • WorkflowVisualization                        │   │
│  │  • QuoteComparisonDisplay                       │   │
│  │  • ProposalPreview                              │   │
│  │  • CustomerPreferencesDisplay                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
┌──────────────┐
│   User       │
│   Action     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  ChatKitInterface    │
│  Component           │
└──────┬───────────────┘
       │
       ├──────────────────────────┐
       │                          │
       ▼                          ▼
┌──────────────────┐     ┌────────────────────┐
│  Session API     │     │  OpenAI ChatKit    │
│  /api/chatkit/   │     │  Agent SDK         │
│  session         │     │                    │
└──────┬───────────┘     └─────────┬──────────┘
       │                           │
       ▼                           ▼
┌──────────────────┐     ┌────────────────────┐
│  Supabase        │     │  Multi-Agent       │
│  (Session        │     │  System            │
│   Storage)       │     │  (Orchestrator)    │
└──────────────────┘     └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │  Agent Workflow    │
                         │  • ClientData      │
                         │  • FlightSearch    │
                         │  • ProposalAnalysis│
                         │  • Communication   │
                         └────────────────────┘
```

### 2.3 State Management

**Component State**:
```typescript
interface ChatKitInterfaceState {
  // Session
  session: ChatKitSession | null
  sessionLoading: boolean
  sessionError: Error | null

  // Chat
  messages: ChatMessage[]
  isTyping: boolean

  // Workflow
  currentWorkflowStep: number
  workflowStatus: WorkflowStatus

  // Quotes
  quotes: Quote[]
  selectedQuoteId: string | null

  // UI
  showWorkflow: boolean
  showProposal: boolean
}
```

---

## 3. Component Specifications

### 3.1 Primary Component

**File**: `components/chatkit-interface.tsx`

**Props**:
```typescript
interface ChatKitInterfaceProps {
  // Session context (inherited from current chat-interface)
  activeChat?: ChatSession

  // Callbacks
  onWorkflowUpdate?: (step: number, status: WorkflowStatus) => void
  onQuotesReceived?: (quotes: Quote[]) => void
  onProposalReady?: (proposal: ProposalData) => void

  // Configuration
  enableChainOfThought?: boolean
  enableFileUploads?: boolean
  customTheme?: ChatKitTheme

  // Feature flags
  showWorkflowVisualization?: boolean
  showQuoteComparison?: boolean
  showCustomerPreferences?: boolean
}
```

**Dependencies**:
- `@openai/chatkit-react` (to be installed)
- `@clerk/nextjs` (existing)
- `@/components/workflow-visualization`
- `@/components/proposal-preview`
- `@/components/aviation/quote-card`
- `@/lib/types/chatkit`

### 3.2 Supporting Components

**3.2.1 ChainOfThoughtRenderer**
```typescript
// components/chatkit/chain-of-thought-renderer.tsx
interface ChainOfThoughtRendererProps {
  reasoning: ReasoningStep[]
  isExpanded: boolean
  onToggle: () => void
}
```

**3.2.2 RFPFileUpload**
```typescript
// components/chatkit/rfp-file-upload.tsx
interface RFPFileUploadProps {
  onFileSelect: (file: File) => void
  acceptedFormats: string[]
  maxSizeMB: number
}
```

**3.2.3 ChatKitThemeProvider**
```typescript
// components/chatkit/theme-provider.tsx
interface ChatKitThemeProviderProps {
  children: React.ReactNode
  theme: 'light' | 'dark' | 'auto'
}
```

### 3.3 Type Extensions

**File**: `lib/types/chatkit.ts` (extend existing)

```typescript
// Add to existing file

/**
 * ChatKit theme configuration
 */
export interface ChatKitTheme {
  colors: {
    primary: string
    secondary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    border: string
    success: string
    error: string
    warning: string
  }
  typography: {
    fontFamily: string
    fontFamilyMono: string
    fontSize: {
      sm: string
      md: string
      lg: string
    }
  }
  spacing: {
    sm: string
    md: string
    lg: string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
  }
}

/**
 * Chain-of-thought reasoning step
 */
export interface ReasoningStep {
  id: string
  type: 'thought' | 'action' | 'observation'
  content: string
  timestamp: string
  metadata?: Record<string, unknown>
}

/**
 * RFP document metadata
 */
export interface RFPDocument {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  uploadedAt: string
  extractedData?: {
    route?: string
    passengers?: number
    date?: string
    preferences?: Record<string, string>
  }
}

/**
 * Extended chat message with Jetvision-specific data
 */
export interface JetvisionChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string

  // Jetvision extensions
  showWorkflow?: boolean
  showProposal?: boolean
  showQuotes?: boolean
  showQuoteStatus?: boolean
  showCustomerPreferences?: boolean

  // Chain-of-thought
  reasoning?: ReasoningStep[]

  // Attachments
  attachments?: RFPDocument[]
}
```

---

## 4. Integration Points

### 4.1 Clerk Authentication

**Current Implementation**:
```typescript
// app/page.tsx
const { user, isLoaded } = useUser()
```

**ChatKit Integration**:
```typescript
// components/chatkit-interface.tsx
import { useUser } from '@clerk/nextjs'

export function ChatKitInterface() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (isLoaded && user) {
      fetchChatKitSession()
    }
  }, [isLoaded, user])
}
```

### 4.2 Session Management

**Session Lifecycle**:
1. Component mounts → Check if user is authenticated
2. User authenticated → Fetch/create session via `/api/chatkit/session`
3. Session received → Initialize ChatKit component
4. Session expires → Auto-refresh (handled by API)
5. Component unmounts → Clean up listeners

**Implementation**:
```typescript
const useChatKitSession = () => {
  const { user } = useUser()
  const [session, setSession] = useState<ChatKitSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchSession = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/chatkit/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: { source: 'web', version: '1.0' }
          })
        })

        if (!response.ok) {
          throw new Error(`Session creation failed: ${response.statusText}`)
        }

        const { session } = await response.json()
        setSession(session)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [user])

  return { session, loading, error }
}
```

### 4.3 Multi-Agent System Integration

**Message Flow**:
```typescript
// When user sends a message
const handleUserMessage = async (content: string, files?: File[]) => {
  // 1. Send to ChatKit (handles display)
  // 2. Trigger agent workflow
  const response = await fetch('/api/agents/orchestrator', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: session.chatKitSessionId,
      message: content,
      files: files?.map(f => ({ name: f.name, size: f.size }))
    })
  })

  // 3. Agent system processes via MessageBus
  // 4. Workflow updates come back via streaming or webhooks
  // 5. Update UI components (WorkflowVisualization, QuoteCards, etc.)
}
```

### 4.4 Workflow Visualization

**Current**: Embedded in message bubbles
**New**: Side panel or expandable sections

```typescript
<ChatKitInterface>
  <ChatKitMessages />

  {showWorkflow && (
    <WorkflowVisualization
      currentStep={workflowState.currentStep}
      status={workflowState.status}
      embedded={false}
    />
  )}
</ChatKitInterface>
```

---

## 5. Implementation Plan

### Phase 1: Setup & Dependencies (Day 1)

**Tasks**:
1. Install `@openai/chatkit-react` package
2. Set up environment variables
   ```env
   CHATKIT_WORKFLOW_ID=your-workflow-id
   OPENAI_API_KEY=your-api-key
   ```
3. Create base component structure
4. Implement `useChatKitSession` hook
5. Add TypeScript type extensions

**Files Created**:
- `components/chatkit-interface.tsx` (skeleton)
- `hooks/use-chatkit-session.ts`
- `lib/types/chatkit.ts` (extend)

**Acceptance Criteria**:
- [ ] Package installed successfully
- [ ] Session hook fetches token
- [ ] TypeScript types compile without errors
- [ ] Component renders with loading state

---

### Phase 2: Core ChatKit Integration (Days 2-3)

**Tasks**:
1. Implement ChatKit React component
2. Connect to session API
3. Handle message sending/receiving
4. Implement custom message renderers
5. Add error boundaries

**Files Created**:
- `components/chatkit/message-renderer.tsx`
- `components/chatkit/error-boundary.tsx`
- `lib/chatkit/config.ts`

**Acceptance Criteria**:
- [ ] Messages send successfully
- [ ] Messages display in ChatKit UI
- [ ] Session persists across page refreshes
- [ ] Error states handled gracefully

---

### Phase 3: Theming & Branding (Day 4)

**Tasks**:
1. Create Jetvision theme configuration
2. Apply brand colors to ChatKit
3. Customize message bubbles
4. Style file upload UI
5. Add dark mode support

**Files Created**:
- `components/chatkit/theme-provider.tsx`
- `lib/chatkit/theme.ts`
- `styles/chatkit-overrides.css`

**Theme Configuration**:
```typescript
const jetvisionTheme: ChatKitTheme = {
  colors: {
    primary: '#0891b2',      // cyan-600
    secondary: '#f59e0b',    // yellow-orange
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#374151',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    success: '#10b981',
    error: '#dc2626',
    warning: '#f59e0b',
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    fontFamilyMono: '"Courier New", monospace',
    fontSize: {
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
    },
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
}
```

**Acceptance Criteria**:
- [ ] Brand colors applied throughout
- [ ] Dark mode works correctly
- [ ] Typography matches Jetvision style
- [ ] Mobile responsive

---

### Phase 4: Chain-of-Thought Visualization (Day 5)

**Tasks**:
1. Create reasoning step renderer
2. Add expand/collapse functionality
3. Style reasoning steps
4. Integrate with GPT-5 reasoning output
5. Add accessibility (screen readers)

**Files Created**:
- `components/chatkit/chain-of-thought-renderer.tsx`
- `components/chatkit/reasoning-step.tsx`
- `lib/chatkit/reasoning-parser.ts`

**UI Design**:
```
┌────────────────────────────────────────────┐
│  [Agent Message]                           │
│  I've found the best options for you...   │
│                                            │
│  💭 Show Reasoning (3 steps) ▼            │
│  ┌──────────────────────────────────────┐ │
│  │ 1. 🤔 Thought                        │ │
│  │    Analyzing route requirements...   │ │
│  │                                      │ │
│  │ 2. 🔧 Action                         │ │
│  │    Searching flight database...      │ │
│  │                                      │ │
│  │ 3. 👁️ Observation                    │ │
│  │    Found 12 matching aircraft...     │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Reasoning steps display correctly
- [ ] Expand/collapse works smoothly
- [ ] Icons and styling match design
- [ ] Accessible via keyboard
- [ ] Screen reader compatible

---

### Phase 5: File Upload & RFP Processing (Day 6)

**Tasks**:
1. Implement file upload UI
2. Add drag-and-drop support
3. File validation (PDF, DOC, DOCX)
4. Progress indicators
5. Extract RFP data from documents

**Files Created**:
- `components/chatkit/rfp-file-upload.tsx`
- `components/chatkit/file-progress.tsx`
- `lib/chatkit/file-validator.ts`
- `lib/rfp/document-parser.ts` (server-side)

**Accepted Formats**:
- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- Text (`.txt`)
- Maximum size: 10MB

**UI Design**:
```
┌──────────────────────────────────────────┐
│  📎 Upload RFP Document                  │
│  ┌────────────────────────────────────┐ │
│  │  Drag & drop or click to browse   │ │
│  │  📄 PDF, DOC, DOCX • Max 10MB     │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ✅ flight-request.pdf (2.3 MB)        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━ 100%        │
└──────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Drag-and-drop works
- [ ] File validation prevents invalid uploads
- [ ] Progress bar shows upload status
- [ ] RFP data extracted correctly
- [ ] Error messages clear and helpful

---

### Phase 6: Integration with Existing Components (Day 7)

**Tasks**:
1. Integrate WorkflowVisualization
2. Integrate QuoteCard components
3. Integrate ProposalPreview
4. Add customer preferences display
5. Test all integrations together

**Integration Points**:
```typescript
// In message renderer
{message.showWorkflow && (
  <WorkflowVisualization
    currentStep={workflowState.currentStep}
    status={workflowState.status}
    embedded={true}
  />
)}

{message.showQuotes && quotes.length > 0 && (
  <QuoteComparisonDisplay
    quotes={quotes}
    selectedId={selectedQuoteId}
    onSelect={handleSelectQuote}
  />
)}

{message.showProposal && (
  <ProposalPreview
    embedded={true}
    chatData={activeChat}
  />
)}
```

**Acceptance Criteria**:
- [ ] Workflow visualization appears in messages
- [ ] Quote cards render correctly
- [ ] Proposal preview displays properly
- [ ] Customer preferences show correctly
- [ ] All components styled consistently

---

### Phase 7: Testing (Days 8-9)

**Unit Tests**:
- `__tests__/unit/components/chatkit-interface.test.tsx`
- `__tests__/unit/hooks/use-chatkit-session.test.ts`
- `__tests__/unit/components/chatkit/chain-of-thought-renderer.test.tsx`
- `__tests__/unit/components/chatkit/rfp-file-upload.test.tsx`

**Integration Tests**:
- `__tests__/integration/chatkit-workflow-integration.test.ts`
- `__tests__/integration/chatkit-clerk-auth.test.ts`

**Test Coverage Requirements**:
- Lines: 75%+
- Functions: 75%+
- Branches: 70%+
- Statements: 75%+

**Key Test Scenarios**:
1. Session creation and refresh
2. Message sending and receiving
3. File upload validation
4. Theme switching (light/dark)
5. Workflow state updates
6. Quote selection
7. Error handling
8. Loading states
9. Accessibility (keyboard navigation)
10. Responsive design

**Acceptance Criteria**:
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Coverage thresholds met
- [ ] No TypeScript errors
- [ ] Linting passes

---

### Phase 8: Documentation & Migration (Day 10)

**Documentation**:
1. Component usage guide
2. API integration guide
3. Theming customization guide
4. Migration guide from old chat-interface
5. Troubleshooting guide

**Files Created**:
- `docs/CHATKIT_USAGE.md`
- `docs/CHATKIT_THEMING.md`
- `docs/CHATKIT_MIGRATION.md`

**Migration Checklist**:
- [ ] Feature parity verified
- [ ] Performance benchmarks meet targets
- [ ] Accessibility audit passed
- [ ] Browser compatibility tested
- [ ] Mobile responsiveness verified
- [ ] Documentation complete
- [ ] Team training completed

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Session Hook Tests**:
```typescript
describe('useChatKitSession', () => {
  it('should fetch session on user authentication', async () => {
    const { result } = renderHook(() => useChatKitSession(), {
      wrapper: ClerkProvider
    })

    await waitFor(() => {
      expect(result.current.session).toBeDefined()
      expect(result.current.loading).toBe(false)
    })
  })

  it('should handle session creation errors', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useChatKitSession())

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
      expect(result.current.session).toBeNull()
    })
  })
})
```

**Component Tests**:
```typescript
describe('ChatKitInterface', () => {
  it('should render loading state initially', () => {
    render(<ChatKitInterface />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should render chat interface after session loads', async () => {
    render(<ChatKitInterface />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument()
    })
  })

  it('should send message on submit', async () => {
    const { user } = render(<ChatKitInterface />)

    const input = screen.getByPlaceholderText(/type a message/i)
    await user.type(input, 'Hello')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
    })
  })
})
```

### 6.2 Integration Tests

**Clerk + ChatKit Integration**:
```typescript
describe('ChatKit with Clerk Authentication', () => {
  it('should create session after Clerk authentication', async () => {
    const { user } = renderWithClerk(<ChatKitInterface />)

    // Wait for Clerk to authenticate
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chatkit/session',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
```

**Workflow Integration**:
```typescript
describe('ChatKit with Workflow Visualization', () => {
  it('should show workflow when agent processes request', async () => {
    render(<ChatKitInterface activeChat={mockChat} />)

    // Send message
    const input = screen.getByPlaceholderText(/type a message/i)
    await userEvent.type(input, 'Book a flight to NYC')
    await userEvent.keyboard('{Enter}')

    // Wait for workflow to appear
    await waitFor(() => {
      expect(screen.getByText(/Understanding Request/i)).toBeInTheDocument()
    })
  })
})
```

### 6.3 E2E Tests (Playwright)

```typescript
// __tests__/e2e/chatkit-integration.spec.ts
test('complete RFP flow with ChatKit', async ({ page }) => {
  // 1. Sign in
  await page.goto('/sign-in')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')

  // 2. Wait for chat interface
  await page.waitForSelector('[data-testid="chatkit-interface"]')

  // 3. Upload RFP
  await page.setInputFiles('input[type="file"]', 'test-rfp.pdf')
  await page.waitForSelector('[data-testid="file-uploaded"]')

  // 4. Send message
  await page.fill('textarea[placeholder*="message"]', 'Find me the best options')
  await page.keyboard.press('Enter')

  // 5. Wait for workflow completion
  await page.waitForSelector('[data-testid="proposal-ready"]', {
    timeout: 30000
  })

  // 6. Verify quotes displayed
  const quotes = await page.locator('[data-testid="quote-card"]').count()
  expect(quotes).toBeGreaterThan(0)
})
```

---

## 7. Migration Path

### 7.1 Feature Flag Approach

**Configuration**:
```typescript
// lib/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_CHATKIT: process.env.NEXT_PUBLIC_USE_CHATKIT === 'true',
  CHATKIT_CHAIN_OF_THOUGHT: process.env.NEXT_PUBLIC_CHATKIT_COT === 'true',
  CHATKIT_FILE_UPLOADS: process.env.NEXT_PUBLIC_CHATKIT_UPLOADS === 'true',
}
```

**Implementation**:
```typescript
// app/page.tsx
import { FEATURE_FLAGS } from '@/lib/config/feature-flags'
import { ChatInterface } from '@/components/chat-interface'
import { ChatKitInterface } from '@/components/chatkit-interface'

export default function Page() {
  const ChatComponent = FEATURE_FLAGS.USE_CHATKIT
    ? ChatKitInterface
    : ChatInterface

  return (
    <div>
      <ChatComponent
        activeChat={activeChat}
        isProcessing={isProcessing}
        onProcessingChange={setIsProcessing}
        onViewWorkflow={() => setCurrentView('workflow')}
        onUpdateChat={handleUpdateChat}
      />
    </div>
  )
}
```

### 7.2 Gradual Rollout

**Phase 1**: Internal testing (1 week)
- Feature flag enabled for dev/staging only
- Team testing and feedback

**Phase 2**: Beta testing (1 week)
- Feature flag enabled for 10% of users
- Monitor performance and errors

**Phase 3**: Wider rollout (1 week)
- Feature flag enabled for 50% of users
- Continue monitoring

**Phase 4**: Full rollout (1 week)
- Feature flag enabled for 100% of users
- Deprecate old chat-interface.tsx

### 7.3 Rollback Plan

If issues arise:
1. Flip feature flag to `false`
2. All users revert to old interface
3. Fix issues in ChatKit implementation
4. Re-test thoroughly
5. Re-enable feature flag

---

## 8. Performance Considerations

### 8.1 Bundle Size

**Target**: Keep bundle size increase under 50KB (gzipped)

**Strategies**:
- Code splitting: Lazy load ChatKit component
- Tree shaking: Import only needed ChatKit modules
- Dynamic imports for heavy components (WorkflowVisualization, ProposalPreview)

```typescript
// Lazy loading example
const ChatKitInterface = dynamic(
  () => import('@/components/chatkit-interface'),
  { ssr: false, loading: () => <ChatLoadingSkeleton /> }
)
```

### 8.2 Runtime Performance

**Targets**:
- First Contentful Paint (FCP): < 1.5s
- Time to Interactive (TTI): < 3.0s
- Message send latency: < 100ms
- Scroll performance: 60 FPS

**Optimizations**:
- Virtual scrolling for message lists (if >100 messages)
- Memoize expensive components
- Debounce typing indicators
- Optimize re-renders with React.memo

```typescript
const QuoteCard = React.memo(({ quote, onSelect }) => {
  // Component implementation
}, (prev, next) => {
  return prev.quote.id === next.quote.id &&
         prev.isSelected === next.isSelected
})
```

### 8.3 Network Optimization

**Strategies**:
- Session token caching (localStorage)
- Message batching for bulk operations
- WebSocket for real-time updates (vs polling)
- Request deduplication

---

## 9. Accessibility (WCAG 2.1 AA)

### 9.1 Keyboard Navigation

**Requirements**:
- [ ] Tab through all interactive elements
- [ ] Enter/Space to activate buttons
- [ ] Escape to close modals/dropdowns
- [ ] Arrow keys for message navigation

### 9.2 Screen Reader Support

**ARIA Labels**:
```tsx
<div
  role="region"
  aria-label="Chat conversation"
  aria-live="polite"
>
  {messages.map(msg => (
    <div
      key={msg.id}
      role="article"
      aria-label={`${msg.role} message`}
    >
      {msg.content}
    </div>
  ))}
</div>
```

### 9.3 Color Contrast

**Minimum Ratios**:
- Normal text: 4.5:1
- Large text: 3:1
- UI components: 3:1

**Testing Tools**:
- Chrome DevTools Lighthouse
- axe DevTools
- WAVE Browser Extension

---

## 10. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| ChatKit package not available via npm | High | Low | Use CDN approach (already implemented in PR #7) |
| Performance degradation | Medium | Medium | Implement code splitting, lazy loading, virtual scrolling |
| Feature parity gaps | High | Low | Thorough feature comparison checklist |
| Integration bugs with existing components | Medium | Medium | Comprehensive integration tests |
| Accessibility regressions | Medium | Low | Automated accessibility tests in CI |
| Theme customization limitations | Low | Medium | Document workarounds, CSS overrides |

---

## 11. Success Criteria

### 11.1 Functional Requirements

- [ ] All existing chat-interface features work
- [ ] Session management works seamlessly
- [ ] File uploads process correctly
- [ ] Chain-of-thought displays properly
- [ ] Workflow visualization integrates
- [ ] Quote comparison works
- [ ] Proposal preview displays
- [ ] Customer preferences show

### 11.2 Non-Functional Requirements

- [ ] Performance metrics met (FCP < 1.5s, TTI < 3.0s)
- [ ] Bundle size increase < 50KB gzipped
- [ ] Test coverage ≥ 75%
- [ ] Zero TypeScript errors
- [ ] Accessibility audit passes (WCAG 2.1 AA)
- [ ] Mobile responsive (320px - 1920px)
- [ ] Browser support (Chrome, Firefox, Safari, Edge)

### 11.3 User Experience

- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] Dark mode works correctly
- [ ] Animations are smooth
- [ ] Touch interactions work on mobile
- [ ] Keyboard shortcuts work

---

## 12. Next Steps

1. **Review & Approval** (Day 0)
   - Design review with team
   - Architecture approval
   - Resource allocation

2. **Spike Investigation** (Day 1)
   - Test ChatKit package locally
   - Verify API compatibility
   - Prototype basic integration

3. **Implementation** (Days 2-9)
   - Follow phases 1-7 outlined above

4. **Testing & QA** (Days 8-10)
   - Unit tests
   - Integration tests
   - E2E tests
   - Manual QA

5. **Documentation** (Day 10)
   - Usage guides
   - API documentation
   - Migration guide

6. **Deployment** (Days 11-14)
   - Gradual rollout with feature flags
   - Monitor performance and errors
   - Collect user feedback

---

## Appendix A: ChatKit API Reference

**Note**: To be filled in once `@openai/chatkit-react` package documentation is available.

Expected API surface:
```typescript
import { ChatKit, ChatKitProvider } from '@openai/chatkit-react'

<ChatKitProvider
  sessionToken={session.chatKitSessionId}
  workflowId={session.workflowId}
  theme={jetvisionTheme}
>
  <ChatKit
    onMessage={handleMessage}
    onFileUpload={handleFileUpload}
    customRenderers={{
      workflow: WorkflowRenderer,
      quote: QuoteRenderer,
      proposal: ProposalRenderer,
    }}
  />
</ChatKitProvider>
```

---

## Appendix B: Environment Variables

```env
# ChatKit Configuration
CHATKIT_WORKFLOW_ID=your-workflow-id-here
OPENAI_API_KEY=sk-...

# Feature Flags
NEXT_PUBLIC_USE_CHATKIT=true
NEXT_PUBLIC_CHATKIT_COT=true
NEXT_PUBLIC_CHATKIT_UPLOADS=true

# Session Configuration
CHATKIT_SESSION_EXPIRATION_HOURS=24
CHATKIT_SESSION_REFRESH_THRESHOLD_HOURS=1
```

---

## Appendix C: Database Schema

**Table**: `chatkit_sessions`

Already implemented in Supabase. No changes needed.

```sql
CREATE TABLE chatkit_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  session_token TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chatkit_sessions_clerk_user_id ON chatkit_sessions(clerk_user_id);
CREATE INDEX idx_chatkit_sessions_status ON chatkit_sessions(status);
CREATE INDEX idx_chatkit_sessions_expires_at ON chatkit_sessions(expires_at);
```

---

**End of Design Document**

**Status**: Ready for Implementation
**Approval Required From**: Tech Lead, Product Owner
**Estimated Timeline**: 10 working days
**Risk Level**: Medium
