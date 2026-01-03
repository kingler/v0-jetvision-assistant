# Clerk Loading Issue Troubleshooting

**Issue:** App stuck on "Loading..." screen  
**Cause:** Clerk authentication not initializing (`isLoaded` stays `false`)

---

## Quick Diagnosis

The "Loading..." screen appears when Clerk's `useUser()` hook returns `isLoaded: false`. This typically means:

1. **Missing Clerk Environment Variables**
2. **Invalid Clerk API Keys**
3. **Network/CORS Issues**
4. **Browser Console Errors**

---

## Solution Steps

### Step 1: Check Environment Variables

Verify your `.env.local` file has the required Clerk variables:

```bash
# Check if .env.local exists and has Clerk vars
cat .env.local | grep CLERK
```

**Required Variables:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Step 2: Verify Clerk Keys

1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **API Keys** in the sidebar
4. Verify you're using the correct keys:
   - **Publishable Key**: Starts with `pk_test_...` or `pk_live_...`
   - **Secret Key**: Starts with `sk_test_...` or `sk_live_...`

### Step 3: Check Browser Console

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Look for errors like:
   - `CLERK_PUBLISHABLE_KEY is missing`
   - `Invalid Clerk key`
   - Network errors to `clerk.accounts.dev`

### Step 4: Restart Development Server

After updating environment variables, restart the dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
pnpm dev
```

**Important:** Environment variables are only loaded when the server starts!

### Step 5: Clear Browser Cache

Sometimes cached Clerk scripts can cause issues:

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

---

## Common Errors

### Error: "CLERK_PUBLISHABLE_KEY is missing"

**Solution:** Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to `.env.local`

### Error: "Invalid publishable key"

**Solution:** 
- Verify the key starts with `pk_test_...` or `pk_live_...`
- Make sure there are no extra spaces or quotes
- Copy the key directly from Clerk Dashboard

### Error: Network errors to Clerk

**Solution:**
- Check your internet connection
- Verify Clerk service status at https://status.clerk.com
- Check for browser extensions blocking requests (ad blockers, privacy tools)

---

## Verification

After fixing the issue, verify Clerk is working:

1. The app should load (no more "Loading..." screen)
2. If not signed in, you should see the sign-in page
3. Browser console should show no Clerk-related errors

---

## Still Not Working?

If the issue persists:

1. **Check Server Logs**: Look at terminal where `pnpm dev` is running
2. **Verify File Location**: Make sure `.env.local` is in the project root
3. **Check File Permissions**: `.env.local` should be readable
4. **Try Fresh Install**: 
   ```bash
   rm -rf .next node_modules
   pnpm install
   pnpm dev
   ```
