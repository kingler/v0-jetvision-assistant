# Clerk Webhook Testing & User Sync Guide

Quick guide for testing Clerk → Supabase integration and syncing existing users.

## Prerequisites

- ✅ Clerk is set up and configured
- ✅ Supabase project is created
- ✅ Environment variables are set in `.env.local`
- ✅ Dev server can run (`npm run dev:app`)

## 1. Test the Webhook Locally

### Step 1: Start your development server

```bash
npm run dev:app
```

### Step 2: Run the webhook test

In a new terminal:

```bash
npm run clerk:test-webhook
```

**What this does:**
- Creates a test user.created event
- Generates a valid Svix signature
- Sends the webhook to `http://localhost:3000/api/webhooks/clerk`
- Shows you the response

**Expected output:**
```
🧪 Testing Clerk Webhook
========================

📍 Webhook URL: http://localhost:3000/api/webhooks/clerk
👤 Test User: test-webhook@example.com
🎭 Role: sales_rep
🆔 Clerk User ID: user_test_1234567890

📝 Generated webhook signature
Headers: { ... }

📤 Sending webhook request...

📥 Response received
Status: 200 OK
Body: Webhook processed successfully

✅ Webhook test successful!

Next steps:
1. Check your Supabase iso_agents table for the new user:
   SELECT * FROM iso_agents WHERE email = 'test-webhook@example.com';

2. Check your server logs for:
   - "Received webhook event: user.created"
   - "Successfully created user in Supabase: ..."
```

### Step 3: Verify in Supabase

Go to your Supabase project → SQL Editor:

```sql
SELECT * FROM iso_agents WHERE email = 'test-webhook@example.com';
```

You should see the test user with:
- ✅ `clerk_user_id`: user_test_...
- ✅ `email`: test-webhook@example.com
- ✅ `full_name`: Test User
- ✅ `role`: sales_rep
- ✅ `is_active`: true

## 2. Sync Existing Clerk Users to Supabase

If you have users in Clerk that aren't in Supabase yet, sync them:

### Step 1: Dry run (recommended first)

```bash
npm run clerk:sync-users:dry-run
```

**What this does:**
- Shows what users would be synced
- Doesn't make any changes
- Gives you a preview

**Example output:**
```
🔄 Clerk → Supabase User Sync
==============================

🔍 DRY RUN MODE - No changes will be made

📥 Fetching users from Clerk...
Found 3 users in Clerk

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

📊 Sync Summary
================
Total users:     3
Created:         3
Updated:         0
Skipped:         0
Errors:          0

✅ Dry run completed successfully!
Run without --dry-run to actually sync the users.
```

### Step 2: Actually sync the users

If the dry run looks good:

```bash
npm run clerk:sync-users
```

**What this does:**
- Fetches all users from Clerk
- Creates users that don't exist in Supabase
- Updates users that already exist
- Shows a summary

**Example output:**
```
🔄 Clerk → Supabase User Sync
==============================

📥 Fetching users from Clerk...
Found 3 users in Clerk

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

📊 Sync Summary
================
Total users:     3
Created:         3
Updated:         0
Skipped:         0
Errors:          0

✅ Sync completed successfully!

Verify in Supabase:
  SELECT * FROM iso_agents ORDER BY created_at DESC;
```

### Step 3: Verify in Supabase

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

## 3. Production Webhook Setup

For production, you need to configure the webhook in Clerk Dashboard:

### Step 1: Deploy your application

Make sure your app is deployed (Vercel, etc.) and accessible via HTTPS.

### Step 2: Configure webhook in Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Webhooks**
4. Click **Add Endpoint**
5. Enter: `https://yourdomain.com/api/webhooks/clerk`
6. Select events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
7. Click **Create**
8. Copy the **Signing Secret**
9. Add to your production environment variables as `CLERK_WEBHOOK_SECRET`

### Step 3: Test in production

1. Create a new user in your production app
2. Check Clerk Dashboard → Webhooks → Recent Events
3. Verify the webhook was delivered (200 status)
4. Check Supabase to verify the user was created

## 4. Troubleshooting

### Webhook test fails with "Missing webhook secret"

**Fix:** Add `CLERK_WEBHOOK_SECRET` to `.env.local`

```env
CLERK_WEBHOOK_SECRET=whsec_your_secret_here
```

Get this from Clerk Dashboard → Webhooks → Your Endpoint → Signing Secret.

### Webhook test fails with 400 or 500 error

**Check:**
1. Is your dev server running? (`npm run dev:app`)
2. Are environment variables set correctly?
3. Check server logs for error details

### User sync fails with "Missing Supabase environment variables"

**Fix:** Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### User sync creates users but with wrong role

**Fix:** Set role in Clerk user's `publicMetadata`:

1. Go to Clerk Dashboard → Users
2. Select the user
3. Click **Metadata**
4. Add to Public Metadata:
   ```json
   {
     "role": "admin"
   }
   ```
5. Re-run sync: `npm run clerk:sync-users`

Valid roles: `sales_rep`, `admin`, `customer`, `operator`

### Users exist in Clerk but not syncing to Supabase

**Check:**
1. Is webhook configured in Clerk Dashboard?
2. Is webhook URL correct and accessible?
3. Check Clerk Dashboard → Webhooks → Recent Events for delivery failures
4. For existing users, run: `npm run clerk:sync-users`

## 5. Role Management

### Default Role

New users get `sales_rep` role by default.

### Setting Custom Roles

Set role via Clerk user public metadata:

```json
{
  "role": "admin"
}
```

**Valid roles:**
- `sales_rep` - Sales representative (default)
- `admin` - Administrator
- `customer` - End customer
- `operator` - System operator

### Updating Roles

1. Update in Clerk Dashboard → Users → [User] → Metadata
2. User updates will trigger `user.updated` webhook
3. Supabase will be updated automatically

Or manually sync:

```bash
npm run clerk:sync-users
```

## 6. Quick Reference

```bash
# Test webhook locally
npm run clerk:test-webhook

# Preview user sync
npm run clerk:sync-users:dry-run

# Actually sync users
npm run clerk:sync-users

# Start dev server
npm run dev:app

# Check Supabase users
# In Supabase SQL Editor:
SELECT * FROM iso_agents;
```

## Related Documentation

- [CLERK_SUPABASE_SYNC.md](./CLERK_SUPABASE_SYNC.md) - Detailed integration docs
- [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) - End-to-end testing
- [Clerk Webhooks Docs](https://clerk.com/docs/integrations/webhooks)

---

**Last Updated**: November 1, 2025
**Status**: ✅ Ready to use
