# User Sync Required - 403/404 Errors

## Problem

You're seeing these errors in the browser console:
- `GET /api/users/me 403 (Forbidden)`
- `GET /api/requests?limit=50 404 (Not Found) - User not found`

## Root Cause

These errors occur when your Clerk user account hasn't been synced to the Supabase `iso_agents` table. This is expected for:
- New users who just signed up
- Users who were created before the sync system was set up
- Development environments where webhooks aren't configured

## Solution

### Option 1: Sync Your User Account (Recommended)

Run the user sync script to sync your Clerk account to Supabase:

```bash
npm run clerk:sync-users
```

This will:
- Fetch your user from Clerk
- Create or update your record in the `iso_agents` table
- Set your role (defaults to `sales_rep` if not specified)

### Option 2: Dry Run First

To see what would be synced without making changes:

```bash
npm run clerk:sync-users:dry-run
```

### Option 3: Automatic Sync via Webhook (Production)

In production, users are automatically synced via Clerk webhooks when they sign up. Make sure:
1. The webhook is configured in Clerk Dashboard
2. The webhook URL points to `/api/webhooks/clerk`
3. The `CLERK_WEBHOOK_SECRET` environment variable is set

## Verification

After syncing, verify your user exists:

```sql
SELECT 
  clerk_user_id,
  email,
  full_name,
  role,
  is_active
FROM iso_agents
WHERE clerk_user_id = 'your-clerk-user-id';
```

## Error Handling

The application now handles these errors gracefully:
- ✅ 403/404 errors for unsynced users are no longer logged as errors
- ✅ The app continues to function (you just won't see your flight requests until synced)
- ✅ Only unexpected errors are logged to the console

## Related Documentation

- [Clerk-Supabase Sync Guide](../authentication/CLERK_SUPABASE_SYNC.md)
- [Clerk Testing Guide](../authentication/CLERK_TESTING_GUIDE.md)
- [User Sync Script](../../scripts/clerk/sync-users.ts)
