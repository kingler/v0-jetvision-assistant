# Clerk Webhook Local Testing Instructions

## 🧪 Test the Webhook Locally

Follow these steps to test that Clerk webhooks are correctly syncing to Supabase.

---

## Step 1: Verify Environment Variables

Make sure these are set in your `.env.local`:

```env
# Required for webhook test
CLERK_WEBHOOK_SECRET=whsec_your_secret_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### How to Get CLERK_WEBHOOK_SECRET:

If you don't have it yet:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Webhooks** in sidebar
4. If you have an endpoint already:
   - Click on it
   - Copy the **Signing Secret**
5. If you don't have an endpoint yet:
   - Click **Add Endpoint**
   - Enter: `http://localhost:3000/api/webhooks/clerk` (temporary for testing)
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Click **Create**
   - Copy the **Signing Secret**
6. Add to `.env.local`:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

---

## Step 2: Start Development Server

Open a terminal and run:

```bash
npm run dev:app
```

Wait until you see:

```
✓ Ready in X ms
○ Local:        http://localhost:3000
```

**Keep this terminal open.**

---

## Step 3: Run Webhook Test

Open a **second terminal** and run:

```bash
npm run clerk:test-webhook
```

---

## Expected Output

### ✅ Successful Test

```
🧪 Testing Clerk Webhook
========================

📍 Webhook URL: http://localhost:3000/api/webhooks/clerk
👤 Test User: test-webhook@example.com
🎭 Role: sales_rep
🆔 Clerk User ID: user_test_1730472000000

📝 Generated webhook signature
Headers: {
  'svix-id': 'webhook_test_1730472000000',
  'svix-timestamp': '1730472000',
  'svix-signature': 'v1,abc123def456...'
}

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

### ❌ Failed Test Examples

#### Missing Webhook Secret

```
❌ CLERK_WEBHOOK_SECRET environment variable is not set
Please set CLERK_WEBHOOK_SECRET in your .env.local file
```

**Fix:** Add `CLERK_WEBHOOK_SECRET` to `.env.local` (see Step 1)

#### Server Not Running

```
❌ Error testing webhook: FetchError: request to http://localhost:3000/api/webhooks/clerk failed, reason: connect ECONNREFUSED 127.0.0.1:3000
```

**Fix:** Start the dev server: `npm run dev:app`

#### Database Error

```
📥 Response received
Status: 500 Internal Server Error
Body: Error: Database sync failed
```

**Fix:** Check Supabase credentials in `.env.local`

---

## Step 4: Verify in Supabase

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Run this query:

```sql
SELECT
  clerk_user_id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM iso_agents
WHERE email = 'test-webhook@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

### Expected Result:

| clerk_user_id | email | full_name | role | is_active | created_at |
|---------------|-------|-----------|------|-----------|------------|
| user_test_... | test-webhook@example.com | Test User | sales_rep | true | 2025-11-01 ... |

---

## Step 5: Check Server Logs

In the terminal where you ran `npm run dev:app`, you should see:

```
Received webhook event: user.created
Successfully created user in Supabase: {
  id: '550e8400-e29b-41d4-a716-446655440000',
  clerk_user_id: 'user_test_1730472000000',
  email: 'test-webhook@example.com',
  full_name: 'Test User',
  role: 'sales_rep',
  is_active: true,
  created_at: '2025-11-01T15:00:00.000Z',
  updated_at: '2025-11-01T15:00:00.000Z'
}
```

---

## Troubleshooting

### Issue: "Missing svix headers"

This means the signature generation failed. This shouldn't happen with the test script, but if it does:

1. Update the `svix` package: `npm install svix@latest`
2. Restart the dev server
3. Try again

### Issue: "Verification failed"

The webhook secret doesn't match.

**Fix:**
1. Get the correct secret from Clerk Dashboard
2. Update `.env.local`
3. Restart dev server (`npm run dev:app`)
4. Run test again

### Issue: Test user appears multiple times in database

This is normal if you run the test multiple times. Each test creates a new user with a unique Clerk ID.

To clean up:

```sql
DELETE FROM iso_agents WHERE email = 'test-webhook@example.com';
```

---

## Next Steps After Successful Test

### 1. Test with a Real User

Sign up at your app with a real email:

1. Go to `http://localhost:3000/sign-up`
2. Create a test account
3. Check Supabase for the new user:
   ```sql
   SELECT * FROM iso_agents ORDER BY created_at DESC LIMIT 5;
   ```

### 2. Sync Existing Clerk Users

If you have users in Clerk that aren't in Supabase yet:

```bash
# Preview first
npm run clerk:sync-users:dry-run

# Actually sync
npm run clerk:sync-users
```

### 3. Set Up Production Webhook

1. Deploy your app to production (Vercel, etc.)
2. Go to Clerk Dashboard → Webhooks
3. Add endpoint: `https://yourdomain.com/api/webhooks/clerk`
4. Select events: `user.created`, `user.updated`, `user.deleted`
5. Copy signing secret
6. Add to production environment variables

---

## Quick Reference

```bash
# Start dev server (Terminal 1)
npm run dev:app

# Test webhook (Terminal 2)
npm run clerk:test-webhook

# Sync existing users
npm run clerk:sync-users:dry-run  # Preview
npm run clerk:sync-users          # Actually sync

# Check Supabase
# In SQL Editor:
SELECT * FROM iso_agents ORDER BY created_at DESC;
```

---

## Related Guides

- [CLERK_TESTING_GUIDE.md](docs/CLERK_TESTING_GUIDE.md) - Comprehensive testing guide
- [CLERK_SUPABASE_SYNC.md](docs/CLERK_SUPABASE_SYNC.md) - Integration details
- [E2E_TESTING_GUIDE.md](docs/E2E_TESTING_GUIDE.md) - End-to-end tests

---

**Ready to test?** Start with Step 1 above!
