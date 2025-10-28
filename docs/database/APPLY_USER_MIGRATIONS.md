# Apply User Management Migrations to Supabase

**Status**: Ready to apply
**Impact**: Renames `iso_agents` table to `users` with enhanced user profiles
**Estimated Time**: 5-10 minutes
**Rollback Available**: Yes (migration 008)

---

## Prerequisites

- [ ] Access to Supabase Dashboard
- [ ] Database backup created (recommended)
- [ ] All application code updated to use `users` table (✅ DONE)
- [ ] No active users in the system (or plan for downtime)

---

## Migration Overview

These migrations will:
1. ✅ Add new user roles (sales_rep, admin, customer, operator)
2. ✅ Rename `iso_agents` table to `users`
3. ✅ Add new columns: avatar_url, phone, timezone, preferences, last_login_at
4. ✅ Update all foreign keys
5. ✅ Update Row Level Security (RLS) policies

---

## Method 1: Supabase Dashboard (Recommended)

### Step 1: Access SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: **v0-jetvision-assistant**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Apply Migrations

Execute each migration **in order**:

#### Migration 1: Update User Roles

```bash
# Copy content from this file:
cat supabase/migrations/004_update_user_roles.sql
```

**What it does**:
- Adds 4 new user roles: sales_rep, admin, customer, operator
- Migrates existing iso_agent roles to sales_rep
- Updates role enum

**Expected output**: `ALTER TYPE`, no errors

---

#### Migration 2: Rename Table

```bash
# Copy content from this file:
cat supabase/migrations/005_rename_iso_agents_to_users.sql
```

**What it does**:
- Renames `iso_agents` → `users`
- Renames indexes
- Adds 5 new columns
- Migrates data from metadata

**Expected output**: `ALTER TABLE`, `COMMENT`, `CREATE INDEX`

---

#### Migration 3: Update Foreign Keys

```bash
# Copy content from this file:
cat supabase/migrations/006_update_foreign_keys.sql
```

**What it does**:
- Renames foreign key columns: `iso_agent_id` → `user_id`
- Updates constraints
- Preserves referential integrity

**Expected output**: `ALTER TABLE`, multiple columns updated

---

#### Migration 4: Update RLS Policies

```bash
# Copy content from this file:
cat supabase/migrations/007_update_rls_for_users.sql
```

**What it does**:
- Drops old RLS policies on iso_agents
- Creates new RLS policies on users table
- Maintains security model

**Expected output**: `DROP POLICY`, `CREATE POLICY`

---

### Step 3: Verify Migration

Run this verification query:

```sql
-- Check that iso_agents table is gone and users table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'iso_agents');
```

**Expected Result**: Only `users` should appear

```sql
-- Check table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;
```

**Expected columns**:
- id, clerk_user_id, email, full_name, role
- avatar_url, phone, timezone, preferences, last_login_at
- margin_type, margin_value, is_active, metadata
- created_at, updated_at

```sql
-- Check user roles
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;
```

**Expected roles**: sales_rep, admin, customer, operator (no iso_agent)

---

## Method 2: Supabase CLI

### Prerequisites

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Get access token from: https://app.supabase.com/account/tokens
export SUPABASE_ACCESS_TOKEN='your-token-here'

# Or login interactively
supabase login
```

### Apply Migrations

#### Option A: Using the Helper Script

```bash
# Run the migration script
./scripts/database/apply-user-migrations.sh
```

The script will:
1. ✅ Check authentication
2. ✅ Link to your project
3. ✅ Show migration status
4. ✅ Apply all migrations
5. ✅ Verify the changes

#### Option B: Manual CLI Commands

```bash
# 1. Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# 2. Check current migration status
supabase db remote list

# 3. Apply migrations
supabase db push

# 4. Verify
supabase db remote list
```

---

## Method 3: Direct Database Connection (Advanced)

If you have direct PostgreSQL access:

```bash
# Connect to your database
psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"

# Run migrations in order
\i supabase/migrations/004_update_user_roles.sql
\i supabase/migrations/005_rename_iso_agents_to_users.sql
\i supabase/migrations/006_update_foreign_keys.sql
\i supabase/migrations/007_update_rls_for_users.sql

# Verify
\dt users
\dt iso_agents
```

---

## Verification Checklist

After applying migrations, verify:

- [ ] `users` table exists
- [ ] `iso_agents` table does NOT exist
- [ ] All columns present in `users` table
- [ ] Foreign keys renamed to `user_id`
- [ ] RLS policies active on `users` table
- [ ] User roles are valid (no old `iso_agent` role)
- [ ] Indexes renamed correctly
- [ ] Application still connects successfully

**Test queries**:

```sql
-- 1. Check table exists
SELECT * FROM users LIMIT 1;

-- 2. Check foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'users';

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users';
```

---

## Troubleshooting

### Error: "relation iso_agents does not exist"

**Cause**: Table already renamed
**Solution**: Migration already applied, skip to verification

### Error: "column user_id does not exist"

**Cause**: Foreign key migration incomplete
**Solution**: Run migration 006 again

### Error: "permission denied for table users"

**Cause**: RLS policies not updated
**Solution**: Run migration 007 again

### Error: "role iso_agent does not exist in enum"

**Cause**: Role enum not updated
**Solution**: Run migration 004 again

---

## Rollback Procedure

If you need to rollback:

```sql
-- Run the rollback migration
\i supabase/migrations/008_rollback_to_iso_agents.sql
```

**This will**:
- Rename `users` → `iso_agents`
- Revert all column names
- Restore original RLS policies
- Remove new user roles

⚠️ **Warning**: Any new user data (avatar_url, phone, etc.) will be moved to metadata column

---

## Post-Migration Tasks

After successful migration:

1. **Update Environment Variables** (if any reference iso_agents)
2. **Clear Application Cache** (if caching database schema)
3. **Restart Application** (to use new table name)
4. **Monitor Logs** for any errors
5. **Test User Authentication** flow
6. **Verify RBAC Permissions** working correctly

---

## Application Integration

The following application components already use the `users` table:

✅ **API Routes**:
- `/api/agents` - Agent execution
- `/api/clients` - Client management
- `/api/requests` - RFP requests
- `/api/quotes` - Quote management
- `/api/workflows` - Workflow tracking
- `/api/users/me` - User profile
- `/api/users` - User management (admin)
- `/api/webhooks/clerk` - Clerk sync

✅ **Middleware**:
- `lib/middleware/rbac.ts` - RBAC permissions

✅ **Hooks**:
- `lib/hooks/use-user-role.ts` - Client-side role checking

✅ **Types**:
- `lib/types/database.ts` - User interface

---

## Migration Timeline

Estimated downtime: **5-10 minutes**

1. **T-0**: Start maintenance mode
2. **T+1**: Create database backup
3. **T+2**: Apply migration 004 (roles) - 30 seconds
4. **T+3**: Apply migration 005 (rename) - 1 minute
5. **T+4**: Apply migration 006 (foreign keys) - 1 minute
6. **T+5**: Apply migration 007 (RLS) - 1 minute
7. **T+6**: Verify migrations - 1 minute
8. **T+7**: Test application - 2 minutes
9. **T+9**: End maintenance mode

---

## Support

If you encounter issues:

1. Check [Supabase Logs](https://app.supabase.com/project/_/logs)
2. Review migration files in `supabase/migrations/`
3. Consult [docs/USER_MANAGEMENT_MIGRATION_PLAN.md](../USER_MANAGEMENT_MIGRATION_PLAN.md)
4. Check Linear issue [ONEK-49](https://linear.app/designthru-ai/issue/ONEK-49)

---

**Status**: ✅ Ready to apply
**Last Updated**: 2025-10-27
**Migration Files**: 004, 005, 006, 007, 008 (rollback)
