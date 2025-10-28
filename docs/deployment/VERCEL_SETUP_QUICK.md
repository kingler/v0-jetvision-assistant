# Vercel Setup - Quick Instructions

## 🚀 Quick Setup (5 minutes)

### Step 1: Go to Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Click your **JetVision** project
3. Click **Settings** → **Environment Variables**

### Step 2: Add These Variables

Click "Add New" for each variable. Set environments to: ✅ Production ✅ Preview

**Copy and paste these exactly:**

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
pk_test_YWNlLXBvcnBvaXNlLTEwLmNsZXJrLmFjY291bnRzLmRldiQ

CLERK_SECRET_KEY
sk_test_tzrWOUR9kb9puh8pQUCnE0LhJVPVaZkiBdfK3jcVas

NEXT_PUBLIC_SUPABASE_URL
https://sbzaevawnjlrsjsuevli.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiemFldmF3bmpscnNqc3VldmxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjcxMDIsImV4cCI6MjA3NjUwMzEwMn0.r-ClgNXSaDnzcz8sJ9LeJb-ITceLLWV_RUSJBYcJThg

SUPABASE_SERVICE_ROLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiemFldmF3bmpscnNqc3VldmxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDkyNzEwMiwiZXhwIjoyMDc2NTAzMTAyfQ.R2TtahKp42sk11OqwB_DSn6-Uxi6flfD-_1hpm4FaEU

OPENAI_API_KEY
sk-proj-YOUR_OPENAI_API_KEY_HERE

NODE_ENV
production
```

### Step 3: Get Clerk Webhook Secret

1. Go to https://dashboard.clerk.com/
2. Click **Webhooks** → **Add Endpoint**
3. Endpoint URL: `https://YOUR-VERCEL-URL.vercel.app/api/webhooks/clerk`
4. Subscribe to events: ✅ user.created ✅ user.updated ✅ user.deleted
5. Click **Create**
6. Copy the **Signing Secret** (starts with `whsec_`)
7. Add it to Vercel as:

```
CLERK_WEBHOOK_SECRET
whsec_[paste your secret here]
```

### Step 4: Redeploy

In Vercel:
1. **Deployments** tab
2. Click **⋯** on latest deployment
3. Click **Redeploy**

✅ Done! Your app should work now.

---

## Troubleshooting

**Still getting errors?**
1. Check all variable names are exactly correct (case-sensitive)
2. Make sure you clicked Production + Preview for each variable
3. Redeploy after adding variables (they don't apply automatically)

**Need help?** See full guide: `docs/VERCEL_DEPLOYMENT_INSTRUCTIONS.md`
