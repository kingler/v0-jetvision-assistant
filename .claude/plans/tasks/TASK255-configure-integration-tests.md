# Task ID: TASK255
# Task Name: Configure Integration Tests
# Parent User Story: [[US139-run-integration-tests|US139 - Integration test configuration]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Configure Vitest for integration tests that test multi-component interactions, API routes, and agent coordination workflows. Integration tests run in a separate test suite from unit tests with different timeout and setup requirements.

## Acceptance Criteria
- Integration tests are discovered from `__tests__/integration/**/*.test.{ts,tsx}`
- `npm run test:integration` runs only integration tests
- Longer timeout configured for integration tests (default: 30 seconds)
- Setup files initialize test database connections and mock external services
- Tests can access API route handlers directly (no HTTP server needed)
- Environment variables for test databases are loaded from `.env.test`
- Integration tests do not run during `npm run test:unit`
- Configuration is validated by running a sample integration test

## Implementation Details
- **File(s)**: `vitest.config.ts`
- **Approach**: Add a separate Vitest project configuration for integration tests within the main config using `defineConfig` with `test.projects` or a separate config file. Set `include` to target `__tests__/integration/`, increase `testTimeout` to 30000ms, and add integration-specific setup files that initialize Supabase test client and mock MCP servers.

## Dependencies
- [[TASK254-configure-vitest-unit|TASK254]] (configure-vitest-unit) for base Vitest configuration
- Test database or mock setup must be available
