# 🚀 Apply User Table Migrations NOW

**Ready to execute!** Follow these steps to migrate your Supabase database from `iso_agents` to `users`.

---

## ⚡ Quick Execution (5 Minutes)

### Step 1: Open Supabase Dashboard
```bash
open https://app.supabase.com
```

### Step 2: Navigate to SQL Editor
1. Select your project: **v0-jetvision-assistant**
2. Click **SQL Editor** in left sidebar
3. Click **New Query**

### Step 3: Execute Migrations

Copy and paste each migration below **in order**:

#### ✅ Migration 1: Update User Roles (30 seconds)
```bash
cat supabase/migrations/005_update_user_roles.sql
```
👆 Copy the output, paste into SQL Editor, click **Run**

#### ✅ Migration 2: Rename Table (1 minute)
```bash
cat supabase/migrations/006_rename_iso_agents_to_users.sql
```
👆 Copy the output, paste into SQL Editor, click **Run**

#### ✅ Migration 3: Update Foreign Keys (1 minute)
```bash
cat supabase/migrations/007_update_foreign_keys.sql
```
👆 Copy the output, paste into SQL Editor, click **Run**

#### ✅ Migration 4: Update RLS Policies (1 minute)
```bash
cat supabase/migrations/008_update_rls_for_users.sql
```
👆 Copy the output, paste into SQL Editor, click **Run**

---

## ✅ Verification (1 minute)

After running all 4 migrations, verify success:

```sql
-- Check table exists (should return only 'users')
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'iso_agents');
```

**Expected Result**: Only `users` table

```sql
-- Check roles are valid (should NOT show 'iso_agent')
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;
```

**Expected Roles**: `sales_rep`, `admin`, `customer`, `operator`

---

## 🎉 Success!

Once verified:

1. ✅ Your database now uses `users` table
2. ✅ All foreign keys updated
3. ✅ RLS policies active
4. ✅ Application ready to use

### Update Linear Issue

```bash
# Mark ONEK-49 as complete
open https://linear.app/designthru-ai/issue/ONEK-49
```

Add comment:
```
Database migrations applied successfully at [timestamp]
- iso_agents → users table rename complete
- 4 user roles active (sales_rep, admin, customer, operator)
- All foreign keys and RLS policies updated
```

---

## 🆘 If Something Goes Wrong

### Rollback (Emergency Only)
```bash
cat supabase/migrations/009_rollback_to_iso_agents.sql
```
Paste and run to revert all changes.

### Get Help
- Check [docs/database/MIGRATION_EXECUTION_GUIDE.md](docs/database/MIGRATION_EXECUTION_GUIDE.md)
- Review [docs/database/APPLY_USER_MIGRATIONS.md](docs/database/APPLY_USER_MIGRATIONS.md)

---

**Ready? Let's go!** 🚀

Open Supabase Dashboard and start with Migration 1!
