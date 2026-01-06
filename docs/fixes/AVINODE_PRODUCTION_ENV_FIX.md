# Avinode Production Environment Variable Fix

**Issue**: Trip creation (`create_trip` tool) works in local development but fails in Vercel production.

**Root Cause**: Environment variable mismatch between the Next.js app and the Avinode MCP server.

## Problem Analysis

### Environment Variable Mapping

The Avinode MCP server (`mcp-servers/avinode-mcp-server/src/client.ts` and `src/index.ts`) expects these environment variables **in order of precedence**:

1. **API Token**: `API_TOKEN` → `AVINODE_API_TOKEN` (fallback)
2. **Auth Token**: `AUTHENTICATION_TOKEN` → `AVINODE_BEARER_TOKEN` → `AVINODE_API_KEY` (fallbacks)
3. **Base URL**: `BASE_URI` → `AVINODE_BASE_URL` (fallback)

### What Went Wrong

**Local Development (.env.local)**:
```bash
AVINODE_API_KEY=eyJhbGciOiJSUzUxMiIsInR5cC...  # JWT Bearer token
AVINODE_API_TOKEN=d221161f-6e64-4f5a-a564-62b7c0b235bc  # API token
# No BASE_URI or AVINODE_BASE_URL (defaults to sandbox)
```

**Vercel Production**:
- Only `AVINODE_API_KEY` was configured
- Missing: `API_TOKEN`, `AUTHENTICATION_TOKEN`, `BASE_URI`
- Result: MCP server falls into mock mode or fails to initialize

### Why It Worked Locally But Not in Production

**Local**:
- `AVINODE_API_TOKEN` is set → MCP server finds it (fallback from `API_TOKEN`)
- `AVINODE_API_KEY` is set → MCP server finds it (fallback from `AUTHENTICATION_TOKEN`)
- No `BASE_URI` → Defaults to sandbox (acceptable in dev)

**Production (Vercel)**:
- Only `AVINODE_API_KEY` configured
- MCP server looks for `API_TOKEN` first → **NOT FOUND**
- MCP server looks for `AUTHENTICATION_TOKEN` first → **NOT FOUND** 
- Falls back to `AVINODE_API_KEY` but missing `API_TOKEN` → **Client initialization fails**
- `NODE_ENV=production` → Requires explicit `BASE_URI` (line 32-37 in client.ts)

## The Fix

### Step 1: Add Missing Environment Variables to .env.local

Update your local `.env.local` file to use the primary variable names:

```bash
# Avinode MCP Server Configuration
# Primary variable names (checked first by MCP server)
API_TOKEN=d221161f-6e64-4f5a-a564-62b7c0b235bc
AUTHENTICATION_TOKEN=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjI4YTgwY2FiLWVlYWEtNGFiNS05YjBlLWI1NjRkZDRmMDE2OCJ9...
BASE_URI=https://sandbox.avinode.com/api

# Fallback variable names (kept for compatibility)
AVINODE_API_TOKEN=d221161f-6e64-4f5a-a564-62b7c0b235bc
AVINODE_API_KEY=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjI4YTgwY2FiLWVlYWEtNGFiNS05YjBlLWI1NjRkZDRmMDE2OCJ9...
AVINODE_BASE_URL=https://sandbox.avinode.com/api
```

### Step 2: Configure Vercel Production Environment Variables

#### Option A: Via Vercel CLI

```bash
# Navigate to project root
cd /path/to/v0-jetvision-assistant

# Login to Vercel (if not already)
vercel login

# Link project (if not already)
vercel link

# Add required environment variables to production
vercel env add API_TOKEN production
# Paste: d221161f-6e64-4f5a-a564-62b7c0b235bc

vercel env add AUTHENTICATION_TOKEN production
# Paste: eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjI4YTgwY2FiLWVlYWEtNGFiNS05YjBlLWI1NjRkZDRmMDE2OCJ9...

vercel env add BASE_URI production
# Paste: https://sandbox.avinode.com/api (for testing)
# OR:    https://api.avinode.com/api (for production)
```

#### Option B: Via Vercel Dashboard

1. Go to https://vercel.com/[your-username]/v0-jetvision-assistant
2. Click **Settings** → **Environment Variables**
3. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `API_TOKEN` | `d221161f-...` | Production |
| `AUTHENTICATION_TOKEN` | `eyJhbGciOiJS...` | Production |
| `BASE_URI` | `https://sandbox.avinode.com/api` | Production |

### Step 3: Redeploy to Production

```bash
# Trigger a new production deployment
vercel --prod

# Or push to main branch to trigger automatic deployment
git push origin main
```

### Step 4: Verify the Fix

Run the verification script:

```bash
npm run verify:avinode-env
# Or directly:
./scripts/verify-avinode-env.sh
```

Expected output:
```
🎉 All checks passed! Environment is configured correctly.
```

### Step 5: Test in Production

1. Visit your production URL
2. Submit a flight request with airports, date, and passengers
3. Verify that `create_trip` returns a `trip_id` and `deep_link`
4. Check production logs for successful Avinode API calls

## Code Reference

### MCP Server Client Initialization

**File**: `mcp-servers/avinode-mcp-server/src/client.ts`

```typescript:mcp-servers/avinode-mcp-server/src/client.ts
// Lines 27-66
const baseURI = process.env.BASE_URI || process.env.AVINODE_BASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

// In production, require explicit URL configuration
if (!baseURI) {
  if (isProduction) {
    throw new Error(
      'BASE_URI or AVINODE_BASE_URL environment variable is required in production. ' +
      'Set BASE_URI=https://api.avinode.com/api for production or BASE_URI=https://sandbox.avinode.com/api for testing.'
    );
  }
}

// Get and trim tokens
let apiToken = (process.env.API_TOKEN || process.env.AVINODE_API_TOKEN || '').trim();
let authToken = (process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN || '').trim();

// Validate required credentials
if (!apiToken) {
  throw new Error('API_TOKEN environment variable is required');
}
if (!authToken) {
  throw new Error('AUTHENTICATION_TOKEN environment variable is required');
}
```

### MCP Server Index

**File**: `mcp-servers/avinode-mcp-server/src/index.ts`

```typescript:mcp-servers/avinode-mcp-server/src/index.ts
// Lines 75-77
const apiToken = process.env.API_TOKEN || process.env.AVINODE_API_TOKEN;
const authToken = process.env.AUTHENTICATION_TOKEN || process.env.AVINODE_BEARER_TOKEN;
const useMockMode = !apiToken || !authToken || apiToken.startsWith('mock_');
```

## Prevention

### Update .env.local.example

Update the example file to reflect the primary variable names:

```bash
# ============================================================================
# Avinode API Configuration (MCP Server)
# ============================================================================
# The MCP server checks these variables in order of precedence:
# 1. API_TOKEN (primary) → AVINODE_API_TOKEN (fallback)
# 2. AUTHENTICATION_TOKEN (primary) → AVINODE_BEARER_TOKEN → AVINODE_API_KEY (fallbacks)
# 3. BASE_URI (primary) → AVINODE_BASE_URL (fallback)

# API Token (UUID format)
API_TOKEN=your-api-token-uuid
AVINODE_API_TOKEN=your-api-token-uuid  # Fallback

# Bearer Token (JWT format)
AUTHENTICATION_TOKEN=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6...
AVINODE_API_KEY=eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6...  # Fallback

# Base URL
BASE_URI=https://sandbox.avinode.com/api
AVINODE_BASE_URL=https://sandbox.avinode.com/api  # Fallback

# Environment Options:
# - Sandbox (testing): https://sandbox.avinode.com/api
# - Production (live): https://api.avinode.com/api
```

### Add to Deployment Checklist

Add to `docs/deployment/DEPLOYMENT_CHECKLIST.md`:

- [ ] Verify Avinode environment variables are configured in Vercel:
  - `API_TOKEN` (primary) or `AVINODE_API_TOKEN` (fallback)
  - `AUTHENTICATION_TOKEN` (primary) or `AVINODE_API_KEY` (fallback)  
  - `BASE_URI` (required in production) or `AVINODE_BASE_URL` (fallback)
- [ ] Run `npm run verify:avinode-env` before deployment
- [ ] Test `create_trip` tool in production after deployment

### Add npm Script

Add to `package.json`:

```json
{
  "scripts": {
    "verify:avinode-env": "bash scripts/verify-avinode-env.sh"
  }
}
```

## Related Issues

- **Linear Issue**: ONEK-120 (Avinode Integration)
- **Breaking Commit**: None - this is a configuration issue, not a code regression
- **Last Known Working**: Production worked when environment variables were correctly configured

## Further Investigation

If the issue persists after applying this fix, check:

1. **Vercel deployment logs** for MCP server initialization errors:
   ```bash
   vercel logs [deployment-url] --follow
   ```

2. **Runtime logs** in Vercel dashboard under "Functions" tab

3. **Environment variable synchronization**:
   ```bash
   vercel env pull .env.production
   cat .env.production | grep -E "API_TOKEN|AUTHENTICATION_TOKEN|BASE_URI"
   ```

4. **Network connectivity** from Vercel to Avinode API (firewall/IP restrictions)

## Contact

- **Avinode API Support**: api-support@avinode.com
- **Documentation**: https://developer.avinodegroup.com/reference/createtrip
