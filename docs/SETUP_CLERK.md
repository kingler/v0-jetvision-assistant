# Clerk Authentication Setup Guide

This guide walks you through setting up Clerk authentication for the JetVision AI Assistant project.

## Overview

Clerk provides:
- Secure user authentication (email, OAuth, magic links)
- Pre-built UI components for sign-in/sign-up
- User management dashboard
- Webhook integration for user sync with Supabase
- Session management and JWT tokens

## Prerequisites

- A Clerk account (sign up at https://clerk.com)
- Project `.env.local` file
- Supabase already configured (see `SETUP_SUPABASE.md`)

## Step 1: Create a Clerk Application

1. **Go to Clerk Dashboard**
   - Navigate to https://dashboard.clerk.com
   - Click "Create Application"

2. **Configure Application**
   - **Application Name**: `JetVision AI Assistant`
   - **Choose Sign-In Methods**:
     - ✅ Email address (required)
     - ✅ Google (recommended for B2B users)
     - ✅ Microsoft (optional - for enterprise users)
   - **Choose Sign-Up Mode**: "Public" (anyone can sign up)

3. **Click "Create Application"**
   - Application setup is instant

## Step 2: Get API Keys

1. **Navigate to API Keys**
   - In Clerk Dashboard, go to **API Keys** (left sidebar)

2. **Copy Required Keys**

   You'll need two keys:

   ```env
   # Publishable Key - Safe for client-side use
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

   # Secret Key - NEVER expose to client, server-only
   CLERK_SECRET_KEY=sk_test_...
   ```

3. **Test vs Production Keys**
   - Use `pk_test_...` and `sk_test_...` for development
   - Use `pk_live_...` and `sk_live_...` for production

## Step 3: Update Environment Variables

1. **Open `.env.local`** in your project root

2. **Add Clerk Configuration**:

   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # Clerk URL Configuration
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   ```

3. **Save the file**

## Step 4: Configure Webhooks for User Sync

Clerk webhooks keep Supabase user data synchronized.

### 4.1 Get Webhook Signing Secret

1. **In Clerk Dashboard**, go to **Webhooks** (left sidebar)
2. Click **Add Endpoint**
3. **Endpoint URL**:
   - For development: `https://your-ngrok-url.ngrok.io/api/webhooks/clerk`
   - For production: `https://yourdomain.com/api/webhooks/clerk`

4. **Subscribe to Events**:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`

5. **Click "Create"**

6. **Copy Signing Secret**:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

### 4.2 Set Up ngrok for Local Development

For local webhook testing:

```bash
# Install ngrok (if not already installed)
brew install ngrok  # macOS
# or download from https://ngrok.com

# Start your Next.js app
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this as your webhook endpoint: https://abc123.ngrok.io/api/webhooks/clerk
```

### 4.3 Update Webhook Endpoint

1. In Clerk Dashboard → Webhooks
2. Edit your endpoint
3. Update URL to ngrok HTTPS URL
4. Save changes

## Step 5: Configure Allowed Domains

1. **In Clerk Dashboard**, go to **Paths** → **Component Settings**
2. **Add Allowed Redirect URLs**:
   - `http://localhost:3000`
   - `https://yourdomain.com` (for production)
3. **Add Sign-in/Sign-up Paths**:
   - Sign-in: `/sign-in`
   - Sign-up: `/sign-up`
   - Home: `/`

## Step 6: Customize Appearance (Optional)

1. **Go to Customization** → **Branding**
2. **Upload Logo**: Add JetVision logo
3. **Brand Colors**: Match your design system
4. **Custom CSS**: Add any custom styling

## Step 7: Test Authentication

Full authentication implementation will be done in **DES-78: Clerk Authentication Integration**.

For now, verify the connection:

```bash
npm run verify-services
```

You should see:
```
✓ Clerk: Connected successfully
```

## Environment Variables Summary

Add these to `.env.local`:

```env
# ============================================================================
# Clerk Authentication
# ============================================================================

# API Keys (from Dashboard → API Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# URL Configuration
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Webhook Secret (from Dashboard → Webhooks)
CLERK_WEBHOOK_SECRET=whsec_...
```

## Verification Checklist

- [ ] Clerk application created
- [ ] Publishable key added to `.env.local`
- [ ] Secret key added to `.env.local` (keep secret!)
- [ ] Webhook endpoint created
- [ ] Webhook secret added to `.env.local`
- [ ] Webhook subscribed to user events
- [ ] Connection verified with `npm run verify-services`
- [ ] ngrok configured for local webhook testing (optional)

## Security Best Practices

### DO ✅
- Use `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for client-side
- Use `CLERK_SECRET_KEY` only in server-side code (API routes)
- Verify webhook signatures using `CLERK_WEBHOOK_SECRET`
- Use HTTPS for webhook endpoints
- Enable multi-factor authentication for admin users

### DON'T ❌
- Never commit `.env.local` to version control
- Never expose secret key to the client
- Don't skip webhook signature verification
- Don't use test keys in production
- Never log sensitive credentials

## Authentication Flow

```
User Sign-In
    ↓
Clerk validates credentials
    ↓
Clerk issues JWT token
    ↓
Next.js middleware validates JWT
    ↓
User data available in app
    ↓
Webhook syncs user to Supabase
```

## Common Issues

### "Clerk is not defined"
- Check that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set
- Ensure environment variables are loaded (restart dev server)
- Verify key is not truncated

### "Invalid API key"
- Using production key in development (or vice versa)
- Key was regenerated in dashboard
- Copy-paste error (check for extra spaces)

### "Webhook signature verification failed"
- Wrong `CLERK_WEBHOOK_SECRET`
- Signature verification not implemented correctly
- Request modified by proxy/load balancer

### "Redirect loop on sign-in"
- Check `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` is correct
- Middleware configuration issue
- Public routes not properly configured

## Next Steps

After Clerk is configured:

1. **DES-78**: Implement Clerk Authentication Integration
   - Add middleware for route protection
   - Create sign-in/sign-up pages
   - Add user context provider

2. **DES-80**: Implement Clerk-Supabase User Sync
   - Create webhook endpoint
   - Sync user data to Supabase
   - Handle user updates and deletions

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Integration](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk + Supabase Guide](https://clerk.com/docs/integrations/databases/supabase)
- [Webhook Events Reference](https://clerk.com/docs/integrations/webhooks/overview)

## Support

If you encounter issues:
- Check Clerk Dashboard logs (Dashboard → Logs)
- Review browser console for client-side errors
- Test webhook delivery (Dashboard → Webhooks → Attempts)
- Run `npm run verify-services` for connection diagnostics
