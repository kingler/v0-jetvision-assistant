# Environment Setup Guide

## Quick Start

1. **Copy the environment template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your credentials** (see sections below for how to obtain each)

3. **Run the verification script**:
   ```bash
   npx tsx scripts/verify-environment.ts
   ```

4. **Start developing** once all checks pass ✅

---

## Required Environment Variables

### Clerk Authentication

**Purpose**: User authentication and session management

**Setup**:
1. Sign up at https://clerk.com
2. Create new application "Jetvision Assistant"
3. Configure domains:
   - Add `http://localhost:3000` for development
4. Navigate to **API Keys** and copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

**Variables**:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...  # Optional for now
```

---

### Supabase Database

**Purpose**: PostgreSQL database with real-time subscriptions

**Setup**:
1. Sign up at https://supabase.com
2. Create new project "jetvision-assistant"
3. Wait for provisioning (~2 minutes)
4. Navigate to **Project Settings > API**
5. Copy all three keys

**Variables**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_KEY=eyJh...  # Keep this secret!
```

---

### OpenAI API

**Purpose**: AI agents and language models

**Setup**:
1. Sign up at https://platform.openai.com
2. Navigate to **API Keys**
3. Create new key "Jetvision Assistant"
4. Set usage limits (recommended: $50/month)

**Variables**:
```bash
OPENAI_API_KEY=sk-proj-...
OPENAI_ORGANIZATION_ID=org-...  # Optional
```

---

### Redis

**Purpose**: Job queue and caching for BullMQ

**Option A: Local Redis (Recommended for Development)**

```bash
# Install via Docker
docker run -d --name redis-jetvision -p 6379:6379 redis:latest

# Test connection
docker exec redis-jetvision redis-cli ping
# Should return: PONG
```

**Variables**:
```bash
REDIS_URL=redis://localhost:6379
```

**Option B: Upstash Redis (Production-like)**

1. Sign up at https://upstash.com
2. Create new Redis database
3. Copy the REST URL and token

**Variables**:
```bash
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
```

---

## Optional Environment Variables

### Google APIs (Gmail + Sheets)

**Purpose**: Send emails and read client data from Google Sheets

**Setup**:
1. Go to https://console.cloud.google.com
2. Create project "jetvision-assistant"
3. Enable APIs:
   - Gmail API
   - Google Sheets API
4. Create **OAuth 2.0 credentials**:
   - Type: Web application
   - Redirect URI: `http://localhost:3000/api/auth/callback/google`

**Variables**:
```bash
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REFRESH_TOKEN=xxxxx  # Generate using OAuth flow
```

---

### Avinode API

**Purpose**: Flight search and RFP creation

**For Development** (use mock):
```bash
AVINODE_API_KEY=mock_key_for_development
AVINODE_API_URL=http://localhost:3000/api/mock/avinode
```

**For Production** (requires partnership):
```bash
AVINODE_API_KEY=your_actual_key
AVINODE_API_URL=https://api.avinode.com/v1
```

---

### Sentry Error Tracking

**Purpose**: Production error monitoring and alerting

**Setup**:
1. Sign up at https://sentry.io
2. Create project:
   - Platform: Next.js
   - Name: jetvision-assistant
3. Copy DSN from setup wizard

**Variables**:
```bash
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ORG=your-org
SENTRY_PROJECT=jetvision-assistant
```

---

## Application Settings

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## Security Best Practices

### ✅ DO

- Keep `.env.local` in `.gitignore`
- Use different keys for development/production
- Rotate API keys periodically
- Set usage limits on paid APIs
- Use environment-specific Clerk/Supabase projects

### ❌ DON'T

- Commit `.env.local` to version control
- Share API keys in Slack/email
- Use production keys in development
- Store secrets in code or comments
- Give service keys to client-side code

---

## Troubleshooting

### "Environment verification failed"

Run the verification script to see which variables are missing:
```bash
npx tsx scripts/verify-environment.ts
```

### "Supabase connection failed"

1. Check your project URL is correct
2. Verify the service key has proper permissions
3. Ensure your IP is allowed (Supabase → Settings → Database → Connection String)

### "OpenAI connection failed"

1. Check API key is valid
2. Verify you have billing set up
3. Check usage limits haven't been exceeded

### "Redis connection failed"

**Local Redis**:
```bash
# Check if Redis is running
docker ps | grep redis

# Start Redis if stopped
docker start redis-jetvision
```

**Upstash**:
- Verify URL and token are correct
- Check database isn't paused

---

## Next Steps

Once environment is configured:

1. ✅ Run verification: `npx tsx scripts/verify-environment.ts`
2. ✅ Start development: `npm run dev`
3. ✅ Continue with [TASK-001: Clerk Authentication](../tasks/backlog/TASK-001-clerk-authentication-integration.md)

---

## Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google Cloud OAuth](https://developers.google.com/identity/protocols/oauth2)
- [Sentry Next.js Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
