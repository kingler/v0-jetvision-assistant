# Project Structure - Jetvision AI Assistant

**Analysis Date**: 2025-12-09
**Project**: Jetvision Multi-Agent System
**Architecture**: Multi-Agent System with OpenAI + MCP Servers
**Stack**: Next.js 14, TypeScript, Supabase, BullMQ, Clerk Auth

---

## Directory Tree Overview

```
v0-jetvision-assistant/
├── .claude/                      # Claude Code configuration
│   ├── commands/                 # 35+ custom slash commands
│   ├── agents/                   # Worktree manager agent
│   ├── hooks/                    # Git hooks automation
│   ├── skills/                   # Git worktree isolation skill
│   └── workspaces/               # Agent workspace management
│
├── .context/                     # Project context & documentation
│   ├── assessments/              # Status and readiness reports
│   ├── documentation/            # Technical documentation
│   ├── planning/                 # Planning and recommendations
│   └── status/                   # Status updates
│
├── .github/                      # GitHub configuration
│   ├── workflows/                # CI/CD workflows (5 workflows)
│   │   ├── code-review.yml       # Automated code review
│   │   ├── pr-code-review.yml    # PR review with morpheus-validator
│   │   ├── linear-sync.yml       # Linear issue synchronization
│   │   ├── auto-create-pr.yml    # Auto PR creation for feature branches
│   │   └── review-command.yml    # Manual review triggers
│   └── PULL_REQUEST_TEMPLATE/    # PR templates
│
├── .husky/                       # Git hooks (Husky)
│   ├── pre-commit                # Type check, lint, unit tests
│   ├── pre-push                  # Full test suite
│   └── commit-msg                # Conventional commits validation
│
├── __tests__/                    # Test suites (58 test files)
│   ├── unit/                     # Unit tests (640+ tests passing)
│   │   ├── agents/               # Agent tests (6 files)
│   │   ├── api/                  # API route tests (11 files)
│   │   ├── components/           # Component tests
│   │   ├── lib/                  # Library tests
│   │   └── mcp/                  # MCP server tests (3 files)
│   ├── integration/              # Integration tests (5 suites)
│   │   ├── auth/                 # Auth flow tests
│   │   ├── conversation/         # Conversation tests
│   │   ├── database/             # Database tests
│   │   └── mcp/                  # MCP integration tests
│   ├── e2e/                      # End-to-end tests (Playwright)
│   ├── helpers/                  # Test utilities
│   └── utils/                    # Test utilities
│
├── agents/                       # AI Agent System (23 files)
│   ├── core/                     # ✅ 95% Complete
│   │   ├── base-agent.ts         # Abstract base class for all agents
│   │   ├── agent-factory.ts      # Singleton factory for agent creation
│   │   ├── agent-registry.ts     # Central agent registry
│   │   ├── agent-context.ts      # Context management
│   │   ├── gpt5-configs.ts       # GPT-5 model configurations
│   │   ├── types.ts              # Type definitions
│   │   └── index.ts              # Barrel exports
│   │
│   ├── coordination/             # ✅ 100% Complete
│   │   ├── message-bus.ts        # EventEmitter-based pub/sub
│   │   ├── handoff-manager.ts    # Task delegation between agents
│   │   ├── task-queue.ts         # BullMQ + Redis async queue
│   │   ├── state-machine.ts      # Workflow state management (11 states)
│   │   └── index.ts              # Barrel exports
│   │
│   ├── implementations/          # 🟢 70% Complete (NEW: +25% since last report)
│   │   ├── orchestrator-agent.ts        # ✅ 85% (was 60%) - Conversational capabilities added
│   │   ├── client-data-agent.ts         # 🟡 40% - Needs Google Sheets MCP
│   │   ├── flight-search-agent.ts       # ✅ 80% (was 50%) - Avinode MCP integrated
│   │   ├── proposal-analysis-agent.ts   # 🟡 55% - Scoring complete
│   │   ├── communication-agent.ts       # 🟡 50% - Email generation works
│   │   └── error-monitor-agent.ts       # 🟡 65% - Basic monitoring
│   │
│   └── tools/                    # 🟡 40% Complete (NEW: Added recently)
│       ├── intent-parser.ts      # ✅ Intent parsing for RFP extraction
│       ├── data-extractor.ts     # ✅ Extract flight details from messages
│       ├── question-generator.ts # ✅ Generate follow-up questions
│       ├── types.ts              # Tool type definitions
│       └── index.ts              # Barrel exports
│
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (15 routes)
│   │   ├── agents/               # Agent management
│   │   ├── analytics/            # Analytics endpoints
│   │   ├── chat/                 # Chat API
│   │   │   └── respond/          # Chat response endpoint
│   │   ├── chatkit/              # ChatKit integration
│   │   │   └── session/          # ChatKit session management
│   │   ├── clients/              # Client management
│   │   ├── email/                # Email sending
│   │   ├── mcp/                  # MCP server health checks
│   │   │   └── health/           # Health check endpoint
│   │   ├── quotes/               # Quote management
│   │   ├── requests/             # RFP request management
│   │   ├── rfp/                  # RFP processing
│   │   │   └── process/          # RFP processing endpoint
│   │   ├── users/                # User management
│   │   │   └── me/               # Current user profile
│   │   │       └── avatar/       # Avatar upload
│   │   ├── webhooks/             # Webhook handlers
│   │   │   └── clerk/            # Clerk auth webhooks
│   │   └── workflows/            # Workflow tracking
│   │
│   ├── chat/                     # ✅ Chat interface page (NEW)
│   ├── dashboard/                # Dashboard pages
│   │   ├── new-request/          # New RFP request form
│   │   └── quotes/               # Quote viewing
│   ├── settings/                 # Settings pages
│   │   └── profile/              # User profile management
│   ├── sign-in/                  # Clerk sign-in
│   ├── sign-up/                  # Clerk sign-up
│   ├── _archived/                # Old dashboard (to be removed)
│   ├── layout.tsx                # Root layout with Clerk
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
│
├── components/                   # React Components (55+ files)
│   ├── aviation/                 # Aviation-specific components
│   │   ├── aircraft-card.tsx     # Aircraft details display
│   │   ├── flight-details.tsx    # Flight information
│   │   └── quote-card.tsx        # Quote display card
│   │
│   ├── message-components/       # ✅ Message Components (ONEK-93)
│   │   ├── action-buttons.tsx    # Inline action buttons
│   │   ├── file-attachment.tsx   # File attachments in messages
│   │   ├── form-field.tsx        # Form fields in chat
│   │   ├── message-renderer.tsx  # Main message renderer
│   │   ├── progress-indicator.tsx # Progress bars
│   │   ├── proposal-preview.tsx  # Proposal preview cards
│   │   ├── quote-card.tsx        # Rich quote cards
│   │   ├── quote-comparison.tsx  # Quote comparison table
│   │   └── workflow-status.tsx   # Workflow status display
│   │
│   ├── rfp/                      # RFP form components
│   │   ├── steps/                # Multi-step form components
│   │   └── rfp-form.tsx          # Main RFP form
│   │
│   ├── ui/                       # shadcn/ui components (24+ components)
│   │   ├── button.tsx            # Button component
│   │   ├── card.tsx              # Card component
│   │   ├── dialog.tsx            # Dialog component
│   │   ├── form.tsx              # Form component
│   │   ├── input.tsx             # Input component
│   │   ├── select.tsx            # Select component
│   │   ├── table.tsx             # Table component
│   │   └── ...                   # 17+ more components
│   │
│   ├── chat-interface.tsx        # ✅ NEW: Main chat interface
│   ├── chat-sidebar.tsx          # Chat session sidebar
│   ├── message-list.tsx          # Message list display
│   └── ...                       # Other components
│
├── docs/                         # Documentation (100+ files)
│   ├── architecture/             # Architecture documentation
│   │   ├── MULTI_AGENT_SYSTEM.md           # Complete system architecture
│   │   ├── DATABASE_SCHEMA_DIAGRAM.md      # Database schema
│   │   ├── MCP_SERVER_ARCHITECTURE.md      # MCP architecture
│   │   ├── UNIFIED_CHAT_INTERFACE.md       # Unified chat design
│   │   └── IMPLEMENTATION_SUMMARY.md       # Phase 1 summary
│   │
│   ├── code-review/              # Code review documentation
│   ├── communication/            # Project updates
│   ├── database/                 # Database documentation
│   ├── deployment/               # Deployment guides
│   ├── git/                      # Git workflow documentation
│   ├── guides/                   # Development guides
│   ├── BRD.md                    # Business Requirements Document
│   ├── PRD.md                    # Product Requirements Document
│   ├── CLAUDE.md                 # ✅ Claude Code comprehensive guide
│   ├── GETTING_STARTED.md        # Getting started guide
│   ├── SYSTEM_ARCHITECTURE.md    # System overview
│   └── ...                       # 80+ more documentation files
│
├── hooks/                        # React hooks
│   ├── use-chat-agent.ts         # Chat agent integration hook
│   ├── use-rfp-realtime.ts       # Real-time RFP updates
│   └── ...                       # Other hooks
│
├── lib/                          # Shared libraries
│   ├── agents/                   # Agent utilities
│   ├── config/                   # Configuration
│   ├── conversation/             # Conversation utilities
│   ├── hooks/                    # Hook utilities
│   ├── linear/                   # Linear integration
│   ├── mcp/                      # MCP client libraries
│   │   ├── clients/              # MCP client implementations
│   │   ├── errors/               # MCP error handling
│   │   └── transports/           # MCP transport layers
│   ├── middleware/               # Middleware (RBAC)
│   ├── mock-data/                # Mock data for development
│   ├── pdf/                      # PDF generation utilities
│   ├── rbac/                     # Role-based access control
│   ├── services/                 # Service layer
│   │   └── mcp-server-manager.ts # ✅ MCP server manager singleton
│   ├── supabase/                 # Supabase client
│   ├── task-runner/              # Task runner utilities
│   ├── types/                    # Shared types
│   ├── utils/                    # Utility functions
│   └── validations/              # Zod validation schemas
│
├── mcp-servers/                  # MCP Server Implementations (26 files)
│   ├── avinode-mcp-server/       # 🟢 75% Complete (was 60%)
│   │   ├── src/
│   │   │   ├── index.ts          # Main server entry
│   │   │   ├── api-client.ts     # ✅ Avinode API client
│   │   │   ├── tools/            # ✅ Tool implementations
│   │   │   └── mock/             # ✅ Mock data infrastructure
│   │   ├── dist/                 # Compiled output
│   │   ├── tests/                # Test files
│   │   │   ├── unit/             # Unit tests
│   │   │   ├── integration/      # Integration tests
│   │   │   └── fixtures/         # Test fixtures
│   │   ├── package.json          # Dependencies
│   │   └── tsconfig.json         # TypeScript config
│   │
│   ├── google-sheets-mcp-server/ # 🟡 30% - Needs OAuth
│   │   └── src/                  # Basic structure
│   │
│   ├── gmail-mcp-server/         # 🟡 30% - Needs OAuth
│   │   └── src/                  # Basic structure
│   │
│   └── supabase-mcp-server/      # 🟡 40% - Needs complex queries
│       └── src/                  # Basic CRUD operations
│
├── public/                       # Static assets
│   └── images/                   # Image assets
│
├── reports/                      # Generated reports
│
├── scripts/                      # Utility scripts
│   ├── code-review/              # Code review scripts
│   ├── database/                 # Database scripts
│   ├── linear/                   # Linear integration scripts
│   ├── mcp/                      # MCP utility scripts
│   ├── test/                     # Test scripts
│   └── testing/                  # Testing utilities
│
├── supabase/                     # Supabase configuration
│   └── migrations/               # Database migrations (10 files)
│       ├── 001_*.sql             # Initial schema
│       ├── 002_*.sql             # RLS policies
│       ├── 003_*.sql             # Foreign keys
│       ├── 004_*.sql             # Seed data
│       ├── 005_*.sql             # User roles update
│       ├── 006_*.sql             # ChatKit sessions
│       └── ...                   # 4 more migrations
│
├── tasks/                        # Task management
│   ├── backlog/                  # Backlog tasks
│   ├── completed/                # Completed tasks
│   └── templates/                # Task templates
│
├── .env.example                  # ✅ Environment template
├── .gitignore                    # Git ignore rules
├── .mcp.json                     # ✅ MCP configuration
├── middleware.ts                 # ✅ Clerk middleware
├── next.config.mjs               # Next.js configuration
├── package.json                  # ✅ Dependencies + 40+ scripts
├── pnpm-lock.yaml                # pnpm lockfile
├── tsconfig.json                 # TypeScript configuration
├── vercel.json                   # Vercel deployment config
├── vitest.config.ts              # ✅ Test configuration
├── CLAUDE.md                     # ✅ Claude Code comprehensive guide
└── README.md                     # Project README
```

---

## Key Statistics

### Codebase Size
- **Total TypeScript files**: ~230 files (was 200+)
- **Agent files**: 23 files (was 18)
- **MCP server files**: 26 files
- **Component files**: 55 TSX files (was 54)
- **API routes**: 15 routes (was 14)
- **Test files**: 58 test files (was 56+)
- **Documentation files**: 100+ markdown files

### Lines of Code (Estimated)
- **Agents**: ~3,500 lines
- **API Routes**: ~2,000 lines
- **Components**: ~4,500 lines
- **MCP Servers**: ~2,500 lines
- **Tests**: ~8,000 lines
- **Total**: ~20,000+ lines

### Dependencies
- **Production**: 87 packages
- **Development**: 70 packages
- **Total**: 157 packages

---

## New Files Since Last Report (2025-11-13)

### Added (Recent Commits)
1. **agents/tools/** - NEW directory with 4 files
   - `intent-parser.ts` - Intent parsing for RFP extraction
   - `data-extractor.ts` - Extract flight details
   - `question-generator.ts` - Generate follow-up questions
   - `types.ts` & `index.ts` - Types and exports

2. **Conversational RFP Flow** (ONEK-95)
   - Enhanced chat interface with conversational flow
   - Backend integration for RFP gathering

3. **FlightSearchAgent Integration** (ONEK-30)
   - Full integration with Avinode MCP server
   - Tool implementations for flight search

4. **Orchestrator Enhancements** (ONEK-98)
   - Conversational capabilities added
   - Improved NLP understanding

### Updated (Major Changes)
1. **agents/implementations/orchestrator-agent.ts**
   - From 60% → 85% complete
   - Added conversational capabilities
   - Integrated NLP tools

2. **agents/implementations/flight-search-agent.ts**
   - From 50% → 80% complete
   - Full Avinode MCP integration
   - Tool implementations complete

3. **TypeScript Fixes**
   - 52 critical type errors resolved
   - All components type-safe
   - API routes type-safe

### Archived
- Old dashboard pages moved to `app/_archived/`
- Preparing for unified chat interface migration

---

## Architecture Patterns

### Singleton Patterns
- `AgentFactory` - Single agent factory instance
- `AgentRegistry` - Central agent registry
- `MessageBus` - Single message bus for pub/sub
- `HandoffManager` - Single handoff coordinator
- `WorkflowStateManager` - Single workflow manager
- `MCPServerManager` - Single MCP server manager

### Factory Pattern
- `AgentFactory.createAgent()` - Creates agent instances
- Registered agent types: 6 agent implementations

### Observer Pattern (Pub/Sub)
- `MessageBus` - EventEmitter-based messaging
- 7 message types: TASK_CREATED, TASK_STARTED, TASK_COMPLETED, TASK_FAILED, AGENT_HANDOFF, CONTEXT_UPDATE, ERROR

### State Machine Pattern
- `WorkflowStateMachine` - 11 workflow states
- Enforced state transitions
- State timing tracking

### Repository Pattern
- Supabase client abstraction
- RLS-aware data access

---

## Notable File Locations

### Configuration Files
- **Environment**: `.env.example`, `.env.local` (create locally)
- **TypeScript**: `tsconfig.json` (strict mode enabled)
- **Next.js**: `next.config.mjs`
- **Testing**: `vitest.config.ts` (75% coverage thresholds)
- **MCP**: `.mcp.json` (MCP server configuration)
- **Vercel**: `vercel.json` (deployment configuration)
- **Package**: `package.json` (40+ npm scripts)

### Core System Files
- **Agent Core**: `agents/core/base-agent.ts` (1,200+ lines)
- **Coordination**: `agents/coordination/` (4 files, production-ready)
- **Database Schema**: `supabase/migrations/` (10 migrations)
- **Authentication**: `middleware.ts` (Clerk middleware)
- **RBAC**: `lib/middleware/rbac.ts` (72 passing tests)

### Documentation
- **Main Guide**: `CLAUDE.md` (comprehensive 600+ line guide)
- **Architecture**: `docs/architecture/MULTI_AGENT_SYSTEM.md` (400+ lines)
- **BRD**: `docs/BRD.md` (Business Requirements)
- **PRD**: `docs/PRD.md` (Product Requirements)
- **Status**: `.context/status/current-project-status.md`

---

## Change Log Since Last Report

### Major Changes
1. ✅ **ONEK-95**: Conversational RFP Flow implemented
2. ✅ **ONEK-30**: FlightSearchAgent + Avinode MCP integration
3. ✅ **ONEK-98**: Orchestrator conversational capabilities
4. ✅ **ONEK-116**: Avinode 3-party chat integration
5. ✅ **TypeScript Fixes**: 52 critical errors resolved

### Completion Increases
- **Overall Project**: 62% → 72% (+10%)
- **Agent Implementations**: 45% → 70% (+25%)
- **OrchestratorAgent**: 60% → 85% (+25%)
- **FlightSearchAgent**: 50% → 80% (+30%)
- **Avinode MCP**: 60% → 75% (+15%)

### New Features
- Agent tools directory with 4 utilities
- Conversational RFP gathering flow
- FlightSearchAgent Avinode integration
- Enhanced orchestrator with NLP

---

## Project Health Indicators

### Positive Signs ✅
- Strong core infrastructure (95%+ complete)
- Comprehensive coordination layer (100% complete)
- Significant agent progress (45% → 70%)
- TypeScript errors resolved (52 fixed)
- Good test coverage foundation (58 test files)
- Comprehensive documentation (100+ docs)

### Areas Needing Attention 🟡
- Unified Chat Interface (ONEK-92) still in progress
- MCP OAuth flows incomplete (Gmail, Sheets)
- Test coverage below 75% target
- 30 test failures need fixing
- Production deployment infrastructure missing

### Critical Blockers 🔴
- ~~Conversational RFP Flow~~ ✅ DONE (ONEK-95)
- ~~FlightSearchAgent integration~~ ✅ DONE (ONEK-30)
- Unified Chat UI completion (ONEK-92)
- MCP OAuth implementations
- Test failures resolution

---

## Recommendations

1. **Continue ONEK-92** - Complete unified chat interface
2. **Fix Test Failures** - Resolve 30 failing tests
3. **Implement OAuth** - Gmail and Google Sheets MCP servers
4. **Production Deployment** - Create Docker + CI/CD setup
5. **Expand Test Coverage** - Reach 75% threshold

**Overall Assessment**: Project structure is well-organized, comprehensive, and follows best practices. Significant progress made since last report with conversational capabilities and agent integrations.
