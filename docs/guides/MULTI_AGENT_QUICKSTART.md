# 🚀 Multi-Agent System - Quick Start Guide

**Welcome to the JetVision Multi-Agent System!**

This guide will get you up and running with the new multi-agent architecture.

---

## ✅ What's Been Built

We've implemented a **production-ready foundation** for a multi-agent AI system:

### Core Infrastructure ✅
- **Agent Core System** - Base agent class, factory pattern, registry
- **Coordination Layer** - Message bus, handoff manager, task queue, workflow state machine
- **Testing Framework** - Vitest configured with coverage tracking
- **Type Safety** - Complete TypeScript type definitions
- **Documentation** - Comprehensive architecture docs

### Technology Stack
- **OpenAI Agent SDK** (JavaScript/TypeScript) for AI capabilities
- **Model Context Protocol (MCP)** for external service integration
- **BullMQ + Redis** for distributed task queue
- **Vitest** for testing
- **Next.js 14** for the application layer

---

## 🎯 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `openai` v5.0.0 - AI agent capabilities
- `@modelcontextprotocol/sdk` - MCP integration
- `bullmq` + `ioredis` - Task queue
- `vitest` - Testing framework
- All other dependencies

### 2. Set Up Environment Variables

Create `.env.local` with:

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ORGANIZATION_ID=your_org_id_here

# Redis (for task queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Start Redis (Required for Task Queue)

**Option A: Docker (Recommended)**
```bash
docker run -d -p 6379:6379 redis:latest
```

**Option B: Local Installation**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo service redis-server start
```

### 4. Run Tests

```bash
npm test
```

Expected output: All tests pass ✅

### 5. Explore the Architecture

```bash
# View agent core
ls -la agents/core/

# View coordination layer
ls -la agents/coordination/

# Read architecture docs
open docs/architecture/MULTI_AGENT_SYSTEM.md
```

---

## 📚 Understanding the System

### Agent Architecture

```
┌─────────────────────────────────────────┐
│           Agent Core                     │
│  - BaseAgent (abstract class)           │
│  - AgentFactory (creates agents)        │
│  - AgentRegistry (manages agents)       │
│  - AgentContext (shared state)          │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│        Agent Coordination                │
│  - MessageBus (A2A communication)       │
│  - HandoffManager (task delegation)     │
│  - TaskQueue (async processing)         │
│  - WorkflowStateMachine (state mgmt)    │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      Agent Implementations               │
│  - OrchestratorAgent (to be created)    │
│  - ClientDataAgent (to be created)      │
│  - FlightSearchAgent (to be created)    │
│  - ProposalAnalysisAgent (to be created)│
│  - CommunicationAgent (to be created)   │
│  - ErrorMonitorAgent (to be created)    │
└─────────────────────────────────────────┘
```

### Key Components

1. **BaseAgent** (`agents/core/base-agent.ts`)
   - Foundation for all agents
   - OpenAI integration
   - Tool registration
   - Metrics tracking

2. **AgentFactory** (`agents/core/agent-factory.ts`)
   - Creates agent instances
   - Manages agent lifecycle
   - Singleton pattern

3. **MessageBus** (`agents/coordination/message-bus.ts`)
   - Internal agent-to-agent messaging
   - Event-driven architecture
   - Message history and filtering

4. **HandoffManager** (`agents/coordination/handoff-manager.ts`)
   - Manages task delegation between agents
   - Accept/reject workflow
   - Audit trail

5. **TaskQueue** (`agents/coordination/task-queue.ts`)
   - Async task processing with BullMQ
   - Priority-based scheduling
   - Automatic retries

6. **WorkflowStateMachine** (`agents/coordination/state-machine.ts`)
   - Manages workflow states
   - Enforced state transitions
   - Duration tracking

---

## 💻 Code Examples

### Creating Your First Agent

```typescript
import { BaseAgent, AgentConfig, AgentContext, AgentResult, AgentType } from '@agents/core'

class MyFirstAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)

    // Register agent-specific tools
    this.registerTool({
      name: 'example_tool',
      description: 'An example tool',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string' }
        },
        required: ['input']
      },
      handler: async (params) => {
        return `Processed: ${params.input}`
      }
    })
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    // Your agent logic here
    const messages = [
      {
        role: 'system' as const,
        content: this.getSystemPrompt(),
        timestamp: new Date()
      },
      {
        role: 'user' as const,
        content: 'Hello, agent!',
        timestamp: new Date()
      }
    ]

    const response = await this.createChatCompletion(messages, context)

    return {
      success: true,
      data: response.choices[0].message.content
    }
  }
}

// Register and create the agent
import { AgentFactory } from '@agents/core'

const factory = AgentFactory.getInstance()
factory.registerAgentType(AgentType.ORCHESTRATOR, MyFirstAgent)

const agent = await factory.createAndInitialize({
  type: AgentType.ORCHESTRATOR,
  name: 'My First Agent',
  model: 'gpt-4-turbo-preview'
})

// Execute the agent
const result = await agent.execute({
  sessionId: 'session-123',
  userId: 'user-456'
})

console.log(result)
```

### Using the Message Bus

```typescript
import { messageBus, MessageType } from '@agents/coordination'

// Subscribe to messages
const unsubscribe = messageBus.subscribe(
  MessageType.TASK_COMPLETED,
  async (message) => {
    console.log(`Task ${message.payload.taskId} completed!`)
  }
)

// Publish a message
await messageBus.publish({
  type: MessageType.TASK_STARTED,
  sourceAgent: 'agent-123',
  targetAgent: 'agent-456',
  payload: { taskId: 'task-789' }
})

// Cleanup when done
unsubscribe()
```

### Managing Workflows

```typescript
import { workflowManager, WorkflowState } from '@agents/coordination'

// Create a workflow
const workflow = workflowManager.createWorkflow('request-123')

// Transition through states
workflow.transition(WorkflowState.ANALYZING, 'orchestrator-agent')
workflow.transition(WorkflowState.FETCHING_CLIENT_DATA, 'client-data-agent')

// Check status
console.log(workflow.getState())        // FETCHING_CLIENT_DATA
console.log(workflow.isInProgress())     // true
console.log(workflow.getDuration())      // Duration in ms

// Get timings per state
const timings = workflow.getStateTimings()
console.log(timings[WorkflowState.ANALYZING])  // Time spent analyzing
```

---

## 🧪 Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Agent Tests Only
```bash
npm run test:agents
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

---

## 📖 Documentation

### Architecture Docs
- **[Multi-Agent System](./docs/architecture/MULTI_AGENT_SYSTEM.md)** - Complete system overview
- **[Implementation Summary](./docs/architecture/IMPLEMENTATION_SUMMARY.md)** - What's been built
- **[Project Structure](./PROJECT_STRUCTURE.md)** - Directory organization

### Existing Docs
- **[Getting Started](./docs/GETTING_STARTED.md)** - Original getting started guide
- **[System Architecture](./docs/SYSTEM_ARCHITECTURE.md)** - Original architecture
- **[Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)** - Development roadmap

---

## 🎯 Next Steps

### For Developers

1. **Understand the Foundation**
   - Read `agents/core/base-agent.ts`
   - Review `agents/coordination/message-bus.ts`
   - Explore type definitions in `agents/core/types.ts`

2. **Implement First Agent**
   - Create `agents/implementations/orchestrator/`
   - Extend `BaseAgent`
   - Register with `AgentFactory`
   - Write tests

3. **Build MCP Servers**
   - Create base MCP server class
   - Implement Avinode MCP server
   - Implement Gmail MCP server
   - Implement Google Sheets MCP server

4. **Add Remaining Agents**
   - Client Data Manager
   - Flight Search
   - Proposal Analysis
   - Communication Manager
   - Error Monitor

### For Reviewers

1. **Review Architecture**
   - Check design patterns (Singleton, Factory, Observer)
   - Verify type safety
   - Assess scalability
   - Review error handling

2. **Test Coverage**
   - Run tests: `npm test`
   - Check coverage: `npm run test:coverage`
   - Review test structure in `__tests__/`

3. **Code Quality**
   - Verify TypeScript strict mode
   - Check for code smells
   - Review naming conventions
   - Assess documentation quality

---

## 🚨 Common Issues

### Redis Connection Error
**Problem**: Cannot connect to Redis
**Solution**:
```bash
# Start Redis
docker run -d -p 6379:6379 redis:latest

# Or use local Redis
brew services start redis
```

### OpenAI API Key Missing
**Problem**: `OPENAI_API_KEY environment variable is required`
**Solution**: Add to `.env.local`:
```env
OPENAI_API_KEY=sk-...your-key...
```

### Import Errors
**Problem**: Module not found
**Solution**:
```bash
npm install  # Reinstall dependencies
```

---

## 📊 System Status

### ✅ Completed
- [x] Agent core infrastructure
- [x] Coordination layer (A2A)
- [x] Task queue system
- [x] Workflow state machine
- [x] Testing framework
- [x] Type definitions
- [x] Documentation

### 🚧 In Progress
- [ ] MCP server infrastructure
- [ ] Agent implementations
- [ ] Agent tools framework
- [ ] Guardrails system

### 📋 Planned
- [ ] Monitoring dashboards
- [ ] Production deployment
- [ ] Performance optimization
- [ ] Additional documentation

---

## 🤝 Getting Help

- **Architecture Questions**: See `docs/architecture/MULTI_AGENT_SYSTEM.md`
- **Implementation Help**: See `docs/architecture/IMPLEMENTATION_SUMMARY.md`
- **Code Examples**: See this file (MULTI_AGENT_QUICKSTART.md)
- **Issues**: Create GitHub issue

---

## 🎓 Learning Path

**Day 1**: Understanding the Foundation
1. Read this quickstart
2. Explore `agents/core/`
3. Run tests
4. Review documentation

**Day 2**: Agent Basics
1. Study `base-agent.ts`
2. Create your first agent
3. Register with factory
4. Write tests

**Day 3**: Coordination
1. Learn message bus
2. Implement handoffs
3. Use task queue
4. Manage workflows

**Day 4**: MCP Integration
1. Understand MCP protocol
2. Create MCP server base
3. Implement first MCP server
4. Test integration

**Week 2**: Full Implementation
1. Implement all 6 agents
2. Build MCP servers
3. Add guardrails
4. Complete testing

---

**Built with** ❤️ **using Next.js 14, OpenAI Agent SDK, and TypeScript**

**Ready to build?** Start with `agents/implementations/` and create your first agent!
