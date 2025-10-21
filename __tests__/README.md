# Tests

Comprehensive test suite for JetVision AI Assistant.

## Directory Structure

```
__tests__/
├── unit/           # Unit tests for individual functions/components
├── integration/    # Integration tests for API routes and agents
├── e2e/           # End-to-end tests for complete user workflows
└── mocks/         # Mock data and utilities for testing
```

## Test Coverage Goals

- Unit tests: 80%+ coverage
- Integration tests: All API routes and agent workflows
- E2E tests: Critical user paths

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Testing Stack

- Jest - Test runner
- React Testing Library - Component testing
- Supertest - API testing
- Playwright - E2E testing
- MSW - API mocking

See `/docs/IMPLEMENTATION_PLAN.md` for detailed testing strategy.
