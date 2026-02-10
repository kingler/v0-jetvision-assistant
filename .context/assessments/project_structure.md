# Project Structure - Jetvision AI Assistant

**Analysis Date**: 2026-02-09
**Total Files**: 1,404 (excluding node_modules, .git, .next, .venv)
**TypeScript Files**: 655
**Test Files**: 153
**API Routes**: 41

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
│   └── jetvision-agent/       # Main agent (97% complete)
│       ├── index.ts
│       ├── streaming.ts
│       ├── tool-executor.ts
│       ├── tools.ts
│       └── types.ts
│
├── app/                       # Next.js 14 App Router
│   ├── api/                   # 41 API routes
│   │   ├── admin/             # Admin endpoints
│   │   ├── agents/            # Agent management
│   │   ├── analytics/         # Usage analytics
│   │   ├── avinode/           # Avinode integration (trips, RFQs, events, messages)
│   │   ├── chat/              # Chat API with SSE streaming
│   │   ├── chat-sessions/     # Session management + messages
│   │   ├── clients/           # Client profiles
│   │   ├── contract/          # Contract generation & sending
│   │   ├── email/             # Email sending
│   │   ├── health/            # Health checks
│   │   ├── mcp/               # MCP endpoints
│   │   ├── messages/          # Message persistence
│   │   ├── proposal/          # Proposal workflow + email approval + margin
│   │   ├── quotes/            # Quote management
│   │   ├── requests/          # RFP requests
│   │   ├── rfp/               # RFP processing
│   │   ├── test/              # Test endpoints
│   │   ├── users/             # User management + avatars
│   │   ├── webhooks/          # Clerk, Avinode webhooks
│   │   └── workflows/         # Workflow state
│   ├── chat/                  # Chat page
│   ├── settings/              # Settings pages
│   ├── sign-in/               # Auth pages
│   ├── sign-up/
│   └── _archived/             # Archived pages (lint warnings only)
│
├── components/                # 166 React component files
│   ├── avinode/               # 37 files (components + tests)
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
│   │   └── (+ test files and utilities)
│   ├── chat/                  # Chat components (AgentMessageV2, etc.)
│   ├── contract/              # ContractSentConfirmation (ONEK-207)
│   ├── conversation-starters/ # Smart starters with context awareness
│   ├── customer-selection-dialog.tsx
│   ├── email/                 # EmailPreviewCard with margin slider
│   ├── mcp-ui/                # MCP UI composites (ONEK-206)
│   │   └── composites/        # TripCreatedUI, QuoteDetailsUI, etc.
│   ├── message-components/    # Quote comparison, proposal preview, types
│   ├── proposal/              # ProposalSentConfirmation
│   ├── quotes/                # Quote cards
│   ├── rich-messages/         # Markdown rendering
│   ├── ui/                    # Base UI (shadcn/ui)
│   └── workflow-steps/        # Workflow UI
│
├── lib/                       # Core libraries (145 files)
│   ├── airports/              # Airport database (US + European airports)
│   ├── avinode/               # Avinode utilities, RFQ transforms
│   ├── chat/                  # Chat state, hooks, transformers
│   ├── config/                # Configuration
│   ├── conversation/          # Conversational RFP flow
│   ├── design-system/         # Tailwind helpers
│   ├── hooks/                 # React hooks
│   ├── linear/                # Linear integration
│   ├── mcp/                   # MCP client library (Avinode, Gmail clients)
│   ├── mcp-ui/                # Tool UI Registry (11 tools registered)
│   ├── middleware/             # Auth middleware
│   ├── mock-data/             # Test data
│   ├── pdf/                   # PDF generation (proposals, contracts)
│   ├── prompts/               # System prompt (multi-city, round-trip guidance)
│   ├── rbac/                  # Role-based access
│   ├── resilience/            # Circuit breakers
│   ├── services/              # Business logic (email, proposal, margin)
│   ├── sessions/              # Session management
│   ├── supabase/              # Database client + MCP helpers
│   ├── types/                 # Type definitions
│   ├── utils/                 # Utilities
│   └── validations/           # Zod schemas
│
├── mcp-servers/               # MCP servers (45 files)
│   ├── avinode-mcp-server/    # 100% complete (8 tools, segments[])
│   ├── gmail-mcp-server/      # 95% complete (production-ready)
│   ├── google-sheets-mcp-server/ # 70% complete (OAuth needed)
│   └── supabase-mcp-server/   # 100% complete
│
├── __tests__/                 # Test files (153 total)
│   ├── e2e/                   # End-to-end tests
│   ├── helpers/               # Test utilities
│   ├── integration/           # Integration tests
│   │   ├── agents/
│   │   ├── auth/
│   │   ├── conversation/
│   │   ├── database/
│   │   ├── environment/
│   │   ├── mcp/
│   │   └── proposal/
│   ├── mocks/                 # Test mocks
│   ├── templates/             # Test templates
│   └── unit/                  # Unit tests
│       ├── api/               # API route tests
│       ├── components/        # Component tests (avinode, chat, starters)
│       ├── lib/               # Library tests (avinode, chat, mcp-ui, pdf)
│       ├── mcp/               # MCP tests
│       ├── mcp-servers/       # MCP server tests
│       └── prompts/           # Prompt tests
│
├── docs/                      # Documentation (331 files)
│   ├── agents/
│   ├── api/
│   ├── architecture/
│   ├── avinode/
│   ├── deployment/
│   ├── features/
│   ├── implementation/
│   ├── plans/
│   ├── uat/                   # UAT instructions and E2E reports
│   └── ux/
│
├── supabase/                  # Database (41 files)
│   └── migrations/            # 35 migration files
│
├── scripts/                   # Utility scripts (158 files)
│   ├── avinode/
│   ├── clerk/
│   ├── code-review/           # Morpheus Validator
│   ├── database/
│   └── ...
│
├── .context/                  # Project context (this directory)
│   ├── assessments/           # Status reports
│   ├── documentation/
│   ├── planning/
│   ├── status/
│   └── workspaces/
│
├── .claude/                   # Claude Code config (100 files)
│   ├── agents/                # Agent definitions
│   ├── commands/              # 50+ slash commands
│   ├── hooks/                 # Git hooks, worktree automation
│   ├── plans/                 # Implementation plans
│   └── skills/                # 7 custom skills
│
└── .github/                   # GitHub config (15 files)
    ├── workflows/             # CI/CD workflows (5 workflows)
    └── PULL_REQUEST_TEMPLATE/
```

---

## Key Statistics

### Codebase Size (February 2026)

| Metric | Jan 31 | Feb 9 | Change |
|--------|--------|-------|--------|
| **TypeScript Files** | 589 | 655 | +66 |
| **Component Files** | 101 | 166 | +65 |
| **Test Files** | 108 | 153 | +45 |
| **API Routes** | 36 | 41 | +5 |
| **Migrations** | 32 | 35 | +3 |
| **Avinode Components** | 21 | 37 | +16 |
| **MCP Server Files** | ~35 | 45 | +10 |
| **Total Commits** | ~420 | 520 | +100 |
| **TypeScript Errors** | 14 | **0** | Fixed |
| **Merged PRs (Feb)** | — | 15 | #92-#108 |

---

## Architecture Highlights

### Single-Agent Architecture
```
JetvisionAgent (agents/jetvision-agent/)
    │
    ├── System Prompt (lib/prompts/jetvision-system-prompt.ts)
    │   ├── Multi-city detection (segments[])
    │   ├── Round-trip detection (return_date)
    │   └── Forced tool patterns for common intents
    │
    ├── Working Memory (ONEK-184)
    │   └── Cross-turn tripId/rfqId retention
    │
    ├── Tool Executor (tool-executor.ts)
    │   └── Routes to MCP servers
    │
    └── MCP Servers (mcp-servers/)
        ├── Avinode MCP (flights, trips, quotes, messages)
        ├── Gmail MCP (email sending, proposal delivery)
        ├── Supabase MCP (database operations)
        └── Google Sheets MCP (client data - partial)
```

### Chat + Rendering Flow
```
User Message → Chat API → JetvisionAgent → Tool Executor → MCP Server
                    ↓
              SSE Streaming ← Response ← Tool Result
                    ↓
              AgentMessageV2 → ToolUIRenderer → Tool UI Registry
                    ↓                                   ↓
              Rich Card Rendering            extractProps() → Component
                    ↓
              Message Persistence (Supabase)
```

### Full Proposal Workflow
```
Trip Created → RFQ Sent → Quotes Received → Quote Comparison
                                                    ↓
                                            Proposal Generated (PDF)
                                                    ↓
                                         Email Preview (margin slider)
                                                    ↓
                                            User Approval (human-in-loop)
                                                    ↓
                                         Email Sent → Confirmation
                                                    ↓
                                         Book Flight → Contract Generated
                                                    ↓
                                         Contract Card (auto-open PDF)
```

---

## Notable Patterns

### Singleton Patterns
- `AgentFactory` — Single agent factory instance
- `AgentRegistry` — Central agent registry
- `MessageBus` — Single message bus for pub/sub
- `HandoffManager` — Single handoff coordinator
- `WorkflowStateManager` — Single workflow manager
- `MCPServerManager` — Single MCP server manager

### Component Organization
- Avinode components: `components/avinode/` (37 files)
- MCP UI composites: `components/mcp-ui/composites/` (11 tools)
- Quote components: `components/quotes/`
- Message components: `components/message-components/`
- Chat components: `components/chat/`
- Email components: `components/email/`
- Proposal components: `components/proposal/`
- Contract components: `components/contract/`

### Test Organization
- Unit tests mirror source structure in `__tests__/unit/`
- Integration tests for cross-cutting concerns (25+ files)
- E2E tests with comprehensive reports in `docs/uat/`
- 295+ unit tests pass in pre-commit hook

---

## Project Health Indicators

### Positive Signs
- **0 TypeScript errors** (down from 14)
- **0 open Linear issues** (board completely clear)
- Strong core infrastructure (97%+ complete)
- Comprehensive coordination layer (100% complete)
- MCP UI Tool Registry provides clean extensibility
- Multi-city and round-trip workflows fully tested (ONEK-144)
- 100 commits in February 2026 alone
- 15 PRs merged (#92-#108)
- 520 total commits

### Areas Needing Attention
- `.venv/` tracked in git (should be gitignored)
- 30+ lint warnings (mostly archived files and `<img>` usage)
- Google Sheets OAuth not complete (70%)
- Production deployment configuration (Sentry, rate limiting)
- Load testing not performed

### Recently Resolved
- TypeScript errors (all 14 fixed)
- Duplicate proposal/email cards (ONEK-209)
- Type safety for rfqFlights (ONEK-208)
- Agent prompt gaps for multi-city (ONEK-210/211)
- Multi-city trip renders as one-way (ONEK-144)

---

## Recommendations

1. **Remove `.venv/` from git** — Add to `.gitignore` and `git rm -r --cached .venv/`
2. **Production setup** — Configure Sentry, rate limiting, and environment variables
3. **Suppress archived lint warnings** — Remove `app/_archived/` or exclude from ESLint
4. **Google Sheets OAuth** — Complete for v1.1 (non-blocking for launch)
5. **Create new sprint** — Board is clear; create issues for deployment and Phase 2 features

**Overall Assessment**: Project structure is mature, well-organized, and production-ready. 92% overall completion with 0 blocking issues.
