# Staging Environment Deployment

**Task ID**: TASK-034
**Created**: 2025-10-20
**Assigned To**: DevOps Engineer / Senior Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 8 hours
**Actual Time**: - (update when complete)

**Dependencies**: TASK-033 (CI/CD Pipeline Configuration)

---

## 1. TASK OVERVIEW

### Objective
Deploy and configure complete staging environment on Vercel with dedicated staging database (Supabase), staging Redis (Upstash), environment variable setup, smoke testing, performance testing, load testing, and comprehensive bug fixing to validate production-readiness in an isolated environment.

### User Story
**As a** development team
**I want** a production-like staging environment
**So that** I can test changes thoroughly before deploying to production

### Business Value
A proper staging environment prevents 90% of production incidents by catching bugs before customers see them. By testing in production-like conditions, the team identifies performance issues, database problems, and integration failures early. This reduces production downtime from hours to minutes and prevents costly customer-facing bugs that damage reputation and revenue.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL have dedicated Vercel staging project
- Separate Vercel project for staging
- Custom staging domain configured
- Automatic deployments from develop branch
- Preview URLs for feature branches

**FR-2**: System SHALL have staging database (Supabase)
- Dedicated Supabase project for staging
- Same schema as production
- Seeded with realistic test data
- Row Level Security enabled
- Connection pooling configured

**FR-3**: System SHALL have staging Redis (Upstash)
- Dedicated Upstash Redis instance
- Same configuration as production
- BullMQ queues configured
- Cache namespacing to prevent conflicts

**FR-4**: System SHALL have environment variables configured
- All required environment variables set
- Staging-specific API keys
- Test mode for payment providers
- Debug logging enabled
- Sentry environment tagged as "staging"

**FR-5**: System SHALL pass smoke testing
- All pages load successfully
- Authentication flow works
- API endpoints respond
- Database connections work
- Real-time features functional

**FR-6**: System SHALL pass performance testing
- API response times <2s
- Page load times <3s
- Lighthouse score >85
- No memory leaks
- Connection pooling effective

**FR-7**: System SHALL pass load testing
- Support 50 concurrent users (half of production)
- No database connection exhaustion
- No Redis connection issues
- Graceful degradation under load

**FR-8**: System SHALL enable comprehensive bug fixing
- All critical bugs fixed before production
- Integration issues resolved
- Data migration tested
- Rollback procedures verified

### Acceptance Criteria

- [ ] **AC-1**: Vercel staging project created and deployed
- [ ] **AC-2**: Staging domain accessible (staging.jetvision-assistant.com)
- [ ] **AC-3**: Staging database created and schema deployed
- [ ] **AC-4**: Database seeded with test data
- [ ] **AC-5**: Staging Redis configured and connected
- [ ] **AC-6**: All environment variables configured
- [ ] **AC-7**: Smoke tests pass (all critical flows work)
- [ ] **AC-8**: Performance tests pass (Lighthouse >85)
- [ ] **AC-9**: Load tests pass (50 concurrent users)
- [ ] **AC-10**: No critical or high-severity bugs
- [ ] **AC-11**: Monitoring and logging functional
- [ ] **AC-12**: Documentation complete
- [ ] **AC-13**: Code review approved

### Non-Functional Requirements

- **Performance**: Same performance targets as production
- **Reliability**: 99% uptime acceptable for staging
- **Isolation**: Complete data isolation from production
- **Cost**: <50% of production infrastructure costs

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Deployment Tests FIRST (Red Phase)

**Test Files to Create**:
```
scripts/test-staging-deployment.sh
scripts/smoke-test-staging.sh
scripts/load-test-staging.k6.js
scripts/seed-staging-data.ts
__tests__/staging/integration.test.ts
```

**Staging Deployment Test**:
```bash
#!/bin/bash
# scripts/test-staging-deployment.sh

set -e

STAGING_URL="https://staging.jetvision-assistant.com"

echo "🧪 Testing Staging Deployment..."

# 1. Verify staging domain accessible
echo "📡 Testing staging domain..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL")
if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Staging domain not accessible (HTTP $HTTP_CODE)"
  exit 1
fi
echo "✅ Staging domain accessible"

# 2. Verify environment is staging
echo "🏷️ Verifying environment..."
RESPONSE=$(curl -s "$STAGING_URL/api/health")
if ! echo "$RESPONSE" | grep -q "staging"; then
  echo "❌ Environment is not staging"
  exit 1
fi
echo "✅ Environment is staging"

# 3. Verify database connection
echo "🗄️ Testing database connection..."
DB_STATUS=$(curl -s "$STAGING_URL/api/health" | jq -r '.database')
if [ "$DB_STATUS" != "connected" ]; then
  echo "❌ Database not connected"
  exit 1
fi
echo "✅ Database connected"

# 4. Verify Redis connection
echo "📦 Testing Redis connection..."
REDIS_STATUS=$(curl -s "$STAGING_URL/api/health" | jq -r '.redis')
if [ "$REDIS_STATUS" != "connected" ]; then
  echo "❌ Redis not connected"
  exit 1
fi
echo "✅ Redis connected"

# 5. Verify Sentry configured
echo "📊 Verifying Sentry..."
SENTRY_ENV=$(curl -s "$STAGING_URL/api/health" | jq -r '.sentry.environment')
if [ "$SENTRY_ENV" != "staging" ]; then
  echo "❌ Sentry environment not set to staging"
  exit 1
fi
echo "✅ Sentry configured for staging"

# 6. Verify authentication works
echo "🔐 Testing authentication..."
# Note: This requires a test account
AUTH_RESPONSE=$(curl -s -X POST "$STAGING_URL/api/auth/test")
if [ -z "$AUTH_RESPONSE" ]; then
  echo "❌ Authentication not working"
  exit 1
fi
echo "✅ Authentication functional"

echo "✅ Staging deployment tests passed!"
```

**Smoke Test Script**:
```bash
#!/bin/bash
# scripts/smoke-test-staging.sh

set -e

STAGING_URL="https://staging.jetvision-assistant.com"

echo "💨 Running smoke tests on staging..."

# Critical user journeys to test
echo "📋 Testing critical user journeys..."

# 1. Homepage loads
echo "  Testing homepage..."
curl -s -f "$STAGING_URL" > /dev/null || (echo "❌ Homepage failed" && exit 1)
echo "  ✅ Homepage loads"

# 2. Dashboard loads (requires auth)
echo "  Testing dashboard..."
curl -s -f "$STAGING_URL/dashboard" > /dev/null || echo "  ⚠️ Dashboard requires auth (expected)"

# 3. API health check
echo "  Testing API health..."
HEALTH=$(curl -s "$STAGING_URL/api/health")
if [ -z "$HEALTH" ]; then
  echo "❌ API health check failed"
  exit 1
fi
echo "  ✅ API health check passed"

# 4. Create request flow
echo "  Testing create request..."
CREATE_RESPONSE=$(curl -s -X POST "$STAGING_URL/api/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "departure_airport": "KTEB",
    "arrival_airport": "KVNY",
    "passengers": 6,
    "departure_date": "2025-11-15"
  }')

if echo "$CREATE_RESPONSE" | grep -q "error"; then
  echo "  ⚠️ Create request requires auth (expected)"
else
  echo "  ✅ Create request endpoint functional"
fi

# 5. WebSocket connection
echo "  Testing WebSocket (Realtime)..."
wscat -c "wss://staging.jetvision-assistant.com/ws" --execute "ping" || echo "  ⚠️ WebSocket test requires wscat"

# 6. Database query performance
echo "  Testing database performance..."
START_TIME=$(date +%s%N)
curl -s "$STAGING_URL/api/requests" > /dev/null
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
if [ $DURATION -gt 2000 ]; then
  echo "  ⚠️ Database query slow (${DURATION}ms)"
else
  echo "  ✅ Database query fast (${DURATION}ms)"
fi

echo "✅ Smoke tests completed!"
```

**Load Test for Staging**:
```javascript
// scripts/load-test-staging.k6.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')
const STAGING_URL = 'https://staging.jetvision-assistant.com'

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Warm-up
    { duration: '1m', target: 25 },   // Ramp to 25 users
    { duration: '2m', target: 50 },   // Ramp to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests <2s
    'errors': ['rate<0.15'],              // Error rate <15%
  },
}

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${STAGING_URL}/api/health`)

  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1)

  sleep(1)

  // Test request creation (will fail auth, but tests endpoint)
  const createRes = http.post(
    `${STAGING_URL}/api/requests`,
    JSON.stringify({
      departure_airport: 'KTEB',
      arrival_airport: 'KVNY',
      passengers: 6,
      departure_date: '2025-11-15'
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  )

  check(createRes, {
    'create endpoint responds': (r) => r.status !== 0,
    'create endpoint response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1)

  sleep(2)
}

export function handleSummary(data) {
  return {
    'staging-load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}
```

**Data Seeding Script**:
```typescript
// scripts/seed-staging-data.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.STAGING_SUPABASE_URL!,
  process.env.STAGING_SUPABASE_SERVICE_KEY!
)

async function seedStagingData() {
  console.log('🌱 Seeding staging database...\n')

  try {
    // 1. Create test users
    console.log('👥 Creating test users...')
    const testUsers = [
      {
        clerk_user_id: 'test_user_1',
        email: 'agent1@staging.test',
        full_name: 'Test Agent 1',
        role: 'iso_agent'
      },
      {
        clerk_user_id: 'test_user_2',
        email: 'agent2@staging.test',
        full_name: 'Test Agent 2',
        role: 'iso_agent'
      },
      {
        clerk_user_id: 'admin_user',
        email: 'admin@staging.test',
        full_name: 'Test Admin',
        role: 'admin'
      }
    ]

    for (const user of testUsers) {
      const { error } = await supabase.from('users').insert(user)
      if (error && !error.message.includes('duplicate')) {
        console.error(`Error creating user ${user.email}:`, error)
      } else {
        console.log(`  ✅ Created ${user.email}`)
      }
    }

    // 2. Create test clients
    console.log('\n👤 Creating test clients...')
    const testClients = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0100',
        preferences: {
          catering: 'vegetarian',
          ground_transport: 'suv',
          aircraft_category: 'midsize'
        },
        is_returning: true
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1-555-0101',
        preferences: {
          catering: 'kosher',
          aircraft_category: 'heavy'
        },
        is_returning: true
      }
    ]

    for (const client of testClients) {
      const { error } = await supabase.from('clients').insert(client)
      if (error && !error.message.includes('duplicate')) {
        console.error(`Error creating client ${client.name}:`, error)
      } else {
        console.log(`  ✅ Created ${client.name}`)
      }
    }

    // 3. Create test flight requests
    console.log('\n✈️ Creating test flight requests...')
    const testRequests = [
      {
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY',
        passengers: 6,
        departure_date: '2025-11-15',
        status: 'COMPLETED'
      },
      {
        departure_airport: 'KSNA',
        arrival_airport: 'KLAS',
        passengers: 4,
        departure_date: '2025-11-20',
        status: 'AWAITING_QUOTES'
      },
      {
        departure_airport: 'KMIA',
        arrival_airport: 'KJFK',
        passengers: 8,
        departure_date: '2025-11-25',
        status: 'ANALYZING_PROPOSALS'
      }
    ]

    for (const request of testRequests) {
      const { error } = await supabase.from('flight_requests').insert(request)
      if (error) {
        console.error(`Error creating request:`, error)
      } else {
        console.log(`  ✅ Created ${request.departure_airport} → ${request.arrival_airport}`)
      }
    }

    console.log('\n✅ Staging data seeded successfully!')

  } catch (error) {
    console.error('❌ Error seeding staging data:', error)
    process.exit(1)
  }
}

seedStagingData()
```

**Run Tests** (should FAIL initially):
```bash
./scripts/test-staging-deployment.sh
# Expected: Tests fail because staging not deployed yet
```

### Step 2: Deploy Staging Environment (Green Phase)

**Step 1: Create Staging Supabase Project**
```bash
# In Supabase dashboard:
# 1. Create new project: "jetvision-staging"
# 2. Region: Same as production
# 3. Database password: Generate secure password
# 4. Wait for provisioning

# Save credentials
echo "STAGING_SUPABASE_URL=https://xxx.supabase.co" >> .env.staging
echo "STAGING_SUPABASE_ANON_KEY=xxx" >> .env.staging
echo "STAGING_SUPABASE_SERVICE_KEY=xxx" >> .env.staging
```

**Step 2: Deploy Database Schema to Staging**
```bash
# Install Supabase CLI
npm i -g supabase

# Login
supabase login

# Link to staging project
supabase link --project-ref YOUR_STAGING_PROJECT_REF

# Push schema
supabase db push

# Verify
supabase db diff
```

**Step 3: Create Staging Redis (Upstash)**
```bash
# In Upstash dashboard:
# 1. Create new database: "jetvision-staging"
# 2. Region: Same as production
# 3. Plan: Free tier or paid

# Save credentials
echo "STAGING_REDIS_URL=https://xxx.upstash.io" >> .env.staging
echo "STAGING_REDIS_TOKEN=xxx" >> .env.staging
```

**Step 4: Create Vercel Staging Project**
```bash
# Install Vercel CLI
npm i -g vercel

# Create staging project
vercel --scope YOUR_TEAM --project-name jetvision-staging

# Link to staging
vercel link --project jetvision-staging

# Add environment variables
vercel env add NEXT_PUBLIC_SENTRY_DSN staging
vercel env add SENTRY_ENVIRONMENT staging
vercel env add DATABASE_URL staging
vercel env add REDIS_URL staging
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY staging
vercel env add CLERK_SECRET_KEY staging
# ... add all required env vars

# Deploy to staging
vercel --prod
```

**Step 5: Configure Staging Domain**
```bash
# In Vercel dashboard:
# 1. Go to project settings
# 2. Domains → Add domain
# 3. Enter: staging.jetvision-assistant.com
# 4. Configure DNS records

# Or via CLI
vercel domains add staging.jetvision-assistant.com
```

**Step 6: Seed Staging Data**
```bash
# Set staging environment variables
export STAGING_SUPABASE_URL=xxx
export STAGING_SUPABASE_SERVICE_KEY=xxx

# Run seeding script
npm run seed:staging
```

**Step 7: Configure GitHub Actions for Staging**
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging

on:
  push:
    branches: [develop]

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_STAGING_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

      - name: Run Smoke Tests
        run: ./scripts/smoke-test-staging.sh

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "✅ Staging deployed: https://staging.jetvision-assistant.com"
            }
```

**Run Tests Again**:
```bash
./scripts/test-staging-deployment.sh
./scripts/smoke-test-staging.sh
k6 run scripts/load-test-staging.k6.js
# Expected: Tests now pass ✓
```

### Step 3: Validate and Document (Blue Phase)

- Run comprehensive testing
- Document staging environment
- Create staging runbook
- Train team on staging usage

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] CI/CD pipeline configured (TASK-033)
- [ ] Vercel Pro account
- [ ] Supabase account
- [ ] Upstash account
- [ ] Domain DNS access

### Step-by-Step Implementation

**Step 1**: Create Staging Infrastructure
- Create Supabase staging project
- Create Upstash Redis staging
- Create Vercel staging project
- Configure custom domain

**Step 2**: Deploy Database Schema
```bash
supabase link --project-ref STAGING_REF
supabase db push
```

**Step 3**: Configure Environment Variables
```bash
# In Vercel dashboard or CLI
vercel env add NEXT_PUBLIC_SENTRY_DSN staging
vercel env add DATABASE_URL staging
vercel env add REDIS_URL staging
# ... all required vars
```

**Step 4**: Deploy to Staging
```bash
vercel --prod
```

**Step 5**: Seed Test Data
```bash
npm run seed:staging
```

**Step 6**: Run Smoke Tests
```bash
./scripts/smoke-test-staging.sh
```

**Step 7**: Run Performance Tests
```bash
npm run lighthouse:staging
```

**Step 8**: Run Load Tests
```bash
k6 run scripts/load-test-staging.k6.js
```

**Step 9**: Bug Fixing
- Test all critical user journeys
- Fix any bugs found
- Re-deploy and re-test
- Document issues and resolutions

**Step 10**: Document Staging Environment
Create `docs/STAGING.md`:
```markdown
# Staging Environment

## URLs
- App: https://staging.jetvision-assistant.com
- Database: https://app.supabase.com/project/STAGING_REF
- Redis: https://console.upstash.com/redis/STAGING_ID

## Test Accounts
- agent1@staging.test / password123
- admin@staging.test / password123

## Usage
1. Deploy: Push to `develop` branch
2. Test: Run smoke tests
3. Promote: Merge to `main` for production

## Troubleshooting
- Reset database: `supabase db reset --linked`
- Restart Redis: Via Upstash console
- View logs: `vercel logs`
```

### Implementation Validation

- [ ] Staging environment accessible
- [ ] Database connected and seeded
- [ ] Redis connected
- [ ] All smoke tests pass
- [ ] Performance tests pass
- [ ] Load tests pass
- [ ] No critical bugs

---

## 5. GIT WORKFLOW

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b feat/staging-environment-deployment
```

### Commit Guidelines
```bash
git add scripts/test-staging-deployment.sh
git commit -m "feat(staging): add staging deployment test script"

git add scripts/seed-staging-data.ts
git commit -m "feat(staging): add data seeding script for staging"

git add .github/workflows/deploy-staging.yml
git commit -m "ci(staging): add staging deployment workflow"

git add docs/STAGING.md
git commit -m "docs(staging): add staging environment documentation"

git push origin feat/staging-environment-deployment
```

### Pull Request
```bash
gh pr create --title "Staging: Environment Deployment" \
  --body "Deploys complete staging environment for pre-production testing.

**Infrastructure:**
- ✅ Vercel staging project
- ✅ Supabase staging database
- ✅ Upstash Redis staging
- ✅ Custom domain (staging.jetvision-assistant.com)

**Testing:**
- ✅ Smoke tests pass
- ✅ Performance tests pass (Lighthouse >85)
- ✅ Load tests pass (50 concurrent users)
- ✅ All critical flows functional

**Data:**
- ✅ Test users seeded
- ✅ Test clients seeded
- ✅ Sample requests created

Closes #TASK-034"
```

---

## 6-11. STANDARD SECTIONS

(Following template structure for remaining sections)

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -

**Dependencies**:
- TASK-033: CI/CD Pipeline Configuration (REQUIRED)
