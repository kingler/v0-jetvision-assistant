# Fix: 403/404 Errors on Trip/Flight Request Submission

## Problem Summary

Users were encountering 403 (Forbidden) and 404 (Not Found) errors when submitting trip/flight requests through the application. Investigation revealed two root causes:

1. **Clerk webhook handler was using wrong Supabase client** - The webhook handler was using the client-side Supabase client instead of the admin client, preventing user sync via webhooks
2. **Users not synced to Supabase** - Existing Clerk users were not present in the `iso_agents` table, causing the `/api/requests` endpoint to return 404 errors

## Root Causes

### 1. Webhook Handler Using Wrong Client (Fixed ✅)

**File**: `app/api/webhooks/clerk/route.ts`

**Issue**: The webhook handler was importing and using `supabase` from `@/lib/supabase/client` instead of `supabaseAdmin` from `@/lib/supabase/admin`.

**Why this matters**: 
- The RLS policy for `iso_agents` INSERT operations is set to `WITH CHECK (false)` (see `supabase/migrations/002_rls_policies.sql` line 73)
- This means only the service role (admin client) can insert users
- Using the client-side client caused all webhook insertions to fail silently

**Fix Applied**: Changed all three webhook event handlers (`user.created`, `user.updated`, `user.deleted`) to use `supabaseAdmin` instead of `supabase`.

### 2. Users Not Synced to Database

**Issue**: The `/api/requests` POST endpoint (line 207-211) queries the `iso_agents` table using the Clerk user ID. If the user doesn't exist in the table, it returns a 404 error (line 220-223).

**Why this happens**:
- New users created after the webhook fix will be synced automatically
- Existing users created before the fix need to be manually synced using the sync script

## Fixes Applied

### 1. Fixed Webhook Handler

**File**: `app/api/webhooks/clerk/route.ts`

**Changes**:
- Changed import from `{ supabase }` to `{ supabaseAdmin }`
- Updated `user.created` handler to use `supabaseAdmin`
- Updated `user.updated` handler to use `supabaseAdmin`
- Updated `user.deleted` handler to use `supabaseAdmin`

**Impact**: 
- Future user signups/updates will be properly synced to Supabase
- Webhook events will successfully create/update users in the `iso_agents` table

### 2. User Sync Script (Needs to be Run)

**Script**: `scripts/clerk/sync-users.ts`

**Command**: 
```bash
npm run clerk:sync-users
```

**What it does**:
- Fetches all users from Clerk
- Creates users in Supabase `iso_agents` table that don't exist
- Updates existing users in Supabase if their data changed in Clerk
- Uses the admin client to bypass RLS policies

## Verification Steps

### 1. Verify Webhook Handler Fix

Check that the webhook handler now uses the admin client:

```bash
grep -A 5 "import.*supabase" app/api/webhooks/clerk/route.ts
```

Should show:
```typescript
import { supabaseAdmin } from '@/lib/supabase/admin';
```

### 2. Run User Sync Script (Dry Run First)

**Preview what will be synced**:
```bash
npm run clerk:sync-users:dry-run
```

**Expected output**: List of users that will be synced without making changes

**Actually sync users**:
```bash
npm run clerk:sync-users
```

**Expected output**: 
- List of users being processed
- Created/Updated status for each user
- Summary showing total users, created, updated, errors

### 3. Verify User Exists in Supabase

**Option A: Supabase Dashboard**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Table Editor** → `iso_agents`
4. Verify your logged-in user exists

**Option B: SQL Query**
```sql
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

### 4. Test the Complete Flow

1. **Log in** to the application via Clerk
2. **Submit a trip/flight request** through the UI
3. **Check browser console** - should see no 403/404 errors
4. **Verify request saved** - check `/api/requests` GET endpoint or database

### 5. Verify No More Errors

**Expected behavior**:
- ✅ User authentication works (Clerk)
- ✅ User exists in `iso_agents` table
- ✅ POST `/api/requests` succeeds (201 Created)
- ✅ GET `/api/requests` returns user's requests
- ✅ No 403/404 errors in browser console

## API Endpoints Involved

### `/api/requests` (POST)

**Endpoint**: `POST /api/requests`

**Authentication**: Clerk (via `auth()` from `@clerk/nextjs/server`)

**Flow**:
1. Authenticates user via Clerk (line 176)
2. Creates Supabase client (line 182)
3. Looks up user in `iso_agents` table using Clerk user ID (line 207-211)
4. Returns 404 if user not found (line 220-223)
5. Creates request in `requests` table (line 227-244)

**Error Scenarios**:
- **401 Unauthorized**: User not authenticated via Clerk
- **404 Not Found**: User not found in `iso_agents` table (fixed by sync script)
- **500 Internal Server Error**: Database insertion failed

### `/api/webhooks/clerk` (POST)

**Endpoint**: `POST /api/webhooks/clerk`

**Authentication**: Webhook signature verification (Svix)

**Flow**:
1. Verifies webhook signature (line 64-74)
2. Processes event (`user.created`, `user.updated`, `user.deleted`)
3. Creates/updates/deletes user in `iso_agents` table (now uses admin client ✅)

**Events Handled**:
- `user.created`: Creates new user in `iso_agents`
- `user.updated`: Updates existing user in `iso_agents`
- `user.deleted`: Soft deletes user (sets `is_active = false`)

## Related Documentation

- [Clerk-Supabase Sync Guide](../../guides/migrations/SYNC_USERS_NOW.md)
- [Clerk Webhook Setup](../../authentication/CLERK_WEBHOOK_SETUP_GUIDE.md)
- [Authentication Implementation](../../authentication/AUTHENTICATION_IMPLEMENTATION.md)

## Environment Variables Required

Make sure these are set in `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Summary

✅ **Fixed**: Webhook handler now uses admin client  
⏳ **Action Required**: Run user sync script to sync existing users  
✅ **Verified**: Code changes are correct and lint-free  

After running the sync script, all users should be able to submit trip/flight requests without encountering 403/404 errors.
