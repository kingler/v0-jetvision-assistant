# TASK: CI Test Environment Setup

**Priority**: High (Urgent)
**Status**: Backlog
**Team**: One Kaleidoscope
**Project**: Jetvision MAS
**Labels**: `ci/cd`, `testing`, `supabase`, `infrastructure`
**Assignee**: @kingler

---

## Description

Set up a proper test environment in GitHub Actions CI to enable integration tests and improve test coverage.

## Context

PR #22 was merged with passing code quality checks but failing test coverage checks due to missing test environment configuration. This issue tracks the setup of proper test infrastructure in CI.

**Related PR**: #22 - feat: implement complete PostgreSQL schema with RLS policies (TASK-002)

---

## Tasks

### 1. Configure Supabase Test Database

- [ ] Set up Supabase test project or use local Supabase instance
- [ ] Configure database connection in GitHub Actions
- [ ] Add environment variables for test database
- [ ] Document test database setup process

### 2. Add GitHub Secrets for Test Environment

Add the following secrets to GitHub repository settings:

- [ ] `SUPABASE_TEST_URL` - Test database URL
- [ ] `SUPABASE_TEST_ANON_KEY` - Test anon key
- [ ] `SUPABASE_TEST_SERVICE_ROLE_KEY` - Test service role key
- [ ] `CLERK_WEBHOOK_SECRET_TEST` - Clerk webhook secret for testing
- [ ] `CHATKIT_WORKFLOW_ID_TEST` - ChatKit workflow ID for testing

### 3. Database Seeding Scripts

- [ ] Create seed data script for test database (`scripts/test/seed-database.ts`)
- [ ] Add seed script to CI workflow
- [ ] Ensure idempotent seeding (can run multiple times)
- [ ] Add test user fixtures
- [ ] Add test client profile fixtures
- [ ] Document seeding process

### 4. Update CI Workflow

Update `.github/workflows/pr-code-review.yml` and `.github/workflows/code-review.yml`:

- [ ] Add Supabase setup step before tests
- [ ] Add pre-test database seeding step
- [ ] Configure integration test execution with test DB credentials
- [ ] Add post-test cleanup step
- [ ] Update environment variables for test runs

**Example workflow step**:
```yaml
- name: Setup Supabase Test Database
  run: |
    echo "Starting Supabase local instance..."
    npx supabase start

- name: Seed Test Database
  run: pnpm run test:seed
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_TEST_SERVICE_ROLE_KEY }}

- name: Run Integration Tests
  run: pnpm run test:integration
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_TEST_ANON_KEY }}
```

---

## Acceptance Criteria

- ✅ Integration tests run successfully in CI
- ✅ Test database is properly isolated from production
- ✅ No manual intervention required for CI tests
- ✅ Tests are idempotent and can be run multiple times
- ✅ Proper cleanup after test execution
- ✅ All environment variables documented
- ✅ Test coverage reporting works in CI

---

## Files to Modify

- `.github/workflows/pr-code-review.yml` - Main PR code review workflow
- `.github/workflows/code-review.yml` - Morpheus validator workflow
- `scripts/test/seed-database.ts` - New seed script
- `package.json` - Add `test:seed` script
- `vitest.config.ts` - Ensure test DB configuration
- `__tests__/utils/database.ts` - Test DB helper utilities

---

## Testing Integration Files

Existing integration tests that will benefit:

- `__tests__/integration/database/schema.test.ts` - Schema validation tests
- `__tests__/integration/database/rls.test.ts` - RLS policy tests (if exists)

---

## Dependencies

- Supabase CLI (for local instance)
- GitHub Actions secrets configured
- Test database migrations applied

---

## Estimated Effort

**2-3 hours**

---

## References

- [Supabase CLI Local Development](https://supabase.com/docs/guides/cli/local-development)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- PR #22: https://github.com/kingler/v0-jetvision-assistant/pull/22

---

**Created**: 2025-11-08
**Context**: Post-PR #22 merge follow-up
**Blocking**: Test coverage improvements, integration test reliability
