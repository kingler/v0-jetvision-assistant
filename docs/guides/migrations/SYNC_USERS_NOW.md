# Sync Clerk Users to Supabase - Ready to Run

## 🚀 Quick Start (Copy & Paste)

Open your terminal in the project directory and run:

### Option 1: Preview First (Recommended)
```bash
npm run clerk:sync-users:dry-run
```

### Option 2: Actually Sync
```bash
npm run clerk:sync-users
```

### Option 3: Use Shell Script
```bash
./sync-clerk-users.sh --dry-run  # Preview
./sync-clerk-users.sh            # Actually sync (asks for confirmation)
```

---

## 📋 Before You Start

### ✅ Pre-flight Checklist

Make sure you have these in your `.env.local`:

```env
# Clerk (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Missing any?** See [Getting Credentials](#getting-credentials) below.

---

## 🔍 Step 1: Dry Run (See What Will Happen)

```bash
npm run clerk:sync-users:dry-run
```

### Expected Output:

```
🔄 Clerk → Supabase User Sync
==============================

🔍 DRY RUN MODE - No changes will be made

📥 Fetching users from Clerk...
Found 5 users in Clerk

Processing: john.doe@example.com
  Clerk ID: user_2abc123xyz
  Name: John Doe
  Role: sales_rep
  [DRY RUN] Would sync to iso_agents table

Processing: jane.smith@example.com
  Clerk ID: user_2def456uvw
  Name: Jane Smith
  Role: admin
  [DRY RUN] Would sync to iso_agents table

Processing: bob.wilson@example.com
  Clerk ID: user_2ghi789rst
  Name: Bob Wilson
  Role: sales_rep
  [DRY RUN] Would sync to iso_agents table

📊 Sync Summary
================
Total users:     5
Created:         5
Updated:         0
Skipped:         0
Errors:          0

✅ Dry run completed successfully!
Run without --dry-run to actually sync the users.
```

### What This Shows:

- ✅ How many users exist in Clerk
- ✅ Each user's email, name, and role
- ✅ Whether they'll be created or updated
- ✅ Any errors or skipped users

**Look good?** Proceed to Step 2.

**Something wrong?** See [Troubleshooting](#troubleshooting) below.

---

## ✅ Step 2: Actually Sync the Users

```bash
npm run clerk:sync-users
```

### Expected Output:

```
🔄 Clerk → Supabase User Sync
==============================

📥 Fetching users from Clerk...
Found 5 users in Clerk

Processing: john.doe@example.com
  Clerk ID: user_2abc123xyz
  Name: John Doe
  Role: sales_rep
  ➕ Creating in Supabase...
  ✅ Created

Processing: jane.smith@example.com
  Clerk ID: user_2def456uvw
  Name: Jane Smith
  Role: admin
  ➕ Creating in Supabase...
  ✅ Created

Processing: bob.wilson@example.com
  Clerk ID: user_2ghi789rst
  Name: Bob Wilson
  Role: sales_rep
  ➕ Creating in Supabase...
  ✅ Created

📊 Sync Summary
================
Total users:     5
Created:         5
Updated:         0
Skipped:         0
Errors:          0

✅ Sync completed successfully!

Verify in Supabase:
  SELECT * FROM iso_agents ORDER BY created_at DESC;
```

---

## 🔎 Step 3: Verify in Supabase

### Option A: Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Table Editor** in sidebar
4. Select `iso_agents` table
5. You should see all your Clerk users!

### Option B: SQL Query

In Supabase SQL Editor, run:

```sql
-- See all synced users
SELECT
  clerk_user_id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM iso_agents
ORDER BY created_at DESC;
```

### Option C: Count Check

```sql
-- Quick count
SELECT COUNT(*) as total_users FROM iso_agents;
```

This should match the number shown in the sync summary.

---

## 🎯 Understanding the Output

### Status Icons

- ➕ **Creating** - User doesn't exist in Supabase, creating new record
- ℹ️ **User exists** - User already in Supabase, will update
- ✅ **Created/Updated** - Operation succeeded
- ❌ **Error** - Operation failed (see error message)
- ⚠️ **Skipping** - User has no email or other required field missing

### Roles

Users are assigned roles based on their Clerk `publicMetadata.role`:

| Clerk Metadata | Supabase Role | Description |
|----------------|---------------|-------------|
| `{ role: "admin" }` | admin | Administrator |
| `{ role: "sales_rep" }` | sales_rep | Sales representative (default) |
| `{ role: "customer" }` | customer | End customer |
| `{ role: "operator" }` | operator | System operator |
| (no metadata) | sales_rep | Default for new users |

---

## 🔧 Troubleshooting

### Error: "Missing Supabase environment variables"

**Fix:** Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these from [Supabase Dashboard](https://supabase.com/dashboard) → Project → Settings → API

---

### Error: "Cannot find module '@clerk/nextjs/server'"

**Fix:** Install dependencies:

```bash
npm install
```

---

### Error: "relation 'iso_agents' does not exist"

**Fix:** Run Supabase migrations:

```bash
# If using Supabase CLI
supabase db push

# Or apply migrations manually in Supabase SQL Editor
# from supabase/migrations/ directory
```

---

### Error: "User already exists" or "duplicate key value"

This is normal if you're running the sync multiple times. The script will:
- **First run**: Create all users
- **Subsequent runs**: Update existing users

No action needed - users are being updated correctly.

---

### Some users showing as "Skipped"

**Reason:** User has no email address in Clerk (very rare)

**Fix:** Check those users in Clerk Dashboard and add email if needed.

---

### Users created with wrong role

**Fix:** Set role in Clerk user metadata:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Users
2. Click on the user
3. Click **Metadata** tab
4. Add to Public Metadata:
   ```json
   {
     "role": "admin"
   }
   ```
5. Click **Save**
6. Re-run sync: `npm run clerk:sync-users`

---

## 🔐 Getting Credentials

### Clerk Credentials

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Click **API Keys** in sidebar
4. Copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`

### Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Settings** (gear icon)
4. Click **API**
5. Copy:
   - **URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`
     - ⚠️ Use `service_role` (not `anon` key) for sync script

---

## 📊 After Sync

### Verify Count Matches

**Clerk:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click **Users**
3. Note the total user count

**Supabase:**
```sql
SELECT COUNT(*) FROM iso_agents;
```

These should match (unless some users were skipped).

---

### Set Up Automatic Sync

For new users, the webhook will automatically sync them. Make sure:

1. ✅ Webhook is configured in Clerk Dashboard
2. ✅ Webhook URL: `https://yourdomain.com/api/webhooks/clerk`
3. ✅ Events selected: `user.created`, `user.updated`, `user.deleted`
4. ✅ `CLERK_WEBHOOK_SECRET` is set in environment

See [CLERK_SUPABASE_SYNC.md](docs/CLERK_SUPABASE_SYNC.md) for details.

---

## 🎯 Quick Commands Reference

```bash
# Dry run (preview)
npm run clerk:sync-users:dry-run

# Actually sync
npm run clerk:sync-users

# Using shell script
./sync-clerk-users.sh --dry-run
./sync-clerk-users.sh

# Verify in Supabase
# SELECT * FROM iso_agents ORDER BY created_at DESC;
```

---

## 📚 Related Guides

- [CLERK_WEBHOOK_TEST_INSTRUCTIONS.md](CLERK_WEBHOOK_TEST_INSTRUCTIONS.md) - Test webhook
- [CLERK_TESTING_GUIDE.md](docs/CLERK_TESTING_GUIDE.md) - Comprehensive testing
- [CLERK_SUPABASE_SYNC.md](docs/CLERK_SUPABASE_SYNC.md) - Integration details

---

**Ready?** Run `npm run clerk:sync-users:dry-run` to get started! 🚀
