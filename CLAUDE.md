# Claude Code Guide - JetVision Multi-Agent System

**Project**: JetVision AI Assistant
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
