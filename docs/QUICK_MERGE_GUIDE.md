# 🚀 Quick Merge Guide (5 Minutes)

## TL;DR - Fastest Way to Merge

### 1️⃣ Merge via GitHub Web (2 clicks per PR)

**PR #1 - Authentication**
1. Go to: https://github.com/abcucinalabs/v0-jetvision-assistant/pull/1
2. Click green **"Merge pull request"** button
3. Click **"Confirm merge"**

**PR #2 - Database**
1. Go to: https://github.com/abcucinalabs/v0-jetvision-assistant/pull/2
2. Click green **"Merge pull request"** button
3. Click **"Confirm merge"**

✅ **Done!** Changes are now in your main branch.

---

### 2️⃣ Set Up Environment (5 minutes)

Create `.env.local` file:

```bash
# Clerk (get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (get from https://app.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

### 3️⃣ Install & Deploy Database

```bash
# Install dependencies
npm install

# Deploy database schema (copy & paste in Supabase SQL Editor)
# File: supabase/migrations/DEPLOY_ALL.sql
```

---

### 4️⃣ Test

```bash
npm run dev
# Visit http://localhost:3000
# Test sign in/sign up
```

---

## 📝 What These PRs Add

### PR #1: Authentication
- ✅ Clerk authentication
- ✅ User sign in/sign up
- ✅ Protected routes
- ✅ Session management

### PR #2: Database
- ✅ 8 database tables
- ✅ Row Level Security
- ✅ Type-safe queries
- ✅ Multi-agent support

---

## 🆘 Need Help?

See full instructions: `.github/MERGE_INSTRUCTIONS_FOR_OWNER.md`
