# 📋 Instructions for abcucinalabs Repository Owner

## Overview
You have **2 Pull Requests** waiting for review and merge from contributor **kingler**. This guide provides step-by-step instructions to review, test, and merge these changes into your repository.

---

## 🔗 Pull Requests to Review

### PR #1: Clerk Authentication Integration
- **URL**: https://github.com/abcucinalabs/v0-jetvision-assistant/pull/1
- **Branch**: `kingler:feat/TASK-001-clerk-authentication` → `main`
- **Purpose**: Implements Clerk authentication with Next.js 14 and Supabase
- **Status**: ⏳ Awaiting your review

### PR #2: Supabase Database Schema & RLS Policies
- **URL**: https://github.com/abcucinalabs/v0-jetvision-assistant/pull/2
- **Branch**: `kingler:feat/TASK-002-database-schema` → `main`
- **Purpose**: Complete database schema with Row Level Security
- **Status**: ⏳ Awaiting your review

---

## 📝 Step-by-Step Merge Instructions

### Option A: Merge via GitHub Web Interface (Easiest)

#### Step 1: Review PR #1 (Authentication)

1. **Open the Pull Request**
   - Go to: https://github.com/abcucinalabs/v0-jetvision-assistant/pull/1

2. **Review the Changes**
   - Click the **"Files changed"** tab
   - Review modified files (should see changes to `app/layout.tsx`, `lib/supabase/client.ts`, etc.)
   - Look for the **green/red diff** showing additions and deletions

3. **Check CI/CD Status**
   - Look at the bottom of the PR for status checks
   - Wait for all checks to pass (green checkmarks ✅)
   - If checks fail, ask kingler to fix issues

4. **Add Comments (Optional)**
   - If you have questions, click on a line number in the diff
   - Add inline comments
   - Click **"Start a review"**

5. **Approve the PR**
   - Click **"Review changes"** (top right)
   - Select **"Approve"**
   - Add a comment like: "LGTM! (Looks Good To Me)"
   - Click **"Submit review"**

6. **Merge the PR**
   - Scroll to the bottom of the PR
   - Click the green **"Merge pull request"** button
   - Choose merge method:
     - **"Create a merge commit"** ← Recommended (keeps full history)
     - "Squash and merge" (combines all commits into one)
     - "Rebase and merge" (linear history)
   - Click **"Confirm merge"**
   - Optionally: Click **"Delete branch"** (this deletes the branch in kingler's fork - usually NOT needed)

#### Step 2: Review PR #2 (Database Schema)

Repeat the exact same process for PR #2:
1. Open: https://github.com/abcucinalabs/v0-jetvision-assistant/pull/2
2. Review files changed
3. Check CI/CD status
4. Approve
5. Merge

**IMPORTANT**: Merge PR #1 (Authentication) BEFORE PR #2 (Database) because the database depends on authentication.

---

### Option B: Merge via Command Line (Advanced)

If you prefer using Git commands:

#### Step 1: Clone Your Repository (if not already done)

```bash
# Clone your repository
git clone https://github.com/abcucinalabs/v0-jetvision-assistant.git
cd v0-jetvision-assistant

# Ensure you're on main branch
git checkout main
git pull origin main
```

#### Step 2: Fetch and Review PR #1

```bash
# Add kingler's fork as a remote (one time only)
git remote add kingler https://github.com/kingler/v0-jetvision-assistant.git

# Fetch kingler's branches
git fetch kingler

# Create a local branch to review PR #1
git checkout -b review-pr1 kingler/feat/TASK-001-clerk-authentication

# Review the changes
git log main..review-pr1 --oneline
git diff main...review-pr1

# Test the code (optional)
npm install
npm run build
npm run test

# If satisfied, switch back to main
git checkout main
```

#### Step 3: Merge PR #1

```bash
# Merge the authentication branch
git merge --no-ff review-pr1 -m "Merge PR #1: Clerk Authentication Integration (TASK-001)"

# Push to your repository
git push origin main

# Clean up local branch
git branch -d review-pr1
```

#### Step 4: Merge PR #2

```bash
# Checkout PR #2 branch
git checkout -b review-pr2 kingler/feat/TASK-002-database-schema

# Review and test
git diff main...review-pr2
npm run test

# Switch back and merge
git checkout main
git merge --no-ff review-pr2 -m "Merge PR #2: Supabase Database Schema & RLS (TASK-002)"

# Push to repository
git push origin main

# Clean up
git branch -d review-pr2
```

#### Step 5: Close the PRs on GitHub

After merging via command line, GitHub should automatically detect the merge and close the PRs. If not:

1. Go to the PR page
2. Click **"Close pull request"**
3. Add a comment: "Merged via command line"

---

### Option C: Merge via GitHub CLI (gh)

If you have GitHub CLI installed:

```bash
# Review PR #1
gh pr view 1 --repo abcucinalabs/v0-jetvision-assistant

# Check PR status
gh pr checks 1 --repo abcucinalabs/v0-jetvision-assistant

# Merge PR #1
gh pr merge 1 --repo abcucinalabs/v0-jetvision-assistant --merge --delete-branch=false

# Merge PR #2
gh pr merge 2 --repo abcucinalabs/v0-jetvision-assistant --merge --delete-branch=false
```

---

## 🔧 Post-Merge Setup Instructions

After merging both PRs, you need to configure your environment and deploy the changes.

### Step 1: Set Up Environment Variables

Create a `.env.local` file in your project root:

```bash
# Clerk Authentication (Get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Supabase (Get from https://app.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URL (for migrations)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres

# OpenAI (if using agents)
OPENAI_API_KEY=sk-your-openai-key-here

# Redis (for task queue)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 2: Install Dependencies

```bash
# Install new dependencies added by the PRs
npm install

# Or if using pnpm
pnpm install

# Or if using yarn
yarn install
```

### Step 3: Set Up Clerk Authentication

1. **Create a Clerk Account**
   - Go to: https://dashboard.clerk.com
   - Sign up or log in
   - Click **"Create Application"**
   - Name it: "JetVision AI Assistant"
   - Choose authentication methods: Email, Google (recommended)

2. **Get API Keys**
   - Copy **Publishable Key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Copy **Secret Key** → `CLERK_SECRET_KEY`
   - Add them to `.env.local`

3. **Configure Clerk Settings**
   - In Clerk Dashboard, go to **"Paths"**
   - Set **Sign-in URL**: `/sign-in`
   - Set **Sign-up URL**: `/sign-up`
   - Set **After sign-in**: `/`
   - Set **After sign-up**: `/`

### Step 4: Set Up Supabase Database

1. **Create Supabase Project** (if not already done)
   - Go to: https://app.supabase.com
   - Click **"New Project"**
   - Name: "jetvision-ai-assistant"
   - Set database password (save it securely!)
   - Choose region closest to your users

2. **Get API Keys**
   - Go to **Settings** → **API**
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep secret!)

3. **Deploy Database Schema**

   **Option A: Using Supabase Dashboard (Easiest)**
   ```bash
   # Copy the contents of the deployment file
   cat supabase/migrations/DEPLOY_ALL.sql
   ```
   - Go to Supabase Dashboard → **SQL Editor**
   - Create a **New Query**
   - Paste the entire contents of `DEPLOY_ALL.sql`
   - Click **"Run"** (bottom right)
   - Wait for success message

   **Option B: Using Supabase CLI**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Login to Supabase
   supabase login

   # Link to your project
   supabase link --project-ref your-project-ref

   # Push migrations
   supabase db push
   ```

4. **Verify Database Tables**
   - Go to Supabase Dashboard → **Table Editor**
   - You should see 8 tables:
     - users
     - clients
     - rfp_requests
     - flight_quotes
     - proposals
     - agent_sessions
     - agent_tasks
     - workflow_states

5. **Generate TypeScript Types**
   ```bash
   # Using Supabase CLI
   supabase gen types typescript --project-ref your-project-ref > lib/types/database.ts

   # Or use the web-based type generator
   # Go to: https://supabase.com/dashboard/project/YOUR-PROJECT/api?page=tables
   ```

### Step 5: Test the Application

```bash
# Run development server
npm run dev

# Open browser
open http://localhost:3000

# Test authentication
# - Click "Sign In" (should redirect to Clerk)
# - Create test account
# - Verify redirect back to app

# Run tests
npm run test

# Check for TypeScript errors
npm run type-check

# Build for production (to verify no build errors)
npm run build
```

### Step 6: Configure Production Environment

1. **Set Up Vercel (Recommended Hosting)**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Deploy
   vercel

   # Add environment variables in Vercel dashboard
   # Go to: https://vercel.com/your-project/settings/environment-variables
   ```

2. **Add Environment Variables in Vercel**
   - Go to your project → **Settings** → **Environment Variables**
   - Add all variables from `.env.local`:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Click **"Save"**

3. **Redeploy**
   ```bash
   vercel --prod
   ```

---

## ✅ Verification Checklist

After merging and setting up, verify everything works:

### Authentication (PR #1)
- [ ] PRs successfully merged into main branch
- [ ] `.env.local` file created with Clerk keys
- [ ] Clerk dashboard configured
- [ ] `npm install` completed without errors
- [ ] Application runs with `npm run dev`
- [ ] Sign-in page loads at `/sign-in`
- [ ] User can create account
- [ ] User can sign in
- [ ] User can sign out
- [ ] Protected routes redirect to sign-in when not authenticated

### Database (PR #2)
- [ ] Supabase project created
- [ ] Database migrations deployed successfully
- [ ] All 8 tables exist in Supabase
- [ ] RLS policies enabled (check in Table Editor)
- [ ] TypeScript types generated in `lib/types/database.ts`
- [ ] Database connection test passes: `npm run db:test-connection`
- [ ] Can query database from application

### Overall
- [ ] No TypeScript errors: `npm run type-check`
- [ ] All tests pass: `npm run test`
- [ ] Application builds successfully: `npm run build`
- [ ] Production deployment successful (if deployed)

---

## 🆘 Troubleshooting

### Problem: Merge Conflicts

If you see merge conflicts when merging:

1. **Via GitHub Web Interface**:
   - GitHub will show a **"Resolve conflicts"** button
   - Click it to use the web editor
   - Remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Keep the correct code
   - Click **"Mark as resolved"**
   - Click **"Commit merge"**

2. **Via Command Line**:
   ```bash
   git checkout main
   git merge kingler/feat/TASK-001-clerk-authentication
   # If conflicts occur:
   git status  # See conflicted files
   # Edit files to resolve conflicts
   git add .
   git commit -m "Resolve merge conflicts"
   git push origin main
   ```

### Problem: Tests Failing After Merge

```bash
# Pull latest changes
git pull origin main

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run tests
npm run test

# Check specific failing tests
npm run test -- --reporter=verbose
```

### Problem: Environment Variables Not Working

1. Ensure `.env.local` is in the project root (not in subdirectories)
2. Restart the development server after adding variables
3. Check variable names match exactly (case-sensitive)
4. Verify no extra spaces or quotes around values

### Problem: Database Connection Fails

1. **Check Supabase URL and Keys**
   ```bash
   # Test connection
   npm run db:test-connection
   ```

2. **Verify RLS Policies**
   - Go to Supabase Dashboard → **Authentication** → **Policies**
   - Ensure RLS is enabled on all tables
   - Check policies are correct

3. **Check Database Password**
   - Ensure `DATABASE_URL` has correct password
   - Reset password in Supabase if needed

---

## 📞 Getting Help

If you encounter issues:

1. **Check PR Comments**
   - kingler may have left setup notes in the PR description

2. **Review Documentation**
   - Authentication: See `docs/AUTHENTICATION.md` (if exists)
   - Database: See `supabase/README.md`
   - Quick Reference: See `supabase/QUICK_REFERENCE.md`

3. **Contact kingler**
   - Comment on the PR with specific questions
   - Tag: @kingler in GitHub issues

4. **Check Logs**
   ```bash
   # Development logs
   npm run dev

   # Test logs
   npm run test -- --reporter=verbose

   # Build logs
   npm run build
   ```

---

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ Both PRs merged successfully (no conflicts)
2. ✅ GitHub shows 2 closed PRs with "Merged" badge
3. ✅ Main branch has the new commits
4. ✅ Application runs without errors
5. ✅ Users can sign in/sign up
6. ✅ Database queries work
7. ✅ All tests pass
8. ✅ Production deployment successful

---

## 📚 Additional Resources

### Clerk Documentation
- Quick Start: https://clerk.com/docs/quickstarts/nextjs
- Authentication: https://clerk.com/docs/authentication/overview
- User Management: https://clerk.com/docs/users/overview

### Supabase Documentation
- Getting Started: https://supabase.com/docs/guides/getting-started
- Database: https://supabase.com/docs/guides/database/overview
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security

### Next.js Documentation
- App Router: https://nextjs.org/docs/app
- Environment Variables: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables

---

## 🔐 Security Reminders

⚠️ **IMPORTANT**: Never commit these files:
- `.env.local` - Contains secrets
- `.env` - May contain secrets
- `service-account-key.json` - Service credentials

✅ **DO commit**:
- `.env.example` - Template without real values
- All source code files
- Documentation

---

**End of Instructions**

If you have any questions, please ask kingler or create an issue in the repository.

Good luck! 🚀
