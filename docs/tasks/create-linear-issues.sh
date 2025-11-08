#!/bin/bash

# Linear Issue Creation Script for PR #22 Follow-up Tasks
# This script provides the exact commands needed if using Linear MCP tools

# Prerequisites:
# - Linear MCP server configured
# - Claude Code with Linear MCP access
# - Linear API key set up

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Linear Issue Creation for PR #22 Follow-up Tasks         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Linear Project Info
TEAM_ID="d79d93c9-3cb4-4859-bd94-6f001183b431"  # One Kaleidoscope
PROJECT_ID="f9b76257-a731-4679-bf78-aa3172bfe7d2"  # Jetvision MAS

echo "Team: One Kaleidoscope ($TEAM_ID)"
echo "Project: Jetvision MAS ($PROJECT_ID)"
echo ""

# Issue 1: CI Test Environment Setup
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Issue 1: CI Test Environment Setup (URGENT)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat <<'EOF'

If using Linear MCP, use this command in Claude Code:

```typescript
const issue1 = await mcp__linear__create_issue({
  teamId: "d79d93c9-3cb4-4859-bd94-6f001183b431",
  projectId: "f9b76257-a731-4679-bf78-aa3172bfe7d2",
  title: "CI Test Environment Setup",
  description: `Set up a proper test environment in GitHub Actions CI to enable integration tests and improve test coverage.

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
- [ ] SUPABASE_TEST_URL - Test database URL
- [ ] SUPABASE_TEST_ANON_KEY - Test anon key
- [ ] SUPABASE_TEST_SERVICE_ROLE_KEY - Test service role key
- [ ] CLERK_WEBHOOK_SECRET_TEST - Clerk webhook secret for testing
- [ ] CHATKIT_WORKFLOW_ID_TEST - ChatKit workflow ID for testing

### 3. Database Seeding Scripts
- [ ] Create seed data script (scripts/test/seed-database.ts)
- [ ] Add seed script to CI workflow
- [ ] Ensure idempotent seeding
- [ ] Add test user fixtures
- [ ] Add test client profile fixtures

### 4. Update CI Workflow
- [ ] Modify .github/workflows/pr-code-review.yml
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
- .github/workflows/pr-code-review.yml
- .github/workflows/code-review.yml
- scripts/test/seed-database.ts (new)
- package.json
- vitest.config.ts

## Estimated Effort
2-3 hours

## References
- PR #22: https://github.com/kingler/v0-jetvision-assistant/pull/22
- Task template: docs/tasks/TASK-CI-TEST-ENVIRONMENT.md`,
  priority: 1, // Urgent
  labelIds: ["ci/cd", "testing", "supabase", "infrastructure"],
  estimate: 3,
});

console.log("✅ Issue 1 created:", issue1.identifier);
```

EOF

echo ""
echo "Press Enter to continue to Issue 2..."
read

# Issue 2: Test Coverage Improvements
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Issue 2: Test Coverage Improvements (HIGH)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat <<'EOF'

If using Linear MCP, use this command in Claude Code:

```typescript
const issue2 = await mcp__linear__create_issue({
  teamId: "d79d93c9-3cb4-4859-bd94-6f001183b431",
  projectId: "f9b76257-a731-4679-bf78-aa3172bfe7d2",
  title: "Test Coverage Improvements",
  description: `Improve test coverage across the codebase to reach and maintain the 75% threshold.

## Context

Current test coverage is below 75% threshold due to:
- Missing integration tests for database operations
- Incomplete unit test coverage
- Test environment not configured in CI

**Coverage Thresholds**: Lines 75%, Functions 75%, Branches 70%, Statements 75%
**Depends On**: CI Test Environment Setup (Issue 1)

## Tasks

### 1. Configure Coverage Reporting in CI
- [ ] Enable coverage reports in CI
- [ ] Upload reports to Codecov
- [ ] Add coverage badge to README
- [ ] Configure PR comments with coverage diff

### 2. Expand Integration Tests
- [ ] Expand __tests__/integration/database/schema.test.ts
- [ ] Test all 7 tables
- [ ] Test all foreign key relationships
- [ ] Test all unique constraints

### 3. Add RLS Policy Tests
- [ ] Create __tests__/integration/database/rls.test.ts
- [ ] Test all 24 RLS policies
- [ ] Test multi-tenant data isolation
- [ ] Test role-based access (admin, sales_rep, operator)

### 4. Add Missing Unit Tests
- [ ] Agent implementations (6 agents)
- [ ] MCP servers (4 servers)
- [ ] API routes
- [ ] Utility functions

### 5. Documentation
- [ ] Create docs/TESTING.md
- [ ] Document testing strategy
- [ ] Add test writing guidelines

## Acceptance Criteria
✅ Overall coverage ≥75%
✅ All integration tests pass in CI
✅ Coverage reports generated
✅ Documentation complete

## Estimated Effort
20 hours (2-3 days)

## References
- PR #22: https://github.com/kingler/v0-jetvision-assistant/pull/22
- Task template: docs/tasks/TASK-TEST-COVERAGE-IMPROVEMENTS.md`,
  priority: 2, // High
  labelIds: ["testing", "quality", "coverage"],
  estimate: 20,
});

console.log("✅ Issue 2 created:", issue2.identifier);

// Set dependency: Issue 2 blocks on Issue 1
await mcp__linear__update_issue({
  id: issue2.id,
  blockedByIds: [issue1.id],
});

console.log("✅ Set dependency: Issue 2 blocks on Issue 1");
```

EOF

echo ""
echo "Press Enter to continue to Issue 3..."
read

# Issue 3: Performance Optimization
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Issue 3: Performance Optimization (MEDIUM)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat <<'EOF'

If using Linear MCP, use this command in Claude Code:

```typescript
const issue3 = await mcp__linear__create_issue({
  teamId: "d79d93c9-3cb4-4859-bd94-6f001183b431",
  projectId: "f9b76257-a731-4679-bf78-aa3172bfe7d2",
  title: "Performance Optimization - Next.js Build & Bundle Size",
  description: `Review and optimize Next.js build configuration, bundle size, and runtime performance.

## Context

Performance Review CI check is failing due to:
- Build configuration issues
- Bundle size optimization needed
- Dependency optimization required

## Tasks

### 1. Next.js Build Configuration Review
- [ ] Review next.config.mjs
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

### 4. Build Performance Improvements
- [ ] Configure incremental builds
- [ ] Optimize TypeScript compilation
- [ ] Review ESLint performance
- [ ] Add build caching in CI

### 5. Fix Performance Review CI Check
- [ ] Update .github/workflows/code-review.yml
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
- Task template: docs/tasks/TASK-PERFORMANCE-OPTIMIZATION.md`,
  priority: 3, // Medium
  labelIds: ["performance", "optimization", "build"],
  estimate: 10,
});

console.log("✅ Issue 3 created:", issue3.identifier);
```

EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All 3 issues can be created with the commands above"
echo ""
echo "Manual Creation:"
echo "  → Open: https://linear.app/one-kaleidoscope/team/ONEK/active"
echo "  → Use guide: docs/tasks/LINEAR_ISSUE_CREATION_GUIDE.md"
echo ""
echo "After creation:"
echo "  1. Add all issues to 'Jetvision MAS' project"
echo "  2. Link Issue 2 as 'Blocked by' Issue 1"
echo "  3. Link all issues to PR #22"
echo ""
