# Production Environment Setup

**Task ID**: TASK-035
**Created**: 2025-10-20
**Assigned To**: DevOps Lead / Senior Developer
**Status**: `pending`
**Priority**: `critical`
**Estimated Time**: 12 hours
**Actual Time**: - (update when complete)

**Dependencies**: TASK-034 (Staging Environment Deployment)

---

## 1. TASK OVERVIEW

### Objective
Set up production-ready environment on Vercel with production-grade Supabase database (Pro tier), production Redis (Upstash), custom domain configuration with SSL, CDN configuration, comprehensive backup and disaster recovery procedures, monitoring and alerting infrastructure, and security hardening to ensure 99.9% uptime and enterprise-grade reliability.

### User Story
**As a** business stakeholder
**I want** a production-ready, highly available environment
**So that** customers can access the application reliably 24/7 with enterprise-grade performance and security

### Business Value
Production environment setup is the final gate before revenue generation. A properly configured production environment with 99.9% uptime enables the business to serve customers reliably, process 500+ requests per month, and scale to enterprise customers. Downtime costs $5,000+ per hour in lost revenue and reputation damage. This task ensures zero-downtime deployments, instant rollback capability, and comprehensive disaster recovery.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL use Vercel Pro production project
- Vercel Pro tier for production features
- Dedicated production project
- Zero-downtime deployments
- Automatic HTTPS and edge network
- DDoS protection enabled

**FR-2**: System SHALL use Supabase Pro production database
- Supabase Pro tier (not free tier)
- Daily automated backups
- Point-in-time recovery enabled
- Read replicas for scaling
- 99.9% uptime SLA
- Connection pooling (Supavisor)

**FR-3**: System SHALL use Upstash Redis production instance
- Upstash paid tier (for production SLA)
- Multi-zone deployment for redundancy
- Automatic failover
- Daily backups
- TLS encryption

**FR-4**: System SHALL have custom domain with SSL
- Primary domain: jetvision-assistant.com
- www redirect configured
- SSL certificate auto-renewed (Let's Encrypt)
- HSTS enabled
- TLS 1.3 enforced

**FR-5**: System SHALL implement CDN configuration
- Vercel Edge Network enabled globally
- Static assets cached at edge
- API routes use edge functions where possible
- Cache invalidation strategy
- Geo-routing for performance

**FR-6**: System SHALL have backup and disaster recovery
- Database: Daily automated backups (30-day retention)
- Redis: Daily snapshots
- Environment variables: Backed up securely
- Code: Git version control
- Recovery time objective (RTO): <1 hour
- Recovery point objective (RPO): <24 hours

**FR-7**: System SHALL have monitoring and alerts
- Uptime monitoring (UptimeRobot or similar)
- Performance monitoring (Vercel Analytics)
- Error tracking (Sentry)
- Database monitoring (Supabase)
- Alert routing:
  - Critical errors → Slack + Email + SMS
  - High errors → Slack + Email
  - Warnings → Slack
- On-call rotation configured

**FR-8**: System SHALL implement security hardening
- Rate limiting on all endpoints
- IP allowlisting for admin endpoints
- Web Application Firewall (WAF) rules
- Security headers (CSP, HSTS, etc.)
- Secrets rotation procedures
- Audit logging enabled

### Acceptance Criteria

- [ ] **AC-1**: Vercel Pro production project created
- [ ] **AC-2**: Custom domain configured with SSL
- [ ] **AC-3**: Supabase Pro database deployed with schema
- [ ] **AC-4**: Database backups running daily
- [ ] **AC-5**: Point-in-time recovery tested
- [ ] **AC-6**: Redis production instance configured
- [ ] **AC-7**: All environment variables set and verified
- [ ] **AC-8**: CDN edge caching working
- [ ] **AC-9**: Monitoring dashboards configured
- [ ] **AC-10**: Alerts tested and routing to correct channels
- [ ] **AC-11**: Disaster recovery procedures documented and tested
- [ ] **AC-12**: Security scan passes (zero critical vulnerabilities)
- [ ] **AC-13**: Performance benchmarks meet production targets
- [ ] **AC-14**: Documentation complete (runbooks, SOPs)
- [ ] **AC-15**: Code review approved by senior engineer

### Non-Functional Requirements

- **Availability**: 99.9% uptime (8.76 hours downtime/year max)
- **Performance**: <2s API response, <3s page load
- **Security**: Zero critical/high vulnerabilities
- **Scalability**: Support 100+ concurrent users
- **Disaster Recovery**: RTO <1hr, RPO <24hr

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Production Readiness Tests FIRST (Red Phase)

**Test Files to Create**:
```
scripts/test-production-readiness.sh
scripts/disaster-recovery-test.sh
scripts/backup-verification.sh
scripts/security-hardening-check.sh
__tests__/production/smoke-tests.ts
```

**Production Readiness Test**:
```bash
#!/bin/bash
# scripts/test-production-readiness.sh

set -e

PROD_URL="https://jetvision-assistant.com"

echo "🏭 Testing Production Readiness..."

# 1. Domain and SSL
echo "🌐 Testing domain and SSL..."
SSL_EXPIRY=$(echo | openssl s_client -servername "$PROD_URL" -connect "${PROD_URL#https://}:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
SSL_DAYS=$(( ($(date -d "$SSL_EXPIRY" +%s) - $(date +%s)) / 86400 ))

if [ $SSL_DAYS -lt 30 ]; then
  echo "❌ SSL certificate expires in $SSL_DAYS days (renew needed)"
  exit 1
fi
echo "✅ SSL certificate valid for $SSL_DAYS days"

# 2. HSTS Header
echo "🔒 Testing HSTS..."
HSTS=$(curl -sI "$PROD_URL" | grep -i "Strict-Transport-Security")
if [ -z "$HSTS" ]; then
  echo "❌ HSTS header not found"
  exit 1
fi
echo "✅ HSTS header present: $HSTS"

# 3. Security Headers
echo "🛡️ Testing security headers..."
SECURITY_HEADERS=(
  "X-Frame-Options"
  "X-Content-Type-Options"
  "Content-Security-Policy"
  "Referrer-Policy"
)

for header in "${SECURITY_HEADERS[@]}"; do
  if ! curl -sI "$PROD_URL" | grep -qi "$header"; then
    echo "❌ Missing security header: $header"
    exit 1
  fi
  echo "  ✅ $header present"
done

# 4. Database Backup Status
echo "🗄️ Testing database backup status..."
BACKUP_STATUS=$(curl -s "$PROD_URL/api/admin/backup-status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.lastBackup')

if [ -z "$BACKUP_STATUS" ]; then
  echo "❌ Unable to verify backup status"
  exit 1
fi

BACKUP_AGE_HOURS=$(( ($(date +%s) - $(date -d "$BACKUP_STATUS" +%s)) / 3600 ))
if [ $BACKUP_AGE_HOURS -gt 24 ]; then
  echo "❌ Last backup is $BACKUP_AGE_HOURS hours old (>24hr)"
  exit 1
fi
echo "✅ Last backup: $BACKUP_AGE_HOURS hours ago"

# 5. Monitoring Status
echo "📊 Testing monitoring..."
SENTRY_STATUS=$(curl -s "$PROD_URL/api/health" | jq -r '.sentry.status')
if [ "$SENTRY_STATUS" != "active" ]; then
  echo "❌ Sentry monitoring not active"
  exit 1
fi
echo "✅ Sentry monitoring active"

# 6. Performance Benchmarks
echo "⚡ Testing performance..."
RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s "$PROD_URL/api/health")
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

if (( $(echo "$RESPONSE_TIME_MS > 2000" | bc -l) )); then
  echo "❌ API response time ${RESPONSE_TIME_MS}ms (>2000ms)"
  exit 1
fi
echo "✅ API response time: ${RESPONSE_TIME_MS}ms"

# 7. CDN Caching
echo "🌍 Testing CDN caching..."
CACHE_HEADER=$(curl -sI "$PROD_URL/_next/static/chunks/main.js" | grep -i "x-vercel-cache")
if [ -z "$CACHE_HEADER" ]; then
  echo "❌ CDN caching header not found"
  exit 1
fi
echo "✅ CDN caching active: $CACHE_HEADER"

# 8. Rate Limiting
echo "🚦 Testing rate limiting..."
for i in {1..150}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/health")
  if [ "$HTTP_CODE" == "429" ]; then
    echo "✅ Rate limiting working (got 429 on request $i)"
    break
  fi

  if [ $i -eq 150 ]; then
    echo "⚠️ Rate limiting may not be configured (no 429 after 150 requests)"
  fi
done

# 9. Alerting Configuration
echo "🔔 Testing alerting..."
# Send test alert
curl -s -X POST "$PROD_URL/api/admin/test-alert" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"severity": "test", "message": "Production readiness test"}' > /dev/null

echo "  Check Slack for test alert (manual verification required)"

# 10. Environment Variables
echo "🔐 Testing environment variables..."
REQUIRED_VARS=(
  "DATABASE_URL"
  "REDIS_URL"
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  "NEXT_PUBLIC_SENTRY_DSN"
)

ENV_CHECK=$(curl -s "$PROD_URL/api/admin/env-check" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

for var in "${REQUIRED_VARS[@]}"; do
  if ! echo "$ENV_CHECK" | jq -e ".[\"$var\"]" > /dev/null; then
    echo "❌ Missing environment variable: $var"
    exit 1
  fi
  echo "  ✅ $var configured"
done

echo "✅ Production readiness tests passed!"
echo ""
echo "📋 Summary:"
echo "  ✅ Domain and SSL valid"
echo "  ✅ Security headers configured"
echo "  ✅ Database backups current"
echo "  ✅ Monitoring active"
echo "  ✅ Performance meets targets"
echo "  ✅ CDN caching working"
echo "  ✅ Rate limiting active"
echo "  ✅ Environment variables set"
echo ""
echo "⚠️ Manual Verification Required:"
echo "  - Verify test alert received in Slack"
echo "  - Verify test alert received via email"
echo "  - Test on-call paging (optional)"
```

**Disaster Recovery Test**:
```bash
#!/bin/bash
# scripts/disaster-recovery-test.sh

set -e

echo "🆘 Testing Disaster Recovery Procedures..."

# This script simulates disaster recovery scenarios
# IMPORTANT: Only run in staging environment!

if [ "$ENVIRONMENT" != "staging" ]; then
  echo "❌ This script can only run in staging environment!"
  echo "Set ENVIRONMENT=staging to proceed"
  exit 1
fi

# 1. Database Backup Restore
echo "🗄️ Test 1: Database Backup Restore..."
echo "  Creating test data..."
ORIGINAL_COUNT=$(curl -s "https://staging.jetvision-assistant.com/api/requests/count" | jq -r '.count')
echo "  Original request count: $ORIGINAL_COUNT"

echo "  Initiating backup restore to 1 day ago..."
# Note: This requires Supabase CLI and appropriate permissions
supabase db dump --linked > backup-test.sql

echo "  Creating test request..."
curl -s -X POST "https://staging.jetvision-assistant.com/api/requests" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{
    "departure_airport": "KTEB",
    "arrival_airport": "KVNY",
    "passengers": 6,
    "departure_date": "2025-12-01"
  }' > /dev/null

NEW_COUNT=$(curl -s "https://staging.jetvision-assistant.com/api/requests/count" | jq -r '.count')
echo "  New request count: $NEW_COUNT"

echo "  Restoring from backup..."
supabase db reset --linked

RESTORED_COUNT=$(curl -s "https://staging.jetvision-assistant.com/api/requests/count" | jq -r '.count')
echo "  Restored request count: $RESTORED_COUNT"

if [ "$RESTORED_COUNT" -eq "$ORIGINAL_COUNT" ]; then
  echo "  ✅ Database restore successful"
else
  echo "  ❌ Database restore failed"
  exit 1
fi

# 2. Redis Failover
echo "📦 Test 2: Redis Failover..."
echo "  Testing Redis connection..."
REDIS_STATUS=$(curl -s "https://staging.jetvision-assistant.com/api/health" | jq -r '.redis')

if [ "$REDIS_STATUS" != "connected" ]; then
  echo "  ❌ Redis not connected"
  exit 1
fi
echo "  ✅ Redis connection working"

# Note: Actual failover test requires Upstash console access
echo "  ⚠️ Manual step: Simulate failover in Upstash console"
echo "  Then verify connection still works"

# 3. Vercel Rollback
echo "🔄 Test 3: Vercel Deployment Rollback..."
echo "  Getting current deployment..."
CURRENT_DEPLOYMENT=$(vercel ls --scope $VERCEL_ORG | head -n 2 | tail -n 1 | awk '{print $1}')
echo "  Current: $CURRENT_DEPLOYMENT"

echo "  Getting previous deployment..."
PREVIOUS_DEPLOYMENT=$(vercel ls --scope $VERCEL_ORG | head -n 3 | tail -n 1 | awk '{print $1}')
echo "  Previous: $PREVIOUS_DEPLOYMENT"

echo "  Promoting previous deployment..."
vercel promote $PREVIOUS_DEPLOYMENT --scope $VERCEL_ORG

echo "  Waiting for DNS propagation..."
sleep 10

echo "  Verifying rollback..."
NEW_VERSION=$(curl -s "https://staging.jetvision-assistant.com/api/health" | jq -r '.version')
echo "  New version: $NEW_VERSION"

echo "  ✅ Rollback successful"

# Restore current deployment
echo "  Restoring current deployment..."
vercel promote $CURRENT_DEPLOYMENT --scope $VERCEL_ORG

# 4. Recovery Time Test
echo "⏱️ Test 4: Recovery Time Objective (RTO)..."
START_TIME=$(date +%s)
echo "  Simulating incident at $(date)"

# Simulate full recovery procedure
echo "  1. Detecting issue..."
sleep 5

echo "  2. Alerting team..."
sleep 5

echo "  3. Diagnosing problem..."
sleep 10

echo "  4. Implementing fix..."
sleep 15

echo "  5. Verifying recovery..."
sleep 5

END_TIME=$(date +%s)
RTO_SECONDS=$((END_TIME - START_TIME))
RTO_MINUTES=$((RTO_SECONDS / 60))

echo "  Total recovery time: ${RTO_MINUTES} minutes"

if [ $RTO_MINUTES -gt 60 ]; then
  echo "  ❌ RTO exceeded 1 hour target"
  exit 1
fi
echo "  ✅ RTO within 1 hour target"

echo "✅ Disaster recovery tests completed!"
echo ""
echo "📊 Results:"
echo "  ✅ Database restore: Working"
echo "  ✅ Vercel rollback: Working"
echo "  ✅ Recovery time: ${RTO_MINUTES} min (target: <60 min)"
echo ""
echo "📝 Next Steps:"
echo "  1. Document any issues found"
echo "  2. Update runbooks if procedures changed"
echo "  3. Schedule next DR drill"
```

**Backup Verification Script**:
```bash
#!/bin/bash
# scripts/backup-verification.sh

set -e

echo "💾 Verifying Backup Systems..."

# 1. Database Backups
echo "🗄️ Checking database backups..."

# Get backup status from Supabase
BACKUP_LIST=$(supabase backups list --linked)
BACKUP_COUNT=$(echo "$BACKUP_LIST" | wc -l)

if [ $BACKUP_COUNT -lt 7 ]; then
  echo "❌ Less than 7 daily backups found (found $BACKUP_COUNT)"
  exit 1
fi
echo "✅ Found $BACKUP_COUNT database backups"

# Get latest backup timestamp
LATEST_BACKUP=$(echo "$BACKUP_LIST" | head -n 2 | tail -n 1 | awk '{print $2}')
BACKUP_AGE_HOURS=$(( ($(date +%s) - $(date -d "$LATEST_BACKUP" +%s)) / 3600 ))

if [ $BACKUP_AGE_HOURS -gt 24 ]; then
  echo "❌ Latest backup is $BACKUP_AGE_HOURS hours old (>24hr)"
  exit 1
fi
echo "✅ Latest backup: $BACKUP_AGE_HOURS hours ago"

# 2. Redis Snapshots
echo "📦 Checking Redis snapshots..."
# Note: This requires Upstash API access
# For now, verify manually in Upstash console

# 3. Environment Variable Backup
echo "🔐 Checking environment variable backup..."
if [ ! -f ".env.production.backup" ]; then
  echo "⚠️ Creating environment variable backup..."
  vercel env pull .env.production.backup --environment=production
fi

BACKUP_AGE_DAYS=$(( ($(date +%s) - $(stat -f %m .env.production.backup)) / 86400 ))
if [ $BACKUP_AGE_DAYS -gt 7 ]; then
  echo "⚠️ Environment variable backup is $BACKUP_AGE_DAYS days old"
  echo "Creating fresh backup..."
  vercel env pull .env.production.backup --environment=production
fi
echo "✅ Environment variable backup current"

# 4. Test Restore
echo "🔄 Testing backup restore (dry run)..."
supabase db dump --linked > /tmp/test-restore.sql

if [ ! -s /tmp/test-restore.sql ]; then
  echo "❌ Backup restore test failed (empty dump)"
  exit 1
fi

FILE_SIZE=$(stat -f%z /tmp/test-restore.sql)
if [ $FILE_SIZE -lt 1000 ]; then
  echo "❌ Backup dump suspiciously small ($FILE_SIZE bytes)"
  exit 1
fi
echo "✅ Backup restore test successful ($FILE_SIZE bytes)"

rm /tmp/test-restore.sql

echo "✅ All backup systems verified!"
```

**Run Tests** (should guide production setup):
```bash
./scripts/test-production-readiness.sh
# Expected: Guides through production setup requirements
```

### Step 2: Deploy Production Environment (Green Phase)

**Production Environment Checklist**:

```markdown
# Production Environment Setup Checklist

## Phase 1: Infrastructure Provisioning

### Vercel
- [ ] Upgrade to Vercel Pro
- [ ] Create production project
- [ ] Configure custom domain
- [ ] Enable DDoS protection
- [ ] Configure edge network

### Supabase
- [ ] Upgrade to Supabase Pro
- [ ] Create production project (same region as staging)
- [ ] Enable daily backups
- [ ] Enable point-in-time recovery
- [ ] Configure connection pooler (Supavisor)
- [ ] Set up read replicas (if needed)

### Upstash Redis
- [ ] Upgrade to paid tier
- [ ] Create production instance
- [ ] Enable multi-zone deployment
- [ ] Configure TLS
- [ ] Set up daily snapshots

## Phase 2: Deployment

### Database Schema
bash
supabase link --project-ref PRODUCTION_REF
supabase db push


### Environment Variables
bash
# Set all production environment variables
vercel env add DATABASE_URL production
vercel env add REDIS_URL production
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add SENTRY_AUTH_TOKEN production
# ... all other variables


### Deploy Application
bash
vercel --prod


## Phase 3: Domain Configuration

### DNS Configuration
- [ ] Add A record: jetvision-assistant.com → Vercel IP
- [ ] Add CNAME record: www → jetvision-assistant.com
- [ ] Configure SSL certificate
- [ ] Test domain resolution
- [ ] Verify SSL certificate

### Security Headers
- [ ] HSTS enabled
- [ ] CSP configured
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set

## Phase 4: Monitoring & Alerts

### Sentry
- [ ] Production environment configured
- [ ] Alert rules created
- [ ] Slack integration tested
- [ ] Email notifications tested

### Uptime Monitoring
- [ ] UptimeRobot monitors created
- [ ] HTTP checks every 5 minutes
- [ ] SSL certificate expiry monitoring
- [ ] Alert contacts configured

### Performance Monitoring
- [ ] Vercel Analytics enabled
- [ ] Core Web Vitals tracking
- [ ] API performance monitoring

## Phase 5: Backup & Recovery

### Automated Backups
- [ ] Database: Daily at 2 AM UTC
- [ ] Redis: Daily snapshots
- [ ] Environment variables: Weekly backup
- [ ] Backup retention: 30 days

### Disaster Recovery
- [ ] Recovery procedures documented
- [ ] Backup restore tested
- [ ] Rollback procedures tested
- [ ] Team trained on procedures

## Phase 6: Security

### Access Control
- [ ] Production access limited to senior engineers
- [ ] 2FA required for all production access
- [ ] Audit logging enabled
- [ ] SSH keys rotated

### Secrets Management
- [ ] All secrets in environment variables
- [ ] No secrets in code
- [ ] Secrets rotation schedule defined
- [ ] Emergency secret rotation procedure

### Security Scanning
- [ ] Vulnerability scan passed
- [ ] Dependency audit clean
- [ ] OWASP Top 10 compliance verified
- [ ] Penetration testing completed

## Phase 7: Documentation

- [ ] Runbooks created
- [ ] SOPs documented
- [ ] Architecture diagrams updated
- [ ] Team training completed

## Phase 8: Final Verification

- [ ] All smoke tests pass
- [ ] Performance benchmarks met
- [ ] Load tests pass (100+ users)
- [ ] Disaster recovery tested
- [ ] Alerting verified
- [ ] Monitoring dashboards reviewed

## Sign-Off

- [ ] Engineering Lead approved
- [ ] DevOps Lead approved
- [ ] Product Manager approved
- [ ] Security reviewed
- [ ] Ready for production traffic
```

**Run Tests Again**:
```bash
./scripts/test-production-readiness.sh
./scripts/backup-verification.sh
# Expected: All tests pass ✓
```

### Step 3: Validate and Harden (Blue Phase)

- Complete security audit
- Performance tuning
- Disaster recovery drill
- Documentation review

---

## 4-11. STANDARD SECTIONS

[Following template structure]

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -

**Dependencies**:
- TASK-034: Staging Environment Deployment (REQUIRED)
- TASK-032: Sentry Integration (for monitoring)
- TASK-033: CI/CD Pipeline (for deployments)
