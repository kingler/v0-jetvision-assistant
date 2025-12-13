# Environment Setup Guide

Complete guide for setting up your local development environment for the JetVision AI Assistant project.

## Overview

This guide covers:
- Prerequisites installation
- Service configuration (Redis, Supabase, Clerk, OpenAI)
- Environment variable setup
- Service verification

**Time Required**: 2-3 hours

## Prerequisites

### Required Software

1. **Node.js 18+**
   ```bash
   # Check version
   node --version  # Should be v18.0.0 or higher

   # Install with nvm (recommended)
   nvm install 18
   nvm use 18
   ```

2. **npm or pnpm**
   ```bash
   # npm comes with Node.js
   npm --version

   # Or use pnpm (faster)
   npm install -g pnpm
   ```

3. **Docker Desktop**
   - Download from https://www.docker.com/products/docker-desktop
   - Required for running Redis locally
   - Alternative: Use Upstash Redis (cloud)

4. **Git**
   ```bash
   git --version
   ```

### Optional Tools

- **ngrok** - For testing webhooks locally
  ```bash
  brew install ngrok  # macOS
  # or download from https://ngrok.com
  ```

- **Redis CLI** - For debugging Redis
  ```bash
  brew install redis  # macOS (cli only, we use Docker for server)
  ```

## Step 1: Clone and Install

```bash
# Clone repository
cd /path/to/your/projects
git clone <repository-url>
cd v0-jetvision-assistant

# Install dependencies
npm install
# or
pnpm install
```

## Step 2: Environment Configuration

### 2.1 Create .env.local

```bash
# Copy the example file
cp .env.local.example .env.local
```

### 2.2 Configure Services

You'll need to configure four main services:

1. **Redis** (Task Queue) - [Quick Setup](#redis-setup)
2. **OpenAI** (AI Agents) - [Quick Setup](#openai-setup)
3. **Supabase** (Database) - [Detailed Guide](./SETUP_SUPABASE.md)
4. **Clerk** (Authentication) - [Detailed Guide](./SETUP_CLERK.md)

### Redis Setup

**Option A: Docker (Recommended)**

```bash
# Start Redis with Docker Compose
npm run redis:start

# Verify it's running
npm run redis:status
```

Your `.env.local` should have:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379
```

**Option B: Upstash (Cloud)**

1. Sign up at https://upstash.com
2. Create a Redis database
3. Copy the connection URL
4. Update `.env.local`:
   ```env
   REDIS_URL=rediss://...@...upstash.io:6379
   ```

### OpenAI Setup

1. **Get API Key**
   - Go to https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy the key (starts with `sk-proj-...`)

2. **Update `.env.local`**:
   ```env
   OPENAI_API_KEY=sk-proj-...
   # OPENAI_ORGANIZATION_ID=org-...  # Optional
   ```

### Supabase Setup

**Quick Setup** (Full guide: [SETUP_SUPABASE.md](./SETUP_SUPABASE.md)):

1. Create project at https://app.supabase.com
2. Get credentials from Settings → API
3. Update `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   SUPABASE_JWT_SECRET=your-jwt-secret
   ```

### Clerk Setup

**Quick Setup** (Full guide: [SETUP_CLERK.md](./SETUP_CLERK.md)):

1. Create app at https://dashboard.clerk.com
2. Get API keys from Dashboard → API Keys
3. Update `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   ```

## Step 3: Verify Services

After configuring all services, verify they're working:

```bash
npm run verify-services
```

Expected output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  JetVision Service Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Testing services...
✓ Redis: Connected successfully
✓ Supabase: Connected successfully
✓ Clerk: Connected successfully
✓ OpenAI: Connected successfully

Results: 4 OK, 0 Errors, 0 Skipped

✅ All services are configured and working!
You are ready to start development.
```

## Step 4: Start Development

```bash
# Start Redis (if using Docker)
npm run redis:start

# Start Next.js development server
npm run dev

# Or start both app and MCP servers
npm run dev  # Uses concurrently
```

Access the app at: http://localhost:3000

## Complete .env.local Template

Here's a minimal working configuration:

```env
# ============================================================================
# JetVision AI Assistant - Environment Configuration
# ============================================================================

# ----------------------------------------------------------------------------
# Application
# ----------------------------------------------------------------------------
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ----------------------------------------------------------------------------
# OpenAI (REQUIRED)
# ----------------------------------------------------------------------------
OPENAI_API_KEY=sk-proj-...

# ----------------------------------------------------------------------------
# Redis (REQUIRED)
# ----------------------------------------------------------------------------
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# ----------------------------------------------------------------------------
# Supabase (REQUIRED after DES-78)
# ----------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_JWT_SECRET=...

# ----------------------------------------------------------------------------
# Clerk (REQUIRED after DES-78)
# ----------------------------------------------------------------------------
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
CLERK_WEBHOOK_SECRET=whsec_...

# ----------------------------------------------------------------------------
# Feature Flags
# ----------------------------------------------------------------------------
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false
NEXT_PUBLIC_ENABLE_MOCK_DATA=false
NEXT_PUBLIC_ENABLE_AGENT_MONITORING=true
```

## Common Commands

### Development
```bash
npm run dev              # Start dev server
npm run dev:app          # Start Next.js only
npm run dev:mcp          # Start MCP servers only
npm run build            # Build for production
npm run start            # Start production server
```

### Redis
```bash
npm run redis:start      # Start Redis container
npm run redis:stop       # Stop Redis container
npm run redis:status     # Check Redis status
```

### Testing
```bash
npm test                 # Run all tests
npm run test:unit        # Run unit tests
npm run test:integration # Run integration tests
npm run test:coverage    # Generate coverage report
npm run test:watch       # Watch mode
```

### Verification
```bash
npm run verify-services  # Test all service connections
npm run type-check       # TypeScript type checking
npm run lint             # ESLint
```

## Troubleshooting

### "Redis connection failed"

**Problem**: Redis not running
**Solution**:
```bash
# Check Docker is running
docker ps

# Start Redis
npm run redis:start

# Check status
npm run redis:status
```

### "OpenAI API key invalid"

**Problem**: Wrong or expired API key
**Solution**:
1. Go to https://platform.openai.com/api-keys
2. Generate a new key
3. Update `OPENAI_API_KEY` in `.env.local`
4. Restart dev server

### "Supabase connection failed"

**Problem**: Wrong URL or keys
**Solution**:
1. Go to Supabase Dashboard → Settings → API
2. Copy URL and anon key exactly
3. Ensure no trailing spaces or newlines
4. Restart dev server

### "Clerk is not defined"

**Problem**: Missing or wrong Clerk keys
**Solution**:
1. Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set
2. Restart dev server (environment changes require restart)
3. Clear Next.js cache: `rm -rf .next`

### Port 3000 already in use

**Solution**:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 npm run dev
```

### Docker permission denied

**Solution**:
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER

# Restart Docker Desktop (macOS)
# Then restart terminal
```

## Security Checklist

Before committing code:

- [ ] `.env.local` is in `.gitignore`
- [ ] No API keys in code or comments
- [ ] No hardcoded secrets
- [ ] Used environment variables for all credentials
- [ ] Verified `.env.local.example` has no real values

## Next Steps

After environment setup:

1. **Read Architecture Docs**:
   - [docs/architecture/MULTI_AGENT_SYSTEM.md](./architecture/MULTI_AGENT_SYSTEM.md)
   - [docs/SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)

2. **Start Development**:
   - DES-78: Clerk Authentication Integration
   - DES-79: Database Schema & Models
   - DES-80: Clerk-Supabase User Sync

3. **Run Tests**:
   ```bash
   npm run test:coverage
   ```

## Support

If you encounter issues not covered here:

1. Check service-specific guides:
   - [SETUP_SUPABASE.md](./SETUP_SUPABASE.md)
   - [SETUP_CLERK.md](./SETUP_CLERK.md)

2. Run diagnostics:
   ```bash
   npm run verify-services
   ```

3. Check logs:
   ```bash
   # Next.js logs (in terminal)
   # Redis logs
   docker logs jetvision-redis
   ```

4. Review error messages carefully - they usually indicate exactly what's wrong

## Development Workflow

Recommended workflow:

```bash
# 1. Start Redis (once per session)
npm run redis:start

# 2. Verify services (after any config changes)
npm run verify-services

# 3. Start development server
npm run dev

# 4. Run tests in watch mode (separate terminal)
npm run test:watch

# 5. Before committing
npm run lint
npm run type-check
npm run test:coverage
```

Good luck with development! 🚀
