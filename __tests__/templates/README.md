# Test Templates

This directory contains templates for creating different types of tests in the Jetvision project.

## Available Templates

### 1. Unit Test Template (`unit-test.template.ts`)

**Use for**: Testing individual functions, classes, or modules in isolation.

**Copy to**: `__tests__/unit/{feature}/{component-name}.test.ts`

**Example**:
```bash
cp __tests__/templates/unit-test.template.ts __tests__/unit/agents/orchestrator-agent.test.ts
```

**Features**:
- Mocked dependencies
- Isolated testing
- Fast execution
- Comprehensive test groups (initialization, core functionality, edge cases, state management, performance)

### 2. Integration Test Template (`integration-test.template.ts`)

**Use for**: Testing multiple components working together, including database and external services.

**Copy to**: `__tests__/integration/{feature}/{feature-name}.integration.test.ts`

**Example**:
```bash
cp __tests__/templates/integration-test.template.ts __tests__/integration/agents/agent-coordination.integration.test.ts
```

**Features**:
- Real database operations
- Component interaction testing
- End-to-end workflow verification
- Performance and scalability tests

### 3. E2E Test Template (`e2e-test.template.ts`)

**Use for**: Testing complete user journeys through the application.

**Copy to**: `__tests__/e2e/{feature}/{user-journey}.e2e.test.ts`

**Example**:
```bash
cp __tests__/templates/e2e-test.template.ts __tests__/e2e/rfp/create-rfp-request.e2e.test.ts
```

**Features**:
- Full-stack testing
- UI interaction testing
- Real user workflows
- Accessibility and mobile testing

## Quick Start

1. **Choose the appropriate template** based on what you're testing
2. **Copy the template** to the correct location
3. **Rename the file** to match your component/feature
4. **Update the template** with your test logic:
   - Replace placeholder imports
   - Uncomment example code
   - Add your specific test cases
5. **Run your tests**:
   ```bash
   npm test -- path/to/your/test.ts
   ```

## Testing Guidelines

### When to Use Each Template

| Test Type | Use When | Example |
|-----------|----------|---------|
| **Unit** | Testing a single class/function | `BaseMCPServer.registerTool()` |
| **Integration** | Testing multiple components together | Agent coordination via MessageBus |
| **E2E** | Testing complete user workflows | Creating and submitting an RFP request |

### Best Practices

1. **Start with unit tests** - They're fastest and catch most bugs
2. **Add integration tests** for critical workflows
3. **Use E2E tests sparingly** - They're slow but valuable for key user journeys
4. **Follow TDD** - Write tests before implementation (Red-Green-Refactor)
5. **Keep tests independent** - Each test should run in isolation
6. **Use descriptive names** - Test names should explain what they verify
7. **Clean up resources** - Use `beforeEach` and `afterEach` hooks
8. **Mock external dependencies** in unit tests
9. **Use real services** in integration/E2E tests when possible

### Test Organization

```
__tests__/
├── unit/              # Fast, isolated tests
│   ├── agents/        # Agent-related tests
│   ├── mcp/           # MCP server tests
│   └── lib/           # Library/utility tests
│
├── integration/       # Multi-component tests
│   ├── agents/        # Agent coordination tests
│   ├── mcp/           # MCP integration tests
│   └── workflows/     # Complete workflow tests
│
├── e2e/              # Full user journey tests
│   ├── rfp/          # RFP-related journeys
│   ├── quotes/       # Quote management journeys
│   └── auth/         # Authentication journeys
│
├── utils/            # Test utilities and helpers
├── templates/        # Test templates (this directory)
└── helpers/          # Global test setup
```

## Example: Creating a New Unit Test

```bash
# 1. Copy template
cp __tests__/templates/unit-test.template.ts __tests__/unit/agents/orchestrator-agent.test.ts

# 2. Edit the file
# - Update imports
# - Add test cases
# - Uncomment example code

# 3. Run the test
npm test -- __tests__/unit/agents/orchestrator-agent.test.ts
```

## Test Utilities

The project provides helpful utilities in `__tests__/utils/`:

```typescript
import {
  wait,
  waitFor,
  randomString,
  randomUUID,
  mockAgentConfig,
  mockAgentContext,
  suppressConsole,
} from '@tests/utils';

// Use in your tests
const config = mockAgentConfig();
const context = mockAgentContext();
await waitFor(() => agent.getState() === 'running');
```

## Coverage Requirements

- **Lines**: 75%
- **Functions**: 75%
- **Branches**: 70%
- **Statements**: 75%

Check coverage:
```bash
npm run test:coverage
```

## Need Help?

- See `docs/TESTING_GUIDELINES.md` for detailed testing documentation
- Check existing tests for examples
- Review test utilities in `__tests__/utils/`
- Ask the team in Slack #dev-testing channel
