# Project Structure Analysis

**Project**: Jetvision AI Assistant
**Analysis Date**: 2025-11-13
**Status**: 62% Complete

---

## Directory Tree (High-Level)

```
v0-jetvision-assistant/
├── .context/                      # 📊 NEW - Project analysis documents
├── .github/workflows/             # ✅ CI/CD workflows
├── .husky/                        # ✅ Git hooks
├── agents/                        # ✅ Multi-agent system (87% complete)
├── app/                           # 🟡 Next.js 14 application
├── components/                    # ✅ React components (54 files)
├── docs/                          # ✅ Comprehensive documentation
├── lib/                           # ✅ Shared libraries
├── mcp-servers/                   # 🟡 MCP server implementations (35% complete)
├── supabase/migrations/           # ✅ Database migrations (10 files)
├── __tests__/                     # 🟡 Test suites (56+ files, 640 tests)
├── public/                        # ✅ Static assets
├── scripts/                       # ✅ Development and deployment scripts
├── package.json                   # ✅ Dependencies (157 packages)
└── [config files]                 # ✅ TypeScript, Vitest, Next.js, etc.
```

---

## Core Directories Analysis

### `/agents` - Multi-Agent System (87% ✅)

```
agents/
├── core/                          # ✅ 100% Complete - Foundation
│   ├── base-agent.ts             # Abstract base class (9,669 bytes)
│   ├── agent-factory.ts          # Singleton factory pattern
│   ├── agent-registry.ts         # Central registry
│   ├── agent-context.ts          # Context manager
│   ├── gpt5-configs.ts           # GPT-5 model configs
│   ├── types.ts                  # Type definitions
│   └── index.ts                  # Barrel exports
│
├── coordination/                  # ✅ 100% Complete - Coordination layer
│   ├── message-bus.ts            # EventEmitter pub/sub (5,538 bytes)
│   ├── handoff-manager.ts        # Task delegation (5,499 bytes)
│   ├── task-queue.ts             # BullMQ + Redis (6,054 bytes)
│   ├── state-machine.ts          # Workflow states (8,606 bytes)
│   └── index.ts                  # Barrel exports
│
├── implementations/               # 🟡 45% Complete - Agent implementations
│   ├── orchestrator-agent.ts     # RFP orchestration (60% done)
│   ├── client-data-agent.ts      # Client profile fetching (40% done)
│   ├── flight-search-agent.ts    # Avinode integration (50% done)
│   ├── proposal-analysis-agent.ts # Quote scoring (55% done)
│   ├── communication-agent.ts    # Email generation (50% done)
│   └── error-monitor-agent.ts    # Error tracking (65% done)
│
├── tools/                         # ❌ 0% - Agent-specific tools (EMPTY)
├── guardrails/                    # ❌ 0% - Safety checks (EMPTY)
└── monitoring/                    # ❌ 0% - Observability (EMPTY)
```

**Status**: Strong foundation, partial implementations
**Total Files**: 18 TypeScript files
**LOC**: ~50,000+ lines

---

### `/mcp-servers` - Model Context Protocol (35% 🟡)

```
mcp-servers/
├── avinode-mcp-server/            # 🟡 60% Complete
│   ├── src/
│   │   ├── index.ts              # Main server entry
│   │   ├── client.ts             # API client
│   │   ├── types.ts              # Type definitions
│   │   └── mock/                 # Mock data (ONEK-76 ✅)
│   ├── tests/                    # Basic tests
│   └── package.json
│
├── google-sheets-mcp-server/      # 🟡 30% Complete
│   ├── src/
│   │   ├── index.ts              # Server structure
│   │   └── types.ts              # Type definitions
│   └── package.json              # Missing: OAuth, CRUD ops
│
├── gmail-mcp-server/              # 🟡 30% Complete
│   ├── src/
│   │   ├── index.ts              # Server structure
│   │   └── types.ts              # Type definitions
│   └── package.json              # Missing: OAuth, send email
│
└── supabase-mcp-server/           # 🟡 40% Complete
    ├── src/
    │   ├── index.ts              # Basic CRUD
    │   └── types.ts              # Type definitions
    └── package.json              # Missing: Complex queries
```

**Status**: Scaffolding complete, implementations partial
**Total Files**: 26 TypeScript files (excluding node_modules)
**Key Gap**: OAuth 2.0 flows not implemented

---

### `/app` - Next.js 14 Application (67% 🟡)

```
app/
├── page.tsx                       # 🟡 Landing page (uses mocks)
├── layout.tsx                     # ✅ Root layout with Clerk
├── global-error.tsx               # ✅ Error boundary
├── not-found.tsx                  # ✅ 404 page
│
├── chat/                          # 🟡 Main chat interface
│   └── page.tsx                  # Needs ONEK-92 implementation
│
├── dashboard/                     # 🟡 Legacy multi-page UI
│   ├── page.tsx                  # Dashboard home
│   ├── layout.tsx                # Dashboard layout
│   ├── new-request/page.tsx      # RFP form
│   └── quotes/page.tsx           # Quotes list
│
├── settings/profile/              # ✅ Profile management
│   └── page.tsx                  # User profile UI
│
├── sign-in/[[...sign-in]]/        # ✅ Clerk sign-in
│   └── page.tsx
│
├── sign-up/[[...sign-up]]/        # ✅ Clerk sign-up
│   └── page.tsx
│
├── _archived/dashboard/           # 📦 Old dashboard (to be removed)
│
└── api/                           # ✅ API Routes (14 routes)
    ├── agents/route.ts           # Agent CRUD
    ├── chat/respond/route.ts     # Chat endpoint
    ├── chatkit/session/route.ts  # ChatKit integration
    ├── clients/route.ts          # Client CRUD
    ├── requests/route.ts         # Request CRUD
    ├── quotes/route.ts           # Quote CRUD
    ├── workflows/route.ts        # Workflow tracking
    ├── users/me/route.ts         # User profile
    ├── webhooks/clerk/route.ts   # Clerk webhook
    ├── email/route.ts            # Email API
    ├── analytics/route.ts        # Analytics
    └── mcp/health/route.ts       # MCP health check
```

**Status**: API layer solid, frontend needs unified chat
**Total API Routes**: 14 routes
**Total Page Components**: ~15 pages

---

### `/components` - React Components (75% ✅)

```
components/
├── ui/                            # ✅ Radix UI components (24+)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   └── [20+ more]
│
├── message-components/            # ✅ ONEK-93 complete
│   ├── action-buttons.tsx        # Quick reply buttons
│   ├── file-attachment.tsx       # File display
│   ├── form-field.tsx            # Inline forms
│   ├── message-renderer.tsx      # Main renderer
│   ├── progress-indicator.tsx    # Progress bars
│   ├── proposal-preview.tsx      # Proposal display
│   ├── quote-card.tsx            # Individual quotes
│   ├── quote-comparison.tsx      # Quote comparison
│   ├── workflow-status.tsx       # Workflow visualization
│   ├── types.ts                  # Type definitions
│   └── index.ts                  # Exports
│
├── aviation/                      # 🟡 Aviation-specific
│   ├── quote-card.tsx            # Quote display
│   ├── aircraft-card.tsx         # Aircraft info
│   └── [3+ more]
│
├── rfp/                           # 🟡 RFP form components
│   ├── steps/                    # Multi-step form
│   └── [8+ components]
│
├── chat-interface.tsx             # 🟡 Main chat UI
├── workflow-visualization.tsx     # ✅ Workflow display
└── [30+ other components]
```

**Status**: Strong component library, needs chat integration
**Total TSX Files**: 54 files
**Recent Addition**: ONEK-93 message components (12 files)

---

### `/lib` - Shared Libraries (80% ✅)

```
lib/
├── agents/                        # ✅ Agent utilities
├── config/                        # ✅ Configuration
│   ├── openai-config.ts
│   └── redis-config.ts
│
├── hooks/                         # 🟡 React hooks
│   ├── use-chat-agent.ts         # ⚠️ Implemented but unused
│   ├── use-rfp-realtime.ts       # ⚠️ Implemented but unused
│   └── use-user-role.ts          # ✅ RBAC hook
│
├── mcp/                           # ✅ MCP client utilities
│   ├── clients/
│   ├── errors/
│   └── transports/
│
├── middleware/                    # ✅ Middleware
│   └── rbac.ts                   # 72 tests passing
│
├── mock-data/                     # ✅ Test data (ONEK-71, ONEK-76)
│   ├── aircraft-database.ts      # 40 tests
│   └── avinode-responses.ts      # 59 tests
│
├── pdf/                           # ❌ PDF generation (MISSING)
│
├── services/                      # ✅ Core services
│   ├── chat-agent-service.ts    # 28,826 bytes
│   ├── mcp-server-manager.ts    # 10,419 bytes (ONEK-78 ✅)
│   └── supabase-queries.ts      # 7,609 bytes
│
├── supabase/                      # ✅ Supabase client
├── types/                         # ✅ Type definitions
├── utils/                         # ✅ Utilities
├── validation/                    # ✅ Zod schemas
└── validations/                   # ✅ Form validations
```

**Status**: Excellent infrastructure, some unused hooks
**Total Files**: 52 TypeScript files

---

### `/supabase/migrations` - Database (100% ✅)

```
supabase/migrations/
├── 001_initial_schema.sql         # Core tables
├── 002_rls_policies.sql           # 24 RLS policies
├── 003_seed_data.sql              # Test data
├── 004_proposals_table.sql        # Proposals
├── 20250101000000_create_chatkit_sessions.sql  # ChatKit
└── DEPLOY_ALL.sql                 # All-in-one deployment
```

**Status**: Production-ready schema
**Tables**: 7 tables (iso_agents, clients, requests, quotes, proposals, workflows, chatkit_sessions)
**RLS Policies**: 24 policies for multi-tenant security
**Relationships**: All foreign keys defined

---

### `/__tests__` - Test Suite (65% 🟡)

```
__tests__/
├── unit/                          # ✅ Unit tests
│   ├── agents/                   # 6 test files
│   ├── api/                      # 11 test files
│   ├── app/                      # 2 test files (25 failures)
│   ├── auth/                     # 1 test file
│   ├── components/               # 1 test file (20 tests)
│   ├── hooks/                    # 1 test file
│   ├── lib/                      # 2 test files
│   ├── mcp/                      # 3 test files
│   ├── mcp-servers/              # 3 test files
│   ├── middleware/               # 1 test file (72 tests)
│   ├── mock-data/                # 2 test files
│   └── services/                 # 1 test file
│
├── integration/                   # 🟡 Integration tests
│   ├── api/                      # User migration tests
│   ├── auth/                     # Auth flow tests
│   ├── database/                 # Schema + RLS tests
│   ├── environment/              # Config tests
│   └── mcp/                      # MCP integration tests
│
├── e2e/                           # 🟡 E2E tests
│   ├── auth.backup/              # ⚠️ Auth tests in backup
│   └── agent-workflow.test.ts   # Agent workflow E2E
│
├── helpers/                       # ✅ Test utilities
│   └── setup.ts                  # Global test setup
│
└── utils/                         # ✅ Test utils
```

**Status**: Good coverage, some failures
**Total Test Files**: 56+ files
**Tests Passing**: 640 tests across 29 suites
**Tests Failing**: 30 tests (ProfilePage + ChatKit)
**Coverage**: ~50% (target: 75%)

---

## Recent Changes (November 2025)

### ✅ Completed
- **2025-11-12**: ONEK-93 - Message Component System (12 files, commit 1614e84)
- **2025-11-09**: ONEK-89 - Test Infrastructure Fix (commit cbb3bf8)
- **2025-11-08**: TypeScript fixes across codebase
- **2025-11-06**: Avinode MCP Server (PR #6, commit 6fd439d)

### 📋 In Progress
- **ONEK-92**: Unified Chat Interface (just started, 88 story points)
- Agent implementations (45% complete)
- MCP server OAuth flows
- Test coverage expansion

---

## File Count Summary

| Directory | TypeScript | TSX | Tests | Total |
|-----------|------------|-----|-------|-------|
| `/agents` | 18 | 0 | 6 | 24 |
| `/mcp-servers` | 26 | 0 | 3 | 29 |
| `/app` | ~30 | ~15 | 11 | ~56 |
| `/components` | 0 | 54 | 1 | 55 |
| `/lib` | 52 | 0 | 8 | 60 |
| `/__tests__` | 0 | 0 | 56 | 56 |
| **Total** | **~126** | **~69** | **85** | **~280** |

---

## Configuration Files

```
Root directory config files:
├── .eslintrc.json                 # ESLint configuration
├── .gitignore                     # Git ignore rules
├── .nvmrc                         # Node version
├── next.config.mjs                # Next.js configuration
├── package.json                   # Dependencies (157 packages)
├── pnpm-lock.yaml                 # Lock file
├── postcss.config.js              # PostCSS
├── tailwind.config.ts             # Tailwind CSS
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts               # Vitest test configuration
└── CLAUDE.md                      # Development guide
```

---

## Key Insights

### Strengths ✅
1. **Well-Organized Structure**: Clear separation of concerns
2. **Comprehensive Documentation**: docs/ folder with architecture details
3. **Strong Type Safety**: TypeScript strict mode throughout
4. **Modern Stack**: Next.js 14, React 18, latest tooling
5. **Test Infrastructure**: 56+ test files, good foundation

### Areas for Improvement 🟡
1. **Empty Directories**: agents/tools/, agents/guardrails/, agents/monitoring/
2. **Unused Hooks**: use-chat-agent.ts, use-rfp-realtime.ts implemented but not used
3. **Archived Code**: app/_archived/dashboard/ should be removed after migration
4. **Mock Data in Production**: lib/mock-data.ts used in production code paths

### Critical Gaps ❌
1. **No lib/pdf/**: PDF generation service missing
2. **Partial MCP Implementations**: OAuth flows incomplete
3. **Test Failures**: 30 tests failing
4. **No Docker Setup**: Missing containerization files

---

## Recommended Cleanup

### Immediate
1. Remove app/_archived/dashboard/ after ONEK-92 migration
2. Wire use-chat-agent.ts and use-rfp-realtime.ts into chat interface
3. Create lib/pdf/ directory with generation service
4. Fix 30 failing tests

### Short-term
1. Populate agents/tools/ with agent-specific tools
2. Add agents/guardrails/ safety checks
3. Implement agents/monitoring/ observability hooks
4. Remove lib/mock-data.ts from production imports

---

**Generated**: 2025-11-13 by Claude Code Analysis
