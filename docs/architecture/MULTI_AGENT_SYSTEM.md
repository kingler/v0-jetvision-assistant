# Jetvision Multi-Agent System Architecture

**Version**: 2.0
**Last Updated**: October 20, 2025
**Status**: Implementation In Progress

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Agent Core](#agent-core)
4. [Agent Coordination](#agent-coordination)
5. [Multi-Agent Workflows](#multi-agent-workflows)
6. [Implementation Status](#implementation-status)
7. [Next Steps](#next-steps)

---

## Overview

The Jetvision Multi-Agent System is a production-ready AI architecture built on:

- **OpenAI Agent SDK (JavaScript/TypeScript)** - For AI agent capabilities
- **Model Context Protocol (MCP)** - For external service integration
- **Internal A2A Patterns** - For agent-to-agent communication
- **BullMQ + Redis** - For asynchronous task processing

### Key Characteristics

✅ **Modular Architecture** - Each agent is independent and specialized
✅ **Type-Safe** - Full TypeScript with strict typing
✅ **Observable** - Built-in tracing, logging, and metrics
✅ **Scalable** - Supports horizontal scaling and async processing
✅ **Resilient** - Error handling, retries, and failover mechanisms

---

## Architecture Components

### 1. Agent Core (`/agents/core`)

Foundation for all agents in the system.

#### Base Agent Class

```typescript
export abstract class BaseAgent implements IAgent {
  // Agent identification
  public readonly id: string
  public readonly type: AgentType
  public readonly name: string

  // Core functionality
  async execute(context: AgentContext): Promise<AgentResult>
  registerTool(tool: AgentTool): void
  async handoff(toAgent: string, task: AgentTask): Promise<void>

  // Lifecycle
  async initialize(): Promise<void>
  async shutdown(): Promise<void>
}
```

**Key Features**:
- OpenAI Chat Completions integration
- Tool registration and execution
- Metrics tracking (executions, tokens, performance)
- Status management (idle, running, waiting, completed, error)

#### Agent Factory

```typescript
export class AgentFactory implements IAgentFactory {
  // Register agent types
  registerAgentType(type: AgentType, constructor: AgentConstructor): void

  // Create agents
  createAgent(config: AgentConfig): IAgent
  async createAndInitialize(config: AgentConfig): Promise<IAgent>

  // Retrieve agents
  getAgent(id: string): IAgent | undefined
  getAllAgents(): IAgent[]
}
```

**Responsibilities**:
- Create agent instances based on configuration
- Register agent types with the system
- Manage agent lifecycle
- Integrate with Agent Registry

#### Agent Registry

```typescript
export class AgentRegistry implements IAgentRegistry {
  // Registration
  register(agent: IAgent): void
  unregister(agentId: string): void

  // Retrieval
  getAgent(agentId: string): IAgent | undefined
  getAgentsByType(type: AgentType): IAgent[]
  getAllAgents(): IAgent[]

  // Status
  getStatus(): RegistryStatus
}
```

**Responsibilities**:
- Maintain central registry of all active agents
- Enable agent discovery
- Provide system-wide agent visibility

#### Agent Context Manager

```typescript
export class AgentContextManager {
  // Context management
  createContext(sessionId: string, data?: Partial<AgentContext>): AgentContext
  getContext(sessionId: string): AgentContext | undefined
  updateContext(sessionId: string, updates: Partial<AgentContext>): void

  // Message history
  addMessage(sessionId: string, message: AgentMessage): void
  getHistory(sessionId: string): AgentMessage[]
  clearHistory(sessionId: string): void
}
```

**Responsibilities**:
- Manage execution context across agent invocations
- Maintain conversation history
- Share context between agents

---

### 2. Agent Coordination (`/agents/coordination`)

Handles agent-to-agent communication and workflow orchestration.

#### Message Bus

```typescript
export class AgentMessageBus extends EventEmitter {
  // Publish messages
  async publish(message: AgentBusMessage): Promise<void>

  // Subscribe to messages
  subscribe(type: MessageType, handler: MessageHandler): () => void
  subscribeToAgent(agentId: string, handler: MessageHandler): () => void

  // Message history
  getHistory(filter?: MessageFilter): AgentBusMessage[]
  getStats(): BusStats
}
```

**Message Types**:
- `TASK_CREATED` - New task created
- `TASK_STARTED` - Agent started working on task
- `TASK_COMPLETED` - Task finished successfully
- `TASK_FAILED` - Task execution failed
- `AGENT_HANDOFF` - Task delegated to another agent
- `CONTEXT_UPDATE` - Shared context updated
- `ERROR` - Error occurred

**Features**:
- Event-driven architecture
- Message filtering and routing
- History tracking (last 1000 messages)
- Statistics and observability

#### Handoff Manager

```typescript
export class HandoffManager {
  // Handoff management
  async handoff(handoff: AgentHandoff): Promise<void>
  async acceptHandoff(taskId: string, agentId: string): Promise<AgentTask>
  async rejectHandoff(taskId: string, agentId: string, reason: string): Promise<void>

  // Query
  getPendingHandoffs(agentId: string): AgentHandoff[]
  getHistory(filter?: HandoffFilter): AgentHandoff[]
  getStats(): HandoffStats
}
```

**Handoff Flow**:
1. Source agent requests handoff with reason
2. Handoff manager validates target agent exists
3. Task marked as pending and published to message bus
4. Target agent can accept or reject handoff
5. Handoff history maintained for audit trail

#### Task Queue

```typescript
export class AgentTaskQueue {
  // Task management
  async addTask(task: AgentTask, context?: AgentContext, options?: TaskOptions): Promise<string>
  async startWorker(processor: JobProcessor): Promise<void>
  async stopWorker(): Promise<void>

  // Task status
  async getTaskStatus(jobId: string): Promise<TaskStatus>
  async cancelTask(jobId: string): Promise<boolean>

  // Queue management
  async getMetrics(): Promise<QueueMetrics>
  async cleanJobs(grace?: number): Promise<CleanupResult>
}
```

**Features**:
- Built on BullMQ (Redis-based queue)
- Priority-based task scheduling
- Automatic retries with exponential backoff
- Job status tracking
- Metrics and monitoring
- Graceful cleanup

**Priority Levels**:
- `urgent` - Priority 1 (immediate execution)
- `high` - Priority 2
- `normal` - Priority 5 (default)
- `low` - Priority 10

#### Workflow State Machine

```typescript
export class WorkflowStateMachine {
  // State management
  getState(): WorkflowState
  canTransition(to: WorkflowState): boolean
  transition(to: WorkflowState, triggeredBy?: string, metadata?: Record<string, unknown>): void

  // Query
  getHistory(): StateTransition[]
  isTerminal(): boolean
  isInProgress(): boolean
  getDuration(): number
  getStateTimings(): Record<WorkflowState, number>
}
```

**Workflow States**:
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
COMPLETED
```

**Terminal States**: `COMPLETED`, `FAILED`, `CANCELLED`

**Features**:
- Enforced state transitions (validates allowed transitions)
- Complete transition history
- Duration tracking per state
- Serialization support (save/restore workflows)
- Workflow manager for handling multiple workflows

---

## Multi-Agent Workflows

### RFP Processing Workflow

```
┌─────────────────────────────────────────────────────────┐
│                     User Submits RFP                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│             Orchestrator Agent                          │
│  - Analyzes request                                      │
│  - Determines priority and complexity                    │
│  - Creates workflow state machine                        │
│  - Publishes TASK_CREATED message                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Client Data Manager Agent                       │
│  - Accepts handoff from Orchestrator                     │
│  - Fetches client profile (via Google Sheets MCP)        │
│  - Identifies preferences and history                    │
│  - Updates context with client data                      │
│  - Hands off to Flight Search                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│             Flight Search Agent                          │
│  - Accepts handoff from Client Data                      │
│  - Searches flights (via Avinode MCP)                    │
│  - Creates RFP in Avinode                                │
│  - Updates workflow state: AWAITING_QUOTES               │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ (Webhooks from Avinode)
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Proposal Analysis Agent                         │
│  - Triggered by quote webhook                            │
│  - Analyzes all received quotes                          │
│  - Scores proposals (price, safety, speed, comfort)      │
│  - Ranks and selects top 3                               │
│  - Hands off to Communication Manager                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Communication Manager Agent                      │
│  - Accepts handoff from Proposal Analysis                │
│  - Generates personalized email (OpenAI)                 │
│  - Creates PDF proposal                                  │
│  - Sends email (via Gmail MCP)                           │
│  - Updates workflow state: COMPLETED                     │
└─────────────────────────────────────────────────────────┘
```

### Agent Communication Example

```typescript
// Orchestrator hands off to Client Data Manager
const handoff: AgentHandoff = {
  fromAgent: 'orchestrator-agent-id',
  toAgent: 'client-data-agent-id',
  task: {
    id: 'task-123',
    type: 'fetch_client_data',
    payload: { requestId: 'req-456' },
    priority: 'high',
    status: 'pending',
    createdAt: new Date(),
  },
  context: {
    sessionId: 'session-789',
    requestId: 'req-456',
    userId: 'user-abc',
  },
  reason: 'Need client profile before flight search',
}

await handoffManager.handoff(handoff)

// Message bus automatically publishes:
// MessageType.AGENT_HANDOFF event
```

---

## Implementation Status

### ✅ Completed

- [x] Package.json updated with all dependencies
- [x] Vitest configuration for testing
- [x] Base Agent class with OpenAI integration
- [x] Agent Factory pattern
- [x] Agent Registry for centralized management
- [x] Agent Context Manager
- [x] Message Bus for internal A2A communication
- [x] Handoff Manager for task delegation
- [x] Task Queue with BullMQ
- [x] Workflow State Machine
- [x] TypeScript type definitions
- [x] Core infrastructure complete

### 🚧 In Progress

- [ ] MCP Server base infrastructure
- [ ] MCP Client for agent integration
- [ ] Agent Tools framework
- [ ] Agent Guardrails
- [ ] Individual agent implementations
- [ ] Configuration management
- [ ] Monitoring and observability setup

### 📋 Pending

- [ ] Test suites (unit, integration)
- [ ] Documentation completion
- [ ] Example agent implementations
- [ ] Deployment scripts
- [ ] Production configuration

---

## Next Steps

### Phase 1: Complete Core Infrastructure (Current)

1. **MCP Server Base**
   - Create base MCP server class
   - Implement stdio transport
   - Implement HTTP+SSE transport
   - Add authentication layer

2. **MCP Client Integration**
   - MCP client wrapper
   - Tool registry
   - Connection pooling
   - Error handling

3. **Agent Tools & Guardrails**
   - Tool wrapper framework
   - Input validators
   - Output validators
   - Safety checks
   - Rate limiters

### Phase 2: Agent Implementations

1. Migrate existing agents to new architecture
2. Implement agent-specific tools
3. Add comprehensive error handling
4. Create agent test suites

### Phase 3: Integration & Testing

1. End-to-end workflow tests
2. MCP integration tests
3. Load testing
4. Performance optimization

### Phase 4: Production Readiness

1. Monitoring dashboards
2. Alerting configuration
3. Deployment automation
4. Documentation completion

---

## Usage Examples

### Creating an Agent

```typescript
import { AgentFactory, AgentType } from '@agents/core'
import { OrchestratorAgent } from '@agents/implementations/orchestrator'

// Register agent type
const factory = AgentFactory.getInstance()
factory.registerAgentType(AgentType.ORCHESTRATOR, OrchestratorAgent)

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
})
```

### Using the Message Bus

```typescript
import { messageBus, MessageType } from '@agents/coordination'

// Subscribe to task completions
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
  payload: { taskId: 'task-456' },
})

// Cleanup
unsubscribe()
```

### Managing Workflows

```typescript
import { workflowManager, WorkflowState } from '@agents/coordination'

// Create workflow
const workflow = workflowManager.createWorkflow('request-123')

// Transition states
workflow.transition(WorkflowState.ANALYZING, 'orchestrator-agent')
workflow.transition(WorkflowState.FETCHING_CLIENT_DATA, 'client-data-agent')
workflow.transition(WorkflowState.SEARCHING_FLIGHTS, 'flight-search-agent')

// Check status
console.log(workflow.getState()) // SEARCHING_FLIGHTS
console.log(workflow.isInProgress()) // true
console.log(workflow.getDuration()) // Duration in ms

// Get timings
const timings = workflow.getStateTimings()
console.log(`Time in ANALYZING: ${timings[WorkflowState.ANALYZING]}ms`)
```

---

## Architecture Benefits

### Scalability
- Agents can be scaled horizontally
- Task queue supports distributed processing
- Redis-based coordination scales across instances

### Maintainability
- Clear separation of concerns
- Each agent is independently testable
- Type-safe interfaces throughout

### Observability
- Built-in metrics tracking
- Complete message history
- Workflow state audit trail
- Error tracking and logging

### Flexibility
- Easy to add new agents
- Tools can be shared across agents
- MCP servers are independent services
- Supports both sync and async operations

---

**Maintained by**: Jetvision Development Team
**Contact**: See [GETTING_STARTED.md](../GETTING_STARTED.md) for support
**Related Docs**:
- [MCP Integration Guide](./MCP_INTEGRATION.md)
- [A2A Patterns](./A2A_PATTERNS.md)
- [Agent Tools Reference](../AGENT_TOOLS.md)
