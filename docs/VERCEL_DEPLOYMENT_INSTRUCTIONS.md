# Vercel Deployment Instructions for Jetvision AI Assistant

## Quick Start

This document contains step-by-step instructions for deploying the Jetvision AI Assistant to Vercel.

**Important**: You must configure environment variables in Vercel for the application to work.

---

## Step 1: Access Your Vercel Project

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Log in to your Vercel account
3. Find and click on your **Jetvision** project
4. Click the **Settings** tab at the top
5. Click **Environment Variables** in the left sidebar

---

## Step 2: Add Environment Variables

For each variable below, click **Add New** and enter:
- **Name**: The variable name (exact, case-sensitive)
- **Value**: The value provided
- **Environments**: Check ✅ **Production** and ✅ **Preview**

### Clerk Authentication (Required)

These variables enable user login/signup:

```
Name:  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
Value: pk_test_YWNlLXBvcnBvaXNlLTEwLmNsZXJrLmFjY291bnRzLmRldiQ
Environments: ✅ Production  ✅ Preview
```

```
Name:  CLERK_SECRET_KEY
Value: sk_test_tzrWOUR9kb9puh8pQUCnE0LhJVPVaZkiBdfK3jcVas
Environments: ✅ Production  ✅ Preview
```

```
Name:  CLERK_WEBHOOK_SECRET
Value: whsec_REPLACE_WITH_ACTUAL_SECRET
Environments: ✅ Production  ✅ Preview

⚠️ NOTE: You need to get this from Clerk Dashboard (see Step 3 below)
```

---

### Supabase Database (Required)

These variables connect to the database:

```
Name:  NEXT_PUBLIC_SUPABASE_URL
Value: https://sbzaevawnjlrsjsuevli.supabase.co
Environments: ✅ Production  ✅ Preview
```

```
Name:  NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiemFldmF3bmpscnNqc3VldmxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjcxMDIsImV4cCI6MjA3NjUwMzEwMn0.r-ClgNXSaDnzcz8sJ9LeJb-ITceLLWV_RUSJBYcJThg
Environments: ✅ Production  ✅ Preview
```

```
Name:  SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiemFldmF3bmpscnNqc3VldmxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDkyNzEwMiwiZXhwIjoyMDc2NTAzMTAyfQ.R2TtahKp42sk11OqwB_DSn6-Uxi6flfD-_1hpm4FaEU
Environments: ✅ Production  ✅ Preview
```

---

### OpenAI API (Required)

This enables AI functionality:

```
Name:  OPENAI_API_KEY
Value: sk-proj-YOUR_OPENAI_API_KEY_HERE
Environments: ✅ Production  ✅ Preview
```

---

### Google OAuth (Optional - for future features)

```
Name:  GOOGLE_CLIENT_ID
Value: YOUR_GOOGLE_CLIENT_ID_HERE
Environments: ✅ Production  ✅ Preview
```

```
Name:  GOOGLE_CLIENT_SECRET
Value: YOUR_GOOGLE_CLIENT_SECRET_HERE
Environments: ✅ Production  ✅ Preview
```

---

### Redis (Optional - for background jobs)

If you're using Upstash Redis:

```
Name:  REDIS_URL
Value: redis://localhost:6379
Environments: ✅ Production  ✅ Preview

⚠️ NOTE: Replace with actual Redis URL if using Upstash or other hosted Redis
```

---

### Other Configuration Variables

```
Name:  NODE_ENV
Value: production
Environments: ✅ Production  ✅ Preview
```

```
Name:  NEXT_PUBLIC_APP_URL
Value: https://your-deployment-url.vercel.app
Environments: ✅ Production  ✅ Preview

⚠️ NOTE: Replace with your actual Vercel deployment URL after first deploy
```

---

## Step 3: Get Clerk Webhook Secret (Required)

The `CLERK_WEBHOOK_SECRET` needs to be obtained from Clerk Dashboard:

### Instructions:

1. Go to [https://dashboard.clerk.com/](https://dashboard.clerk.com/)
2. Log in to Clerk
3. Select your **Jetvision** application
4. Click **Webhooks** in the left sidebar
5. Click **Add Endpoint** (or edit existing endpoint)
6. For the **Endpoint URL**, enter:
   ```
   https://your-vercel-url.vercel.app/api/webhooks/clerk
   ```
   Replace `your-vercel-url` with your actual Vercel deployment URL

7. Under **Subscribe to events**, check:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`

8. Click **Create**

9. Copy the **Signing Secret** (starts with `whsec_`)

10. Go back to Vercel → Settings → Environment Variables

11. Find the `CLERK_WEBHOOK_SECRET` variable and update its value with the signing secret you just copied

---

## Step 4: Redeploy

After adding ALL environment variables:

1. Go to the **Deployments** tab in Vercel
2. Find the most recent deployment
3. Click the **⋯** (three dots) menu
4. Click **Redeploy**
5. Wait for deployment to complete (usually 1-2 minutes)

**OR** simply push a new commit to your Git repository to trigger automatic deployment.

---

## Step 5: Verify Deployment

### Check 1: App Loads

1. Visit your Vercel deployment URL
2. You should see the Jetvision sign-in page
3. **If you see an error**, check the build logs in Vercel

### Check 2: Sign Up Works

1. Click **Sign up**
2. Create a test account
3. You should be redirected to the main app

### Check 3: Database Connection

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project
3. Go to **Table Editor** → `iso_agents`
4. You should see your test user created

---

## Troubleshooting

### Error: "Missing publishableKey"

**Solution**:
- Make sure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is added to Vercel
- Redeploy after adding the variable

### Error: "Failed to fetch"

**Solution**:
- Check all Supabase variables are correct
- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys match Supabase Dashboard

### Clerk Sign-in Doesn't Work

**Solution**:
1. Go to Clerk Dashboard → Domains
2. Add your Vercel domain (e.g., `your-app.vercel.app`)
3. Wait a few minutes for DNS propagation

### Build Fails

**Solution**:
1. Check build logs in Vercel → Deployments → Click deployment → View logs
2. Look for missing environment variables
3. Add any missing variables and redeploy

---

## Environment Variables Checklist

Use this checklist to ensure all variables are added:

### Required (Must Have)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `CLERK_WEBHOOK_SECRET` (get from Clerk Dashboard)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`

### Recommended
- [ ] `NODE_ENV` = `production`
- [ ] `NEXT_PUBLIC_APP_URL` (your Vercel URL)

### Optional (for future features)
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `REDIS_URL` (if using background jobs)

---

## Security Notes

⚠️ **Important**:
- Never share these credentials publicly
- Never commit `.env.local` to Git
- Only add environment variables through Vercel Dashboard
- Keep the webhook secret secure

---

## Support

If you encounter issues:

1. **Check Vercel build logs**:
   - Deployments → Click deployment → View logs

2. **Check Clerk Dashboard**:
   - Webhooks → Recent Events (for webhook issues)

3. **Check Supabase logs**:
   - Logs & Analytics → API Logs

4. **Common issues**:
   - Variable name typos (case-sensitive!)
   - Extra spaces in values
   - Forgot to redeploy after adding variables
   - Domain not added to Clerk

---

## Quick Reference: Where to Find Things

| Service | Dashboard URL | What You Need |
|---------|---------------|---------------|
| Vercel | https://vercel.com/dashboard | Project Settings → Environment Variables |
| Clerk | https://dashboard.clerk.com/ | Webhooks → Signing Secret |
| Supabase | https://supabase.com/dashboard | Settings → API (for keys) |
| OpenAI | https://platform.openai.com/api-keys | API Keys |

---

**Last Updated**: October 25, 2025
**Status**: Ready for deployment
**Required Variables**: 7 minimum (see checklist)
