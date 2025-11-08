# Linear Issue Creation Guide

**Purpose**: Step-by-step guide to create the 3 follow-up issues from PR #22

---

## Quick Links

- **Linear Workspace**: https://linear.app/one-kaleidoscope
- **Team**: One Kaleidoscope
- **Project**: Jetvision MAS
- **PR #22**: https://github.com/kingler/v0-jetvision-assistant/pull/22

---

## Issue 1: CI Test Environment Setup (URGENT)

### Step 1: Create the Issue

1. Go to https://linear.app/one-kaleidoscope/team/ONEK/active
2. Click **"New Issue"** (or press `C`)
3. Fill in the following:

**Title**:
```
CI Test Environment Setup
```

**Description**:
```markdown
Set up a proper test environment in GitHub Actions CI to enable integration tests and improve test coverage.

## Context

PR #22 was merged with passing code quality checks but failing test coverage checks due to missing test environment configuration. This issue tracks the setup of proper test infrastructure in CI.

**Related PR**: https://github.com/kingler/v0-jetvision-assistant/pull/22

## Tasks

### 1. Configure Supabase Test Database
- [ ] Set up Supabase test project or use local Supabase instance
- [ ] Configure database connection in GitHub Actions
- [ ] Add environment variables for test database
- [ ] Document test database setup process

### 2. Add GitHub Secrets for Test Environment
- [ ] `SUPABASE_TEST_URL` - Test database URL
- [ ] `SUPABASE_TEST_ANON_KEY` - Test anon key
- [ ] `SUPABASE_TEST_SERVICE_ROLE_KEY` - Test service role key
- [ ] `CLERK_WEBHOOK_SECRET_TEST` - Clerk webhook secret for testing
- [ ] `CHATKIT_WORKFLOW_ID_TEST` - ChatKit workflow ID for testing

### 3. Database Seeding Scripts
- [ ] Create seed data script (`scripts/test/seed-database.ts`)
- [ ] Add seed script to CI workflow
- [ ] Ensure idempotent seeding
- [ ] Add test user fixtures
- [ ] Add test client profile fixtures

### 4. Update CI Workflow
- [ ] Modify `.github/workflows/pr-code-review.yml`
- [ ] Add Supabase setup step
- [ ] Add pre-test database seeding
- [ ] Configure integration test execution
- [ ] Add post-test cleanup

## Acceptance Criteria
✅ Integration tests run successfully in CI
✅ Test database properly isolated
✅ No manual intervention required
✅ Tests are idempotent
✅ Proper cleanup after execution

## Files to Modify
- `.github/workflows/pr-code-review.yml`
- `.github/workflows/code-review.yml`
- `scripts/test/seed-database.ts` (new)
- `package.json`
- `vitest.config.ts`

## Estimated Effort
2-3 hours

## References
- PR #22: https://github.com/kingler/v0-jetvision-assistant/pull/22
- Integration tests: `__tests__/integration/database/schema.test.ts`
- Task template: `docs/tasks/TASK-CI-TEST-ENVIRONMENT.md`
```

**Settings**:
- **Priority**: Urgent (1)
- **Status**: Backlog
- **Team**: One Kaleidoscope
- **Project**: Jetvision MAS
- **Assignee**: Yourself
- **Labels**: `ci/cd`, `testing`, `supabase`, `infrastructure`
- **Estimate**: 3 (points/hours)

### Step 2: Add to Project Board

After creating, add to the "Jetvision MAS" project board in the "Backlog" column.

---

## Issue 2: Test Coverage Improvements (HIGH)

### Step 1: Create the Issue

1. Click **"New Issue"** (or press `C`)
2. Fill in the following:

**Title**:
```
Test Coverage Improvements
```

**Description**:
```markdown
Improve test coverage across the codebase to reach and maintain the 75% threshold defined in vitest.config.ts.

## Context

Current test coverage is below the 75% threshold due to:
- Missing integration tests for database operations
- Incomplete unit test coverage for new features
- Test environment not configured in CI

**Coverage Thresholds**:
- Lines: 75%
- Functions: 75%
- Branches: 70%
- Statements: 75%

**Depends On**: CI Test Environment Setup must be completed first

## Tasks

### 1. Configure Coverage Reporting in CI
- [ ] Enable coverage reports in CI
- [ ] Upload reports to Codecov
- [ ] Add coverage badge to README
- [ ] Configure PR comments with coverage diff

### 2. Expand Integration Tests

#### Database Schema Tests
- [ ] Expand `__tests__/integration/database/schema.test.ts`
- [ ] Test all 7 tables
- [ ] Test all foreign key relationships
- [ ] Test all unique constraints
- [ ] Test default values

#### RLS Policy Tests
- [ ] Create `__tests__/integration/database/rls.test.ts`
- [ ] Test all 24 RLS policies
- [ ] Test multi-tenant data isolation
- [ ] Test role-based access (admin, sales_rep, operator)
- [ ] Test policy enforcement on all operations

### 3. Add Missing Unit Tests
- [ ] Agent implementations (6 agents)
- [ ] MCP servers (4 servers)
- [ ] API routes
- [ ] Utility functions

### 4. Improve Test Quality
- [ ] Add edge case coverage
- [ ] Add error handling tests
- [ ] Add validation tests
- [ ] Add concurrent operation tests

### 5. Documentation
- [ ] Create `docs/TESTING.md`
- [ ] Document testing strategy
- [ ] Add test writing guidelines
- [ ] Provide test examples

## Acceptance Criteria
✅ Overall coverage ≥75% (lines, functions, statements)
✅ Branch coverage ≥70%
✅ All integration tests pass in CI
✅ Coverage reports generated in CI
✅ PR comments show coverage diff
✅ Documentation complete

## Estimated Effort
20 hours (2-3 days)

## Priority Tests
**High Priority**:
1. RLS policies (security critical)
2. Database schema (foundation)
3. Agent orchestration (core workflow)
4. API routes (user-facing)

## References
- PR #22: https://github.com/kingler/v0-jetvision-assistant/pull/22
- Task template: `docs/tasks/TASK-TEST-COVERAGE-IMPROVEMENTS.md`
- Coverage config: `vitest.config.ts:80-85`
```

**Settings**:
- **Priority**: High (2)
- **Status**: Backlog
- **Team**: One Kaleidoscope
- **Project**: Jetvision MAS
- **Assignee**: Yourself
- **Labels**: `testing`, `quality`, `coverage`
- **Estimate**: 20 (points/hours)
- **Blocked By**: Link to "CI Test Environment Setup" issue

---

## Issue 3: Performance Optimization (MEDIUM)

### Step 1: Create the Issue

1. Click **"New Issue"** (or press `C`)
2. Fill in the following:

**Title**:
```
Performance Optimization - Next.js Build & Bundle Size
```

**Description**:
```markdown
Review and optimize Next.js build configuration, bundle size, and runtime performance.

## Context

The Performance Review check in CI is failing, indicating potential issues with:
- Build configuration
- Bundle size
- Dependency optimization
- Runtime performance

## Tasks

### 1. Next.js Build Configuration Review
- [ ] Review `next.config.mjs`
- [ ] Enable production optimizations
- [ ] Configure code splitting strategy
- [ ] Review image optimization
- [ ] Configure font optimization

### 2. Bundle Size Analysis
- [ ] Run bundle analyzer
- [ ] Remove unused dependencies
- [ ] Identify code splitting opportunities
- [ ] Review dynamic imports
- [ ] Analyze client vs server bundles

### 3. Dependency Optimization
- [ ] Review Radix UI usage (tree-shaking)
- [ ] Check OpenAI SDK bundle size
- [ ] Optimize MCP dependencies
- [ ] Review Sentry configuration
- [ ] Check googleapis bundle impact

### 4. Build Performance Improvements
- [ ] Configure incremental builds
- [ ] Optimize TypeScript compilation
- [ ] Review ESLint performance
- [ ] Add build caching in CI

### 5. Fix Performance Review CI Check
- [ ] Update `.github/workflows/code-review.yml`
- [ ] Fix build output check
- [ ] Configure depcheck to pass
- [ ] Add performance budget checks

## Performance Budget
- Total JS: <500KB
- Total CSS: <100KB
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Build time: <3 minutes

## Acceptance Criteria
✅ Build completes successfully in CI
✅ Bundle size within limits
✅ No unused dependencies
✅ Performance Review CI passes
✅ Build time improved by 10%+
✅ Lighthouse score >90

## Estimated Effort
10 hours (1-2 days)

## References
- PR #22: https://github.com/kingler/v0-jetvision-assistant/pull/22
- Task template: `docs/tasks/TASK-PERFORMANCE-OPTIMIZATION.md`
- Next.js Performance: https://nextjs.org/docs/app/building-your-application/optimizing
```

**Settings**:
- **Priority**: Medium (3)
- **Status**: Backlog
- **Team**: One Kaleidoscope
- **Project**: Jetvision MAS
- **Assignee**: Yourself
- **Labels**: `performance`, `optimization`, `build`
- **Estimate**: 10 (points/hours)

---

## After Creating All Issues

### 1. Set Up Project Board

1. Go to Project: https://linear.app/one-kaleidoscope/project/jetvision-mas
2. Create columns if needed:
   - **Backlog** - New issues
   - **Ready** - Ready to start
   - **In Progress** - Currently working
   - **Review** - Awaiting review
   - **Done** - Completed

3. Move all 3 issues to **Backlog** column

### 2. Set Dependencies

1. Open "Test Coverage Improvements" issue
2. Under "Relations" section, click "Add blocked by"
3. Link to "CI Test Environment Setup" issue

### 3. Add PR #22 Reference

For each issue:
1. Scroll to "Relations" section
2. Click "Add relation"
3. Select "Related to"
4. Paste PR URL: `https://github.com/kingler/v0-jetvision-assistant/pull/22`

### 4. Add Labels

Ensure all labels are created in Linear:
- `ci/cd` - CI/CD related
- `testing` - Testing infrastructure
- `supabase` - Supabase database
- `infrastructure` - Infrastructure setup
- `quality` - Code quality
- `coverage` - Test coverage
- `performance` - Performance optimization
- `optimization` - General optimization
- `build` - Build system

---

## Issue IDs

After creation, update this section with the Linear issue IDs:

- [ ] **CI Test Environment Setup**: ONEK-___
- [ ] **Test Coverage Improvements**: ONEK-___
- [ ] **Performance Optimization**: ONEK-___

---

## Timeline

**Week 1**:
- Day 1-2: CI Test Environment Setup (3 hours)
- Day 2-4: Test Coverage Improvements - Phase 1 (RLS policies)

**Week 2**:
- Day 1-3: Test Coverage Improvements - Phase 2 (Integration tests)
- Day 3-5: Test Coverage Improvements - Phase 3 (Unit tests)

**Week 3**:
- Day 1-2: Performance Optimization
- Day 3: Documentation and cleanup

**Total**: ~3 weeks for complete implementation

---

## Quick Commands

**After issues are created**, you can reference them in commits:

```bash
git commit -m "feat: add test seeding script

Implements database seeding for CI test environment.

Closes ONEK-XXX"
```

---

## Notes

- Start with **CI Test Environment Setup** (URGENT) - blocks test coverage
- **Test Coverage** depends on CI setup being complete
- **Performance** can be done in parallel with test coverage
- All issues link back to PR #22 for context

---

**Created**: 2025-11-08
**Purpose**: Linear issue creation for PR #22 follow-up tasks
**Status**: Ready for execution
