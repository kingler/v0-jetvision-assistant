# Environment Configuration & Prerequisites

**Task ID**: TASK-003
**Created**: 2025-10-20
**Assigned To**: DevOps / Backend Developer
**Status**: `pending`
**Priority**: `critical`
**Estimated Time**: 4 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Configure all required environment variables, set up external service accounts, and verify system prerequisites to enable development of the JetVision AI Assistant application.

### User Story
**As a** developer
**I want** all environment variables and external services properly configured
**So that** I can run the application locally and integrate with external APIs

### Business Value
Environment configuration is a prerequisite for all external integrations including Clerk authentication, Supabase database, OpenAI agents, and MCP servers. Without proper configuration, no feature can be developed or tested.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: Environment SHALL configure all required API keys
- Clerk (authentication)
- Supabase (database)
- OpenAI (AI agents)
- Redis (job queue)
- Gmail API (email delivery)
- Google Sheets API (client data)
- Avinode API (flight search)
- Sentry (error tracking)

**FR-2**: Environment variables SHALL be properly structured
- `.env.local` for local development
- `.env.example` template committed to version control
- Production variables configured in Vercel
- No secrets committed to git

**FR-3**: Service accounts SHALL be created and configured
- Clerk application with webhook
- Supabase project with API keys
- OpenAI account with API key
- Google Cloud project for Gmail and Sheets
- Sentry project for error tracking

**FR-4**: Verification script SHALL confirm all prerequisites
- Check all required environment variables
- Test API connections
- Verify service accessibility

### Acceptance Criteria

- [ ] **AC-1**: `.env.local` file created with all required variables
- [ ] **AC-2**: `.env.example` template committed to version control
- [ ] **AC-3**: Clerk application configured with correct domains
- [ ] **AC-4**: Supabase project created with database
- [ ] **AC-5**: OpenAI API key obtained and tested
- [ ] **AC-6**: Google Cloud project setup with Gmail and Sheets APIs enabled
- [ ] **AC-7**: OAuth credentials created for Google services
- [ ] **AC-8**: Sentry project created and DSN obtained
- [ ] **AC-9**: Redis connection tested (local or cloud)
- [ ] **AC-10**: Verification script runs successfully
- [ ] **AC-11**: Documentation updated with setup instructions

### Non-Functional Requirements

- **Security**: Secrets never committed to version control
- **Maintainability**: Clear documentation for each environment variable
- **Usability**: Simple setup process for new developers
- **Reliability**: Verification script catches missing configuration

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

Create a verification script that checks all environment variables and connections.

**Test Files to Create**:
```
scripts/verify-environment.ts
__tests__/integration/environment/config.test.ts
```

**Example Test (Write This First)**:
```typescript
// scripts/verify-environment.ts
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { Redis } from 'ioredis'

interface EnvCheckResult {
  name: string
  status: 'pass' | 'fail'
  message: string
}

const results: EnvCheckResult[] = []

function checkEnvVar(name: string, required = true): boolean {
  const value = process.env[name]
  const exists = !!value

  results.push({
    name,
    status: exists || !required ? 'pass' : 'fail',
    message: exists
      ? '✅ Set'
      : required
      ? '❌ Missing (required)'
      : '⚠️  Not set (optional)'
  })

  return exists
}

async function verifyEnvironment() {
  console.log('\n🔍 Verifying Environment Configuration...\n')

  // Check required environment variables
  console.log('📋 Environment Variables:\n')

  // Clerk
  checkEnvVar('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')
  checkEnvVar('CLERK_SECRET_KEY')
  checkEnvVar('CLERK_WEBHOOK_SECRET')

  // Supabase
  checkEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  checkEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  checkEnvVar('SUPABASE_SERVICE_KEY')

  // OpenAI
  checkEnvVar('OPENAI_API_KEY')

  // Redis
  checkEnvVar('REDIS_URL', false) // optional for local
  checkEnvVar('UPSTASH_REDIS_REST_URL', false)
  checkEnvVar('UPSTASH_REDIS_REST_TOKEN', false)

  // Google APIs
  checkEnvVar('GOOGLE_CLIENT_ID')
  checkEnvVar('GOOGLE_CLIENT_SECRET')
  checkEnvVar('GOOGLE_REFRESH_TOKEN')

  // Avinode
  checkEnvVar('AVINODE_API_KEY')
  checkEnvVar('AVINODE_API_URL')

  // Sentry
  checkEnvVar('SENTRY_DSN')
  checkEnvVar('SENTRY_ORG')
  checkEnvVar('SENTRY_PROJECT')

  // Print results
  results.forEach(({ name, status, message }) => {
    console.log(`  ${message} ${name}`)
  })

  // Test API connections
  console.log('\n🔌 Testing API Connections:\n')

  // Test Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      )
      const { error } = await supabase.from('users').select('count').limit(0)

      if (error) throw error
      console.log('  ✅ Supabase connection successful')
    } catch (error) {
      console.log('  ❌ Supabase connection failed:', (error as Error).message)
    }
  }

  // Test OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      await openai.models.list()
      console.log('  ✅ OpenAI connection successful')
    } catch (error) {
      console.log('  ❌ OpenAI connection failed:', (error as Error).message)
    }
  }

  // Test Redis
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  try {
    const redis = new Redis(redisUrl)
    await redis.ping()
    await redis.disconnect()
    console.log('  ✅ Redis connection successful')
  } catch (error) {
    console.log('  ❌ Redis connection failed:', (error as Error).message)
  }

  // Summary
  const failed = results.filter(r => r.status === 'fail').length
  const passed = results.filter(r => r.status === 'pass').length

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed\n`)

  if (failed > 0) {
    console.log('❌ Environment verification failed. Please configure missing variables.\n')
    process.exit(1)
  } else {
    console.log('✅ Environment verification passed! You\'re ready to develop.\n')
    process.exit(0)
  }
}

verifyEnvironment()
```

**Run Test** (should FAIL initially):
```bash
npx tsx scripts/verify-environment.ts
# Expected: Script reports missing environment variables
```

### Step 2: Implement Minimal Code (Green Phase)

Configure all required environment variables and services.

**Implementation Checklist**:
- [ ] Create service accounts
- [ ] Obtain API keys
- [ ] Create `.env.local` file
- [ ] Test connections

### Step 3: Refactor (Blue Phase)

Improve configuration documentation and scripts.

**Refactoring Checklist**:
- [ ] Add helpful comments to `.env.example`
- [ ] Create setup documentation
- [ ] Add troubleshooting guide

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

Before starting:
- [ ] Review PREREQUISITES_CHECKLIST.md
- [ ] Have access to create accounts on all required services
- [ ] Have admin rights for Google Cloud Console

### Step-by-Step Implementation

**Step 1**: Set Up Clerk Authentication

1. Sign up at https://clerk.com
2. Create new application "JetVision Assistant"
3. Configure allowed domains:
   - Add `http://localhost:3000` for development
   - Add production domain when available
4. Navigate to API Keys and copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
5. Create webhook endpoint:
   - URL: `https://your-domain.com/api/webhooks/clerk` (will setup later)
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy `CLERK_WEBHOOK_SECRET`

**Step 2**: Set Up Supabase Database

1. Sign up at https://supabase.com
2. Create new project "jetvision-assistant"
3. Wait for project provisioning (~2 minutes)
4. Navigate to Project Settings > API
5. Copy the following:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public)
   - `SUPABASE_SERVICE_KEY` (service_role secret)

**Step 3**: Set Up OpenAI API

1. Sign up at https://platform.openai.com
2. Navigate to API Keys
3. Create new API key "JetVision Assistant"
4. Copy `OPENAI_API_KEY`
5. Set usage limits (recommended: $50/month)

**Step 4**: Set Up Redis

**Option A: Local Redis (Development)**
```bash
# Install Redis via Docker
docker run -d \
  --name redis-jetvision \
  -p 6379:6379 \
  redis:latest

# Test connection
redis-cli ping
# Should return: PONG

# Set REDIS_URL in .env.local
REDIS_URL=redis://localhost:6379
```

**Option B: Upstash Redis (Production-like)**
1. Sign up at https://upstash.com
2. Create new Redis database
3. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

**Step 5**: Set Up Google Cloud APIs

1. Go to https://console.cloud.google.com
2. Create new project "jetvision-assistant"
3. Enable APIs:
   - Gmail API
   - Google Sheets API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
6. Generate refresh token (see script below)

**Generate Google Refresh Token**:
```typescript
// scripts/generate-google-refresh-token.ts
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/auth/callback/google'
)

const scopes = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/spreadsheets.readonly'
]

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes
})

console.log('Visit this URL to authorize:', url)
// Follow URL, authorize, get code from redirect
// Then exchange code for refresh token
```

**Step 6**: Set Up Avinode API

*Note: Avinode API access requires partnership. For development, use mock data.*

1. Contact Avinode for API access
2. Obtain API key
3. Set:
   - `AVINODE_API_KEY`
   - `AVINODE_API_URL` (usually `https://api.avinode.com/v1`)

**For development without Avinode access**:
```bash
AVINODE_API_KEY=mock_key_for_development
AVINODE_API_URL=http://localhost:3000/api/mock/avinode
```

**Step 7**: Set Up Sentry Error Tracking

1. Sign up at https://sentry.io
2. Create new project:
   - Platform: Next.js
   - Name: jetvision-assistant
3. Copy DSN from setup wizard
4. Set:
   - `SENTRY_DSN`
   - `SENTRY_ORG` (your organization name)
   - `SENTRY_PROJECT=jetvision-assistant`
   - `SENTRY_AUTH_TOKEN` (for CI/CD)

**Step 8**: Create Environment Files

Create `.env.local`:
```bash
# ============================================
# JetVision AI Assistant - Environment Variables
# ============================================

# --------------------------------------------
# Clerk Authentication
# --------------------------------------------
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# --------------------------------------------
# Supabase Database
# --------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_KEY=xxxxx

# --------------------------------------------
# OpenAI
# --------------------------------------------
OPENAI_API_KEY=sk-proj-xxxxx

# --------------------------------------------
# Redis (Choose one option)
# --------------------------------------------
# Option 1: Local Redis
REDIS_URL=redis://localhost:6379

# Option 2: Upstash Redis (Production)
# UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
# UPSTASH_REDIS_REST_TOKEN=xxxxx

# --------------------------------------------
# Google APIs (Gmail + Sheets)
# --------------------------------------------
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REFRESH_TOKEN=xxxxx

# --------------------------------------------
# Avinode API
# --------------------------------------------
AVINODE_API_KEY=xxxxx
AVINODE_API_URL=https://api.avinode.com/v1

# --------------------------------------------
# Sentry Error Tracking
# --------------------------------------------
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ORG=your-org
SENTRY_PROJECT=jetvision-assistant
SENTRY_AUTH_TOKEN=xxxxx

# --------------------------------------------
# Application Settings
# --------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Create `.env.example` (template for version control):
```bash
# Copy this file to .env.local and fill in your actual values

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
CLERK_WEBHOOK_SECRET=whsec_your_secret_here

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# OpenAI
OPENAI_API_KEY=sk-proj-your_key_here

# Redis
REDIS_URL=redis://localhost:6379

# Google APIs
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here

# Avinode API
AVINODE_API_KEY=your_api_key_here
AVINODE_API_URL=https://api.avinode.com/v1

# Sentry
SENTRY_DSN=your_dsn_here
SENTRY_ORG=your_org_here
SENTRY_PROJECT=jetvision-assistant
SENTRY_AUTH_TOKEN=your_token_here

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Step 9**: Add to .gitignore

Ensure `.gitignore` includes:
```
# Environment variables
.env
.env.local
.env*.local

# Secrets
*.pem
*.key
credentials.json
```

**Step 10**: Run Verification Script

```bash
# Install dependencies if needed
npm install ioredis openai @supabase/supabase-js

# Run verification
npx tsx scripts/verify-environment.ts

# Expected output:
# ✅ All environment variables set
# ✅ All API connections successful
```

### Implementation Validation

After each step, validate that:
- [ ] API keys are valid (test in service dashboard)
- [ ] `.env.local` has no syntax errors
- [ ] Environment variables load correctly (`process.env.VAR_NAME`)
- [ ] No secrets committed to git

---

## 5. GIT WORKFLOW

### Branch Creation

```bash
git checkout main
git pull origin main
git checkout -b feat/environment-configuration
```

### Commit Guidelines

```bash
# Add template and verification script
git add .env.example
git add scripts/verify-environment.ts
git add .gitignore
git commit -m "feat(env): add environment configuration template and verification script"

# Add documentation
git add docs/ENVIRONMENT_SETUP.md
git commit -m "docs(env): add environment setup guide"

# Push
git push origin feat/environment-configuration
```

**IMPORTANT**: Never commit `.env.local` or any file containing secrets!

### Pull Request Process

```bash
gh pr create --title "Feature: Environment Configuration & Prerequisites" \
  --body "Sets up environment variable configuration and verification tooling.

## Changes
- Created .env.example template
- Added verification script
- Updated .gitignore for secrets
- Documented setup process

## Setup Required
Each developer needs to:
1. Copy .env.example to .env.local
2. Fill in their API keys
3. Run verification script

Closes #TASK-003"
```

---

## 6. CODE REVIEW CHECKLIST

### Reviewer Checklist

**Security**:
- [ ] `.env.local` NOT committed to version control
- [ ] `.gitignore` properly configured for secrets
- [ ] `.env.example` contains NO actual secrets
- [ ] Documentation doesn't expose sensitive information

**Completeness**:
- [ ] All required services documented
- [ ] Verification script checks all variables
- [ ] Clear setup instructions provided
- [ ] Troubleshooting guide included

**Quality**:
- [ ] Verification script provides helpful error messages
- [ ] Environment variables well-organized and commented
- [ ] Documentation is clear for new developers

---

## 7. TESTING REQUIREMENTS

### Manual Testing

**Verification Steps**:
1. Delete `.env.local`
2. Copy `.env.example` to `.env.local`
3. Fill in actual API keys
4. Run verification script
5. All checks should pass

### Automated Testing

```bash
# Test verification script
npx tsx scripts/verify-environment.ts

# Should output:
# ✅ Environment verification passed!
```

---

## 8. DEFINITION OF DONE

### Code Complete
- [ ] `.env.example` template created and committed
- [ ] `.gitignore` updated for secrets
- [ ] Verification script implemented
- [ ] All service accounts created

### Testing Complete
- [ ] Verification script runs successfully
- [ ] All API connections tested
- [ ] Manual setup tested by another developer

### Documentation Complete
- [ ] Environment setup guide created
- [ ] Each variable explained in comments
- [ ] Troubleshooting section added
- [ ] README updated with setup link

### Code Review Complete
- [ ] Pull request created
- [ ] Security review completed
- [ ] At least 1 approval received

---

## 9. RESOURCES & REFERENCES

### Service Documentation
- [Clerk Setup](https://clerk.com/docs/quickstarts/nextjs)
- [Supabase Setup](https://supabase.com/docs/guides/getting-started)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Google Cloud OAuth](https://developers.google.com/identity/protocols/oauth2)
- [Sentry Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

### Related Tasks
- TASK-001: Clerk Authentication (uses Clerk env vars)
- TASK-002: Supabase Database (uses Supabase env vars)
- TASK-007: MCP Base Server (uses API keys)

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- Some API keys (like Avinode) may not be available immediately
- Use mock data or skip optional integrations during development
- Verification script allows optional variables for gradual setup

### Open Questions
- [ ] Should we use Upstash Redis for development or local?
- [ ] Do we need separate Sentry projects for staging/production?

### Assumptions
- Developers have ability to create accounts on external services
- Google Cloud project can be created without approval
- Avinode API access will be granted (or mock used)

### Risks/Blockers
- **Risk**: API key approval delays
  - **Mitigation**: Use mocks for unavailable services
- **Risk**: Secrets accidentally committed
  - **Mitigation**: Pre-commit hooks to check for secrets

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
*[Fill out after task completion]*

### Changes Made
*[List all files created/modified]*
- Created: `.env.example`
- Created: `scripts/verify-environment.ts`
- Created: `docs/ENVIRONMENT_SETUP.md`
- Updated: `.gitignore`

### Test Results
```
*[Paste verification script results]*
```

### Known Issues/Future Work
*[Document any issues]*

### Time Tracking
- **Estimated**: 4 hours
- **Actual**: - hours
- **Variance**: - hours

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -
