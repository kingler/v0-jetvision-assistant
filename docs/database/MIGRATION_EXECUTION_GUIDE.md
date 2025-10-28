# Jetvision Database Migration Execution Guide

**Date**: October 28, 2025
**Branch**: `feat/apply-user-table-migrations`
**Issue**: ONEK-49 - Apply User Table Migrations
**Status**: Ready to Execute

---

## Quick Start (5 Minutes)

### Method 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**:
   ```bash
   open https://app.supabase.com
   ```

2. **Navigate**: Your Project → SQL Editor → New Query

3. **Execute migrations in order**:

#### Step 1: Apply Migration 004 (User Roles)
```bash
# Copy the entire content:
cat supabase/migrations/004_update_user_roles.sql
```
Paste into SQL Editor and click **Run**.

#### Step 2: Apply Migration 005 (Rename Table)
```bash
# Copy the entire content:
cat supabase/migrations/005_rename_iso_agents_to_users.sql
```
Paste into SQL Editor and click **Run**.

#### Step 3: Apply Migration 006 (Foreign Keys)
```bash
# Copy the entire content:
cat supabase/migrations/006_update_foreign_keys.sql
```
Paste into SQL Editor and click **Run**.

#### Step 4: Apply Migration 007 (RLS Policies)
```bash
# Copy the entire content:
cat supabase/migrations/007_update_rls_for_users.sql
```
Paste into SQL Editor and click **Run**.

4. **Verify** (paste and run):
```sql
-- Should return only 'users', not 'iso_agents'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'iso_agents');
```

**Expected Result**: Only `users` table should appear.

---

## Method 2: Supabase CLI (Automated)

### Prerequisites

1. **Get Access Token**:
   - Go to: https://app.supabase.com/account/tokens
   - Click "Generate new token"
   - Copy the token

2. **Set Environment Variable**:
   ```bash
   export SUPABASE_ACCESS_TOKEN='your-token-here'
   ```

3. **Run Migration Script**:
   ```bash
   ./scripts/database/apply-user-migrations.sh
   ```

The script will:
- ✅ Authenticate with Supabase
- ✅ Link to your project
- ✅ Apply all migrations in order
- ✅ Verify success

---

## Verification Checklist

After applying migrations, run these queries in SQL Editor:

### 1. Table Exists
```sql
SELECT * FROM users LIMIT 1;
```
**Expected**: Returns user data (or empty if no users yet)

### 2. Columns Present
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```
**Expected Columns**:
- id, clerk_user_id, email, full_name, role
- avatar_url, phone, timezone, preferences
- last_login_at, margin_type, margin_value
- is_active, metadata, created_at, updated_at

### 3. Roles Valid
```sql
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;
```
**Expected**: sales_rep, admin, customer, operator (NO iso_agent)

### 4. Foreign Keys Updated
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'users';
```
**Expected**: All foreign keys point to `users` table with `user_id` columns

### 5. RLS Policies Active
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'users';
```
**Expected**: Multiple policies (SELECT, INSERT, UPDATE, DELETE)

---

## Rollback (If Needed)

If something goes wrong:

```bash
# Copy rollback migration:
cat supabase/migrations/008_rollback_to_iso_agents.sql
```

Paste into SQL Editor and run. This will:
- Rename `users` → `iso_agents`
- Revert all column names
- Restore original RLS policies

⚠️ **Warning**: Any new user data will be moved to metadata column.

---

## Post-Migration Steps

1. **Verify Application**:
   ```bash
   # Test API endpoints
   curl -X GET https://your-app.vercel.app/api/users/me \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Test User Authentication**:
   - Sign in to your application
   - Check user profile page
   - Verify RBAC permissions

3. **Monitor Logs**:
   - Check Supabase logs for errors
   - Monitor application logs
   - Watch for authentication issues

4. **Update Linear**:
   - Mark ONEK-49 as complete
   - Add comment with migration timestamp
   - Close related PRs

---

## Migration Files Reference

| File | Purpose | Order |
|------|---------|-------|
| 004_update_user_roles.sql | Add 4 new user roles | 1st |
| 005_rename_iso_agents_to_users.sql | Rename table, add columns | 2nd |
| 006_update_foreign_keys.sql | Update FK columns | 3rd |
| 007_update_rls_for_users.sql | Update security policies | 4th |
| 008_rollback_to_iso_agents.sql | Rollback script | Emergency only |

---

## Troubleshooting

### Error: "relation iso_agents does not exist"
**Solution**: Migration already applied, skip to verification

### Error: "column user_id does not exist"
**Solution**: Run migration 006 again

### Error: "permission denied"
**Solution**: Run migration 007 (RLS policies)

### Error: Tests Failing
**Solution**:
```bash
# The avatar upload tests have known issues in feat/user-profile-ui
# These don't affect the migration
# Fix separately after migration completes
```

---

## Success Criteria

- ✅ `users` table exists
- ✅ `iso_agents` table does NOT exist
- ✅ All columns present
- ✅ Foreign keys renamed to `user_id`
- ✅ RLS policies active
- ✅ Application connects successfully
- ✅ User authentication works
- ✅ No errors in logs

---

## Timeline

**Estimated Time**: 5-10 minutes

1. **T+0**: Open Supabase Dashboard
2. **T+1**: Apply migration 004 (30 seconds)
3. **T+2**: Apply migration 005 (1 minute)
4. **T+3**: Apply migration 006 (1 minute)
5. **T+4**: Apply migration 007 (1 minute)
6. **T+5**: Run verification queries (2 minutes)
7. **T+7**: Test application (2 minutes)
8. **T+9**: Complete ✅

---

**Next Steps**: Once migration is complete, update this document with actual execution details and commit to the feature branch.
