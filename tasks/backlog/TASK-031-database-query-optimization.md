# Database Query Optimization

**Task ID**: TASK-031
**Created**: 2025-10-20
**Assigned To**: Database Engineer / Backend Developer
**Status**: `pending`
**Priority**: `normal`
**Estimated Time**: 8 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Optimize database query performance through query analysis, index optimization, N+1 query elimination, connection pool tuning, query result caching, materialized views for reports, and EXPLAIN ANALYZE for identifying slow queries.

### User Story
**As a** user
**I want** database operations to be fast and responsive
**So that** the application loads quickly and I don't experience delays when viewing requests, quotes, or proposals

### Business Value
Database performance is critical for application responsiveness and scalability. Slow queries can bottleneck the entire system, causing timeouts, poor user experience, and infrastructure scaling costs. Optimizing queries reduces API response times by 50-70%, supports 10x more concurrent users, and reduces database costs by 40%. Essential for achieving the <2s API response time goal.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: System SHALL analyze query performance
- Identify slow queries (>100ms)
- Use EXPLAIN ANALYZE for optimization
- Track query execution plans
- Monitor query frequency and impact

**FR-2**: System SHALL optimize database indexes
- Create indexes for frequently queried columns
- Remove unused indexes
- Use composite indexes for multi-column queries
- Monitor index usage statistics
- Ensure indexes don't slow down writes

**FR-3**: System SHALL eliminate N+1 queries
- Use joins instead of sequential queries
- Implement eager loading where appropriate
- Batch queries using `whereIn` or `IN` clauses
- Use database views for complex joins

**FR-4**: System SHALL tune connection pooling
- Configure optimal pool size (20-50 connections)
- Set appropriate timeouts
- Monitor connection usage
- Prevent connection exhaustion

**FR-5**: System SHALL implement query result caching
- Cache frequently accessed data (client profiles, airports)
- Use Redis for cache layer
- Set appropriate TTLs (5-60 minutes)
- Invalidate cache on updates

**FR-6**: System SHALL create materialized views for reports
- Analytics queries use materialized views
- Refresh views periodically or on demand
- Reduce report generation time by 80%

**FR-7**: System SHALL monitor query performance
- Log slow queries (>100ms)
- Track P50, P95, P99 query times
- Set up alerts for performance degradation
- Dashboard for query metrics

### Acceptance Criteria

- [ ] **AC-1**: All queries <100ms (95th percentile)
- [ ] **AC-2**: Indexes created for all foreign keys
- [ ] **AC-3**: No N+1 query patterns found
- [ ] **AC-4**: Connection pool configured optimally
- [ ] **AC-5**: Caching implemented for read-heavy tables
- [ ] **AC-6**: Materialized views for reports
- [ ] **AC-7**: Slow query logging enabled
- [ ] **AC-8**: Query performance monitoring dashboard
- [ ] **AC-9**: EXPLAIN ANALYZE results documented
- [ ] **AC-10**: Database performance improved by 50%+
- [ ] **AC-11**: Code review approved

### Non-Functional Requirements

- **Performance**: Queries <100ms (95th percentile)
- **Scalability**: Support 1000+ queries/second
- **Reliability**: No query timeouts
- **Observability**: All slow queries logged

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Performance Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/database/query-performance.test.ts
__tests__/database/n-plus-one.test.ts
__tests__/database/index-usage.test.ts
__tests__/database/connection-pool.test.ts
scripts/analyze-queries.sql
scripts/create-indexes.sql
scripts/create-materialized-views.sql
```

**Example Test - Query Performance**:
```typescript
// __tests__/database/query-performance.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { measureQueryTime } from '../helpers/performance'

describe('Database Query Performance', () => {
  let supabase: any

  beforeAll(() => {
    supabase = createClient()
  })

  it('should fetch flight requests in <50ms', async () => {
    const startTime = Date.now()

    const { data, error } = await supabase
      .from('flight_requests')
      .select('*')
      .eq('user_id', 'test-user-id')
      .limit(20)

    const duration = Date.now() - startTime

    expect(error).toBeNull()
    expect(duration).toBeLessThan(50)
  })

  it('should fetch single request with quotes in <100ms', async () => {
    const startTime = Date.now()

    const { data, error } = await supabase
      .from('flight_requests')
      .select(`
        *,
        quotes (*)
      `)
      .eq('id', 'test-request-id')
      .single()

    const duration = Date.now() - startTime

    expect(error).toBeNull()
    expect(duration).toBeLessThan(100)
  })

  it('should fetch request with all related data in <200ms', async () => {
    const startTime = Date.now()

    const { data, error } = await supabase
      .from('flight_requests')
      .select(`
        *,
        quotes (*),
        proposals (*),
        workflow_history (*),
        clients (*)
      `)
      .eq('id', 'test-request-id')
      .single()

    const duration = Date.now() - startTime

    expect(error).toBeNull()
    expect(duration).toBeLessThan(200)
  })

  it('should fetch requests with filter and sort in <75ms', async () => {
    const startTime = Date.now()

    const { data, error } = await supabase
      .from('flight_requests')
      .select('*')
      .eq('user_id', 'test-user-id')
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(20)

    const duration = Date.now() - startTime

    expect(error).toBeNull()
    expect(duration).toBeLessThan(75)
  })

  it('should perform full-text search in <100ms', async () => {
    const startTime = Date.now()

    const { data, error } = await supabase
      .from('flight_requests')
      .select('*')
      .eq('user_id', 'test-user-id')
      .textSearch('departure_airport', 'KTEB')

    const duration = Date.now() - startTime

    expect(error).toBeNull()
    expect(duration).toBeLessThan(100)
  })
})
```

**Example Test - N+1 Query Detection**:
```typescript
// __tests__/database/n-plus-one.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createClient } from '@/lib/supabase/server'

describe('N+1 Query Detection', () => {
  it('should not have N+1 when fetching requests with quotes', async () => {
    const supabase = createClient()
    const querySpy = vi.spyOn(supabase, 'from')

    // Fetch 10 requests with their quotes
    const { data: requests } = await supabase
      .from('flight_requests')
      .select(`
        *,
        quotes (*)
      `)
      .limit(10)

    // Should only execute 1 query (with join), not 11 queries
    expect(querySpy).toHaveBeenCalledTimes(1)
  })

  it('should batch load client data instead of N queries', async () => {
    const supabase = createClient()

    // Get all unique client IDs from requests
    const { data: requests } = await supabase
      .from('flight_requests')
      .select('client_id')
      .limit(10)

    const clientIds = [...new Set(requests?.map(r => r.client_id))]

    const querySpy = vi.spyOn(supabase, 'from')

    // Fetch all clients in one query
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .in('id', clientIds)

    // Should be 1 query, not N queries
    expect(querySpy).toHaveBeenCalledTimes(1)
  })

  it('should use materialized view for analytics instead of complex joins', async () => {
    const supabase = createClient()

    const startTime = Date.now()

    // Use materialized view
    const { data } = await supabase
      .from('request_analytics_mv')
      .select('*')
      .gte('created_at', '2025-01-01')

    const duration = Date.now() - startTime

    // Should be fast (<50ms) because it's pre-computed
    expect(duration).toBeLessThan(50)
  })
})
```

**Example Test - Index Usage**:
```typescript
// __tests__/database/index-usage.test.ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@/lib/supabase/server'

describe('Index Usage', () => {
  it('should use index for user_id lookups', async () => {
    const supabase = createClient()

    // This should use idx_flight_requests_user_id
    const { data, error } = await supabase
      .from('flight_requests')
      .select('*')
      .eq('user_id', 'test-user-id')

    expect(error).toBeNull()

    // Verify EXPLAIN shows index usage
    const explain = await executeSQL(`
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT * FROM flight_requests WHERE user_id = 'test-user-id'
    `)

    expect(explain).toContain('Index Scan')
    expect(explain).toContain('idx_flight_requests_user_id')
  })

  it('should use composite index for status + created_at queries', async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('flight_requests')
      .select('*')
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(20)

    // Verify composite index usage
    const explain = await executeSQL(`
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT * FROM flight_requests
      WHERE status = 'COMPLETED'
      ORDER BY created_at DESC
      LIMIT 20
    `)

    expect(explain).toContain('Index Scan')
    expect(explain).toContain('idx_flight_requests_status_created_at')
  })

  it('should not perform sequential scans on large tables', async () => {
    const explain = await executeSQL(`
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT * FROM flight_requests WHERE user_id = 'test-user-id'
    `)

    expect(explain).not.toContain('Seq Scan on flight_requests')
  })
})
```

**SQL Analysis Scripts**:
```sql
-- scripts/analyze-queries.sql

-- Find slow queries (>100ms)
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes (sequential scans on large tables)
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan AS avg_seq_tup
FROM pg_stat_user_tables
WHERE seq_scan > 0
  AND schemaname = 'public'
  AND seq_tup_read / seq_scan > 10000
ORDER BY seq_tup_read DESC;

-- Analyze table bloat
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::text)) AS total_size,
  pg_size_pretty(pg_relation_size(tablename::text)) AS table_size,
  pg_size_pretty(pg_total_relation_size(tablename::text) - pg_relation_size(tablename::text)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;
```

**Run Tests** (should FAIL initially):
```bash
npm run test:db:performance
# Expected: Queries exceed time thresholds
```

### Step 2: Implement Optimizations (Green Phase)

**Create Indexes**:
```sql
-- scripts/create-indexes.sql

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_flight_requests_user_id
  ON flight_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_flight_requests_client_id
  ON flight_requests(client_id);

CREATE INDEX IF NOT EXISTS idx_quotes_request_id
  ON quotes(request_id);

CREATE INDEX IF NOT EXISTS idx_proposals_request_id
  ON proposals(request_id);

CREATE INDEX IF NOT EXISTS idx_proposals_quote_id
  ON proposals(quote_id);

CREATE INDEX IF NOT EXISTS idx_workflow_history_request_id
  ON workflow_history(request_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_flight_requests_user_status_created
  ON flight_requests(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flight_requests_status_created
  ON flight_requests(status, created_at DESC);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_flight_requests_departure_airport
  ON flight_requests USING gin(to_tsvector('english', departure_airport));

CREATE INDEX IF NOT EXISTS idx_flight_requests_arrival_airport
  ON flight_requests USING gin(to_tsvector('english', arrival_airport));

-- Partial indexes (for specific queries)
CREATE INDEX IF NOT EXISTS idx_flight_requests_active
  ON flight_requests(user_id, created_at DESC)
  WHERE status NOT IN ('COMPLETED', 'CANCELLED', 'FAILED');

-- Update statistics
ANALYZE flight_requests;
ANALYZE quotes;
ANALYZE proposals;
ANALYZE workflow_history;
```

**Optimize Connection Pool**:
```typescript
// lib/db/pool.ts
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,

  // Connection pool settings
  max: 20,                      // Max connections
  min: 5,                       // Min connections to keep alive
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout for acquiring connection
  maxUses: 7500,                // Recycle connections after 7500 uses

  // Performance settings
  statement_timeout: 5000,      // 5s statement timeout
  query_timeout: 5000,          // 5s query timeout
})

// Monitor pool
pool.on('connect', () => {
  console.log('New database connection established')
})

pool.on('error', (err) => {
  console.error('Database pool error:', err)
})

export default pool
```

**Implement Caching**:
```typescript
// lib/cache/query-cache.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!
})

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  // Try cache first
  const cached = await redis.get<T>(key)
  if (cached) {
    return cached
  }

  // Execute query
  const result = await queryFn()

  // Cache result
  await redis.set(key, result, { ex: ttl })

  return result
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}

// Usage example
export async function getFlightRequest(id: string) {
  return cachedQuery(
    `flight_request:${id}`,
    async () => {
      const { data } = await supabase
        .from('flight_requests')
        .select('*')
        .eq('id', id)
        .single()
      return data
    },
    300 // Cache for 5 minutes
  )
}
```

**Create Materialized Views**:
```sql
-- scripts/create-materialized-views.sql

-- Analytics view for reports
CREATE MATERIALIZED VIEW IF NOT EXISTS request_analytics_mv AS
SELECT
  fr.id,
  fr.user_id,
  fr.status,
  fr.created_at,
  fr.departure_airport,
  fr.arrival_airport,
  fr.passengers,
  COUNT(DISTINCT q.id) AS quote_count,
  AVG(q.base_price) AS avg_quote_price,
  MIN(q.base_price) AS min_quote_price,
  MAX(q.base_price) AS max_quote_price,
  COUNT(DISTINCT p.id) AS proposal_count,
  MAX(wh.created_at) AS last_workflow_update
FROM flight_requests fr
LEFT JOIN quotes q ON q.request_id = fr.id
LEFT JOIN proposals p ON p.request_id = fr.id
LEFT JOIN workflow_history wh ON wh.request_id = fr.id
GROUP BY fr.id;

-- Create index on materialized view
CREATE INDEX idx_request_analytics_mv_user_created
  ON request_analytics_mv(user_id, created_at DESC);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_request_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY request_analytics_mv;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh every hour
-- (Set up in pg_cron or external scheduler)
```

**Eliminate N+1 Queries**:
```typescript
// lib/queries/flight-requests.ts
export async function getFlightRequestsWithRelations(userId: string) {
  // GOOD: Single query with joins
  const { data, error } = await supabase
    .from('flight_requests')
    .select(`
      *,
      client:clients(*),
      quotes(*),
      proposals(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return data
}

// BAD: N+1 query pattern (avoid this)
export async function getFlightRequestsBAD(userId: string) {
  const { data: requests } = await supabase
    .from('flight_requests')
    .select('*')
    .eq('user_id', userId)

  // N+1: Separate query for each request
  for (const request of requests || []) {
    const { data: quotes } = await supabase
      .from('quotes')
      .select('*')
      .eq('request_id', request.id)

    request.quotes = quotes
  }

  return requests
}
```

**Run Tests Again**:
```bash
npm run test:db:performance
# Expected: All tests now pass ✓
```

### Step 3: Monitor and Fine-Tune (Blue Phase)

- Monitor query performance in production
- Adjust indexes based on usage
- Tune cache TTLs
- Optimize slow queries further

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] TASK-002 (Database Schema) completed
- [ ] TASK-005 (Supabase Client) completed
- [ ] Access to database for EXPLAIN ANALYZE
- [ ] Redis configured for caching

### Step-by-Step Implementation

**Step 1**: Analyze Current Performance
```bash
# Run query analysis
psql $DATABASE_URL -f scripts/analyze-queries.sql

# Identify slow queries
# Identify missing indexes
# Identify N+1 patterns
```

**Step 2**: Create Indexes
```bash
psql $DATABASE_URL -f scripts/create-indexes.sql
```

**Step 3**: Optimize Connection Pool
- Configure pool settings
- Monitor connection usage
- Tune parameters

**Step 4**: Implement Query Caching
- Set up Redis
- Add caching layer
- Implement invalidation

**Step 5**: Create Materialized Views
```bash
psql $DATABASE_URL -f scripts/create-materialized-views.sql
```

**Step 6**: Eliminate N+1 Queries
- Review all queries
- Replace with joins
- Implement eager loading

**Step 7**: Run EXPLAIN ANALYZE
```bash
# For each major query
EXPLAIN (ANALYZE, BUFFERS) SELECT ...
```

**Step 8**: Run Performance Tests
```bash
npm run test:db:performance
```

**Step 9**: Document Optimizations
- Index strategy
- Caching strategy
- Query patterns

### Implementation Validation

- [ ] All queries <100ms
- [ ] Indexes created
- [ ] No N+1 patterns
- [ ] Caching working
- [ ] Performance tests pass

---

## 5. GIT WORKFLOW

### Branch Creation
```bash
git checkout main
git pull origin main
git checkout -b perf/database-query-optimization
```

### Commit Guidelines
```bash
git add scripts/create-indexes.sql
git commit -m "perf(db): add indexes for frequently queried columns"

git add lib/db/pool.ts
git commit -m "perf(db): optimize connection pool configuration"

git add lib/cache/query-cache.ts
git commit -m "perf(db): implement Redis query result caching"

git add scripts/create-materialized-views.sql
git commit -m "perf(db): create materialized views for analytics"

git push origin perf/database-query-optimization
```

### Pull Request
```bash
gh pr create --title "Performance: Database Query Optimization" \
  --body "Implements comprehensive database performance optimizations.

**Improvements:**
- Query times: 450ms → 65ms average (86% improvement)
- Eliminated all N+1 query patterns
- Added 12 strategic indexes
- Implemented Redis query caching
- Created materialized views for reports

**Optimizations:**
- Foreign key indexes
- Composite indexes for common queries
- Connection pool tuning (20 max connections)
- Query result caching (5-60min TTL)
- Materialized views for analytics
- Eliminated N+1 queries

**Results:**
- All queries <100ms (95th percentile)
- 70% reduction in database load
- 50% improvement in API response times

Closes #TASK-031"
```

---

## 6-11. STANDARD SECTIONS

### Code Review Checklist
- [ ] All queries <100ms
- [ ] Indexes created and used
- [ ] No N+1 patterns
- [ ] Connection pool configured
- [ ] Caching implemented
- [ ] EXPLAIN ANALYZE reviewed

### Testing Requirements
```bash
npm run test:db:performance
npm run test:db:n-plus-one
npm run test:db:index-usage
```

### Definition of Done
- [ ] All queries <100ms
- [ ] Indexes optimized
- [ ] N+1 queries eliminated
- [ ] Caching implemented
- [ ] Performance tests pass
- [ ] Documentation complete
- [ ] Code review approved

### Resources & References
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Supabase Performance](https://supabase.com/docs/guides/database/performance)
- [Database Indexing Guide](https://use-the-index-luke.com/)

### Related Tasks
- TASK-002: Database Schema
- TASK-005: Supabase Client
- TASK-029: Performance Optimization

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
