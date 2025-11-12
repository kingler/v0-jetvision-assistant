# Complete Migration Guide: Align Database with Documentation

**Created**: 2025-11-01
**Status**: Ready for User Action

---

## 🎯 Goal

Migrate the Supabase database from the current state to match the documentation:

| Current State | Target State |
|--------------|--------------|
| Table: `iso_agents` | Table: `users` |
| Role: `iso_agent` | Role: `sales_rep` |
| FK: `iso_agent_id` | FK: `user_id` |

---

## ✅ What's Been Done

1. ✅ Created comprehensive migration file: `supabase/migrations/010_migrate_to_users_table.sql`
2. ✅ Prepared updated sync script: `scripts/clerk/sync-users-NEW.ts`
3. ✅ Created migration guide: `APPLY_MIGRATION_010.md`
4. ✅ **Migration SQL copied to clipboard** ← Ready to paste!

---

## 🚀 Step-by-Step Instructions

### Step 1: Apply Migration (YOU DO THIS NOW)

**The migration SQL is already in your clipboard!**

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** → **New Query**
4. **Paste** the migration SQL (Cmd+V)
5. Click **Run** (Cmd+Enter)
6. Wait 30-60 seconds

#### Expected Output:
```
NOTICE:  ✅ Table successfully renamed from iso_agents to users
NOTICE:  ✅ Migrated 7 users to sales_rep role
NOTICE:  ✅ RLS enabled on all tables
NOTICE:  Foreign key constraints verified successfully
NOTICE:  ========================================
NOTICE:  Migration 010 Completed Successfully
NOTICE:  ========================================
NOTICE:  Total users: 9
NOTICE:    - Sales Reps: 7
NOTICE:    - Admins: 2
NOTICE:    - Customers: 0
NOTICE:    - Operators: 0
NOTICE:  ========================================
```

#### If You See Errors:
- Read the error message carefully
- Check [APPLY_MIGRATION_010.md](APPLY_MIGRATION_010.md) troubleshooting section
- The migration has built-in rollback capability

---

### Step 2: Verify Migration (Run These Queries)

After the migration completes, run these verification queries in the SQL Editor:

#### Query 1: Check users table exists
```sql
SELECT * FROM users LIMIT 5;
```
✅ Should return users with `sales_rep` role (not `iso_agent`)

#### Query 2: Confirm old table is gone
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'iso_agents');
```
✅ Should show only `users` (not `iso_agents`)

#### Query 3: Check role distribution
```sql
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;
```
✅ Should show: `sales_rep`, `admin`, `operator` (NO `iso_agent`)

---

### Step 3: Update Application Code

Once migration is verified, update the application code:

#### A. Replace Sync Script

```bash
# Backup current version
mv scripts/clerk/sync-users.ts scripts/clerk/sync-users-OLD.ts

# Use new version
mv scripts/clerk/sync-users-NEW.ts scripts/clerk/sync-users.ts
```

#### B. Update Webhook

File: `app/api/webhooks/clerk/route.ts`

Find and replace (2 changes needed):

**Change 1** - Table name (appears ~5 times):
```typescript
// FROM:
.from('iso_agents')

// TO:
.from('users')
```

**Change 2** - Default role (appears ~2 times):
```typescript
// FROM:
role: metadata?.role || 'iso_agent'

// TO:
role: metadata?.role || 'sales_rep'
```

---

### Step 4: Test the System

#### A. Delete Old Synced Users

The current users were synced with the old schema. We need to delete them and re-sync:

```bash
# Run verification script to see current users
npx tsx scripts/clerk/verify-sync.ts
```

**Option 1**: Delete via Supabase Dashboard SQL Editor:
```sql
-- Delete users synced with old schema
DELETE FROM users
WHERE clerk_user_id IN (
  'user_34sZ1CKQIimet0xDqOVEFBeNxcz',
  'user_34sYCoSlyn6siCnXWL49nvakvYp',
  'user_34YmaZ12hM0a9wpp3aDqVBNuqyJ',
  'user_34Ylb9cbSnECXxeIsKcbwnZ4EUb',
  'user_34R2SvVkcfq5fWJkdQT0AFluLRr'
);
```

**Option 2**: Keep them (they'll be updated on next sync)

#### B. Re-Sync Clerk Users (with NEW schema)

```bash
# Dry run first
npx tsx scripts/clerk/sync-users.ts --dry-run

# If looks good, run actual sync
npx tsx scripts/clerk/sync-users.ts
```

Expected output:
```
✅ Created 5 users
All users now have role: sales_rep
```

#### C. Verify Final State

```bash
# Run verification
npx tsx scripts/clerk/verify-sync.ts
```

Should show:
- All users in `users` table ✅
- All users have `sales_rep` or `admin` role ✅
- No `iso_agent` role ✅

---

### Step 5: Test User Authentication

1. Open your application
2. Sign in with Clerk
3. Verify:
   - ✅ Login works
   - ✅ User profile loads
   - ✅ RLS policies work (can see own data)
   - ✅ RBAC permissions work

---

## 📋 Verification Checklist

After completing all steps:

- [ ] Migration 010 applied successfully
- [ ] Verification queries passed
- [ ] sync-users.ts replaced with NEW version
- [ ] Webhook updated (table + role)
- [ ] Clerk users re-synced
- [ ] Users table shows sales_rep role
- [ ] User authentication works
- [ ] RLS policies working correctly
- [ ] No errors in application logs

---

## 🔄 If Something Goes Wrong

### Rollback Migration

If the migration fails or causes issues:

```bash
# Copy rollback migration to clipboard
cat supabase/migrations/009_rollback_to_iso_agents.sql | pbcopy

# Paste and run in Supabase SQL Editor
```

This will revert everything back to `iso_agents` table with `iso_agent` role.

### Restore Original Sync Script

```bash
# If you backed up the old version
mv scripts/clerk/sync-users-OLD.ts scripts/clerk/sync-users.ts
```

---

## 📊 Current System State

### Before Migration:
```
Table: iso_agents
Roles: iso_agent, admin, operator
FKs: iso_agent_id
Users: 9 (7 iso_agent, 2 admin)
```

### After Migration:
```
Table: users
Roles: sales_rep, admin, customer, operator
FKs: user_id
Users: 9 (7 sales_rep, 2 admin)
New Columns: avatar_url, phone, timezone, preferences, last_login_at
```

---

## 📚 Related Documentation

- [APPLY_MIGRATION_010.md](APPLY_MIGRATION_010.md) - Detailed migration instructions
- [docs/CLERK_SUPABASE_SYNC.md](docs/CLERK_SUPABASE_SYNC.md) - Webhook documentation
- [docs/USER_MANAGEMENT_MIGRATION_PLAN.md](docs/USER_MANAGEMENT_MIGRATION_PLAN.md) - Migration plan
- [docs/database/APPLY_USER_MIGRATIONS.md](docs/database/APPLY_USER_MIGRATIONS.md) - Database migrations

---

## 🎯 Success Criteria

You'll know the migration was successful when:

1. ✅ `users` table exists (not `iso_agents`)
2. ✅ All users have `sales_rep` role (not `iso_agent`)
3. ✅ Foreign keys use `user_id` (not `iso_agent_id`)
4. ✅ Clerk sync works with new schema
5. ✅ User authentication works
6. ✅ Documentation matches reality

---

## 🆘 Need Help?

If you encounter issues:

1. Check error messages in Supabase SQL Editor
2. Review [APPLY_MIGRATION_010.md](APPLY_MIGRATION_010.md) troubleshooting
3. Check Supabase logs: https://supabase.com/dashboard/project/_/logs
4. Use rollback if needed (migration 009)

---

**Ready to proceed?** Start with Step 1: Apply the migration (SQL is in your clipboard!)
