# Fix: 403/404 Authentication Errors in Trip/Flight Requests

**Date**: 2025-01-XX  
**Issue**: Users encountering 403 (Forbidden) and 404 (Not Found) errors when submitting trip/flight requests  
**Status**: ✅ Fixed

---

## Problem Summary

Users were experiencing 403 and 404 errors when submitting trip/flight requests through the application. The root causes were:

1. **Column Name Mismatch**: API route was using `user_id` but database schema uses `iso_agent_id`
2. **RLS Policy Blocking**: Row Level Security policies were blocking user lookups because Clerk JWT wasn't being passed to Supabase
3. **User Sync Missing**: Some users existed in Clerk but not in Supabase `iso_agents` table

---

## Root Causes Identified

### 1. Database Column Mismatch

**File**: `app/api/requests/route.ts`

**Problem**: The API route was inserting requests with `user_id` field, but the database schema uses `iso_agent_id`.

```typescript
// ❌ WRONG - Column doesn't exist
.insert({
  user_id: user.id,  // This column doesn't exist!
  ...
})

// ✅ CORRECT - Matches database schema
.insert({
  iso_agent_id: user.id,  // Correct column name
  ...
})
```

**Impact**: Database insertion failed with column not found error, causing 500 errors that appeared as 404 in some cases.

### 2. RLS Policy Blocking User Lookup

**Problem**: The server-side Supabase client wasn't receiving Clerk's JWT token, so RLS policies couldn't identify the authenticated user.

**RLS Policy** (from `002_rls_policies.sql`):
```sql
CREATE POLICY "Users can view own profile or admin can view all"
  ON iso_agents
  FOR SELECT
  USING (
    clerk_user_id = auth.jwt()->>'sub'  -- This returns NULL if no JWT
    OR is_admin()
  );
```

**Impact**: User lookup queries returned 404 because RLS blocked access when `auth.jwt()->>'sub'` was NULL.

**Solution**: Use `supabaseAdmin` client for user lookup since we already have Clerk authentication via `auth()`.

### 3. Missing User Sync

**Problem**: Users authenticated in Clerk but not synced to Supabase `iso_agents` table.

**Impact**: User lookup failed with 404 error: "User not found - Your account may not be synced to the database."

---

## Fixes Applied

### Fix 1: Corrected Column Names

**File**: `app/api/requests/route.ts`

**Changes**:
- Changed `user_id` to `iso_agent_id` in POST handler (line 230)
- Changed `user_id` to `iso_agent_id` in GET handler (line 68)

```typescript
// GET handler - Query user's requests
.eq('iso_agent_id', user.id)  // ✅ Fixed

// POST handler - Insert new request
.insert({
  iso_agent_id: user.id,  // ✅ Fixed
  ...
})
```

### Fix 2: Use Admin Client for User Lookup

**Files**: Multiple API routes + RBAC middleware

**Changes**:
- Import `supabaseAdmin` from `@/lib/supabase/admin`
- Use `supabaseAdmin` for user lookup queries (bypasses RLS)
- Continue using regular `supabase` client for user's own data (respects RLS)

**Affected Files**:
- `app/api/requests/route.ts` - GET and POST handlers
- `app/api/clients/route.ts` - GET, POST, and PATCH handlers
- `app/api/workflows/route.ts` - GET handler
- `app/api/agents/route.ts` - GET handler
- `lib/middleware/rbac.ts` - `getUserRole()` function (used by all RBAC-protected routes)

```typescript
// ✅ Use admin client for user lookup (we already have Clerk auth)
const { data: user, error: userError } = await supabaseAdmin
  .from('iso_agents')
  .select('id, role')
  .eq('clerk_user_id', userId)
  .single();

// ✅ Use regular client for user's requests (RLS will allow)
const { data: requests } = await supabase
  .from('requests')
  .select('*')
  .eq('iso_agent_id', user.id);
```

**Why This Works**:
- We already have Clerk authentication via `auth()` which gives us `userId`
- Admin client bypasses RLS for the user lookup
- Regular client still respects RLS for subsequent queries (users can only see their own data)

### Fix 3: Created Diagnostic Script

**File**: `scripts/diagnostics/check-auth-errors.ts`

**Purpose**: Helps identify authentication and sync issues before they cause errors.

**Usage**:
```bash
npm run diagnostics:auth
```

**Checks**:
1. ✅ Environment variables (Clerk keys, Supabase keys)
2. ✅ Clerk connection and user count
3. ✅ Supabase connection
4. ✅ User sync status (Clerk ↔ Supabase)
5. ✅ RLS policy configuration

---

## Verification Steps

### Step 1: Run Diagnostic Script

```bash
npm run diagnostics:auth
```

**Expected Output**:
```
✅ Environment variables: OK
✅ Clerk connection: OK
✅ Supabase connection: OK
✅ All users are synced
```

**If users are missing**:
```bash
npm run clerk:sync-users
```

### Step 2: Verify User Exists in Supabase

**Option A: Supabase Dashboard**
1. Go to Supabase Dashboard → Table Editor
2. Select `iso_agents` table
3. Verify your user exists with correct `clerk_user_id`

**Option B: SQL Query**
```sql
SELECT clerk_user_id, email, full_name, role, is_active
FROM iso_agents
WHERE clerk_user_id = 'your-clerk-user-id';
```

### Step 3: Test API Endpoint

**Using curl**:
```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=your-clerk-session" \
  -d '{
    "departure_airport": "KTEB",
    "arrival_airport": "KLAX",
    "departure_date": "2025-12-25T10:00:00Z",
    "passengers": 4
  }'
```

**Expected Response**: `201 Created` with request data

**If you get 404**: User not synced - run `npm run clerk:sync-users`  
**If you get 403**: RLS policy issue - check user exists and is active  
**If you get 500**: Check server logs for specific error

### Step 4: Test Complete Flow

1. **Login** via Clerk (sign-in page)
2. **Submit** a trip/flight request through the UI
3. **Check** browser console for errors
4. **Verify** request appears in database

---

## User Sync Instructions

If users are missing from Supabase:

### Option 1: Automatic Sync (Webhook)

**Setup** (one-time):
1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`, `user.deleted`
4. Copy webhook secret to `.env.local`: `CLERK_WEBHOOK_SECRET=whsec_...`

**Result**: New users automatically sync when they sign up.

### Option 2: Manual Sync (Script)

**For existing users**:
```bash
# Dry run (preview what will be synced)
npm run clerk:sync-users:dry-run

# Actually sync users
npm run clerk:sync-users
```

**What it does**:
- Fetches all users from Clerk
- Creates missing users in Supabase `iso_agents` table
- Updates existing users if data changed
- Shows summary of created/updated/skipped users

---

## Related Files

### Modified Files
- `app/api/requests/route.ts` - Fixed column names and user lookup
- `app/api/clients/route.ts` - Fixed column names and user lookup
- `app/api/workflows/route.ts` - Fixed column names and user lookup
- `app/api/agents/route.ts` - Fixed column names and user lookup
- `lib/middleware/rbac.ts` - Fixed user role lookup to use admin client
- `package.json` - Added diagnostic script command

### New Files
- `scripts/diagnostics/check-auth-errors.ts` - Diagnostic tool
- `docs/fixes/403_404_AUTH_ERRORS_FIX.md` - This document

### Existing Files (No Changes)
- `scripts/clerk/sync-users.ts` - User sync script (already existed)
- `app/api/webhooks/clerk/route.ts` - Webhook handler (already existed)
- `supabase/migrations/002_rls_policies.sql` - RLS policies (already correct)

---

## Prevention

To prevent similar issues in the future:

1. **Always use TypeScript types** from `@/lib/types/database` to ensure column names match
2. **Run diagnostic script** before deploying: `npm run diagnostics:auth`
3. **Test user sync** after Clerk configuration changes
4. **Use admin client** for user lookups when you already have Clerk authentication
5. **Verify RLS policies** allow the operations you need

---

## Troubleshooting

### Error: "User not found" or 403 on `/api/users/me`

**Cause**: User exists in Clerk but not in Supabase, or RLS blocking user lookup

**Fix**:
```bash
# Sync users from Clerk to Supabase
npm run clerk:sync-users

# Verify user exists
npm run diagnostics:auth
```

**Note**: The RBAC middleware (`/api/users/me` endpoint) now uses admin client for user lookup, but if the user doesn't exist in Supabase at all, you'll still get a 403. Sync the user first.

### Error: "Column 'user_id' does not exist"

**Cause**: Using wrong column name (should be `iso_agent_id`)

**Fix**: Update code to use `iso_agent_id` instead of `user_id`

### Error: "Row Level Security policy violation"

**Cause**: RLS blocking access because Clerk JWT not in Supabase session

**Fix**: Use `supabaseAdmin` for user lookups when you already have Clerk auth

### Error: "Missing environment variables"

**Cause**: Required env vars not set in `.env.local`

**Fix**: Add missing variables:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Summary

✅ **Fixed**: Column name mismatch (`user_id` → `iso_agent_id`)  
✅ **Fixed**: RLS blocking user lookup (use admin client)  
✅ **Added**: Diagnostic script for troubleshooting  
✅ **Documented**: User sync instructions and verification steps

**Next Steps**:
1. Run `npm run diagnostics:auth` to verify setup
2. Run `npm run clerk:sync-users` if users are missing
3. Test trip/flight request submission
4. Monitor for any remaining 403/404 errors

---

**Questions?** Check:
- `docs/authentication/CLERK_SUPABASE_SYNC.md` - User sync guide
- `docs/guides/migrations/SYNC_USERS_NOW.md` - Quick sync guide
- `scripts/clerk/sync-users.ts` - Sync script source
