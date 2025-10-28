# User Management System Database Migration

This directory contains database migrations for migrating from the `iso_agents` table to a comprehensive `users` table with multi-role support.

## Overview

**Migration Set**: 004-008
**Purpose**: Transform single-role ISO agent system into multi-role user management
**Scope**: Database schema, RLS policies, helper functions

### What Changes

**Before**:
- Table: `iso_agents`
- Roles: `iso_agent`, `admin`, `operator`
- Foreign keys: `iso_agent_id`

**After**:
- Table: `users`
- Roles: `sales_rep` (replaces `iso_agent`), `admin`, `customer`, `operator`
- Foreign keys: `user_id`
- New columns: `avatar_url`, `phone`, `timezone`, `preferences`, `last_login_at`

## Migration Files

### 004_update_user_roles.sql
**Purpose**: Update user_role enum to include new roles
**Changes**:
- Creates new enum: `user_role_new` with `sales_rep`, `admin`, `customer`, `operator`, `iso_agent`
- Migrates existing roles: `iso_agent` → `sales_rep`
- Replaces old enum with new one
**Duration**: ~5-10 seconds (small databases)
**Rollback**: Included in 008_rollback_to_iso_agents.sql

### 005_rename_iso_agents_to_users.sql
**Purpose**: Rename main table and add new profile columns
**Changes**:
- Renames `iso_agents` → `users`
- Renames all indexes
- Adds new columns: `avatar_url`, `phone`, `timezone`, `preferences`, `last_login_at`
- Migrates existing data from metadata to new columns
- Updates trigger names
**Duration**: ~10-20 seconds (depending on table size)
**Rollback**: Included in 008_rollback_to_iso_agents.sql

### 006_update_foreign_keys.sql
**Purpose**: Update foreign key references in dependent tables
**Changes**:
- `client_profiles.iso_agent_id` → `client_profiles.user_id`
- `requests.iso_agent_id` → `requests.user_id`
- Renames related indexes
- Validates no orphaned records
**Duration**: ~5-10 seconds
**Rollback**: Included in 008_rollback_to_iso_agents.sql

### 007_update_rls_for_users.sql
**Purpose**: Update RLS helper functions and policies
**Changes**:
- Replaces `get_current_iso_agent_id()` → `get_current_user_id()`
- Adds new helpers: `is_sales_rep()`, `is_customer()`, `get_current_user_role()`
- Updates all RLS policies for `users`, `client_profiles`, `requests`, `quotes`, `workflow_states`, `agent_executions`
**Duration**: ~15-30 seconds
**Rollback**: Included in 008_rollback_to_iso_agents.sql

### 008_rollback_to_iso_agents.sql
**Purpose**: EMERGENCY ROLLBACK - Reverses all changes
**WARNING**: Only use if migration fails
**Changes**: Reverses all migrations 004-007
**Duration**: ~30-60 seconds

## Pre-Migration Checklist

Before running these migrations, ensure:

- [ ] **Database Backup**: Full backup of production database
- [ ] **Staging Test**: Migrations tested on staging environment
- [ ] **Code Ready**: Updated application code ready to deploy
- [ ] **Downtime Window**: Scheduled maintenance window (recommended 30-60 minutes)
- [ ] **Team Notification**: Team aware of migration
- [ ] **Rollback Plan**: 008_rollback_to_iso_agents.sql tested and ready
- [ ] **Monitoring**: Database monitoring tools active
- [ ] **Clerk Webhook**: Ready to update webhook code

## Running the Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# 1. Ensure you're on the correct branch
git checkout feat/user-management-migration

# 2. Link to your Supabase project
supabase link --project-ref your-project-ref

# 3. Check current migration status
supabase db push --dry-run

# 4. Create backup
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# 5. Run migrations
supabase db push

# 6. Verify migrations
psql "postgresql://..." -c "\dt"  # List tables (should see 'users', not 'iso_agents')
psql "postgresql://..." -c "SELECT * FROM users LIMIT 5;"
```

### Option 2: Using Supabase Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Create a new query
3. Copy and paste each migration file in order (004 → 007)
4. Run each migration and verify success before proceeding
5. Check for errors in the output

### Option 3: Using psql Directly

```bash
# Connect to database
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Run each migration
\i supabase/migrations/004_update_user_roles.sql
\i supabase/migrations/005_rename_iso_agents_to_users.sql
\i supabase/migrations/006_update_foreign_keys.sql
\i supabase/migrations/007_update_rls_for_users.sql
```

## Verification Steps

After running migrations, verify success:

### 1. Check Table Existence

```sql
-- Should return 'users', not 'iso_agents'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'iso_agents');
```

**Expected**: Only `users` should appear

### 2. Check Role Migration

```sql
-- Check role distribution
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;
```

**Expected**: `sales_rep` should have count of former `iso_agent` users

### 3. Check Foreign Keys

```sql
-- Check client_profiles foreign keys
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'client_profiles'
AND column_name LIKE '%user_id%';

-- Check requests foreign keys
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'requests'
AND column_name LIKE '%user_id%';
```

**Expected**: Both should show `user_id`, not `iso_agent_id`

### 4. Check RLS Functions

```sql
-- List helper functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%'
OR routine_name LIKE '%iso_agent%';
```

**Expected**:
- ✅ `get_current_user_id`
- ✅ `is_sales_rep`
- ✅ `is_customer`
- ✅ `get_current_user_role`
- ❌ `get_current_iso_agent_id` (should not exist)

### 5. Check RLS Policies

```sql
-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

**Expected**: All tables should have policies

### 6. Test Data Integrity

```sql
-- Check for orphaned records
SELECT COUNT(*)
FROM client_profiles cp
LEFT JOIN users u ON cp.user_id = u.id
WHERE u.id IS NULL;
```

**Expected**: 0 (no orphaned records)

## Post-Migration Steps

### 1. Deploy Code Changes

```bash
# Deploy updated application code
vercel --prod

# Or your deployment method
git push origin main
```

### 2. Update Clerk Webhook

Ensure the Clerk webhook at `/api/webhooks/clerk` creates users in the `users` table (should already be updated in code).

### 3. Test User Flows

- [ ] Sign up new user → Creates record in `users` table
- [ ] Login existing user → Can access their data
- [ ] Sales rep creates client → Links to `user_id`
- [ ] Admin views all users → Can see all users
- [ ] RLS policies working → Users can only see their own data

### 4. Monitor

- [ ] Check error logs (first 24 hours critical)
- [ ] Monitor database performance
- [ ] Watch for RLS policy violations
- [ ] Track webhook success rate
- [ ] Monitor API response times

## Rollback Procedure

If you encounter critical issues:

### Emergency Rollback

```bash
# 1. Take immediate database snapshot
supabase db dump -f emergency-backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Run rollback migration
psql "postgresql://..." -f supabase/migrations/008_rollback_to_iso_agents.sql

# 3. Verify rollback
psql "postgresql://..." -c "\dt"  # Should see 'iso_agents', not 'users'

# 4. Redeploy old code
vercel rollback  # Or your rollback method

# 5. Verify functionality
# Test critical user flows
```

### After Rollback

1. **Investigate**: Determine root cause of failure
2. **Fix Issues**: Update migrations or code as needed
3. **Re-test**: Test fixes on staging
4. **Schedule Re-attempt**: Plan new migration window

## Common Issues

### Issue 1: Migration Times Out

**Symptoms**: Migration runs for > 5 minutes
**Cause**: Large table size or high traffic
**Solution**:
- Schedule during low-traffic period
- Consider running migrations with `LOCK TABLE` in SHARE mode
- Increase statement timeout: `SET statement_timeout = '300000';`

### Issue 2: Orphaned Records Found

**Symptoms**: Validation query finds orphaned records
**Cause**: Data inconsistency before migration
**Solution**:
```sql
-- Find orphaned records
SELECT * FROM client_profiles cp
LEFT JOIN iso_agents ia ON cp.iso_agent_id = ia.id
WHERE ia.id IS NULL;

-- Fix before migration
DELETE FROM client_profiles WHERE iso_agent_id NOT IN (SELECT id FROM iso_agents);
```

### Issue 3: RLS Policies Block Access

**Symptoms**: Users cannot access their data after migration
**Cause**: RLS policy logic error
**Solution**:
- Check JWT payload: `SELECT auth.jwt();`
- Verify helper functions work: `SELECT get_current_user_id();`
- Temporarily disable RLS for debugging: `ALTER TABLE users DISABLE ROW LEVEL SECURITY;` (re-enable after!)

### Issue 4: Enum Migration Fails

**Symptoms**: Error during 004_update_user_roles.sql
**Cause**: Enum value conflicts or dependencies
**Solution**:
- Check for dependent types or tables
- Ensure no active transactions holding locks
- Run migration in separate transaction

## Performance Considerations

### Expected Impact

| Operation | Duration | Locks | Impact |
|-----------|----------|-------|--------|
| Enum update | 5-10s | Table lock | ⚠️ Medium |
| Table rename | <1s | Metadata lock | ⚠️ Low |
| Add columns | 5-10s | Table lock | ⚠️ Medium |
| FK rename | <1s | Metadata lock | ⚠️ Low |
| RLS update | 15-30s | No locks | ✅ Minimal |

### Optimization Tips

1. **Run during low traffic**: Minimize concurrent user impact
2. **Use transactions**: Wrap migrations in `BEGIN; ... COMMIT;`
3. **Monitor locks**: `SELECT * FROM pg_locks WHERE granted = false;`
4. **Checkpoint before**: `CHECKPOINT;` before running migrations

## Support

### Documentation

- [Full Migration Plan](../../docs/USER_MANAGEMENT_MIGRATION_PLAN.md)
- [Clerk-Supabase Sync](../../docs/CLERK_SUPABASE_SYNC.md)
- [Database Schema](../migrations/001_initial_schema.sql)

### Troubleshooting

1. Check migration logs: `supabase db push --debug`
2. Review Supabase dashboard: Database → Logs
3. Check Vercel logs: `vercel logs`
4. Review test results: `npm run test`

### Emergency Contacts

- **Project Lead**: [Contact info]
- **Database Admin**: [Contact info]
- **DevOps**: [Contact info]

## Success Criteria

Migration is successful when:

- ✅ All 4 migrations (004-007) complete without errors
- ✅ Table renamed: `iso_agents` → `users`
- ✅ Roles migrated: `iso_agent` → `sales_rep`
- ✅ Foreign keys updated: `iso_agent_id` → `user_id`
- ✅ RLS policies working correctly
- ✅ No orphaned records
- ✅ All tests passing
- ✅ User flows working (signup, login, data access)
- ✅ No increase in error rates
- ✅ Performance metrics stable

## Timeline

| Step | Duration | Notes |
|------|----------|-------|
| Pre-checks | 15 min | Verify backups, team ready |
| Run migrations | 5-10 min | Execute 004-007 |
| Verification | 10 min | Run verification queries |
| Code deployment | 10 min | Deploy updated application |
| Testing | 15 min | Test critical flows |
| Monitoring | 24 hours | Watch for issues |

**Total estimated downtime**: 30-60 minutes (with rollback buffer)

---

**Last Updated**: October 25, 2025
**Migration Version**: 1.0
**Status**: Ready for staging deployment
