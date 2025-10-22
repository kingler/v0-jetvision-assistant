# How to Find Your Supabase Service Role Key

## Quick Steps

1. **Open this URL in your browser:**
   ```
   https://supabase.com/dashboard/project/sbzaevawnjlrsjsuevli/settings/api
   ```

2. **Look for the "Project API keys" section**

   You should see a table that looks like this:

   ```
   ┌─────────────────────────────────────────────────┐
   │ Project API keys                                │
   ├─────────────────────────────────────────────────┤
   │                                                 │
   │ Name: anon public                               │
   │ [eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...]      │
   │ [Copy] button                                   │
   │                                                 │
   │ ───────────────────────────────────────────    │
   │                                                 │
   │ Name: service_role secret                       │
   │ [••••••••••••••••••••••••••]  👁️ [Reveal]      │
   │ [Copy] button                                   │
   │                                                 │
   └─────────────────────────────────────────────────┘
   ```

3. **Click the 👁️ (eye) icon or "Reveal" button** next to "service_role secret"

4. **Copy the revealed key** - it will be very long (starts with `eyJhbGci...`)

5. **Paste it into `.env.local` at line 31:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...paste-here...
   ```

## Visual Guide

### What the Service Role Key Section Looks Like:

```
Project API keys
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ NEVER expose the service_role key in the browser or share it publicly.
   It has elevated privileges and can bypass Row Level Security.

┌───────────────────────────────────────────────────────┐
│ Name              │ Value                              │
├───────────────────┼────────────────────────────────────┤
│ anon              │ eyJhbGciOiJIUzI1NiIsInR5cCI6Ik... │
│ public            │ [Copy]                             │
├───────────────────┼────────────────────────────────────┤
│ service_role      │ ••••••••••••••••••••••••••••••••   │
│ secret            │ 👁️ Reveal    [Copy]                │
└───────────────────┴────────────────────────────────────┘
```

## Troubleshooting

### "I don't see the service_role key"

**Possible reasons:**

1. **You need to scroll down** - The service_role key is usually BELOW the anon key

2. **You're not logged in** - Make sure you're logged into Supabase

3. **You don't have admin access** - Only project admins can see the service_role key

4. **Wrong page** - Make sure you're on the "Settings → API" page, NOT "Database" or other sections

### "The service_role key is hidden"

This is **normal and expected**! Supabase hides it by default for security.

Look for:
- A row of dots: `••••••••••••••••••••`
- An eye icon: 👁️
- A "Reveal" button
- A "Show" link

Click any of these to reveal the key.

### "I can only see the anon key"

The page should show TWO keys:
1. **anon** (public) - You already have this ✅
2. **service_role** (secret) - This is what you need

If you only see one key, try:
- Refreshing the page
- Checking you're logged in as project owner
- Looking at the bottom of the API keys section

## What's the Difference?

| Key Type | Purpose | RLS Bypass | Safe to Share |
|----------|---------|------------|---------------|
| **anon** | Client-side use (browser) | ❌ No | ✅ Yes (already in code) |
| **service_role** | Server-side use only | ✅ Yes | ❌ NO - Keep secret! |

The **service_role** key is needed to:
- Run database migrations
- Bypass Row Level Security for admin tasks
- Create tables and policies
- Seed test data

---

**Still can't find it?**

Send a screenshot of what you see at:
https://supabase.com/dashboard/project/sbzaevawnjlrsjsuevli/settings/api

Or try the manual deployment method instead (see below).

---

## Alternative: Manual Deployment

If you can't find the service role key, you can deploy the schema manually:

1. Go to: https://supabase.com/dashboard/project/sbzaevawnjlrsjsuevli/editor

2. Open: `supabase/migrations/001_initial_schema.sql`

3. Copy the entire contents

4. Paste into the SQL Editor

5. Click "Run"

6. Repeat for `002_rls_policies.sql` and `003_seed_data.sql`

This method works without needing the service role key!
