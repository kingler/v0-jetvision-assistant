# Complete Sentry Integration & Monitoring

**Task ID**: TASK-032
**Created**: 2025-10-20
**Assigned To**: DevOps Engineer / Senior Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 8 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Complete Sentry integration for comprehensive error tracking, performance monitoring, and user feedback collection. Configure source maps upload, custom error boundaries, alert configuration, issue tracking integration, and release tracking to ensure zero production errors go unnoticed.

### User Story
**As a** development team
**I want** comprehensive error monitoring and performance tracking
**So that** I can quickly identify and resolve production issues before they impact users

### Business Value
Production monitoring is critical for maintaining 99.9% uptime and ensuring rapid incident response. Sentry provides real-time error tracking, performance monitoring, and user feedback that enables the team to fix issues before they cause customer churn. Early detection of errors reduces mean time to resolution (MTTR) from hours to minutes, directly impacting customer satisfaction and revenue protection.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL track all errors in production
- Client-side JavaScript errors captured
- Server-side API errors captured
- Edge function errors captured
- Unhandled promise rejections captured
- Network errors tracked
- Error context includes user info, session data, breadcrumbs

**FR-2**: System SHALL upload source maps for production builds
- Source maps generated during build
- Source maps uploaded to Sentry automatically
- Original source code visible in error stack traces
- Source maps not exposed to end users
- Upload integrated into CI/CD pipeline

**FR-3**: System SHALL implement performance monitoring
- API route performance tracked
- Page load times measured
- Transaction tracing enabled
- Database query performance monitored
- Slow operations flagged (>2s threshold)
- Custom performance metrics tracked

**FR-4**: System SHALL use custom error boundaries
- React error boundaries for UI errors
- Fallback UI displayed on errors
- Error details sent to Sentry
- User-friendly error messages
- Automatic retry mechanisms

**FR-5**: System SHALL configure intelligent alerts
- Critical errors trigger immediate alerts
- Alert routing by error severity
- Slack/email notifications configured
- Alert deduplication enabled
- Alert fatigue prevention (rate limiting)

**FR-6**: System SHALL integrate with issue tracking
- Sentry issues linked to GitHub
- Automatic issue creation for new errors
- Issue assignment based on code ownership
- Status sync between Sentry and GitHub

**FR-7**: System SHALL provide user feedback widget
- Feedback widget on error pages
- Users can report issues directly
- Screenshots captured automatically
- Feedback linked to Sentry events
- Contact info collection (optional)

**FR-8**: System SHALL track releases
- Every deployment tagged with release version
- Errors grouped by release
- Release health metrics displayed
- Regression detection enabled
- Changelog integration

### Acceptance Criteria

- [ ] **AC-1**: All client-side errors captured in Sentry
- [ ] **AC-2**: All server-side errors captured in Sentry
- [ ] **AC-3**: Source maps uploaded automatically on deployment
- [ ] **AC-4**: Stack traces show original TypeScript source code
- [ ] **AC-5**: Performance monitoring active for all API routes
- [ ] **AC-6**: Custom error boundaries implemented on all pages
- [ ] **AC-7**: Alerts configured for critical errors (Slack + Email)
- [ ] **AC-8**: GitHub integration configured and tested
- [ ] **AC-9**: User feedback widget functional
- [ ] **AC-10**: Releases tracked with version numbers
- [ ] **AC-11**: No sensitive data (PII, tokens) logged
- [ ] **AC-12**: Dashboard shows error trends and metrics
- [ ] **AC-13**: Code review approved

### Non-Functional Requirements

- **Performance**: Sentry SDK overhead <50ms per request
- **Reliability**: 100% error capture rate
- **Privacy**: No PII or secrets in error logs
- **Cost**: Stay within Sentry free tier or budget limits

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/monitoring/sentry-client.test.ts
__tests__/monitoring/sentry-server.test.ts
__tests__/monitoring/error-boundary.test.tsx
__tests__/monitoring/source-maps.test.ts
__tests__/monitoring/performance-monitoring.test.ts
scripts/verify-sentry-config.ts
```

**Example Test - Error Capture**:
```typescript
// __tests__/monitoring/sentry-client.test.ts
import { describe, it, expect, vi } from 'vitest'
import * as Sentry from '@sentry/nextjs'

describe('Sentry Client Error Capture', () => {
  it('should capture client-side errors', () => {
    const captureException = vi.spyOn(Sentry, 'captureException')

    try {
      throw new Error('Test error')
    } catch (error) {
      Sentry.captureException(error)
    }

    expect(captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' })
    )
  })

  it('should include user context in errors', () => {
    const captureException = vi.spyOn(Sentry, 'captureException')

    Sentry.setUser({
      id: 'user123',
      email: 'test@example.com'
    })

    Sentry.captureException(new Error('User-specific error'))

    expect(captureException).toHaveBeenCalled()
    expect(Sentry.getCurrentScope().getUser()).toMatchObject({
      id: 'user123',
      email: 'test@example.com'
    })
  })

  it('should NOT log PII in error context', () => {
    const captureException = vi.spyOn(Sentry, 'captureException')

    const sensitiveData = {
      password: 'secret123',
      creditCard: '4111111111111111'
    }

    Sentry.captureException(new Error('Error with context'), {
      extra: sensitiveData
    })

    // Verify beforeSend scrubs PII
    const call = captureException.mock.calls[0]
    expect(JSON.stringify(call)).not.toContain('secret123')
    expect(JSON.stringify(call)).not.toContain('4111111111111111')
  })

  it('should capture unhandled promise rejections', async () => {
    const captureException = vi.spyOn(Sentry, 'captureException')

    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(new Error('Unhandled rejection')),
        reason: new Error('Unhandled rejection')
      })
    )

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(captureException).toHaveBeenCalled()
  })
})
```

**Example Test - Performance Monitoring**:
```typescript
// __tests__/monitoring/performance-monitoring.test.ts
import { describe, it, expect } from 'vitest'
import * as Sentry from '@sentry/nextjs'

describe('Sentry Performance Monitoring', () => {
  it('should track API route performance', async () => {
    const transaction = Sentry.startTransaction({
      name: 'POST /api/requests',
      op: 'http.server'
    })

    // Simulate API request
    await fetch('/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        departure_airport: 'KTEB',
        arrival_airport: 'KVNY'
      })
    })

    transaction.finish()

    expect(transaction.toContext()).toMatchObject({
      name: 'POST /api/requests',
      op: 'http.server',
      status: expect.any(String)
    })
  })

  it('should track database query performance', async () => {
    const span = Sentry.startSpan({
      name: 'SELECT FROM flight_requests',
      op: 'db.query'
    }, async () => {
      // Simulate database query
      await supabase.from('flight_requests').select('*')
    })

    expect(span).toBeDefined()
  })

  it('should flag slow operations (>2s)', async () => {
    const transaction = Sentry.startTransaction({
      name: 'Slow Operation',
      op: 'custom'
    })

    // Simulate slow operation
    await new Promise(resolve => setTimeout(resolve, 2500))

    transaction.finish()

    const duration = transaction.endTimestamp! - transaction.startTimestamp
    expect(duration).toBeGreaterThan(2)
  })
})
```

**Example Test - Error Boundary**:
```typescript
// __tests__/monitoring/error-boundary.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import * as Sentry from '@sentry/nextjs'

describe('Error Boundary', () => {
  it('should catch React errors and show fallback UI', () => {
    const captureException = vi.spyOn(Sentry, 'captureException')

    const ThrowError = () => {
      throw new Error('React error')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    expect(captureException).toHaveBeenCalled()
  })

  it('should display user-friendly error message', () => {
    const ThrowError = () => {
      throw new Error('Technical error message')
    }

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    // Should NOT show technical error to user
    expect(screen.queryByText(/Technical error message/i)).not.toBeInTheDocument()

    // Should show friendly message
    expect(screen.getByText(/We're sorry/i)).toBeInTheDocument()
  })

  it('should provide retry functionality', async () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) throw new Error('Error')
      return <div>Success</div>
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /try again/i })
    retryButton.click()

    // Re-render without error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Success/i)).toBeInTheDocument()
  })
})
```

**Source Maps Verification Script**:
```typescript
// scripts/verify-sentry-config.ts
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

async function verifySentryConfig() {
  console.log('🔍 Verifying Sentry configuration...\n')

  // 1. Check Sentry config files exist
  const configFiles = [
    'sentry.client.config.ts',
    'sentry.server.config.ts',
    'sentry.edge.config.ts'
  ]

  for (const file of configFiles) {
    if (!existsSync(file)) {
      console.error(`❌ Missing ${file}`)
      process.exit(1)
    }
    console.log(`✅ Found ${file}`)
  }

  // 2. Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SENTRY_DSN',
    'SENTRY_AUTH_TOKEN',
    'SENTRY_ORG',
    'SENTRY_PROJECT'
  ]

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing environment variable: ${envVar}`)
      process.exit(1)
    }
    console.log(`✅ ${envVar} configured`)
  }

  // 3. Verify source maps generated
  console.log('\n📦 Building project...')
  execSync('npm run build', { stdio: 'inherit' })

  const sourceMapExists = existsSync(
    join('.next', 'static', 'chunks', 'main.js.map')
  )

  if (!sourceMapExists) {
    console.error('❌ Source maps not generated')
    process.exit(1)
  }
  console.log('✅ Source maps generated')

  // 4. Verify Sentry CLI can upload
  console.log('\n📤 Testing Sentry upload...')
  try {
    execSync('sentry-cli releases list', { stdio: 'inherit' })
    console.log('✅ Sentry CLI authenticated')
  } catch (error) {
    console.error('❌ Sentry CLI authentication failed')
    process.exit(1)
  }

  console.log('\n✅ Sentry configuration verified successfully!')
}

verifySentryConfig()
```

**Run Tests** (should FAIL initially):
```bash
npm run test:monitoring
# Expected: Tests fail because Sentry not fully configured
```

### Step 2: Implement Sentry Integration (Green Phase)

**Sentry Client Configuration**:
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV,

  // Tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Error filtering
  beforeSend(event, hint) {
    // Filter out low-priority errors
    if (event.level === 'info' || event.level === 'debug') {
      return null
    }

    // Scrub PII
    if (event.request) {
      delete event.request.cookies
      delete event.request.headers
    }

    if (event.extra) {
      Object.keys(event.extra).forEach(key => {
        if (
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret')
        ) {
          event.extra![key] = '[Filtered]'
        }
      })
    }

    return event
  },

  // Ignore specific errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'cancelled'
  ]
})
```

**Sentry Server Configuration**:
```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  beforeSend(event) {
    // Scrub sensitive server-side data
    if (event.request?.url) {
      // Remove query parameters that might contain tokens
      event.request.url = event.request.url.split('?')[0]
    }

    return event
  },

  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Postgres()
  ]
})
```

**Error Boundary Component**:
```typescript
// components/ErrorBoundary.tsx
'use client'

import React from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
            <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-gray-600">
              We're sorry for the inconvenience. Our team has been notified and is working on a fix.
            </p>
            <div className="mt-6 space-x-4">
              <Button onClick={this.handleReset}>
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
              >
                Go Home
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-mono">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 rounded bg-gray-100 p-4 text-xs overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Next.js Configuration for Source Maps**:
```javascript
// next.config.mjs
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig = {
  // ... other config

  // Generate source maps for production
  productionBrowserSourceMaps: true,

  // Sentry webpack plugin
  sentry: {
    hideSourceMaps: true,
    widenClientFileUpload: true
  }
}

export default withSentryConfig(
  nextConfig,
  {
    // Sentry configuration options
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // Auth token for uploading source maps
    authToken: process.env.SENTRY_AUTH_TOKEN,

    silent: true,

    // Upload source maps during build
    uploadSourceMaps: true,

    // Delete source maps after upload (keep bundle clean)
    deleteSourcemapsAfterUpload: true
  }
)
```

**GitHub Actions Integration**:
```yaml
# .github/workflows/sentry-release.yml
name: Sentry Release

on:
  push:
    branches: [main]

jobs:
  sentry-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create Sentry release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
          version: ${{ github.sha }}
```

**User Feedback Widget**:
```typescript
// components/FeedbackWidget.tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'

export function FeedbackWidget() {
  const handleFeedback = () => {
    const feedback = Sentry.feedbackIntegration({
      colorScheme: 'light',
      showBranding: false,
      formTitle: 'Report an Issue',
      submitButtonLabel: 'Send Feedback',
      messagePlaceholder: 'What went wrong? What did you expect to happen?'
    })

    feedback.openDialog()
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFeedback}
      className="fixed bottom-4 right-4"
    >
      <MessageSquare className="mr-2 h-4 w-4" />
      Feedback
    </Button>
  )
}
```

**Run Tests Again**:
```bash
npm run test:monitoring
npm run verify:sentry
# Expected: Tests now pass ✓
```

### Step 3: Refactor and Monitor (Blue Phase)

- Set up Sentry dashboards
- Configure alert rules
- Test error scenarios in staging
- Document monitoring procedures

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Sentry account created
- [ ] Sentry project created
- [ ] Auth tokens generated
- [ ] Environment variables configured

### Step-by-Step Implementation

**Step 1**: Install Sentry SDK
```bash
npx @sentry/wizard@latest -i nextjs
```

**Step 2**: Configure Environment Variables
Add to `.env.local`:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=jetvision
SENTRY_PROJECT=jetvision-assistant
```

**Step 3**: Configure Sentry Clients
- Create `sentry.client.config.ts`
- Create `sentry.server.config.ts`
- Create `sentry.edge.config.ts`
- Configure beforeSend hooks to scrub PII

**Step 4**: Implement Error Boundary
- Create `components/ErrorBoundary.tsx`
- Wrap app in error boundary
- Add fallback UI
- Test error scenarios

**Step 5**: Configure Source Maps Upload
- Update `next.config.mjs`
- Enable productionBrowserSourceMaps
- Configure Sentry webpack plugin
- Test source map upload

**Step 6**: Set Up Performance Monitoring
```typescript
// lib/monitoring/performance.ts
import * as Sentry from '@sentry/nextjs'

export function trackAPIPerformance(
  name: string,
  operation: () => Promise<any>
) {
  return Sentry.startSpan({
    name,
    op: 'http.server'
  }, operation)
}

export function trackDatabaseQuery(
  query: string,
  operation: () => Promise<any>
) {
  return Sentry.startSpan({
    name: query,
    op: 'db.query'
  }, operation)
}
```

**Step 7**: Configure Alerts
In Sentry dashboard:
- Set up Slack integration
- Create alert rule for critical errors
- Configure email notifications
- Set up issue assignment rules

**Step 8**: Set Up GitHub Integration
- Connect Sentry to GitHub
- Configure automatic issue creation
- Set up commit tracking
- Enable suspect commits feature

**Step 9**: Add Feedback Widget
- Implement `FeedbackWidget` component
- Add to error pages
- Test feedback submission
- Verify feedback appears in Sentry

**Step 10**: Create Release Tracking
```bash
# In CI/CD pipeline
sentry-cli releases new "$VERSION"
sentry-cli releases set-commits "$VERSION" --auto
sentry-cli releases finalize "$VERSION"
sentry-cli releases deploys "$VERSION" new -e production
```

### Implementation Validation

- [ ] Errors captured in Sentry dashboard
- [ ] Source maps working (stack traces show TS)
- [ ] Performance data visible
- [ ] Alerts triggering correctly
- [ ] Feedback widget functional

---

## 5. GIT WORKFLOW

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b feat/sentry-integration-monitoring
```

### Commit Guidelines
```bash
git add sentry.*.config.ts
git commit -m "feat(monitoring): add Sentry configuration for client, server, and edge"

git add components/ErrorBoundary.tsx
git commit -m "feat(monitoring): implement error boundary with Sentry integration"

git add next.config.mjs
git commit -m "feat(monitoring): configure source maps upload to Sentry"

git add __tests__/monitoring/
git commit -m "test(monitoring): add comprehensive Sentry integration tests"

git push origin feat/sentry-integration-monitoring
```

### Pull Request
```bash
gh pr create --title "Feature: Complete Sentry Integration & Monitoring" \
  --body "Implements comprehensive error tracking and performance monitoring.

**Features:**
- ✅ Client-side error tracking
- ✅ Server-side error tracking
- ✅ Edge function error tracking
- ✅ Source maps upload (automatic)
- ✅ Performance monitoring
- ✅ Custom error boundaries
- ✅ Alert configuration (Slack + Email)
- ✅ GitHub integration
- ✅ User feedback widget
- ✅ Release tracking

**Monitoring Coverage:**
- 100% error capture rate
- <50ms SDK overhead
- PII scrubbing configured
- Source maps working

Closes #TASK-032"
```

---

## 6. CODE REVIEW CHECKLIST

### Functionality
- [ ] All errors captured in Sentry
- [ ] Source maps uploaded automatically
- [ ] Performance monitoring active
- [ ] Error boundaries functional
- [ ] Alerts configured correctly

### Security & Privacy
- [ ] No PII in error logs
- [ ] No API keys or secrets logged
- [ ] Source maps hidden from users
- [ ] Sensitive headers scrubbed

### Performance
- [ ] Sentry SDK overhead <50ms
- [ ] Sample rates configured appropriately
- [ ] No blocking operations

---

## 7. TESTING REQUIREMENTS

### Unit Tests
```bash
npm run test:monitoring
```

### Integration Tests
- Trigger test errors in staging
- Verify errors appear in Sentry
- Test alert notifications
- Verify source maps work

### Manual Testing
- Force client error → Check Sentry
- Force server error → Check Sentry
- Test feedback widget → Verify submission
- Check performance data

---

## 8. DEFINITION OF DONE

- [ ] All errors captured in Sentry
- [ ] Source maps uploaded automatically
- [ ] Performance monitoring active
- [ ] Error boundaries implemented
- [ ] Alerts configured and tested
- [ ] GitHub integration working
- [ ] Feedback widget functional
- [ ] Release tracking enabled
- [ ] Tests passing
- [ ] Documentation complete
- [ ] Code review approved
- [ ] PR merged

---

## 9. RESOURCES & REFERENCES

### Documentation
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Source Maps Guide](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

### Related Tasks
- TASK-033: CI/CD Pipeline (uses Sentry releases)
- TASK-035: Production Environment (requires monitoring)
- TASK-037: Final QA (validates monitoring)

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- Use Sentry's beforeSend hook aggressively to prevent PII leaks
- Keep sample rates low in production to control costs
- Set up separate Sentry projects for staging/production

### Open Questions
- [ ] Should we enable Session Replay? (increases costs)
- [ ] What alert thresholds should we use?

### Assumptions
- Sentry free tier sufficient for MVP
- 10% trace sampling acceptable
- Email + Slack notifications sufficient

### Risks/Blockers
- Risk: Sentry costs could increase with scale
- Mitigation: Monitor usage, adjust sample rates

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
[Fill out after completion]

### Changes Made
- Created: `sentry.client.config.ts`
- Created: `sentry.server.config.ts`
- Created: `sentry.edge.config.ts`
- Created: `components/ErrorBoundary.tsx`
- Created: `components/FeedbackWidget.tsx`
- Modified: `next.config.mjs`
- Created: `__tests__/monitoring/*`

### Test Results
```
Test Suites: X passed, X total
Tests:       X passed, X total
Coverage:    XX%
```

### Known Issues/Future Work
- Consider Session Replay for debugging
- Add custom metrics for business KPIs

### Time Tracking
- **Estimated**: 8 hours
- **Actual**: X hours
- **Variance**: +/- X hours

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
**Reviewed By**: -
**Review Date**: -
