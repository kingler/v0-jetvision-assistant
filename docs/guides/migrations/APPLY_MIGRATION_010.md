# Apply Migration 010: Migrate to Users Table

**Status**: Ready to Apply
**Created**: 2025-11-01
**Migration File**: `supabase/migrations/010_migrate_to_users_table.sql`

---

## What This Migration Does

This migration transforms your database to match the documentation:

### Changes:
1. **Table Rename**: `iso_agents` → `users`
2. **Role Update**: `iso_agent` → `sales_rep`
3. **Foreign Keys**: `iso_agent_id` → `user_id` in all tables
4. **New Columns**: Adds avatar_url, phone, timezone, preferences, last_login_at
5. **RLS Updates**: All Row Level Security policies updated

### Impact:
- **Existing Users**: All 9 users will be migrated automatically
- **Downtime**: ~2-5 minutes
- **Rollback**: Can be rolled back if needed

---

## Quick Start (Recommended Method)

The migration SQL has been **copied to your clipboard**. Follow these steps:

### Step 1: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Apply Migration

1. **Paste** the migration SQL (already in clipboard)
2. Click **Run** or press `Cmd+Enter`
3. Wait 30-60 seconds for completion

### Step 3: Verify Success

You should see output messages like:
```
✅ Table successfully renamed from iso_agents to users
✅ Migrated X users to sales_rep role
✅ RLS enabled on all tables
```

And a summary:
```
========================================
Migration 010 Completed Successfully
========================================
Total users: 9
  - Sales Reps: 7
  - Admins: 2
  - Customers: 0
  - Operators: 0
========================================
```

---

## Verification Queries

After migration, run these queries in the SQL Editor to verify:

### 1. Check Table Exists
```sql
SELECT * FROM users LIMIT 5;
```
**Expected**: Should return users with `sales_rep` role

### 2. Verify Old Table is Gone
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'iso_agents');
```
**Expected**: Only `users` should appear (not `iso_agents`)

### 3. Check Role Distribution
```sql
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;
```
**Expected**: Roles should be `sales_rep`, `admin`, `operator` (NO `iso_agent`)

### 4. Verify Foreign Keys
```sql
SELECT column_name, table_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'user_id'
ORDER BY table_name;
```
**Expected**: `client_profiles` and `requests` should have `user_id` column

---

## Alternative Methods

### Method 2: Using psql (Direct Connection)

If you have database credentials:

```bash
# Get your connection string from Supabase Dashboard > Settings > Database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  -f supabase/migrations/010_migrate_to_users_table.sql
```

### Method 3: Supabase CLI

```bash
# 1. Login (if not already)
supabase login

# 2. Link to project
supabase link --project-ref YOUR_PROJECT_REF

# 3. Push migration
supabase db push
```

---

## After Migration: Update Application Code

Once the migration is successful, you need to update the application code:

### 1. Update Clerk Sync Script

The sync script has already been prepared. You'll need to revert it to use the new schema:

```bash
# The script is ready at: scripts/clerk/sync-users.ts
# It needs to be updated to use:
# - Table: users (instead of iso_agents)
# - Role: sales_rep (instead of iso_agent)
```

### 2. Update Clerk Webhook

File: `app/api/webhooks/clerk/route.ts`

Change:
```typescript
// FROM:
.from('iso_agents')

// TO:
.from('users')
```

And:
```typescript
// FROM:
role: 'iso_agent'

// TO:
role: 'sales_rep'
```

### 3. Re-sync Clerk Users

After updating the code:

```bash
# Delete old records (they're using iso_agent table)
# Then sync again with new schema
npm run clerk:sync-users
```

---

## Troubleshooting

### Error: "relation iso_agents does not exist"
**Cause**: Table already renamed
**Solution**: Migration already applied successfully!

### Error: "column user_id does not exist"
**Cause**: Foreign key update didn't complete
**Solution**: Re-run the migration or run migration 007 specifically

### Error: "type user_role_new already exists"
**Cause**: Migration partially applied
**Solution**: Drop the new type first:
```sql
DROP TYPE IF EXISTS user_role_new CASCADE;
```
Then re-run the migration.

### Error: "cannot drop type user_role because other objects depend on it"
**Cause**: Need to use CASCADE
**Solution**: The migration handles this automatically. If you see this, the migration wasn't run properly.

---

## Rollback (If Needed)

If something goes wrong, you can rollback using migration 009:

```bash
# Copy rollback migration to clipboard
cat supabase/migrations/009_rollback_to_iso_agents.sql | pbcopy

# Then paste and run in Supabase SQL Editor
```

This will:
- Rename `users` → `iso_agents`
- Change `sales_rep` → `iso_agent`
- Revert all column names
- Restore original RLS policies

---

## Current Status

- ✅ Migration file created
- ✅ Migration SQL copied to clipboard
- ⏳ **Next Step**: Apply migration in Supabase Dashboard

---

## After Migration Checklist

- [ ] Migration applied successfully
- [ ] Verification queries run
- [ ] Update sync-users.ts (table + role)
- [ ] Update webhook (table + role)
- [ ] Re-sync Clerk users
- [ ] Test user authentication
- [ ] Verify RLS policies working
- [ ] Update documentation (if needed)

---

**Migration File**: `supabase/migrations/010_migrate_to_users_table.sql`
**Estimated Time**: 2-5 minutes
**Risk Level**: Medium (has rollback)
