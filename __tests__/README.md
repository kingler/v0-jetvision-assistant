# Tests

Comprehensive test suite for Jetvision Multi-Agent System.

## Directory Structure

```
__tests__/
├── unit/           # Unit tests for agents, MCP servers, and utilities
├── integration/    # Integration tests for agent coordination and workflows
├── e2e/            # End-to-end tests for complete user workflows
├── utils/          # Test utilities and mock factories
├── templates/      # Test file templates
└── helpers/        # Test setup and configuration
```

## Test Coverage Goals

Per `vitest.config.ts`:
- **Lines**: 75%
- **Functions**: 75%
- **Branches**: 70%
- **Statements**: 75%

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run agent tests
npm run test:agents

# Watch mode (for development)
npm run test:watch

# Coverage report
npm run test:coverage
```

## Testing Stack

- **Vitest** - Fast unit test runner with native TypeScript support
- **Playwright** - E2E browser automation and testing
- **@vitest/coverage-v8** - Code coverage reporting

## Test Utilities

Located in `__tests__/utils/`:

- **test-helpers.ts** - Common utilities (`wait`, `waitFor`, `createSequentialMock`, etc.)
- **mock-factories.ts** - Factory functions for creating test data
- **index.ts** - Barrel export for easy imports

Import with: `import { mockAgentConfig, wait } from '@tests/utils'`

## Writing Tests

### TDD Approach

Follow Test-Driven Development:
1. Write failing test first
2. Implement minimum code to pass
3. Refactor while keeping tests green

### Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockAgentConfig } from '@tests/utils'

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks()
  })

  it('should handle expected behavior', () => {
    // Arrange
    const config = mockAgentConfig()

    // Act
    const result = functionUnderTest(config)

    // Assert
    expect(result).toBeDefined()
  })
})
```

### Testing Standards

1. **TDD Approach** - Tests before implementation
2. **Comprehensive Coverage** - Edge cases and error paths
3. **Isolated Tests** - No dependencies between tests
4. **Fast Execution** - Quick feedback loops
5. **Clear Assertions** - Descriptive test names

## Path Aliases

Configured in `vitest.config.ts`:
- `@/` → Root directory
- `@agents/` → `agents/`
- `@lib/` → `lib/`
- `@mcp-servers/` → `mcp-servers/`
- `@components/` → `components/`
- `@tests/` → `__tests__/`

## See Also

- `/docs/AGENTS.md` - Agent testing guidelines
- `/docs/architecture/MULTI_AGENT_SYSTEM.md` - System architecture
- `vitest.config.ts` - Test configuration
