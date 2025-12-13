# Claude Code Guide - Jetvision Multi-Agent System

**Project**: Jetvision AI Assistant
**Architecture**: Multi-Agent System with OpenAI Agent SDK + MCP
**Stack**: Next.js 14, TypeScript, Supabase, BullMQ + Redis

---

## Essential Commands

### Development

```bash
# Start app + MCP servers concurrently
npm run dev

# Start Next.js app only
npm run dev:app

# Start MCP servers only
npm run dev:mcp

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run agent tests only
npm run test:agents

# Watch mode (development)
npm run test:watch

# Coverage report (75% threshold)
npm run test:coverage
```

### Agent Management

```bash
# Create new agent scaffold
npm run agents:create

# List all registered agents
npm run agents:list
```

### MCP Tools

```bash
# Create new MCP server
npm run mcp:create

# Test MCP connection
npm run mcp:test

# List available MCP tools
npm run mcp:list-tools
```

### Code Review & Quality

```bash
# Run code review validation (morpheus-validator)
npm run review:validate

# Run TDD workflow (RED -> GREEN -> REFACTOR)
npm run review:tdd

# Generate PR review report (code-review-coordinator)
npm run review:pr

# Auto-fix linting issues
npm run review:fix
```

---

## High-Level Architecture

### Multi-Agent System Overview

The system consists of **6 specialized AI agents** coordinating through an **internal Agent-to-Agent (A2A) communication layer**:

```
┌─────────────────────────────────────────────────┐
│            Agent Core System                     │
│  • BaseAgent - Abstract foundation              │
│  • AgentFactory - Creates agents (Singleton)    │
│  • AgentRegistry - Central registry (Singleton) │
│  • AgentContext - Session management            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         Agent Coordination Layer                 │
│  • MessageBus - Event-driven A2A (EventEmitter) │
│  • HandoffManager - Task delegation             │
│  • TaskQueue - Async processing (BullMQ+Redis)  │
│  • WorkflowStateMachine - State management      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│          6 Specialized Agents                    │
│  • OrchestratorAgent                            │
│  • ClientDataAgent                              │
│  • FlightSearchAgent                            │
│  • ProposalAnalysisAgent                        │
│  • CommunicationAgent                           │
│  • ErrorMonitorAgent                            │
└─────────────────────────────────────────────────┘
```

### Key Agent Types

```typescript
// agents/core/types.ts
enum AgentType {
  ORCHESTRATOR = 'orchestrator',           // Analyzes RFP, delegates tasks
  CLIENT_DATA = 'client_data',             // Fetches client profile
  FLIGHT_SEARCH = 'flight_search',         // Searches flights via Avinode
  PROPOSAL_ANALYSIS = 'proposal_analysis', // Scores and ranks quotes
  COMMUNICATION = 'communication',         // Generates and sends emails
  ERROR_MONITOR = 'error_monitor',         // Monitors errors, retries
}
```

---

## Core Components

### 1. Agent Core (`/agents/core`)

#### Creating an Agent

```typescript
import { AgentFactory, AgentType } from '@agents/core'

// Get singleton factory
const factory = AgentFactory.getInstance()

// Create and initialize agent
const agent = await factory.createAndInitialize({
  type: AgentType.ORCHESTRATOR,
  name: 'RFP Orchestrator',
  model: 'gpt-4-turbo-preview',
  temperature: 0.7,
})

// Execute agent
const result = await agent.execute({
  sessionId: 'session-123',
  requestId: 'request-456',
  userId: 'user-abc',
})
```

#### BaseAgent Abstract Class

All agents extend `BaseAgent` from `agents/core/base-agent.ts`:

```typescript
abstract class BaseAgent implements IAgent {
  // Required implementation
  abstract execute(context: AgentContext): Promise<AgentResult>

  // Available methods
  registerTool(tool: AgentTool): void
  async handoff(toAgent: string, task: AgentTask): Promise<void>
  protected async createChatCompletion(messages: AgentMessage[]): Promise<ChatCompletion>
  getMetrics(): AgentMetrics
  async shutdown(): Promise<void>
}
```

### 2. Agent Coordination (`/agents/coordination`)

#### Message Bus (Internal A2A Communication)

```typescript
import { messageBus, MessageType } from '@agents/coordination'

// Subscribe to messages
const unsubscribe = messageBus.subscribe(
  MessageType.TASK_COMPLETED,
  async (message) => {
    console.log(`Task ${message.payload.taskId} completed by ${message.sourceAgent}`)
  }
)

// Publish a message
await messageBus.publish({
  type: MessageType.TASK_STARTED,
  sourceAgent: 'agent-123',
  targetAgent: 'agent-456',
  payload: { taskId: 'task-789' },
  context: { sessionId: 'session-abc' },
})

// Cleanup
unsubscribe()
```

**7 Message Types**:
- `TASK_CREATED` - New task created
- `TASK_STARTED` - Agent started working
- `TASK_COMPLETED` - Task finished successfully
- `TASK_FAILED` - Task execution failed
- `AGENT_HANDOFF` - Task delegated to another agent
- `CONTEXT_UPDATE` - Shared context updated
- `ERROR` - Error occurred

#### Handoff Manager (Task Delegation)

```typescript
import { handoffManager } from '@agents/coordination'

// Agent A hands off to Agent B
await handoffManager.handoff({
  fromAgent: 'orchestrator-id',
  toAgent: 'client-data-id',
  task: {
    id: 'task-123',
    type: 'fetch_client_data',
    payload: { requestId: 'req-456' },
    priority: 'high',
    status: 'pending',
  },
  context: { sessionId: 'session-789' },
  reason: 'Need client profile before flight search',
})

// Agent B accepts handoff
const task = await handoffManager.acceptHandoff('task-123', 'client-data-id')

// Or rejects it
await handoffManager.rejectHandoff('task-123', 'client-data-id', 'Agent busy')
```

#### Task Queue (Async Processing)

```typescript
import { AgentTaskQueue } from '@agents/coordination'

const queue = new AgentTaskQueue()

// Add task with priority
await queue.addTask(
  {
    id: 'task-123',
    type: 'search_flights',
    payload: { /* data */ },
    priority: 'urgent', // urgent | high | normal | low
  },
  context,
  { priority: 1, attempts: 3 }
)

// Start worker to process tasks
await queue.startWorker(async (job) => {
  const { task, context } = job.data
  // Process task
  return { success: true, data: result }
})
```

**Priority Levels**:
- `urgent` → Priority 1 (immediate)
- `high` → Priority 2
- `normal` → Priority 5 (default)
- `low` → Priority 10

#### Workflow State Machine

```typescript
import { workflowManager, WorkflowState } from '@agents/coordination'

// Create workflow
const workflow = workflowManager.createWorkflow('request-123')

// Transition through states
workflow.transition(WorkflowState.ANALYZING, 'orchestrator-agent')
workflow.transition(WorkflowState.FETCHING_CLIENT_DATA, 'client-data-agent')
workflow.transition(WorkflowState.SEARCHING_FLIGHTS, 'flight-search-agent')

// Check status
console.log(workflow.getState())        // SEARCHING_FLIGHTS
console.log(workflow.isInProgress())     // true
console.log(workflow.getDuration())      // Duration in ms

// Get per-state timings
const timings = workflow.getStateTimings()
console.log(`Time analyzing: ${timings[WorkflowState.ANALYZING]}ms`)
```

**11 Workflow States**:
```
CREATED
  ↓
ANALYZING
  ↓
FETCHING_CLIENT_DATA
  ↓
SEARCHING_FLIGHTS
  ↓
AWAITING_QUOTES
  ↓
ANALYZING_PROPOSALS
  ↓
GENERATING_EMAIL
  ↓
SENDING_PROPOSAL
  ↓
COMPLETED / FAILED / CANCELLED (terminal states)
```

---

## TypeScript Path Aliases

Configured in `vitest.config.ts` and `tsconfig.json`:

```typescript
import { BaseAgent } from '@agents/core'          // agents/core
import { messageBus } from '@agents/coordination' // agents/coordination
import { supabase } from '@/lib/supabase'         // lib/supabase
import { Button } from '@components/ui/button'    // components/ui/button
```

**Available Aliases**:
- `@/` → Root directory
- `@agents/` → `agents/`
- `@lib/` → `lib/`
- `@mcp-servers/` → `mcp-servers/`
- `@components/` → `components/`
- `@tests/` → `__tests__/`

---

## Directory Structure

```
v0-jetvision-assistant/
├── agents/
│   ├── core/                    # ✅ Complete - Agent foundation
│   │   ├── base-agent.ts       # Abstract base class
│   │   ├── agent-factory.ts    # Singleton factory
│   │   ├── agent-registry.ts   # Central registry
│   │   ├── agent-context.ts    # Context manager
│   │   ├── types.ts            # Type definitions
│   │   └── index.ts            # Barrel exports
│   │
│   ├── coordination/            # ✅ Complete - A2A coordination
│   │   ├── message-bus.ts      # EventEmitter-based messaging
│   │   ├── handoff-manager.ts  # Task delegation
│   │   ├── task-queue.ts       # BullMQ async queue
│   │   ├── state-machine.ts    # Workflow states
│   │   └── index.ts            # Barrel exports
│   │
│   ├── implementations/         # 🚧 Pending - Specific agents
│   ├── tools/                   # 🚧 Pending - Agent tools
│   ├── guardrails/             # 🚧 Pending - Safety checks
│   └── monitoring/             # 🚧 Pending - Observability
│
├── mcp-servers/                # 🚧 Pending - MCP servers
│   └── shared/                 # Shared MCP utilities
│
├── lib/
│   ├── supabase/               # ✅ Supabase client
│   ├── config/                 # ✅ Configuration
│   ├── types/                  # ✅ Shared types
│   └── utils/                  # ✅ Utilities
│
├── __tests__/                  # ✅ Structure ready
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   ├── e2e/                    # End-to-end tests
│   └── mocks/                  # Test mocks
│
├── docs/
│   ├── architecture/           # Architecture docs
│   │   ├── MULTI_AGENT_SYSTEM.md        # Complete guide
│   │   └── IMPLEMENTATION_SUMMARY.md    # Phase 1 summary
│   ├── AGENTS.md               # Agent creation guidelines
│   ├── GETTING_STARTED.md      # Getting started guide
│   └── SYSTEM_ARCHITECTURE.md  # System overview
│
├── package.json                # Dependencies + scripts
├── vitest.config.ts           # Testing configuration
├── next.config.mjs            # Next.js config
├── tsconfig.json              # TypeScript config
└── .env.local                 # Environment variables (create this)
```

---

## Environment Variables

Create `.env.local` in the project root:

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION_ID=org-...

# Redis (for task queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

**Start Redis** (required for task queue):
```bash
# Docker (recommended)
docker run -d -p 6379:6379 redis:latest

# Or local install
brew install redis && brew services start redis  # macOS
```

---

## Testing Guidelines

From `docs/AGENTS.md`:

### Coverage Thresholds

Configured in `vitest.config.ts`:
- **Lines**: 75%
- **Functions**: 75%
- **Branches**: 70%
- **Statements**: 75%

### Testing Approach

1. **TDD (Test-Driven Development)**: Write tests before implementation
2. **Unit Tests**: Test individual functions and classes
3. **Integration Tests**: Test agent coordination and workflows
4. **Mock External Services**: MCP servers, OpenAI API, Redis

### Example Test Structure

```typescript
// __tests__/unit/agents/base-agent.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BaseAgent } from '@agents/core'

describe('BaseAgent', () => {
  let agent: TestAgent

  beforeEach(() => {
    agent = new TestAgent({ type: AgentType.ORCHESTRATOR, name: 'Test' })
  })

  it('should initialize correctly', async () => {
    await agent.initialize()
    expect(agent.status).toBe(AgentStatus.IDLE)
  })

  it('should track metrics', async () => {
    await agent.execute(context)
    const metrics = agent.getMetrics()
    expect(metrics.totalExecutions).toBe(1)
  })
})
```

---

## Code Style Guidelines

From `docs/AGENTS.md`:

### Formatting
- **Indentation**: 2 spaces (enforced)
- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Trailing commas**: Required in multi-line objects/arrays

### Naming Conventions
- **Classes**: PascalCase (e.g., `OrchestratorAgent`)
- **Functions**: camelCase (e.g., `fetchClientData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Interfaces**: PascalCase with `I` prefix (e.g., `IAgent`)
- **Types**: PascalCase (e.g., `AgentConfig`)
- **Enums**: PascalCase (e.g., `AgentType`)

### TypeScript
- **Strict mode**: Enabled
- **No `any`**: Use proper types or `unknown`
- **Explicit return types**: Required for public methods
- **Interface over type**: Prefer interfaces for object shapes

---

## Common Patterns

### Singleton Pattern

Used for: AgentFactory, AgentRegistry, MessageBus, HandoffManager, WorkflowStateManager

```typescript
class MyService {
  private static instance: MyService

  static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService()
    }
    return MyService.instance
  }

  private constructor() {
    // Prevent direct instantiation
  }
}
```

### Factory Pattern

Used for: Creating agent instances

```typescript
// Register agent type
factory.registerAgentType(AgentType.ORCHESTRATOR, OrchestratorAgent)

// Create agent
const agent = factory.createAgent({ type: AgentType.ORCHESTRATOR, name: 'Orchestrator' })
```

### Observer Pattern (Pub/Sub)

Used for: Message bus, event-driven communication

```typescript
// Subscribe
const unsubscribe = messageBus.subscribe(MessageType.TASK_COMPLETED, handler)

// Publish
await messageBus.publish({ type: MessageType.TASK_COMPLETED, ... })

// Cleanup
unsubscribe()
```

### State Machine Pattern

Used for: Workflow management with enforced transitions

```typescript
const workflow = new WorkflowStateMachine('request-123')
workflow.transition(WorkflowState.ANALYZING, 'agent-id')
// Will throw if invalid transition
```

---

## Important Documentation

### Quick Start
- `MULTI_AGENT_QUICKSTART.md` - 5-minute setup guide

### Architecture
- `docs/architecture/MULTI_AGENT_SYSTEM.md` - Complete system architecture (400+ lines)
- `docs/architecture/IMPLEMENTATION_SUMMARY.md` - Phase 1 completion summary

### Development Guidelines
- `docs/AGENTS.md` - Agent creation guidelines, code style, testing
- `docs/GETTING_STARTED.md` - Original getting started guide
- `docs/SYSTEM_ARCHITECTURE.md` - System overview

---

## RFP Processing Workflow

Example end-to-end workflow:

```
1. User submits RFP
   ↓
2. Orchestrator Agent
   • Analyzes request
   • Creates workflow state machine
   • Publishes TASK_CREATED
   ↓
3. Client Data Manager Agent
   • Accepts handoff
   • Fetches client profile (Google Sheets MCP)
   • Updates context
   • Hands off to Flight Search
   ↓
4. Flight Search Agent
   • Searches flights (Avinode MCP)
   • Creates RFP in Avinode
   • Updates state: AWAITING_QUOTES
   ↓
5. Proposal Analysis Agent
   • Triggered by webhook
   • Scores all quotes
   • Ranks proposals
   • Hands off to Communication
   ↓
6. Communication Manager Agent
   • Generates email (OpenAI)
   • Creates PDF
   • Sends email (Gmail MCP)
   • Updates state: COMPLETED
```

---

## Security Notes

- **Never commit** `.env.local` or `.env` files
- **Supabase RLS**: Row Level Security enabled on all tables
- **Clerk Auth**: JWT tokens validated on every request
- **API Keys**: Stored in environment variables only
- **Redis**: Should be secured in production (password, TLS)

---

## Code Review Integration

### Overview

The project uses **two specialized code review agents** integrated into all development workflows:

1. **morpheus-validator** - Automated code quality validation
2. **code-review-coordinator** - PR review process management

### Git Hooks (Pre-commit Validation)

Git hooks automatically run on every commit and push:

**Pre-commit Hook** (`.husky/pre-commit`):
- Type checking (`npm run type-check`)
- Linting (`npm run lint`)
- Unit tests for changed files
- Code validation (`npm run review:validate`)

**Pre-push Hook** (`.husky/pre-push`):
- Full test suite with coverage
- Integration tests

**Commit Message Validation** (`.husky/commit-msg`):
- Enforces conventional commits format
- Example: `feat(agents): add orchestrator agent`

### TDD Workflow Integration

Use the TDD workflow script to enforce proper test-driven development:

```bash
npm run review:tdd
```

**Workflow Phases**:

1. **RED Phase** - Write failing test
   - Create test file
   - Define desired behavior
   - Verify test fails

2. **GREEN Phase** - Make test pass
   - Implement minimal code
   - Run tests to verify
   - Commit with validation

3. **REFACTOR Phase** - Improve code quality
   - Improve structure
   - Remove duplication
   - Run full validation suite

### Pull Request Workflow

**Before creating a PR:**

```bash
# 1. Run PR review coordinator
npm run review:pr

# This will:
# - Run all automated checks
# - Display code review checklist
# - Generate review report
# - Save report to .github/PULL_REQUEST_REVIEW.md
```

**Code Review Checklist Categories**:
- **Code Quality**: Style guidelines, error handling, naming
- **Testing**: Unit tests, integration tests, edge cases, coverage
- **Documentation**: JSDoc, README, changelog, comments
- **Security**: No secrets, input validation, SQL/XSS prevention
- **Architecture**: Project structure, BaseAgent extension, separation of concerns
- **Performance**: Rendering, queries, caching, memory leaks

### Automated Code Validation

The `review:validate` script checks:

**File Naming**:
- Kebab-case for non-component files
- PascalCase for React components
- Test files end with `.test.ts` or `.test.tsx`

**Code Style**:
- No `console.log` in production code
- No `any` type usage
- JSDoc on exported functions
- TODO/FIXME tracking

**Test Coverage**:
- Corresponding test file exists for each source file
- 75% coverage threshold enforced

**Security**:
- No hardcoded secrets or API keys
- No `eval()` usage
- Safe handling of `dangerouslySetInnerHTML`

**Architecture**:
- Agents extend `BaseAgent`
- MCP servers use `@modelcontextprotocol/sdk`
- API routes have try/catch error handling

### GitHub Actions Integration

Automated code review runs on every PR and push (`.github/workflows/code-review.yml`):

**Jobs**:
1. **code-review** - All automated checks + PR comment
2. **security-review** - npm audit + secret scanning
3. **architecture-review** - Architecture compliance
4. **performance-review** - Bundle size analysis

### Daily Workflow Example

**Starting new feature**:
```bash
# 1. Create feature branch
git checkout -b feat/new-feature

# 2. Start TDD workflow - RED phase
npm run review:tdd
# Write failing test...

# 3. TDD workflow - GREEN phase
npm run review:tdd
# Implement feature...

# 4. TDD workflow - REFACTOR phase
npm run review:tdd
# Improve code quality...

# 5. Generate PR review
npm run review:pr

# 6. Create PR
gh pr create
```

**Pre-commit** (automatic):
```bash
# Git hooks run automatically
git commit -m "feat(agents): add new feature"
# ✅ Type check
# ✅ Lint
# ✅ Unit tests
# ✅ Code validation
```

**Pre-push** (automatic):
```bash
git push
# ✅ Full test suite
# ✅ Integration tests
# ✅ Coverage ≥75%
```

### Bypassing Hooks (Emergency Only)

```bash
# Skip pre-commit hooks (NOT recommended)
git commit --no-verify -m "emergency fix"

# Skip pre-push hooks (NOT recommended)
git push --no-verify
```

**Note**: Only use `--no-verify` in emergencies. All checks will still run in CI/CD.

### Code Review Standards

From `docs/AGENTS.md`:

**Code Style**:
- Indentation: 2 spaces
- Semicolons: Required
- Quotes: Single quotes
- Trailing commas: Required

**Naming Conventions**:
- Classes: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Interfaces: PascalCase with `I` prefix
- Types: PascalCase
- Enums: PascalCase

**TypeScript**:
- Strict mode enabled
- No `any` type
- Explicit return types on public methods
- Prefer interfaces over types

### Setting Up Code Review

**Initial Setup**:
```bash
# Install dependencies (includes husky)
npm install

# Initialize git hooks
npm run prepare

# Or manually:
npx husky install
```

**Verify Setup**:
```bash
# Check hooks are installed
ls -la .husky/

# Test validation
npm run review:validate

# Test TDD workflow
npm run review:tdd
```

---

## Git Worktree Workspace Management

Agent workspaces are managed using git worktrees in `.context/workspaces/` with a 9-phase SDLC structure for parallel agent isolation.

### Workspace Structure

```text
.context/workspaces/
├── phase-1-branch-init/        # Branch initialization
├── phase-2-test-creation/      # TDD test writing (RED phase)
├── phase-3-implementation/     # Code implementation (GREEN phase)
├── phase-4-code-review/        # Code review
├── phase-5-iteration/          # Iteration & fixes (REFACTOR phase)
├── phase-6-pr-creation/        # PR creation
├── phase-7-pr-review/          # PR review
├── phase-8-conflict-resolution/ # Conflict resolution
├── phase-9-merge/              # Branch merge
└── .archive/                   # Archived workspace metadata
```

### Automatic Lifecycle Management

Worktrees are automatically managed via Claude Code hooks:

**Auto-Creation** (PreToolUse hook):

- Triggered when agents are invoked for SDLC phases
- Creates isolated worktree at `.context/workspaces/phase-N-<name>/<branch>`
- Generates `WORKSPACE_META.json` with metadata

**Auto-Cleanup** (SubagentStop hook):

Worktrees are only cleaned up when ALL 5 conditions are met:

1. All TDD tests pass (`npm run test:unit` exits 0)
2. PR is created (`gh pr list --head <branch>` returns PR)
3. Code review is completed (PR has `reviewDecision: APPROVED`)
4. Linear issue is updated (status = Done/Closed)
5. Branch is merged into main (`git branch --merged main`)

Plus 2 safety checks:

- No uncommitted changes
- No unpushed commits

### Slash Commands

```bash
# Create isolated workspace for a phase
/worktree-create <phase> <branch> [linear-issue-id]

# Examples:
/worktree-create 2 feat/ONEK-123-user-auth ONEK-123
/worktree-create 3 fix/ONEK-456-validation

# View status of all workspaces
/worktree-status

# Clean up workspaces
/worktree-cleanup feat/ONEK-123-user-auth  # Specific branch
/worktree-cleanup --stale                   # Stale (>7 days)
/worktree-cleanup --all                     # All completed
```

### Phase-to-Agent Mapping

| Phase | Name | Agents |
|-------|------|--------|
| 1 | branch-init | Pull Request Agent, git-workflow |
| 2 | test-creation | Test Agent, qa-engineer-seraph |
| 3 | implementation | Coding Agent, backend-developer, frontend-developer |
| 4 | code-review | Code Review Agent, code-review-coordinator |
| 5 | iteration | Coding Agent, backend-developer, frontend-developer |
| 6 | pr-creation | Pull Request Agent, git-workflow |
| 7 | pr-review | Code Review Agent, code-review-coordinator |
| 8 | conflict-resolution | Conflict Resolution Agent, git-workflow |
| 9 | merge | Pull Request Agent, git-workflow |

### Manual Worktree Operations

```bash
# List all worktrees
git worktree list

# Navigate to a worktree
cd .context/workspaces/phase-3-implementation/feat/my-feature

# Remove worktree manually (only if lifecycle complete)
git worktree remove .context/workspaces/phase-3-implementation/feat/my-feature

# Prune stale references
git worktree prune
```

### Workspace Metadata

Each worktree contains `WORKSPACE_META.json`:

```json
{
  "branch": "feat/ONEK-123-user-auth",
  "linearIssue": "ONEK-123",
  "phase": 3,
  "phaseName": "implementation",
  "agentRole": "Coding Agent",
  "agentType": "backend-developer",
  "createdAt": "2025-11-14T10:30:00Z",
  "lastAccessedAt": "2025-11-14T12:45:00Z",
  "status": "active",
  "workflowState": {}
}
```

---

## Claude Code Terminal Orchestration

The system supports spawning isolated Claude Code terminal instances for Linear issue implementation. Each terminal runs in its own git worktree workspace.

### Terminal Manager

The `TerminalManager` handles lifecycle management of Claude Code processes:

```typescript
import { terminalManager, TerminalStatus } from '@agents/coordination'

// Spawn a new Claude Code terminal
const terminal = await terminalManager.spawnTerminal({
  linearIssueId: 'ONEK-123',
  branch: 'feat/onek-123-user-auth',
  phase: 3, // Implementation phase
  agentType: 'backend-developer',
  prompt: 'Implement user authentication',
  timeout: 30 * 60 * 1000, // 30 minutes
})

// Monitor terminal
console.log(`Terminal ${terminal.id} PID: ${terminal.pid}`)
console.log(`Worktree: ${terminal.worktreePath}`)

// Get running terminals
const running = terminalManager.getRunningTerminals()

// Terminate terminal
await terminalManager.terminateTerminal(terminal.id, 'User request')
```

### Linear Issue Agent Spawner

For Linear issue delegation, use the `LinearAgentSpawner`:

```typescript
import {
  linearAgentSpawner,
  spawnAgentForLinearIssue,
  spawnAgentsForLinearIssues
} from '@agents/coordination'

// Spawn agent for single issue
const terminal = await spawnAgentForLinearIssue({
  issueId: 'ONEK-123',
  title: 'Implement user authentication',
  description: 'Add login/logout functionality',
  agentType: 'backend-developer',
  phase: 3,
  priority: 'high',
})

// Spawn agents for multiple issues in parallel
const terminals = await spawnAgentsForLinearIssues([
  { issueId: 'ONEK-123', title: 'Auth', agentType: 'backend-developer' },
  { issueId: 'ONEK-124', title: 'UI', agentType: 'frontend-developer' },
  { issueId: 'ONEK-125', title: 'Tests', agentType: 'test-engineer', phase: 2 },
])
```

### Terminal Handoffs

The `HandoffManager` supports terminal-based handoffs:

```typescript
import { handoffManager } from '@agents/coordination'

// Handoff task to new terminal
const terminal = await handoffManager.handoffToTerminal(
  task,
  {
    linearIssueId: 'ONEK-123',
    branch: 'feat/onek-123-feature',
    phase: 3,
    agentType: 'backend-developer',
    prompt: 'Implement the feature',
  },
  context
)

// Batch handoff for parallel execution
const terminals = await handoffManager.batchHandoffToTerminals(
  [
    { task: task1, config: config1 },
    { task: task2, config: config2 },
  ],
  context
)

// Get active terminal handoffs
const active = handoffManager.getActiveTerminalHandoffs()
```

### Message Types for Terminal Events

New message types for terminal lifecycle:

```typescript
enum MessageType {
  // ... existing types ...
  TERMINAL_SPAWNED = 'terminal_spawned',
  TERMINAL_OUTPUT = 'terminal_output',
  TERMINAL_COMPLETED = 'terminal_completed',
  TERMINAL_FAILED = 'terminal_failed',
  TERMINAL_TERMINATED = 'terminal_terminated',
  WORKTREE_CREATED = 'worktree_created',
  WORKTREE_CLEANUP = 'worktree_cleanup',
}

// Subscribe to terminal events
messageBus.subscribe(MessageType.TERMINAL_COMPLETED, async (message) => {
  const { terminalId, linearIssueId, exitCode } = message.payload
  console.log(`Terminal ${terminalId} for ${linearIssueId} completed: ${exitCode}`)
})
```

### Agent Type to Phase Mapping

Agents are mapped to SDLC phases:

| Agent Type | Phase | Name |
|------------|-------|------|
| architect, system-architect | 1 | branch-init |
| qa, test-engineer, qa-engineer-seraph | 2 | test-creation |
| backend-developer, frontend-developer, fullstack-developer | 3 | implementation |
| code-reviewer, code-review-coordinator | 4 | code-review |
| performance-engineer, legacy-modernizer | 5 | iteration |
| git-workflow, devops | 6 | pr-creation |
| deployment-engineer | 9 | merge |

---

## Next Implementation Phases

### Phase 2: MCP Server Infrastructure (Next)
- Create MCP server base class
- Implement stdio and HTTP+SSE transports
- Build Avinode, Gmail, Google Sheets MCP servers

### Phase 3: Agent Implementations
- Implement all 6 specialized agents
- Add agent-specific tools
- Implement guardrails

### Phase 4: Testing & Integration
- Write unit tests for all components
- Integration tests for workflows
- End-to-end RFP processing tests

---

## Troubleshooting

### Redis Connection Error
```bash
# Start Redis
docker run -d -p 6379:6379 redis:latest
```

### OpenAI API Key Missing
Add to `.env.local`:
```env
OPENAI_API_KEY=sk-your-key-here
```

### Import Errors
```bash
npm install  # Reinstall dependencies
```

### Test Failures
```bash
npm run test:coverage  # Check coverage report
npm run test:watch     # Debug in watch mode
```

---

**Built with**: Next.js 14, OpenAI Agent SDK, TypeScript, Supabase, BullMQ, Vitest

**For detailed architecture**, see `docs/architecture/MULTI_AGENT_SYSTEM.md`
