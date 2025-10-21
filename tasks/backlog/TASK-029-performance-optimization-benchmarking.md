# Performance Optimization & Benchmarking

**Task ID**: TASK-029
**Created**: 2025-10-20
**Assigned To**: Senior Developer / Performance Engineer
**Status**: `pending`
**Priority**: `normal`
**Estimated Time**: 10 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Optimize application performance targeting <2s API response times, bundle size reduction, image optimization, React component performance, Lighthouse score 90+, and load testing with k6 to ensure system can handle 100+ concurrent users.

### User Story
**As a** user
**I want** the application to load quickly and respond instantly
**So that** I can complete tasks efficiently without waiting for slow responses

### Business Value
Performance optimization directly impacts user satisfaction and conversion rates. Every 100ms improvement in response time increases conversion by 1%. Achieving <2s API responses and 90+ Lighthouse score ensures competitive advantage, reduces user frustration, and supports the goal of processing 500+ requests/month per ISO agent.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL optimize API response times
- All API routes respond in <2 seconds (95th percentile)
- Database queries optimized with proper indexing
- Caching implemented for frequently accessed data
- Connection pooling configured correctly

**FR-2**: System SHALL optimize bundle size
- Initial bundle <200KB (gzipped)
- Code splitting for routes
- Tree shaking enabled
- Unused dependencies removed
- Dynamic imports for heavy components

**FR-3**: System SHALL optimize images
- Images compressed and optimized
- Next.js Image component used everywhere
- WebP format for supported browsers
- Lazy loading for below-the-fold images
- Responsive images for different screen sizes

**FR-4**: System SHALL optimize React components
- Unnecessary re-renders eliminated
- useMemo/useCallback used appropriately
- Component lazy loading
- Virtualization for long lists
- Debouncing/throttling for expensive operations

**FR-5**: System SHALL achieve Lighthouse score 90+
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

**FR-6**: System SHALL handle load testing
- 100+ concurrent users supported
- API endpoints tested under load
- Response times remain <2s under load
- No memory leaks or crashes
- Database connections don't exhaust

### Acceptance Criteria

- [ ] **AC-1**: All API routes <2s response time (95th percentile)
- [ ] **AC-2**: Initial bundle size <200KB gzipped
- [ ] **AC-3**: All images optimized with Next.js Image
- [ ] **AC-4**: No unnecessary React re-renders
- [ ] **AC-5**: Lighthouse Performance score ≥90
- [ ] **AC-6**: Lighthouse Accessibility score ≥90
- [ ] **AC-7**: Lighthouse Best Practices score ≥90
- [ ] **AC-8**: Lighthouse SEO score ≥90
- [ ] **AC-9**: Load testing passes with 100 concurrent users
- [ ] **AC-10**: No memory leaks detected
- [ ] **AC-11**: Performance benchmarks documented
- [ ] **AC-12**: Code review approved

### Non-Functional Requirements

- **Performance**: <2s API response, <3s page load
- **Scalability**: Support 100+ concurrent users
- **Resource Usage**: <512MB memory per instance
- **Cost**: No increase in infrastructure costs

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Performance Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/performance/api-response-times.test.ts
__tests__/performance/bundle-size.test.ts
__tests__/performance/lighthouse.test.ts
scripts/load-test.k6.js
scripts/performance-benchmark.ts
```

**Example Test - API Response Times**:
```typescript
// __tests__/performance/api-response-times.test.ts
import { describe, it, expect } from 'vitest'
import { measureResponseTime } from '../helpers/performance'

describe('API Response Times', () => {
  it('POST /api/requests should respond in <2 seconds', async () => {
    const times = []

    for (let i = 0; i < 10; i++) {
      const duration = await measureResponseTime(() =>
        fetch('/api/requests', {
          method: 'POST',
          body: JSON.stringify({
            departure_airport: 'KTEB',
            arrival_airport: 'KVNY',
            passengers: 6,
            departure_date: '2025-11-15'
          })
        })
      )
      times.push(duration)
    }

    const p95 = calculatePercentile(times, 95)
    expect(p95).toBeLessThan(2000) // <2s
  })

  it('GET /api/requests should respond in <500ms', async () => {
    const times = []

    for (let i = 0; i < 10; i++) {
      const duration = await measureResponseTime(() =>
        fetch('/api/requests')
      )
      times.push(duration)
    }

    const p95 = calculatePercentile(times, 95)
    expect(p95).toBeLessThan(500) // <500ms
  })

  it('GET /api/requests/:id should respond in <300ms', async () => {
    // Create test request first
    const { id } = await createTestRequest()

    const times = []

    for (let i = 0; i < 10; i++) {
      const duration = await measureResponseTime(() =>
        fetch(`/api/requests/${id}`)
      )
      times.push(duration)
    }

    const p95 = calculatePercentile(times, 95)
    expect(p95).toBeLessThan(300) // <300ms
  })
})
```

**Example Test - Bundle Size**:
```typescript
// __tests__/performance/bundle-size.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync, statSync } from 'fs'
import { join } from 'path'
import { gzipSync } from 'zlib'

describe('Bundle Size', () => {
  it('main bundle should be <200KB gzipped', () => {
    const buildPath = join(process.cwd(), '.next/static/chunks/main-*.js')
    const files = glob.sync(buildPath)

    const sizes = files.map(file => {
      const content = readFileSync(file)
      const gzipped = gzipSync(content)
      return gzipped.length
    })

    const totalSize = sizes.reduce((a, b) => a + b, 0) / 1024 // KB

    expect(totalSize).toBeLessThan(200)
  })

  it('should not import unused dependencies', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
    )

    const buildInfo = readFileSync(
      join(process.cwd(), '.next/build-manifest.json'),
      'utf-8'
    )

    // Check for known heavy dependencies that should be excluded
    expect(buildInfo).not.toContain('moment') // Use date-fns instead
    expect(buildInfo).not.toContain('lodash') // Use lodash-es or tree-shakeable imports
  })

  it('should use dynamic imports for heavy components', async () => {
    const pageFiles = glob.sync('app/**/page.tsx')

    for (const file of pageFiles) {
      const content = readFileSync(file, 'utf-8')

      // Check for PDF viewer, charts, etc with dynamic imports
      if (content.includes('PDFViewer') || content.includes('Chart')) {
        expect(content).toMatch(/dynamic\(/)
      }
    }
  })
})
```

**Example Test - Lighthouse**:
```typescript
// __tests__/performance/lighthouse.test.ts
import { describe, it, expect } from 'vitest'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

describe('Lighthouse Scores', () => {
  it('should achieve 90+ performance score', async () => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
    const options = { port: chrome.port }

    const runnerResult = await lighthouse('http://localhost:3000', options)
    const score = runnerResult.lhr.categories.performance.score * 100

    await chrome.kill()

    expect(score).toBeGreaterThanOrEqual(90)
  })

  it('should achieve 90+ accessibility score', async () => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
    const options = { port: chrome.port }

    const runnerResult = await lighthouse('http://localhost:3000', options)
    const score = runnerResult.lhr.categories.accessibility.score * 100

    await chrome.kill()

    expect(score).toBeGreaterThanOrEqual(90)
  })

  it('should achieve 90+ best practices score', async () => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
    const options = { port: chrome.port }

    const runnerResult = await lighthouse('http://localhost:3000', options)
    const score = runnerResult.lhr.categories['best-practices'].score * 100

    await chrome.kill()

    expect(score).toBeGreaterThanOrEqual(90)
  })

  it('should have total blocking time <300ms', async () => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
    const options = { port: chrome.port }

    const runnerResult = await lighthouse('http://localhost:3000', options)
    const tbt = runnerResult.lhr.audits['total-blocking-time'].numericValue

    await chrome.kill()

    expect(tbt).toBeLessThan(300)
  })

  it('should have first contentful paint <1.8s', async () => {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
    const options = { port: chrome.port }

    const runnerResult = await lighthouse('http://localhost:3000', options)
    const fcp = runnerResult.lhr.audits['first-contentful-paint'].numericValue

    await chrome.kill()

    expect(fcp).toBeLessThan(1800)
  })
})
```

**Load Testing with k6**:
```javascript
// scripts/load-test.k6.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 users
    { duration: '1m', target: 50 },   // Ramp-up to 50 users
    { duration: '2m', target: 100 },  // Ramp-up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp-down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests <2s
    'errors': ['rate<0.1'],              // Error rate <10%
  },
}

export default function () {
  // Test POST /api/requests
  const createPayload = JSON.stringify({
    departure_airport: 'KTEB',
    arrival_airport: 'KVNY',
    passengers: 6,
    departure_date: '2025-11-15'
  })

  const createRes = http.post('http://localhost:3000/api/requests', createPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`
    }
  })

  check(createRes, {
    'status is 201': (r) => r.status === 201,
    'response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1)

  sleep(1)

  // Test GET /api/requests
  const listRes = http.get('http://localhost:3000/api/requests', {
    headers: {
      'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`
    }
  })

  check(listRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1)

  sleep(1)

  // Test GET /api/requests/:id
  if (createRes.status === 201) {
    const requestId = createRes.json('id')

    const getRes = http.get(`http://localhost:3000/api/requests/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`
      }
    })

    check(getRes, {
      'status is 200': (r) => r.status === 200,
      'response time < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1)
  }

  sleep(1)
}
```

**Run Load Tests**:
```bash
k6 run scripts/load-test.k6.js
# Expected: Initially may fail performance thresholds
```

### Step 2: Implement Optimizations (Green Phase)

**API Optimizations**:
```typescript
// lib/db/connection-pool.ts
import { Pool } from 'pg'

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export default pool
```

**Bundle Optimizations**:
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
          },
        },
      }
    }
    return config
  },
}
```

**Image Optimizations**:
```typescript
// components/OptimizedImage.tsx
import Image from 'next/image'

export function OptimizedImage({ src, alt, ...props }: ImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      loading="lazy"
      quality={85}
      {...props}
    />
  )
}
```

**React Optimizations**:
```typescript
// components/RequestList.tsx
import { memo, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

const RequestItem = memo(({ request }: { request: Request }) => {
  return <div>{request.departure_airport} → {request.arrival_airport}</div>
})

export function RequestList({ requests }: { requests: Request[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: requests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <RequestItem request={requests[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Run Tests Again**:
```bash
npm run test:performance
k6 run scripts/load-test.k6.js
# Expected: Tests now pass ✓
```

### Step 3: Refactor and Fine-Tune (Blue Phase)

- Monitor production metrics
- Identify bottlenecks with profiling
- Implement caching strategies
- Optimize database queries further

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] All previous tasks completed
- [ ] Performance monitoring tools installed
- [ ] Lighthouse CI configured
- [ ] k6 load testing tool installed

### Step-by-Step Implementation

**Step 1**: Analyze Current Performance
```bash
# Run Lighthouse
npx lighthouse http://localhost:3000 --view

# Analyze bundle
npx @next/bundle-analyzer

# Check API response times
npm run perf:api
```

**Step 2**: Optimize API Routes
- Add database indexes
- Implement Redis caching
- Optimize queries (remove N+1)
- Configure connection pooling

**Step 3**: Optimize Bundle Size
- Remove unused dependencies
- Implement code splitting
- Use dynamic imports
- Tree shake libraries

**Step 4**: Optimize Images
- Compress all images
- Use Next.js Image component
- Implement lazy loading
- Generate responsive sizes

**Step 5**: Optimize React Components
- Eliminate unnecessary re-renders
- Add useMemo/useCallback
- Implement virtualization
- Lazy load components

**Step 6**: Run Lighthouse Audits
```bash
npm run lighthouse
```

**Step 7**: Run Load Tests
```bash
k6 run scripts/load-test.k6.js
```

**Step 8**: Document Performance Benchmarks
- API response times
- Bundle sizes
- Lighthouse scores
- Load test results

### Implementation Validation

- [ ] All performance tests pass
- [ ] Lighthouse scores ≥90
- [ ] Load tests pass with 100 users
- [ ] No regressions in functionality

---

## 5. GIT WORKFLOW

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b perf/optimization-and-benchmarking
```

### Commit Guidelines
```bash
git add lib/db/connection-pool.ts
git commit -m "perf(api): add database connection pooling for better performance"

git add next.config.js
git commit -m "perf(bundle): implement code splitting and tree shaking"

git add components/OptimizedImage.tsx
git commit -m "perf(images): use Next.js Image component with lazy loading"

git add __tests__/performance/
git commit -m "test(perf): add performance tests and benchmarks"

git push origin perf/optimization-and-benchmarking
```

### Pull Request
```bash
gh pr create --title "Performance: Optimization & Benchmarking" \
  --body "Implements performance optimizations and benchmarking.

**Improvements:**
- API response times: 3.5s → 1.2s (66% improvement)
- Bundle size: 450KB → 180KB (60% reduction)
- Lighthouse Performance: 65 → 92 (+27 points)
- Load testing: Successfully handles 100+ concurrent users

**Optimizations:**
- Database connection pooling
- Redis caching for frequent queries
- Code splitting and tree shaking
- Image optimization with Next.js Image
- React component virtualization
- Eliminated unnecessary re-renders

Closes #TASK-029"
```

---

## 6. CODE REVIEW CHECKLIST

### Performance Metrics
- [ ] All API routes <2s (95th percentile)
- [ ] Bundle size <200KB gzipped
- [ ] Lighthouse scores ≥90
- [ ] Load tests pass with 100 users

### Optimizations
- [ ] Database queries optimized
- [ ] Caching implemented
- [ ] Code splitting configured
- [ ] Images optimized
- [ ] React components optimized

---

## 7. TESTING REQUIREMENTS

### Performance Tests
```bash
# API response times
npm run test:perf:api

# Bundle size
npm run test:perf:bundle

# Lighthouse
npm run test:perf:lighthouse

# Load testing
k6 run scripts/load-test.k6.js
```

### Benchmarks
- API: <2s (95th percentile)
- Bundle: <200KB gzipped
- Lighthouse: ≥90 all categories
- Load: 100+ concurrent users

---

## 8. DEFINITION OF DONE

- [ ] All API routes <2s response time
- [ ] Bundle size <200KB gzipped
- [ ] All images optimized
- [ ] Lighthouse scores ≥90
- [ ] Load tests pass
- [ ] Performance benchmarks documented
- [ ] Code review approved
- [ ] PR merged

---

## 9. RESOURCES & REFERENCES

### Documentation
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [k6 Load Testing](https://k6.io/docs/)
- [React Performance](https://react.dev/learn/render-and-commit)

### Related Tasks
- TASK-002: Database Schema
- TASK-018: API Routes
- TASK-020: Dashboard Pages
- TASK-031: Database Query Optimization

---

## 10. NOTES & QUESTIONS

### Implementation Notes
- Use React DevTools Profiler to identify re-render issues
- Monitor production with Vercel Analytics
- Set up performance budgets in CI/CD

### Open Questions
- [ ] Should we implement edge caching?
- [ ] Do we need CDN for static assets?

### Assumptions
- 100 concurrent users is sufficient for MVP
- <2s API response acceptable

---

## 11. COMPLETION SUMMARY

### What Was Accomplished
[Fill out after completion]

### Performance Improvements
- API response time: X → Y
- Bundle size: X → Y
- Lighthouse score: X → Y

### Time Tracking
- **Estimated**: 10 hours
- **Actual**: X hours

---

**Task Status**: ⏳ PENDING
