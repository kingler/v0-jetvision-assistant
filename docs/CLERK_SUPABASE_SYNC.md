# Clerk to Supabase User Synchronization

## Overview

This document explains how user authentication data is synchronized from Clerk to Supabase in the Jetvision AI Assistant application.

## Architecture

```
┌──────────────┐
│  Clerk Auth  │  User signs up/updates/deletes account
└──────┬───────┘
       │
       │ Webhook Event (HTTPS POST)
       ▼
┌──────────────────────────┐
│ /api/webhooks/clerk      │  Verifies signature & processes event
│ (Next.js API Route)      │
└──────┬───────────────────┘
       │
       │ Insert/Update/Soft Delete
       ▼
┌──────────────────────────┐
│ Supabase                 │  iso_agents table
│ (PostgreSQL)             │
└──────────────────────────┘
```

## Features

### Supported Events

1. **user.created** - When a new user signs up
   - Creates a new record in `iso_agents` table
   - Sets default role to `iso_agent`
   - Marks user as active

2. **user.updated** - When user updates their profile
   - Updates email and name in Supabase
   - Updates `updated_at` timestamp

3. **user.deleted** - When user deletes their account
   - Soft deletes the user (sets `is_active = false`)
   - Preserves historical data

### Security

- **Webhook signature verification** using Svix
- **HTTPS-only** communication
- **Environment variable** for webhook secret
- **Error handling** and logging

## Setup Instructions

### 1. Install Dependencies

The required packages are already installed:
- `@clerk/nextjs` - Clerk SDK for Next.js
- `svix` - Webhook signature verification

### 2. Environment Variables

Add the following to your `.env.local` file:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  # Get this from Clerk Dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Configure Webhook in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Navigate to **Webhooks** in the left sidebar
4. Click **Add Endpoint**
5. Enter your endpoint URL:
   - **Development**: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
   - **Production**: `https://yourdomain.com/api/webhooks/clerk`
6. Select the following events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
7. Click **Create**
8. Copy the **Signing Secret** and add it to `.env.local` as `CLERK_WEBHOOK_SECRET`

### 4. Test Locally with ngrok

Since webhooks require a public URL, use ngrok for local development:

```bash
# Install ngrok (if not already installed)
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Start your Next.js app
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add it to Clerk webhook configuration
```

### 5. Verify Setup

1. **Test User Creation**:
   ```bash
   # Sign up a new user at http://localhost:3000/sign-up
   # Check Clerk Dashboard → Users to see the new user
   # Check Supabase → iso_agents table to verify sync
   ```

2. **Test User Update**:
   ```bash
   # Update user profile in Clerk User Portal
   # Verify changes appear in Supabase
   ```

3. **Check Logs**:
   ```bash
   # Terminal running Next.js app
   # Should show: "Received webhook event: user.created"
   # Should show: "Successfully created user in Supabase: ..."
   ```

## Database Schema

The webhook syncs data to the `iso_agents` table:

```sql
CREATE TABLE iso_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,          -- Clerk user ID
  email TEXT UNIQUE NOT NULL,                   -- User email
  full_name TEXT NOT NULL,                      -- Full name
  role user_role NOT NULL DEFAULT 'iso_agent', -- User role
  is_active BOOLEAN DEFAULT true,               -- Soft delete flag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Implementation Details

### File Structure

```
app/
└── api/
    └── webhooks/
        └── clerk/
            └── route.ts          # Webhook handler

__tests__/
└── unit/
    └── api/
        └── webhooks/
            └── clerk.test.ts     # Unit tests (7 tests, all passing ✅)
```

### Error Handling

The webhook handler includes comprehensive error handling:

| Error | Status Code | Response |
|-------|-------------|----------|
| Missing webhook secret | 500 | "Missing webhook secret configuration" |
| Missing svix headers | 400 | "Missing svix headers" |
| Invalid signature | 400 | "Verification failed" |
| No email address | 400 | "No email address" |
| Database error | 500 | "Database sync failed" |

### Logging

All webhook events are logged to the console:

```typescript
console.log(`Received webhook event: ${eventType}`);
console.log('Successfully created user in Supabase:', data);
```

For production, consider using a logging service like:
- **Vercel Log Drains**
- **Datadog**
- **Sentry**

## Testing

### Unit Tests

Run the webhook tests:

```bash
npm run test __tests__/unit/api/webhooks/clerk.test.ts
```

**Test Coverage**:
- ✅ User creation (user.created)
- ✅ User update (user.updated)
- ✅ User deletion (user.deleted)
- ✅ Missing svix headers
- ✅ Missing webhook secret
- ✅ Missing email address
- ✅ Unhandled event types

### Manual Testing

1. **Create a test user**:
   ```bash
   # Visit http://localhost:3000/sign-up
   # Enter test credentials:
   #   Email: test@example.com
   #   Password: Test123!
   ```

2. **Verify in Supabase**:
   ```sql
   SELECT * FROM iso_agents WHERE email = 'test@example.com';
   ```

3. **Check webhook delivery in Clerk Dashboard**:
   - Webhooks → Select endpoint → Recent events
   - Should show successful delivery (200 status)

## Troubleshooting

### Webhook not receiving events

1. **Check webhook URL is correct** in Clerk Dashboard
2. **Verify CLERK_WEBHOOK_SECRET** is set in `.env.local`
3. **Ensure ngrok is running** (for local development)
4. **Check Clerk webhook logs** for delivery failures

### Database sync failures

1. **Verify Supabase connection**:
   ```bash
   # Check environment variables
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Check table exists**:
   ```sql
   \d iso_agents  -- In Supabase SQL Editor
   ```

3. **Review server logs** for error messages

### Signature verification failures

1. **Ensure CLERK_WEBHOOK_SECRET matches** Clerk Dashboard
2. **Check svix headers are being sent** by Clerk
3. **Verify clock synchronization** on your server

## Security Best Practices

1. **Never commit** `.env.local` to version control
2. **Use environment variables** for all secrets
3. **Verify webhook signatures** (already implemented)
4. **Use HTTPS only** for webhook endpoints
5. **Implement rate limiting** for production (consider Vercel Edge Config)
6. **Monitor webhook failures** and set up alerts

## Production Deployment

### Vercel

1. **Add environment variables** in Vercel Dashboard:
   - Settings → Environment Variables
   - Add `CLERK_WEBHOOK_SECRET`

2. **Update webhook URL** in Clerk:
   - `https://yourdomain.com/api/webhooks/clerk`

3. **Enable webhook logging**:
   - Vercel → Project → Logs
   - Filter by `/api/webhooks/clerk`

### Other Platforms

1. Set environment variables in your hosting platform
2. Update webhook URL in Clerk Dashboard
3. Configure logging and monitoring

## Related Documentation

- [Clerk Webhooks Documentation](https://clerk.com/docs/integrations/webhooks)
- [Svix Documentation](https://docs.svix.com/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For issues or questions:
1. Check this documentation
2. Review [TASK-001](../tasks/backlog/TASK-001-clerk-authentication-integration.md)
3. Check Clerk Dashboard webhook logs
4. Review Next.js server logs

---

**Last Updated**: October 25, 2025
**Status**: ✅ Implemented and Tested
**Test Coverage**: 7/7 tests passing
