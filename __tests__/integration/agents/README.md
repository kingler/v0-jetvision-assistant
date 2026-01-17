# Agent Workflow Integration Tests

This directory contains comprehensive integration tests for the JetVision Multi-Agent System workflow.

## Overview

The integration tests cover the following areas:

1. **Orchestrator Workflow** (`orchestrator-workflow.integration.test.ts`)
   - Conversational flow with intent parsing
   - Progressive data extraction
   - RFP creation and completion
   - Session management
   - Multi-turn conversation handling

2. **Agent Handoff** (`agent-handoff.integration.test.ts`)
   - Task delegation between agents
   - Handoff acceptance/rejection
   - Terminal-based handoffs for Claude Code orchestration
   - Handoff statistics and history

3. **Message Bus** (`message-bus.integration.test.ts`)
   - Pub/sub message routing
   - Message type filtering
   - Agent-specific subscriptions
   - Message history and statistics
   - Error handling

4. **Tool Execution** (`tool-execution.integration.test.ts`)
   - MCP tool execution with retry logic
   - Flight search and trip creation
   - Quote retrieval and RFQ management
   - Input validation
   - Metrics tracking

## Running Tests

### Run All Agent Integration Tests

```bash
pnpm test:integration -- --testPathPattern=agents
```

### Run Specific Test Files

```bash
# Orchestrator workflow tests
pnpm vitest run __tests__/integration/agents/orchestrator-workflow.integration.test.ts

# Agent handoff tests
pnpm vitest run __tests__/integration/agents/agent-handoff.integration.test.ts

# Message bus tests
pnpm vitest run __tests__/integration/agents/message-bus.integration.test.ts

# Tool execution tests
pnpm vitest run __tests__/integration/agents/tool-execution.integration.test.ts
```

### Run Tests in Watch Mode

```bash
pnpm vitest watch __tests__/integration/agents/
```

### Run with Coverage

```bash
pnpm vitest run --coverage __tests__/integration/agents/
```

## Test Structure

Each test file follows a consistent structure:

```typescript
describe('Feature Name', () => {
  // Setup
  beforeEach(async () => {
    // Reset mocks and create fresh instances
  })

  afterEach(async () => {
    // Cleanup
  })

  // Test groups by functionality
  describe('Sub-feature', () => {
    it('should do something specific', async () => {
      // Test implementation
    })
  })
})
```

## Mock Factories

The tests use mock factories from `__tests__/mocks/agents.ts`:

```typescript
import {
  createMockAgentContext,
  createMockRFPContext,
  createMockConversationalContext,
  createMockAgentTask,
  createMockFlightSearchTask,
  createMockAgent,
  createMockMCPClient,
  createMockConversationStore,
  createMockOpenAIClient,
} from '@tests/mocks/agents'
```

### Available Mock Factories

| Factory | Description |
|---------|-------------|
| `createMockAgentContext` | Creates a basic agent context |
| `createMockRFPContext` | Creates context with RFP data |
| `createMockConversationalContext` | Creates context with user message |
| `createMockAgentTask` | Creates a task for agent execution |
| `createMockFlightSearchTask` | Creates a flight search task |
| `createMockAgent` | Creates a mock agent implementing IAgent |
| `createMockMCPClient` | Creates a mock MCP client for tool testing |
| `createMockConversationStore` | Creates a mock Redis conversation store |
| `createMockOpenAIClient` | Creates a mock OpenAI client |

## Testing Patterns

### Testing Orchestrator Conversations

```typescript
it('should handle RFP creation flow', async () => {
  const context = createMockConversationalContext(
    'Book flight from KJFK to KLAX on 2025-12-15 for 4 passengers'
  )
  
  const result = await orchestrator.execute(context)
  
  expect(result.success).toBe(true)
  expect(result.data.isComplete).toBe(true)
})
```

### Testing Agent Handoffs

```typescript
it('should hand off task to target agent', async () => {
  const task = createMockFlightSearchTask()
  const context = createMockAgentContext()
  
  await handoffManager.handoff({
    fromAgent: 'orchestrator-1',
    toAgent: 'flight-search-1',
    task,
    context,
    reason: 'Flight search delegation',
  })
  
  const pendingHandoffs = handoffManager.getPendingHandoffs('flight-search-1')
  expect(pendingHandoffs).toHaveLength(1)
})
```

### Testing MCP Tools

```typescript
it('should execute flight search with retry', async () => {
  const context = createMockAgentContext({
    metadata: {
      departure: 'KJFK',
      arrival: 'KLAX',
      departureDate: '2025-12-15',
      passengers: 4,
    },
  })

  const result = await flightSearchAgent.execute(context)
  
  expect(result.success).toBe(true)
  expect(result.data.flights).toBeDefined()
})
```

## Environment Variables

Tests automatically use `.env.local` for environment variables. Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (mocked in tests)

## Dependencies

- **Vitest** - Test runner
- **@testing-library/jest-dom** - DOM assertions
- **vitest mocking** - `vi.mock`, `vi.fn`, `vi.spyOn`

## Coverage Targets

The tests aim to maintain the following coverage:

- Lines: 75%
- Functions: 75%
- Branches: 70%
- Statements: 75%

## Adding New Tests

1. Create test file in appropriate directory
2. Import mock factories from `@tests/mocks/agents`
3. Mock external dependencies (`vi.mock`)
4. Use consistent describe/it structure
5. Clean up in `afterEach`
6. Update this README if adding new test categories

## Troubleshooting

### Tests Failing with Missing Mocks

Ensure all external dependencies are mocked:

```typescript
vi.mock('@/lib/config/llm-config', () => ({
  getOpenAIClient: vi.fn().mockResolvedValue(mockOpenAI),
}))
```

### Redis Connection Errors

Tests mock the Redis conversation store. If you see Redis errors, ensure the mock is properly configured:

```typescript
vi.mock('@/lib/sessions', () => ({
  getConversationStore: vi.fn().mockReturnValue(mockStore),
}))
```

### Singleton State Bleeding Between Tests

Always reset singletons in `beforeEach`:

```typescript
beforeEach(() => {
  handoffManager.reset()
  messageBus.reset()
  registry.clear()
})
```
