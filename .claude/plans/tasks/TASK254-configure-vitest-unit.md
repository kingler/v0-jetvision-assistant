# Task ID: TASK254
# Task Name: Configure Vitest for Unit Tests
# Parent User Story: [[US138-run-unit-tests|US138 - Configure unit testing infrastructure]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Configure Vitest as the unit testing framework with proper path aliases, environment settings, and test file patterns targeting the `__tests__/unit/` directory.

## Acceptance Criteria
- Vitest is configured to discover tests in `__tests__/unit/**/*.test.{ts,tsx}`
- Path aliases (`@/`, `@agents/`, `@lib/`, `@components/`) resolve correctly in tests
- Test environment is set to `jsdom` for component tests
- Global test utilities (describe, it, expect, vi) are available without imports
- Test timeouts are configured (default: 10 seconds)
- Setup files are loaded for common mocks (e.g., Next.js router, Supabase client)
- `npm run test:unit` command runs only unit tests
- Configuration is validated by running existing unit tests successfully

## Implementation Details
- **File(s)**: `vitest.config.ts`
- **Approach**: Update the Vitest config to include a `test` block with `include` patterns for unit tests, `environment: 'jsdom'`, `globals: true`, and `alias` mappings matching `tsconfig.json` paths. Add `setupFiles` pointing to test setup scripts. Ensure the `test:unit` npm script filters to the unit test directory.

## Dependencies
- `vitest` and `@vitest/coverage-v8` must be installed
- `tsconfig.json` path aliases for reference
