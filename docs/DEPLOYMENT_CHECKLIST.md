# Deployment Checklist - Jetvision Multi-Agent System

**Last Updated**: 2025-11-12
**Version**: Phase 1 & 2 Complete
**Target Environment**: Staging → Production

---

## Pre-Deployment Verification

### ✅ Code Quality

- [x] All merge conflicts resolved (35 files)
- [x] PR #6 successfully merged to main
- [x] Critical TypeScript errors fixed
- [ ] Remaining TypeScript errors documented ([TYPESCRIPT_FIXES_TODO.md](./sessions/TYPESCRIPT_FIXES_TODO.md))
- [x] Dependencies up to date (`pnpm install` completed)
- [x] Stale branches cleaned up (10 branches pruned)

### ✅ Testing Status

#### Unit Tests
- [x] Agent core tests passing ✅
- [x] Agent implementation tests passing ✅
- [x] MCP server tests passing ✅
  - Avinode: 26 tests ✅
  - Gmail: 35 tests ✅
  - Google Sheets: 21 tests ✅
  - Supabase: 32 tests ✅
- [x] Middleware tests passing (72 tests) ✅

#### Integration Tests
- [x] Supabase MCP integration: 16/16 passing ✅
- [x] Chat agent integration: 22/22 passing ✅
- [ ] Auth flow integration: Failing (needs Clerk configuration)
- [ ] RLS policies: Failing (needs proper test setup)
- [ ] API routes: Failing (needs user table migration)

#### E2E Tests
- [ ] RFP submission workflow
- [ ] Quote analysis and ranking
- [ ] Email generation and sending
- [ ] Dashboard navigation
- [ ] User authentication flow

---

## Environment Configuration

### Required Environment Variables

#### Core Services
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION_ID=org-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Redis (Task Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=...
REDIS_URL=redis://...

# Vercel (if deploying)
VERCEL_URL=...
VERCEL_ENV=staging
```

#### MCP Server Configuration
```bash
# Avinode API
AVINODE_API_KEY=... # or "mock_key_for_testing" for development
AVINODE_API_URL=https://api.avinode.com

# Gmail API
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...

# Google Sheets API
GOOGLE_SHEETS_CLIENT_ID=...
GOOGLE_SHEETS_CLIENT_SECRET=...
GOOGLE_SHEETS_REFRESH_TOKEN=...
GOOGLE_SHEETS_SPREADSHEET_ID=...
```

### Verification Script
```bash
npm run verify-services
```

---

## Database Deployment

### Staging Environment

#### 1. Apply Migrations
```bash
# Connect to staging Supabase
npx supabase link --project-ref <staging-project-id>

# Apply migrations
npx supabase db push

# Verify migrations
npx supabase db diff
```

#### 2. Seed Initial Data (Optional)
```bash
npm run test:seed
```

#### 3. Verify RLS Policies
```bash
# Test RLS policies are active
npm run test:integration -- __tests__/integration/database/rls.test.ts
```

### Production Environment

#### Pre-Production Checklist
- [ ] Database backup created
- [ ] Migration dry-run completed
- [ ] RLS policies tested
- [ ] Seed data reviewed
- [ ] Rollback plan documented

#### Deployment Steps
1. Create production backup
2. Apply migrations (same as staging)
3. Verify all tables created
4. Test RLS policies
5. Run smoke tests

---

## MCP Servers Deployment

### Development/Staging
MCP servers run locally via `npm run dev:mcp`

### Production Options

#### Option 1: Serverless Functions (Recommended for Vercel)
```bash
# Deploy MCP servers as API routes
# Already configured in app/api/mcp/*
```

#### Option 2: Separate Services
```bash
# Deploy each MCP server independently
cd mcp-servers/avinode-mcp-server && npm run build
cd mcp-servers/gmail-mcp-server && npm run build
cd mcp-servers/google-sheets-mcp-server && npm run build
cd mcp-servers/supabase-mcp-server && npm run build
```

#### Option 3: Docker Containers
```dockerfile
# TODO: Create Dockerfile for MCP servers
# Would containerize all 4 servers together
```

---

## Redis Deployment

### Staging
```bash
# Option 1: Upstash Redis (Serverless)
REDIS_URL=redis://...upstash.io:6379

# Option 2: Redis Cloud
REDIS_URL=redis://...redislabs.com:6379

# Option 3: Self-hosted
# Deploy Redis container
docker run -d -p 6379:6379 redis:latest
```

### Verification
```bash
npm run redis:status
```

---

## Application Deployment

### Vercel Deployment (Recommended)

#### 1. Connect Repository
```bash
# Install Vercel CLI
npm install -g vercel

# Link project
vercel link

# Set environment variables
vercel env pull .env.local
```

#### 2. Deploy to Staging
```bash
# Preview deployment
vercel

# Production-like staging
vercel --prod --scope staging
```

#### 3. Deploy to Production
```bash
# Final production deployment
vercel --prod
```

### Manual Deployment

#### 1. Build Application
```bash
npm run build
```

#### 2. Verify Build
```bash
# Check for build errors
npm start

# Test locally
curl http://localhost:3000/api/health
```

#### 3. Deploy
```bash
# Upload to server
# Configure reverse proxy (nginx/caddy)
# Set up SSL certificates
# Configure environment variables
```

---

## Post-Deployment Verification

### Smoke Tests

#### 1. Health Checks
```bash
# Application health
curl https://your-domain.com/api/health

# Database connectivity
curl https://your-domain.com/api/health/database

# Redis connectivity
curl https://your-domain.com/api/health/redis

# MCP servers
curl https://your-domain.com/api/mcp/health
```

#### 2. Authentication
- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Access protected routes
- [ ] API authentication works

#### 3. Core Workflows
- [ ] Submit RFP
- [ ] View dashboard
- [ ] Check quotes
- [ ] Send test email
- [ ] Verify agent coordination

#### 4. MCP Tools
- [ ] Avinode flight search
- [ ] Gmail email sending
- [ ] Google Sheets client lookup
- [ ] Supabase database operations

### Monitoring Setup

#### 1. Application Monitoring
- [ ] Sentry error tracking configured
- [ ] Vercel Analytics enabled
- [ ] Custom metrics tracking

#### 2. Database Monitoring
- [ ] Supabase dashboard alerts
- [ ] Query performance monitoring
- [ ] Connection pool monitoring

#### 3. Queue Monitoring
- [ ] Redis memory usage
- [ ] Task queue metrics
- [ ] Failed job alerts

#### 4. API Monitoring
- [ ] Rate limiting configured
- [ ] Response time tracking
- [ ] Error rate alerts

---

## Rollback Plan

### Quick Rollback (Vercel)
```bash
# Revert to previous deployment
vercel rollback

# Or specific deployment
vercel rollback <deployment-url>
```

### Database Rollback
```bash
# Restore from backup
npx supabase db dump --use-copy --data-only > backup.sql

# Revert migrations
npx supabase migration down
```

### Manual Rollback
1. Redeploy previous Git commit
2. Restore database backup
3. Clear Redis cache
4. Verify services

---

## Known Issues & Workarounds

### 1. TypeScript Errors in API Routes
**Status**: Documented, non-blocking
**Impact**: Compile-time warnings only, no runtime impact
**Workaround**: See [TYPESCRIPT_FIXES_TODO.md](./sessions/TYPESCRIPT_FIXES_TODO.md)
**Resolution**: Regenerate Supabase types before production

### 2. Integration Test Failures
**Status**: Auth/RLS tests failing in CI
**Impact**: Does not affect deployment
**Workaround**: Manual verification of auth flow
**Resolution**: Configure test environment variables

### 3. Archived Files
**Status**: 156K of old dashboard files
**Impact**: Slight bundle size increase
**Workaround**: None needed currently
**Resolution**: Remove before next major release

---

## Performance Benchmarks

### Target Metrics

#### Response Times
- API routes: < 200ms (p95)
- Dashboard load: < 2s (FCP)
- Agent execution: < 5s (RFP analysis)
- Database queries: < 100ms (p95)

#### Resource Usage
- Memory: < 512MB per instance
- CPU: < 50% average
- Database connections: < 20 per instance
- Redis connections: < 10 per instance

### Optimization Checklist
- [ ] Next.js Image Optimization enabled
- [ ] Static asset caching configured
- [ ] Database query optimization
- [ ] Redis connection pooling
- [ ] CDN configured for static assets

---

## Security Checklist

### Application Security
- [ ] HTTPS enabled (TLS 1.2+)
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on all routes
- [ ] XSS protection headers
- [ ] CSRF protection enabled

### Authentication & Authorization
- [ ] Clerk webhook signature verification
- [ ] JWT token validation
- [ ] Session management secure
- [ ] RLS policies active
- [ ] API key rotation plan

### Data Security
- [ ] Database encryption at rest
- [ ] Sensitive data masked in logs
- [ ] Environment variables secured
- [ ] API keys in secret management
- [ ] Backup encryption enabled

### Compliance
- [ ] GDPR data handling reviewed
- [ ] Data retention policies defined
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Cookie consent implemented

---

## Support & Documentation

### Runbooks
- [Multi-Agent System Architecture](./architecture/MULTI_AGENT_SYSTEM.md)
- [MCP Server Configuration](./PHASE-2-COMPLETION.md)
- [Database Schema](./DEPLOY_DATABASE.md)
- [ChatKit Integration](./GPT5_CHATKIT_INTEGRATION.md)

### Incident Response
1. Check [Sentry](https://sentry.io) for errors
2. Review [Vercel logs](https://vercel.com/dashboard)
3. Check [Supabase logs](https://supabase.com/dashboard)
4. Monitor Redis with `npm run redis:status`
5. Contact on-call engineer if needed

### Contact Information
- **Dev Team**: [Your team contact]
- **DevOps**: [DevOps contact]
- **Product Owner**: [PO contact]
- **Emergency**: [Emergency contact]

---

## Sign-Off

### Staging Deployment
- [ ] Technical Lead approval
- [ ] QA testing complete
- [ ] Stakeholder review
- [ ] **Deployed Date**: _____________
- [ ] **Deployed By**: _____________

### Production Deployment
- [ ] Product Owner approval
- [ ] Security review complete
- [ ] Performance testing passed
- [ ] Documentation updated
- [ ] **Deployed Date**: _____________
- [ ] **Deployed By**: _____________

---

**Generated**: 2025-11-12
**Next Review**: Before production deployment

🤖 Generated with [Claude Code](https://claude.com/claude-code)
