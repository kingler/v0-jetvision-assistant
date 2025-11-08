# TASK: Test Coverage Improvements

**Priority**: High
**Status**: Backlog
**Team**: One Kaleidoscope
**Project**: Jetvision MAS
**Labels**: `testing`, `quality`, `coverage`
**Assignee**: @kingler
**Depends On**: CI Test Environment Setup

---

## Description

Improve test coverage across the codebase to reach and maintain the 75% threshold defined in `vitest.config.ts`.

## Context

Current test coverage is below the 75% threshold due to:
- Missing integration tests for database operations
- Incomplete unit test coverage for new features
- Test environment not configured in CI

**Coverage Thresholds** (from `vitest.config.ts`):
- Lines: 75%
- Functions: 75%
- Branches: 70%
- Statements: 75%

---

## Tasks

### 1. Configure Test Coverage Reporting in CI

- [ ] Ensure coverage reports are generated in CI
- [ ] Upload coverage reports to Codecov or similar service
- [ ] Add coverage badge to README
- [ ] Configure PR comments with coverage diff

**Files to modify**:
- `.github/workflows/pr-code-review.yml` - Enable coverage upload
- `.github/workflows/code-review.yml` - Enable coverage reporting

### 2. Expand Integration Tests

#### Database Schema Tests
- [ ] Expand `__tests__/integration/database/schema.test.ts`
- [ ] Add tests for all 7 tables (users, client_profiles, requests, quotes, proposals, workflow_states, agent_executions)
- [ ] Test all foreign key relationships
- [ ] Test all unique constraints
- [ ] Test default values and auto-generated fields

#### RLS Policy Tests
- [ ] Create `__tests__/integration/database/rls.test.ts`
- [ ] Test all 24 RLS policies
- [ ] Test multi-tenant data isolation
- [ ] Test role-based access (admin, sales_rep, operator)
- [ ] Test policy enforcement on INSERT, UPDATE, DELETE, SELECT

#### API Route Tests
- [ ] Expand tests for `/api/clients/route.ts`
- [ ] Expand tests for `/api/requests/route.ts`
- [ ] Expand tests for `/api/quotes/route.ts`
- [ ] Add tests for any new API routes

### 3. Add Missing Unit Tests

#### Agent Tests
- [ ] `agents/implementations/orchestrator-agent.ts` - Add comprehensive tests
- [ ] `agents/implementations/client-data-agent.ts` - Add comprehensive tests
- [ ] `agents/implementations/flight-search-agent.ts` - Add comprehensive tests
- [ ] `agents/implementations/proposal-analysis-agent.ts` - Expand existing tests
- [ ] `agents/implementations/communication-agent.ts` - Add comprehensive tests
- [ ] `agents/implementations/error-monitor-agent.ts` - Add comprehensive tests

#### MCP Server Tests
- [ ] `mcp-servers/gmail-mcp-server/` - Expand existing tests
- [ ] `mcp-servers/avinode-mcp-server/` - Expand existing tests
- [ ] `mcp-servers/google-sheets-mcp-server/` - Add comprehensive tests
- [ ] `mcp-servers/supabase-mcp-server/` - Add comprehensive tests

### 4. Improve Test Quality

- [ ] Add edge case coverage
- [ ] Add error handling tests
- [ ] Add validation tests
- [ ] Add concurrent operation tests
- [ ] Add timeout and retry logic tests

### 5. Test Documentation

- [ ] Document testing strategy in `docs/TESTING.md`
- [ ] Add test writing guidelines
- [ ] Document test utilities and helpers
- [ ] Add examples of good tests

---

## Acceptance Criteria

- ✅ Overall test coverage ≥75% for lines, functions, and statements
- ✅ Branch coverage ≥70%
- ✅ All integration tests pass in CI
- ✅ Coverage reports generated and uploaded in CI
- ✅ PR comments show coverage diff
- ✅ No untested critical paths
- ✅ Documentation updated

---

## Current Test Structure

```
__tests__/
├── unit/
│   ├── agents/
│   │   ├── orchestrator-agent.test.ts
│   │   └── proposal-analysis-agent.test.ts
│   ├── api/
│   │   ├── clients/route.test.ts
│   │   ├── requests/route.test.ts
│   │   └── quotes/route.test.ts
│   ├── mcp-servers/
│   │   ├── avinode-mcp.test.ts
│   │   ├── gmail-mcp.test.ts
│   │   └── google-sheets-mcp.test.ts
│   └── lib/
│       └── types/database.test.ts
├── integration/
│   └── database/
│       └── schema.test.ts
├── e2e/
│   └── (Playwright tests)
└── utils/
    └── database.ts
```

---

## Priority Test Files

**High Priority** (Critical paths):
1. RLS policies - Security critical
2. Database schema - Foundation
3. Agent orchestration - Core workflow
4. API routes - User-facing

**Medium Priority**:
1. MCP servers - External integrations
2. Utility functions
3. Type validations

**Low Priority**:
1. UI components (covered by e2e)
2. Mock data generators

---

## Tools & Configuration

**Test Framework**: Vitest
**Coverage Tool**: @vitest/coverage-v8
**Test Utilities**: `__tests__/utils/`
**CI Platform**: GitHub Actions

**Configuration Files**:
- `vitest.config.ts` - Main test configuration
- `__tests__/setup.ts` - Test setup and global mocks

---

## Example Test Structure

```typescript
// __tests__/integration/database/rls.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '@tests/utils/database'

describe('RLS Policies - Users Table', () => {
  let adminClient: TestSupabaseClient
  let salesRepClient: TestSupabaseClient

  beforeAll(async () => {
    adminClient = await createTestClient('admin')
    salesRepClient = await createTestClient('sales_rep')
  })

  it('should allow admin to view all users', async () => {
    const { data, error } = await adminClient
      .from('users')
      .select('*')

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it('should restrict sales_rep to own data only', async () => {
    const { data, error } = await salesRepClient
      .from('users')
      .select('*')

    expect(error).toBeNull()
    expect(data).toHaveLength(1) // Only own record
  })
})
```

---

## Estimated Effort

**Phase 1**: RLS Policy Tests - 4 hours
**Phase 2**: Integration Tests - 6 hours
**Phase 3**: Unit Test Expansion - 8 hours
**Phase 4**: Documentation - 2 hours

**Total**: ~20 hours (2-3 days)

---

## Dependencies

- **CI Test Environment Setup** must be completed first
- Supabase test database configured
- Test data seeding scripts available

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)
- Project Coverage Config: `vitest.config.ts:80-85`

---

**Created**: 2025-11-08
**Context**: Post-PR #22 merge follow-up
**Blocking**: Production deployment, quality assurance
