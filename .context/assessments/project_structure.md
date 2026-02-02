# Project Structure - Jetvision AI Assistant

**Analysis Date**: 2025-01-31
**Total Files**: ~1,383 (excluding node_modules, .git, .next)
**TypeScript Files**: 589
**Test Files**: 108
**API Routes**: 36

---

## Directory Tree Overview

```
v0-jetvision-assistant/
├── agents/                    # Agent system
│   ├── coordination/          # Agent coordination (100% complete)
│   │   ├── handoff-manager.ts
│   │   ├── linear-agent-spawner.ts
│   │   ├── message-bus.ts
│   │   ├── state-machine.ts
│   │   ├── task-queue.ts
│   │   └── terminal-manager.ts
│   └── jetvision-agent/       # Main agent (95% complete)
│       ├── index.ts
│       ├── tool-executor.ts
│       └── types.ts
│
├── app/                       # Next.js 14 App Router
│   ├── api/                   # 36 API routes
│   │   ├── admin/             # Admin endpoints
│   │   ├── agents/            # Agent management
│   │   ├── analytics/         # Usage analytics
│   │   ├── avinode/           # Avinode integration
│   │   ├── chat/              # Chat API with SSE
│   │   ├── chat-sessions/     # Session management
│   │   ├── clients/           # Client profiles
│   │   ├── contract/          # Contract generation (NEW)
│   │   │   ├── [id]/
│   │   │   ├── generate/
│   │   │   └── send/
│   │   ├── email/             # Email sending
│   │   ├── health/            # Health checks
│   │   ├── mcp/               # MCP endpoints
│   │   ├── messages/          # Message persistence
│   │   ├── proposal/          # Proposal workflow
│   │   │   ├── approve-email/ # Email approval (NEW)
│   │   │   ├── generate/
│   │   │   └── send/
│   │   ├── quotes/            # Quote management
│   │   ├── requests/          # RFP requests
│   │   ├── rfp/               # RFP processing
│   │   ├── test/              # Test endpoints
│   │   ├── users/             # User management
│   │   ├── webhooks/          # Clerk, Avinode webhooks
│   │   └── workflows/         # Workflow state
│   ├── chat/                  # Chat page
│   ├── component-demo/        # Component demos
│   ├── settings/              # Settings pages
│   ├── sign-in/               # Auth pages
│   ├── sign-up/
│   └── _archived/             # Archived pages (causes TS errors)
│
├── components/                # 101 React components
│   ├── avinode/               # 21 Avinode components
│   │   ├── avinode-action-required.tsx
│   │   ├── avinode-auth-status.tsx
│   │   ├── avinode-connection-status.tsx
│   │   ├── avinode-deep-links.tsx
│   │   ├── avinode-message-card.tsx
│   │   ├── avinode-sidebar-card.tsx
│   │   ├── book-flight-modal.tsx
│   │   ├── deep-link-prompt.tsx
│   │   ├── flight-search-progress.tsx
│   │   ├── operator-message-thread.tsx
│   │   ├── rfq-flight-card.tsx
│   │   ├── rfq-flights-list.tsx
│   │   ├── rfq-quote-details-card.tsx
│   │   ├── send-proposal-step.tsx
│   │   ├── trip-details-card.tsx
│   │   ├── trip-id-input.tsx
│   │   ├── trip-summary-card.tsx
│   │   └── webhook-status-indicator.tsx
│   ├── chat/                  # Chat components
│   ├── conversation-starters/ # 8 starter components
│   ├── email/                 # Email preview (NEW)
│   │   ├── email-preview-card.tsx
│   │   └── index.ts
│   ├── message-components/    # Rich message types
│   ├── proposal/              # Proposal UI (NEW)
│   │   └── proposal-sent-confirmation.tsx
│   ├── quotes/                # Quote cards
│   ├── rfp/                   # RFP form steps
│   ├── rich-messages/         # Markdown rendering
│   ├── ui/                    # Base UI (shadcn/ui)
│   └── workflow-steps/        # Workflow UI
│
├── lib/                       # Core libraries
│   ├── airports/              # Airport data
│   ├── avinode/               # Avinode utilities
│   ├── chat/                  # Chat state & hooks
│   ├── config/                # Configuration
│   ├── conversation/          # Conversation flow
│   ├── design-system/         # Tailwind helpers
│   ├── hooks/                 # React hooks
│   ├── linear/                # Linear integration
│   ├── mcp/                   # MCP client library
│   ├── middleware/            # Auth middleware
│   ├── mock-data/             # Test data
│   ├── pdf/                   # PDF generation
│   ├── prompts/               # System prompts
│   ├── rbac/                  # Role-based access
│   ├── resilience/            # Circuit breakers
│   ├── services/              # Business logic
│   ├── sessions/              # Session management
│   ├── supabase/              # Database client
│   ├── types/                 # Type definitions
│   ├── utils/                 # Utilities
│   └── validations/           # Zod schemas
│
├── mcp-servers/               # MCP servers
│   ├── avinode-mcp-server/    # 100% complete
│   ├── gmail-mcp-server/      # 90% complete
│   ├── google-sheets-mcp-server/ # 70% complete
│   └── supabase-mcp-server/   # 100% complete
│
├── __tests__/                 # Test files (108 total)
│   ├── e2e/                   # End-to-end tests
│   ├── helpers/               # Test utilities
│   ├── integration/           # Integration tests
│   │   ├── agents/
│   │   ├── auth/
│   │   ├── conversation/
│   │   ├── database/
│   │   ├── mcp/
│   │   └── webhooks/
│   ├── mocks/                 # Test mocks
│   ├── templates/             # Test templates
│   └── unit/                  # Unit tests
│       ├── agents/
│       ├── api/
│       ├── app/
│       ├── components/
│       ├── conversation/
│       ├── hooks/
│       ├── lib/
│       ├── mcp/
│       └── middleware/
│
├── docs/                      # Documentation (90+ files)
│   ├── agents/
│   ├── api/
│   ├── architecture/
│   ├── avinode/
│   ├── deployment/
│   ├── implementation/
│   └── ...
│
├── supabase/                  # Database
│   └── migrations/            # 32 migration files
│
├── scripts/                   # Utility scripts
│   ├── avinode/
│   ├── clerk/
│   ├── code-review/
│   ├── database/
│   └── ...
│
├── .context/                  # Project context
│   ├── assessments/           # Status reports (this file)
│   ├── documentation/
│   ├── planning/
│   ├── status/
│   └── workspaces/            # Worktree metadata
│
├── .claude/                   # Claude Code config
│   ├── agents/
│   ├── commands/
│   ├── hooks/
│   ├── plans/
│   └── skills/
│
└── .github/                   # GitHub config
    ├── workflows/             # CI/CD workflows
    └── PULL_REQUEST_TEMPLATE/
```

---

## Key Statistics

### Codebase Size (January 2025)

| Metric | Jan 28 | Jan 31 | Notes |
|--------|--------|--------|-------|
| **TypeScript Files** | 833 (estimated) | 589 (accurate) | Recounted |
| **Component Files** | 118 | 101 | Recounted |
| **Test Files** | 208+ | 108 | Recounted |
| **API Routes** | 36 | 36 | Stable |
| **Migrations** | 32 | 32 | Stable |
| **Avinode Components** | 19 | 21 | +2 |

### Lines of Code (Estimated)
- **Agents**: ~4,000 lines
- **API Routes**: ~3,000 lines
- **Components**: ~6,000 lines
- **MCP Servers**: ~3,000 lines
- **Tests**: ~8,000 lines
- **Total**: ~24,000+ lines

---

## New Files Since Last Report (Jan 28)

### New Components
- No new components since Jan 28

### New API Routes
- No new routes since Jan 28

### Recent Commits (Stability)
- `885db74` - Fix: Load messages directly per session
- `48580cb` - Revert: Undo aggressive deduplication
- `650c736` - Fix: Email approval migration ENUM

---

## Architecture Highlights

### Single-Agent Architecture
```
JetvisionAgent (agents/jetvision-agent/)
    │
    ├── System Prompt (lib/prompts/jetvision-system-prompt.ts)
    │   └── Forced tool patterns for common intents
    │
    ├── Tool Executor (tool-executor.ts)
    │   └── Routes to MCP servers
    │
    └── MCP Servers (mcp-servers/)
        ├── Avinode MCP (flight search, trips, quotes)
        ├── Gmail MCP (email sending)
        ├── Supabase MCP (database operations)
        └── Google Sheets MCP (client data - partial)
```

### Chat Flow
```
User Message → Chat API → JetvisionAgent → Tool Executor → MCP Server
                    ↓
              SSE Streaming ← Response ← Tool Result
                    ↓
              Message Persistence (Supabase)
```

### Proposal Workflow
```
RFQ Created → Quotes Received → Proposal Generated → Email Preview
                                                           ↓
                                                    User Approval
                                                           ↓
                                                    Email Sent → Confirmation
```

---

## Notable Patterns

### Singleton Patterns
- `AgentFactory` - Single agent factory instance
- `AgentRegistry` - Central agent registry
- `MessageBus` - Single message bus for pub/sub
- `HandoffManager` - Single handoff coordinator
- `WorkflowStateManager` - Single workflow manager
- `MCPServerManager` - Single MCP server manager

### Component Organization
- Avinode components: `components/avinode/` (21 files)
- Quote components: `components/quotes/`
- Message components: `components/message-components/`
- Chat components: `components/chat/`
- Email components: `components/email/` (2 files)
- Proposal components: `components/proposal/` (1 file)

### Test Organization
- Unit tests mirror source structure in `__tests__/unit/`
- Integration tests for cross-cutting concerns
- E2E tests for critical paths

### Configuration Files
- **Environment**: `.env.local`
- **TypeScript**: `tsconfig.json` (strict mode)
- **Testing**: `vitest.config.ts`
- **Linting**: `eslint.config.mjs`
- **MCP**: `.mcp.json`

---

## Project Health Indicators

### Positive Signs
- Strong core infrastructure (95%+ complete)
- Comprehensive coordination layer (100% complete)
- JetvisionAgent architecture solid (95%)
- MCP servers mostly complete (90%)
- Good test coverage foundation (108 test files)
- Comprehensive documentation (90+ docs)
- Chat message persistence fixed (885db74)
- Email approval workflow implemented
- Contract generation added

### Areas Needing Attention
- 14 TypeScript type export errors
- Test suite verification needed
- Google Sheets OAuth not complete
- Production deployment configuration

### Recently Fixed
- Message persistence (885db74)
- Quote pricing display (8233e83)
- Email approval migration (650c736)

---

## Files Causing TypeScript Errors

The following files have import errors due to missing exports from `lib/types/database`:

1. `lib/middleware/rbac.ts` - `UserRole`
2. `lib/rbac/permissions.ts` - `UserRole`
3. `lib/hooks/use-user-role.ts` - `UserRole`
4. `lib/hooks/use-avinode-quotes.ts` - `Quote`
5. `lib/services/supabase-queries.ts` - `RequestStatus`
6. `lib/utils/request-to-chat-session.ts` - `Request`
7. `app/api/clients/route.ts` - `User`, `ClientProfile`
8. `app/api/requests/route.ts` - `User`, `Request`
9. `app/settings/profile/page.tsx` - `UserRole`
10. `app/_archived/admin/users/page.tsx` - `UserRole`, `User` (archived)

**Fix**: Add missing exports to `lib/types/database/index.ts`

---

## Recommendations

1. **Fix TypeScript Errors** - Add missing type exports (1-2 hours)
2. **Clean Archived Files** - Remove `app/_archived/` or exclude from compilation
3. **Verify Tests** - Run test suite and fix failures
4. **Production Setup** - Configure Vercel and Sentry
5. **Google Sheets OAuth** - Complete for v1.1

**Overall Assessment**: Project structure is well-organized and comprehensive. 86% overall completion. Ready for production with TypeScript cleanup.
