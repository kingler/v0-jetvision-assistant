# Test Database Setup

This directory contains scripts and utilities for setting up and managing the test database.

## Files

- `seed-database.ts` - Seeds the test database with fixture data

## Quick Start

### 1. Configure Test Environment

Copy the test environment template:

```bash
cp .env.test.example .env.test
```

Edit `.env.test` with your test database credentials.

### 2. Seed the Database

```bash
pnpm run test:seed
```

This will:
- Clear existing test data
- Create test users (admin, sales_rep, operator)
- Create test client profiles
- Create sample requests and quotes

### 3. Run Tests

```bash
# Run all tests
pnpm test

# Run integration tests only
pnpm run test:integration

# Run with coverage
pnpm run test:coverage
```

## Test Data

The seeding script creates the following test data:

### Users
- **Admin**: `admin@test.jetvision.com`
- **Sales Rep**: `sales@test.jetvision.com`
- **Operator**: `operator@test.jetvision.com`

### Client Profiles
- Acme Corporation (john@acme.com)
- TechStart Inc (jane@techstart.com)

### Sample Data
- 1 test request (TEB → VNY)
- 2 test quotes (Citation X, Gulfstream G650)

## CI/CD Integration

The test database setup is integrated into GitHub Actions workflows:

1. **Setup Test Database** - Configures test environment
2. **Seed Test Database** - Runs `pnpm run test:seed`
3. **Run Tests** - Executes test suites with seeded data

See `.github/workflows/pr-code-review.yml` for implementation details.

## Local Supabase Setup (Recommended for CI)

For CI environments, use Supabase CLI local instance:

```bash
# Start local Supabase
npx supabase start

# Get credentials
npx supabase status

# Set in .env.test
SUPABASE_TEST_URL=http://localhost:54321
SUPABASE_TEST_ANON_KEY=<from supabase status>
SUPABASE_TEST_SERVICE_ROLE_KEY=<from supabase status>
```

## Idempotency

The seeding script is **idempotent** - it can be run multiple times safely:

1. Clears all test data matching test patterns
2. Seeds fresh test data
3. Returns consistent results

## Cleanup

To manually clear test data:

```typescript
import { clearTestData } from './scripts/test/seed-database'

await clearTestData()
```

## Environment Variables

Required environment variables (see `.env.test.example`):

```bash
# Supabase
SUPABASE_TEST_URL
SUPABASE_TEST_ANON_KEY
SUPABASE_TEST_SERVICE_ROLE_KEY

# Clerk (optional)
CLERK_WEBHOOK_SECRET_TEST
CLERK_SECRET_KEY_TEST

# ChatKit (optional)
CHATKIT_WORKFLOW_ID_TEST
```

## Troubleshooting

### "Missing required environment variables"

Ensure `.env.test` is created and configured with valid Supabase credentials.

### "Database seeding failed"

1. Check Supabase connection
2. Verify service role key has proper permissions
3. Check database migrations are up to date

### Tests fail with RLS policy errors

The seeding script uses the service role key which bypasses RLS. If tests fail with RLS errors, check that test client is configured correctly.

## References

- Main test utils: `__tests__/utils/database.ts`
- Integration tests: `__tests__/integration/database/`
- Task: `docs/tasks/TASK-CI-TEST-ENVIRONMENT.md`
