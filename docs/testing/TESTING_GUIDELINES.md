# Testing Guidelines

**Version**: 1.0.0
**Last Updated**: 2025-10-22
**Status**: 🟢 Active

This document provides comprehensive guidelines for writing, organizing, and maintaining tests in the Jetvision Multi-Agent System.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test-Driven Development (TDD)](#test-driven-development-tdd)
3. [Test Types](#test-types)
4. [Test Organization](#test-organization)
5. [Writing Tests](#writing-tests)
6. [Test Utilities](#test-utilities)
7. [Mocking Strategies](#mocking-strategies)
8. [Coverage Requirements](#coverage-requirements)
9. [Running Tests](#running-tests)
10. [CI/CD Integration](#cicd-integration)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

---

## Testing Philosophy

### Core Principles

1. **Tests are First-Class Citizens**
   - Tests are as important as production code
   - Well-tested code is maintainable code
   - Tests serve as living documentation

2. **Write Tests First (TDD)**
   - Red: Write failing test
   - Green: Implement minimum code to pass
   - Blue: Refactor and improve

3. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Tests should survive refactoring
   - Avoid testing internal implementation details

4. **Fast, Independent, Repeatable**
   - Tests should run quickly
   - Tests should not depend on each other
   - Same input = same output, every time

---

## Test-Driven Development (TDD)

### The TDD Cycle

```
┌─────────────┐
│  1. RED     │  Write a failing test
│  (Fail)     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  2. GREEN   │  Write minimum code to pass
│  (Pass)     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  3. BLUE    │  Refactor and improve
│  (Refactor) │
└──────┬──────┘
       │
       └──────► Repeat
```

### TDD Workflow

1. **Red Phase** - Write tests that fail
   ```typescript
   it('should register a tool', () => {
     const server = new BaseMCPServer(config);
     server.registerTool(mockTool);
     expect(server.getTools()).toContain('test_tool');
   });
   ```

2. **Green Phase** - Implement minimum code
   ```typescript
   class BaseMCPServer {
     registerTool(tool: MCPToolDefinition): void {
       this.tools.set(tool.name, tool);
     }
   }
   ```

3. **Blue Phase** - Refactor for quality
   ```typescript
   class BaseMCPServer {
     registerTool(tool: MCPToolDefinition): void {
       this.validateTool(tool);
       if (this.tools.has(tool.name)) {
         throw new Error(`Tool ${tool.name} already registered`);
       }
       this.tools.set(tool.name, tool);
     }
   }
   ```

### Benefits of TDD

- ✅ Better code design
- ✅ Fewer bugs
- ✅ Living documentation
- ✅ Confidence in refactoring
- ✅ Faster debugging

---

## Test Types

### 1. Unit Tests

**Purpose**: Test individual functions, classes, or modules in isolation.

**Characteristics**:
- Fast execution (< 100ms per test)
- No external dependencies
- Mocked dependencies
- High code coverage

**When to Use**:
- Testing pure functions
- Testing class methods
- Testing business logic
- Testing edge cases

**Example**:
```typescript
describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register a tool', () => {
    registry.register('test', mockTool);
    expect(registry.has('test')).toBe(true);
  });
});
```

**Template**: `__tests__/templates/unit-test.template.ts`

---

### 2. Integration Tests

**Purpose**: Test multiple components working together.

**Characteristics**:
- Moderate execution time (100ms - 5s per test)
- May use real external services (database, APIs)
- Test component interactions
- Verify data flow

**When to Use**:
- Testing agent coordination
- Testing database operations
- Testing API integrations
- Testing workflows

**Example**:
```typescript
describe('Agent Coordination Integration', () => {
  it('should handoff task between agents', async () => {
    const orchestrator = await factory.createAgent(AgentType.ORCHESTRATOR);
    const clientData = await factory.createAgent(AgentType.CLIENT_DATA);

    await handoffManager.handoff({
      fromAgent: orchestrator.id,
      toAgent: clientData.id,
      task: mockTask,
    });

    const accepted = await handoffManager.acceptHandoff(mockTask.id, clientData.id);
    expect(accepted).toBeDefined();
  });
});
```

**Template**: `__tests__/templates/integration-test.template.ts`

---

### 3. End-to-End (E2E) Tests

**Purpose**: Test complete user journeys through the application.

**Characteristics**:
- Slow execution (5s - 30s per test)
- Uses real UI, API, and database
- Tests entire stack
- Simulates real user behavior

**When to Use**:
- Testing critical user flows
- Testing UI interactions
- Testing full workflows
- Regression testing

**Example**:
```typescript
test('should create RFP request successfully', async ({ page }) => {
  await page.goto('/rfp-requests');
  await page.click('text=New Request');
  await page.fill('input[name="departure"]', 'JFK');
  await page.fill('input[name="arrival"]', 'LAX');
  await page.click('button:has-text("Submit")');

  await expect(page.locator('.success-message')).toBeVisible();
});
```

**Template**: `__tests__/templates/e2e-test.template.ts`

---

## Test Organization

### Directory Structure

```
__tests__/
├── unit/                    # Unit tests (fast, isolated)
│   ├── agents/
│   │   ├── core/
│   │   │   ├── base-agent.test.ts
│   │   │   ├── agent-factory.test.ts
│   │   │   └── agent-registry.test.ts
│   │   ├── coordination/
│   │   │   ├── message-bus.test.ts
│   │   │   └── handoff-manager.test.ts
│   │   └── implementations/
│   ├── mcp/
│   │   ├── base-server.test.ts
│   │   ├── tool-registry.test.ts
│   │   └── stdio-transport.test.ts
│   └── lib/
│       └── utils.test.ts
│
├── integration/            # Integration tests (moderate speed)
│   ├── agents/
│   │   └── agent-coordination.integration.test.ts
│   ├── mcp/
│   │   └── supabase-tools.integration.test.ts
│   └── workflows/
│       └── rfp-workflow.integration.test.ts
│
├── e2e/                   # E2E tests (slow, comprehensive)
│   ├── rfp/
│   │   ├── create-request.e2e.test.ts
│   │   └── review-quotes.e2e.test.ts
│   └── auth/
│       └── login.e2e.test.ts
│
├── utils/                 # Test utilities
│   ├── test-helpers.ts   # Helper functions
│   ├── mock-factories.ts # Mock data factories
│   └── index.ts          # Barrel export
│
├── templates/            # Test templates
│   ├── unit-test.template.ts
│   ├── integration-test.template.ts
│   └── e2e-test.template.ts
│
└── helpers/              # Global setup
    └── setup.ts          # Vitest global setup
```

### Naming Conventions

| Test Type | File Name Pattern | Example |
|-----------|------------------|---------|
| **Unit** | `{component}.test.ts` | `base-agent.test.ts` |
| **Integration** | `{feature}.integration.test.ts` | `agent-coordination.integration.test.ts` |
| **E2E** | `{user-journey}.e2e.test.ts` | `create-rfp-request.e2e.test.ts` |

---

## Writing Tests

### Test Structure (AAA Pattern)

```typescript
it('should do something', async () => {
  // Arrange: Set up test data and conditions
  const input = { value: 100 };
  const expectedOutput = { result: 200 };

  // Act: Execute the code being tested
  const result = await functionUnderTest(input);

  // Assert: Verify the outcome
  expect(result).toEqual(expectedOutput);
});
```

### Descriptive Test Names

✅ **Good**:
```typescript
it('should throw error when registering duplicate tool name')
it('should execute tool with valid parameters successfully')
it('should timeout after 5 seconds for long-running operations')
```

❌ **Bad**:
```typescript
it('test 1')
it('works')
it('error handling')
```

### Test Groups

Organize related tests using `describe` blocks:

```typescript
describe('BaseMCPServer', () => {
  describe('Tool Registration', () => {
    it('should register tool with valid schema')
    it('should throw error for duplicate names')
    it('should validate schema on registration')
  });

  describe('Tool Execution', () => {
    it('should execute registered tool')
    it('should throw error for non-existent tool')
    it('should validate parameters')
  });
});
```

### Setup and Teardown

```typescript
describe('MyComponent', () => {
  let instance: MyComponent;

  // Run before each test
  beforeEach(() => {
    instance = new MyComponent();
  });

  // Run after each test
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Run once before all tests
  beforeAll(async () => {
    await setupDatabase();
  });

  // Run once after all tests
  afterAll(async () => {
    await cleanupDatabase();
  });
});
```

---

## Test Utilities

### Available Utilities

Import from `@tests/utils`:

```typescript
import {
  // Timing utilities
  wait,
  waitFor,
  measureExecutionTime,

  // Mock utilities
  createSequentialMock,
  createSequentialAsyncMock,
  createDeferred,

  // Console utilities
  suppressConsole,
  captureConsole,

  // Random data
  randomString,
  randomInt,
  randomUUID,

  // Mock factories
  mockAgentConfig,
  mockAgentContext,
  mockMCPToolDefinition,
  mockSupabaseQueryResult,
  mockChatCompletion,
} from '@tests/utils';
```

### Example Usage

```typescript
// Wait for condition
await waitFor(() => agent.getState() === 'running', 5000);

// Suppress console output
await suppressConsole(async () => {
  // Code that logs to console
});

// Create sequential mock
const mock = createSequentialMock('first', 'second', 'third');
mock(); // Returns 'first'
mock(); // Returns 'second'
mock(); // Returns 'third'

// Create mock agent config
const config = mockAgentConfig({
  type: AgentType.ORCHESTRATOR,
  temperature: 0.5,
});
```

---

## Mocking Strategies

### When to Mock

✅ **Mock**:
- External API calls
- Database connections (in unit tests)
- File system operations
- Time-dependent operations
- Random number generation

❌ **Don't Mock**:
- Pure functions
- Simple utilities
- Internal implementation details
- Database (in integration tests)

### Mocking External Dependencies

```typescript
import { vi } from 'vitest';

// Mock OpenAI API
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue(mockChatCompletion()),
    },
  },
};

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue(mockSupabaseQueryResult([])),
    insert: vi.fn().mockResolvedValue({ error: null }),
  }),
};
```

### Spying on Methods

```typescript
const spy = vi.spyOn(object, 'method');
await object.method();

expect(spy).toHaveBeenCalled();
expect(spy).toHaveBeenCalledWith(expectedArgs);
expect(spy).toHaveBeenCalledTimes(2);

spy.mockRestore();
```

---

## Coverage Requirements

### Thresholds

Configured in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    lines: 75,
    functions: 75,
    branches: 70,
    statements: 75,
  },
}
```

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage Exemptions

Use coverage comments sparingly:

```typescript
/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  // Debug code that doesn't need coverage
}
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

### Run Specific Test Files

```bash
# Run single file
npm test -- path/to/test.ts

# Run tests matching pattern
npm test -- --grep "Agent"

# Run in watch mode
npm run test:watch
```

### Run with Coverage

```bash
npm run test:coverage
```

### Debug Tests

```typescript
// Add .only to run single test
it.only('should debug this test', () => {
  // Test code
});

// Add .skip to skip test
it.skip('should skip this test', () => {
  // Test code
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_KEY }}

      - name: Check coverage
        run: npm run test:coverage
```

---

## Troubleshooting

### Common Issues

#### Tests Timing Out

```typescript
// Increase timeout for specific test
it('should handle slow operation', async () => {
  // Test code
}, 10000); // 10 second timeout
```

#### Tests Failing Intermittently

- Ensure tests are independent
- Check for race conditions
- Add proper `waitFor` conditions
- Avoid hardcoded timeouts

#### Coverage Not Meeting Threshold

```bash
# Find uncovered code
npm run test:coverage
open coverage/index.html
```

#### Mock Not Working

```typescript
// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

---

## Best Practices

### DO ✅

- Write tests before implementation (TDD)
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test both success and failure cases
- Test edge cases and boundary conditions
- Keep tests simple and focused
- Mock external dependencies in unit tests
- Clean up resources in afterEach
- Use test utilities and factories
- Maintain test coverage above thresholds

### DON'T ❌

- Test implementation details
- Write interdependent tests
- Use hardcoded values (use factories)
- Skip error testing
- Ignore flaky tests
- Over-mock (mock only what's needed)
- Duplicate test code (use helpers)
- Commit failing tests
- Skip CI tests
- Ignore coverage warnings

---

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)

### Internal Resources
- `__tests__/templates/` - Test templates
- `__tests__/utils/` - Test utilities
- `docs/AGENTS.md` - Agent development guidelines
- `CLAUDE.md` - Project overview

### Examples
- `__tests__/unit/mcp/` - Unit test examples
- `__tests__/integration/mcp/` - Integration test examples

---

**Questions?** Ask in #dev-testing on Slack or consult the documentation.

**Last Updated**: 2025-10-22
**Maintained By**: Development Team
