# Vercel Build Settings Fix - URGENT

## Problem
Vercel is still running `pnpm install --no-frozen-lockfile` despite all our changes to use npm.

## Root Cause
Vercel has **cached the build settings** in their dashboard. The `vercel.json` file is being ignored because the dashboard settings take precedence.

## Fix Steps (REQUIRED - Must be done manually)

### 1. Update Build & Development Settings in Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project: `v0-jetvision-assistant`
3. Click **Settings** (top navigation)
4. Click **General** (left sidebar)
5. Scroll to **Build & Development Settings**
6. Update the following:

   **Framework Preset**: `Next.js`
   
   **Build Command**: 
   ```
   npm run build
   ```
   
   **Install Command**: 
   ```
   npm install
   ```
   
   **Output Directory**: `.next` (leave as default)
   
7. Click **Save** at the bottom

### 2. Clear Build Cache

1. Still in Settings, go to **Functions** (left sidebar)
2. Scroll down and find "Clear Build Cache" or similar option
3. Click it to clear the pnpm cache

### 3. Trigger New Deployment

After saving the settings:

**Option A - Redeploy from Dashboard:**
1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Click **Redeploy**
4. Confirm

**Option B - Push empty commit (already done):**
```bash
git commit --allow-empty -m "trigger: force rebuild with npm"
git push origin main
```

### 4. Verify the Build

Once the new deployment starts:
1. Open the build logs
2. Look for: `Running "install" command: npm install...`
3. Should **NOT** see: `pnpm install`

## Why This Happened

Vercel caches build settings from the first deployment. Even though we:
- ✅ Removed `packageManager` from package.json
- ✅ Updated `vercel.json` with npm commands
- ✅ Cleaned up `.npmrc`
- ✅ Removed workspaces configuration

Vercel still used cached pnpm settings from the dashboard.

## Expected Result After Fix

```
Running "install" command: npm install...
✓ Dependencies installed successfully
Running "build" command: npm run build...
✓ Build completed successfully
```

## If Still Failing

If you still see pnpm after following these steps:

1. **Check for pnpm-workspace.yaml** in project root:
   ```bash
   rm -f pnpm-workspace.yaml
   git add -A
   git commit -m "remove pnpm workspace file"
   git push origin main
   ```

2. **Contact Vercel Support** if the dashboard settings aren't being applied

3. **Create a new Vercel project** as last resort (import from GitHub again)

## Files Updated in This Session

- ✅ `package.json` - Removed packageManager and workspaces
- ✅ `vercel.json` - Updated to npm commands
- ✅ `.npmrc` - Removed pnpm configuration
- ⚠️  **Vercel Dashboard Settings** - NEEDS MANUAL UPDATE (see above)

---

**Priority**: URGENT - Build is blocked until dashboard settings are updated.

**Next Step**: Update Vercel dashboard settings NOW, then redeploy.
