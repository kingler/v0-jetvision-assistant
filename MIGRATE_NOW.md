# 🚀 Automated Migration Script

**Quick and easy** database migration using our automated scripts!

---

## ⚡ Quick Start (5 Minutes)

### Option 1: Direct PostgreSQL (Recommended)

```bash
# Run the automated migration script
./scripts/apply-migrations.sh
```

The script will:
1. ✅ Check all prerequisites (psql, migration files)
2. 🔍 Test database connection
3. 📊 Show current database state
4. ⚠️  Ask for confirmation
5. 🚀 Apply all 4 migrations (005-008)
6. ✅ Verify migration success
7. 📈 Display summary with next steps

---

### Option 2: Via Supabase CLI

```bash
# Run the Supabase CLI migration script
./scripts/migrate-user-table.sh
```

---

## 📋 Prerequisites

### 1. Install PostgreSQL Client (psql)

**macOS:**
```bash
brew install postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Get Your Database URL

From Supabase Dashboard:
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **Settings** → **Database**
4. Copy **Connection string** (URI format)
5. Replace `[YOUR-PASSWORD]` with your database password

Format:
```
postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
```

---

## 🎯 What Gets Migrated

### Migration 005: Update User Roles
- Adds 4 new roles: `sales_rep`, `admin`, `customer`, `operator`
- Migrates existing `iso_agent` roles to `sales_rep`

### Migration 006: Rename Table
- Renames: `iso_agents` → `users`
- Adds 5 new columns:
  - `avatar_url` - User profile picture
  - `phone` - Phone number
  - `timezone` - User timezone (default: UTC)
  - `preferences` - JSON preferences
  - `last_login_at` - Last login timestamp

### Migration 007: Update Foreign Keys
- Updates columns: `iso_agent_id` → `user_id`
- Affected tables:
  - `client_profiles`
  - `requests`
  - `quotes`
  - `workflow_states`
  - `agent_executions`

### Migration 008: Update RLS Policies
- Updates Row Level Security policies for `users` table
- Adds admin and sales_rep specific policies

---

## 🆘 Troubleshooting

### Script says "psql not found"
Install PostgreSQL client (see Prerequisites above)

### Connection failed
- Verify database URL is correct
- Check password doesn't contain special characters (URL encode if needed)
- Ensure your IP is allowed in Supabase (Settings → Database → Connection pooling)

### Migration fails mid-way
The script will ask what to do:
1. **Continue** - Try remaining migrations (not recommended)
2. **Rollback** - Revert all changes automatically
3. **Abort** - Stop and leave database as-is

### Manual rollback
If automated rollback fails:
```bash
psql "YOUR_DB_URL" -f supabase/migrations/009_rollback_to_iso_agents.sql
```

---

## ✅ Verification

After migration, verify with these queries:

### Check table exists
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'users' AND table_schema = 'public';
-- Should return: users
```

### Check roles
```sql
SELECT DISTINCT role FROM users ORDER BY role;
-- Should return: admin, customer, operator, sales_rep
```

### Check new columns
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('avatar_url', 'phone', 'timezone', 'preferences', 'last_login_at');
-- Should return all 5 columns
```

### Check foreign keys
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'user_id'
AND table_name IN ('client_profiles', 'requests', 'quotes', 'workflow_states', 'agent_executions')
ORDER BY table_name;
-- Should return 5 rows
```

---

## 📚 Related Documentation

- [Full Migration Guide](docs/database/APPLY_USER_MIGRATIONS.md) - Comprehensive 731-line guide
- [Execution Guide](docs/database/MIGRATION_EXECUTION_GUIDE.md) - Step-by-step instructions
- [Manual Method](APPLY_MIGRATIONS_NOW.md) - Dashboard SQL copy-paste method

---

## 🎉 After Migration

1. **Update Linear Issues**
   - Mark ONEK-49, ONEK-50, ONEK-51 as "Done"

2. **Test Authentication**
   ```bash
   npm run dev
   # Test login with different roles
   ```

3. **Deploy Changes**
   ```bash
   git push
   # Or deploy via Vercel/your platform
   ```

---

**Need help?** Check [docs/database/APPLY_USER_MIGRATIONS.md](docs/database/APPLY_USER_MIGRATIONS.md) for detailed troubleshooting.

**Prefer manual?** Use [APPLY_MIGRATIONS_NOW.md](APPLY_MIGRATIONS_NOW.md) for Dashboard SQL method.
