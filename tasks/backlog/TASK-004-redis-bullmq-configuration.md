# Redis Setup & BullMQ Configuration

**Task ID**: TASK-004
**Created**: 2025-10-20
**Assigned To**: Backend Developer
**Status**: `pending`
**Priority**: `high`
**Estimated Time**: 6 hours
**Actual Time**: - (update when complete)

---

## 1. TASK OVERVIEW

### Objective
Set up Redis for caching and job queue management, configure BullMQ for background job processing, and implement the queue infrastructure to support asynchronous AI agent workflows.

### User Story
**As a** backend developer
**I want** a reliable job queue system with Redis and BullMQ
**So that** AI agents can process requests asynchronously without blocking API responses

### Business Value
Redis and BullMQ enable asynchronous processing of long-running AI agent workflows. This improves user experience by providing immediate API responses while work continues in the background, and allows for retry logic, job prioritization, and monitoring.

---

## 2. REQUIREMENTS & ACCEPTANCE CRITERIA

### Functional Requirements

**FR-1**: Redis SHALL be running and accessible
- Local Redis instance for development
- Cloud Redis (Upstash) option for production
- Connection pool management
- Health check endpoint

**FR-2**: BullMQ SHALL manage job queues
- Queue for each agent type (orchestrator, flight-search, etc.)
- Job retry logic with exponential backoff
- Job priority levels (urgent, high, normal, low)
- Dead letter queue for failed jobs

**FR-3**: Queue monitoring SHALL be available
- Dashboard for queue visualization
- Job status tracking
- Failed job inspection
- Performance metrics

**FR-4**: Worker processes SHALL consume jobs
- Worker for each queue type
- Concurrent job processing
- Graceful shutdown handling
- Error recovery

### Acceptance Criteria

- [ ] **AC-1**: Redis running locally via Docker
- [ ] **AC-2**: Redis connection tested and verified
- [ ] **AC-3**: BullMQ queues created for all 6 agent types
- [ ] **AC-4**: Can add jobs to queue programmatically
- [ ] **AC-5**: Worker processes consume and complete jobs
- [ ] **AC-6**: Failed jobs retry with exponential backoff
- [ ] **AC-7**: Queue monitoring dashboard accessible
- [ ] **AC-8**: Job status can be queried by ID
- [ ] **AC-9**: Graceful shutdown prevents job loss
- [ ] **AC-10**: Performance metrics tracked (job duration, queue depth)
- [ ] **AC-11**: Tests written and passing (>75% coverage)

### Non-Functional Requirements

- **Performance**: Jobs processed within 5 minutes on average
- **Reliability**: No job loss during shutdown
- **Scalability**: Support 100+ concurrent jobs
- **Observability**: Full visibility into queue status

---

## 3. TEST-DRIVEN DEVELOPMENT (TDD) APPROACH

### Step 1: Write Tests FIRST (Red Phase)

**Test Files to Create**:
```
__tests__/unit/queue/redis-connection.test.ts
__tests__/unit/queue/bullmq-queue.test.ts
__tests__/integration/queue/job-processing.test.ts
```

**Example Test (Write This First)**:
```typescript
// __tests__/unit/queue/redis-connection.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createRedisClient } from '@/lib/queue/redis'

describe('Redis Connection', () => {
  let redis: any

  beforeAll(async () => {
    redis = await createRedisClient()
  })

  afterAll(async () => {
    await redis.disconnect()
  })

  it('should connect to Redis successfully', async () => {
    const pong = await redis.ping()
    expect(pong).toBe('PONG')
  })

  it('should set and get values', async () => {
    await redis.set('test-key', 'test-value')
    const value = await redis.get('test-key')
    expect(value).toBe('test-value')

    // Cleanup
    await redis.del('test-key')
  })

  it('should handle connection errors gracefully', async () => {
    // Create client with invalid URL
    const invalidRedis = await createRedisClient('redis://invalid:9999')

    await expect(invalidRedis.ping()).rejects.toThrow()
    await invalidRedis.disconnect()
  })
})
```

**BullMQ Queue Test**:
```typescript
// __tests__/unit/queue/bullmq-queue.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Queue } from 'bullmq'
import { createQueue, QueueName } from '@/lib/queue/queues'

describe('BullMQ Queues', () => {
  let queue: Queue

  beforeEach(async () => {
    queue = createQueue(QueueName.ORCHESTRATOR)
  })

  afterEach(async () => {
    await queue.obliterate({ force: true })
    await queue.close()
  })

  it('should create queue successfully', () => {
    expect(queue).toBeDefined()
    expect(queue.name).toBe('orchestrator')
  })

  it('should add job to queue', async () => {
    const job = await queue.add('process-request', {
      requestId: 'test-123',
      userId: 'user-456'
    })

    expect(job).toBeDefined()
    expect(job.id).toBeDefined()
    expect(job.data.requestId).toBe('test-123')
  })

  it('should add job with priority', async () => {
    const urgentJob = await queue.add(
      'urgent-request',
      { requestId: 'urgent-123' },
      { priority: 1 } // Higher priority = processed first
    )

    const normalJob = await queue.add(
      'normal-request',
      { requestId: 'normal-123' },
      { priority: 10 }
    )

    const jobs = await queue.getJobs(['waiting'])
    expect(jobs[0].id).toBe(urgentJob.id) // Urgent job first
  })

  it('should retrieve job status', async () => {
    const job = await queue.add('test-job', { data: 'test' })
    const retrievedJob = await queue.getJob(job.id!)

    expect(retrievedJob).toBeDefined()
    expect(retrievedJob?.data).toEqual({ data: 'test' })
  })
})
```

**Job Processing Integration Test**:
```typescript
// __tests__/integration/queue/job-processing.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Queue, Worker } from 'bullmq'
import { createQueue, QueueName } from '@/lib/queue/queues'
import { createWorker } from '@/lib/queue/workers'

describe('Job Processing', () => {
  let queue: Queue
  let worker: Worker

  beforeEach(async () => {
    queue = createQueue(QueueName.ORCHESTRATOR)
  })

  afterEach(async () => {
    await worker.close()
    await queue.obliterate({ force: true })
    await queue.close()
  })

  it('should process job successfully', async () => {
    let processedData: any = null

    worker = createWorker(QueueName.ORCHESTRATOR, async (job) => {
      processedData = job.data
      return { success: true }
    })

    await queue.add('test-job', { requestId: 'test-123' })

    // Wait for job to be processed
    await new Promise(resolve => setTimeout(resolve, 1000))

    expect(processedData).toEqual({ requestId: 'test-123' })
  })

  it('should retry failed jobs', async () => {
    let attemptCount = 0

    worker = createWorker(QueueName.ORCHESTRATOR, async (job) => {
      attemptCount++
      if (attemptCount < 3) {
        throw new Error('Temporary failure')
      }
      return { success: true, attempts: attemptCount }
    })

    await queue.add('retry-job', { data: 'test' }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 100 }
    })

    // Wait for retries
    await new Promise(resolve => setTimeout(resolve, 2000))

    expect(attemptCount).toBe(3)
  })

  it('should move failed jobs to failed queue', async () => {
    worker = createWorker(QueueName.ORCHESTRATOR, async () => {
      throw new Error('Permanent failure')
    })

    const job = await queue.add('failing-job', { data: 'test' }, {
      attempts: 1
    })

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000))

    const failedJobs = await queue.getFailed()
    expect(failedJobs.length).toBeGreaterThan(0)
    expect(failedJobs[0].failedReason).toContain('Permanent failure')
  })
})
```

**Run Tests** (should FAIL):
```bash
npm test -- queue
# Expected: Tests fail because queue infrastructure doesn't exist
```

### Step 2: Implement Minimal Code (Green Phase)

Implement Redis client, BullMQ queues, and workers.

### Step 3: Refactor (Blue Phase)

Optimize queue configuration and error handling.

---

## 4. IMPLEMENTATION STEPS

### Pre-Implementation Checklist

- [ ] Review BullMQ documentation
- [ ] Docker installed for local Redis
- [ ] Redis environment variables configured

### Step-by-Step Implementation

**Step 1**: Start Redis Server

```bash
# Using Docker (recommended for development)
docker run -d \
  --name redis-jetvision \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:latest \
  redis-server --appendonly yes

# Verify Redis is running
docker ps | grep redis
redis-cli ping  # Should return PONG
```

**Step 2**: Install BullMQ Dependencies

```bash
npm install bullmq ioredis
npm install -D @types/ioredis
```

**Step 3**: Create Redis Client

File: `lib/queue/redis.ts`
```typescript
import { Redis, RedisOptions } from 'ioredis'

let redisClient: Redis | null = null

export interface RedisConfig {
  host?: string
  port?: number
  password?: string
  maxRetriesPerRequest?: number
}

export async function createRedisClient(
  url?: string,
  config?: RedisConfig
): Promise<Redis> {
  const redisUrl = url || process.env.REDIS_URL || 'redis://localhost:6379'

  const options: RedisOptions = {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: true,
    ...config
  }

  const client = new Redis(redisUrl, options)

  client.on('error', (error) => {
    console.error('Redis connection error:', error)
  })

  client.on('connect', () => {
    console.log('✅ Redis connected successfully')
  })

  return client
}

export async function getRedisClient(): Promise<Redis> {
  if (!redisClient) {
    redisClient = await createRedisClient()
  }
  return redisClient
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}
```

**Step 4**: Define Queue Names and Types

File: `lib/queue/types.ts`
```typescript
export enum QueueName {
  ORCHESTRATOR = 'orchestrator',
  CLIENT_DATA = 'client-data',
  FLIGHT_SEARCH = 'flight-search',
  PROPOSAL_ANALYSIS = 'proposal-analysis',
  COMMUNICATION = 'communication',
  ERROR_MONITOR = 'error-monitor'
}

export interface BaseJobData {
  requestId: string
  userId: string
  priority?: 'urgent' | 'high' | 'normal' | 'low'
}

export interface OrchestratorJobData extends BaseJobData {
  type: 'analyze-request'
  message: string
  clientEmail?: string
}

export interface FlightSearchJobData extends BaseJobData {
  type: 'search-flights'
  departure: string
  arrival: string
  passengers: number
  date: string
}

export interface ProposalAnalysisJobData extends BaseJobData {
  type: 'analyze-quotes'
  quotes: Array<{
    id: string
    operatorName: string
    price: number
  }>
}

export interface CommunicationJobData extends BaseJobData {
  type: 'send-proposal'
  proposalId: string
  recipientEmail: string
}

export type JobData =
  | OrchestratorJobData
  | FlightSearchJobData
  | ProposalAnalysisJobData
  | CommunicationJobData
  | BaseJobData
```

**Step 5**: Create Queue Factory

File: `lib/queue/queues.ts`
```typescript
import { Queue, QueueOptions } from 'bullmq'
import { QueueName, JobData } from './types'
import { createRedisClient } from './redis'

const queues = new Map<QueueName, Queue>()

export function createQueue(
  name: QueueName,
  options?: Partial<QueueOptions>
): Queue<JobData> {
  if (queues.has(name)) {
    return queues.get(name)!
  }

  const defaultOptions: QueueOptions = {
    connection: createRedisClient() as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000 // Start with 2 seconds, exponentially increase
      },
      removeOnComplete: {
        age: 86400, // Keep completed jobs for 24 hours
        count: 1000 // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 604800 // Keep failed jobs for 7 days
      }
    },
    ...options
  }

  const queue = new Queue<JobData>(name, defaultOptions)

  queues.set(name, queue)

  return queue
}

export function getQueue(name: QueueName): Queue<JobData> | undefined {
  return queues.get(name)
}

export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map(q => q.close())
  await Promise.all(closePromises)
  queues.clear()
}

// Convenience functions for adding jobs
export async function addOrchestratorJob(data: OrchestratorJobData) {
  const queue = createQueue(QueueName.ORCHESTRATOR)
  return queue.add('orchestrator-job', data, {
    priority: getPriorityValue(data.priority)
  })
}

export async function addFlightSearchJob(data: FlightSearchJobData) {
  const queue = createQueue(QueueName.FLIGHT_SEARCH)
  return queue.add('flight-search-job', data, {
    priority: getPriorityValue(data.priority)
  })
}

function getPriorityValue(priority?: string): number {
  switch (priority) {
    case 'urgent': return 1
    case 'high': return 5
    case 'normal': return 10
    default: return 15
  }
}
```

**Step 6**: Create Worker Factory

File: `lib/queue/workers.ts`
```typescript
import { Worker, Job, WorkerOptions } from 'bullmq'
import { QueueName, JobData } from './types'
import { createRedisClient } from './redis'

type JobProcessor<T = JobData> = (job: Job<T>) => Promise<any>

const workers = new Map<QueueName, Worker>()

export function createWorker<T = JobData>(
  name: QueueName,
  processor: JobProcessor<T>,
  options?: Partial<WorkerOptions>
): Worker<T> {
  if (workers.has(name)) {
    return workers.get(name) as Worker<T>
  }

  const defaultOptions: WorkerOptions = {
    connection: createRedisClient() as any,
    concurrency: 5, // Process 5 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000 // per second
    },
    ...options
  }

  const worker = new Worker<T>(
    name,
    async (job) => {
      console.log(`Processing job ${job.id} from queue ${name}`)
      try {
        const result = await processor(job)
        console.log(`✅ Job ${job.id} completed successfully`)
        return result
      } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error)
        throw error
      }
    },
    defaultOptions
  )

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
  })

  worker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message)
  })

  worker.on('error', (error) => {
    console.error(`Worker error in ${name}:`, error)
  })

  workers.set(name, worker as Worker)

  return worker
}

export function getWorker(name: QueueName): Worker | undefined {
  return workers.get(name)
}

export async function closeAllWorkers(): Promise<void> {
  const closePromises = Array.from(workers.values()).map(w => w.close())
  await Promise.all(closePromises)
  workers.clear()
}

// Graceful shutdown handler
export async function gracefulShutdown(): Promise<void> {
  console.log('Shutting down workers gracefully...')

  // Stop accepting new jobs
  await closeAllWorkers()

  // Close Redis connection
  const { closeRedisClient } = await import('./redis')
  await closeRedisClient()

  console.log('Shutdown complete')
}

// Register shutdown handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
}
```

**Step 7**: Create Queue Dashboard Setup

File: `lib/queue/dashboard.ts`
```typescript
import { Queue } from 'bullmq'
import { QueueName } from './types'
import { createQueue } from './queues'

export interface QueueStats {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
}

export async function getQueueStats(name: QueueName): Promise<QueueStats> {
  const queue = createQueue(name)

  const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused()
  ])

  return {
    name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused: isPaused
  }
}

export async function getAllQueueStats(): Promise<QueueStats[]> {
  const stats = await Promise.all(
    Object.values(QueueName).map(name => getQueueStats(name as QueueName))
  )
  return stats
}

export async function getJobStatus(queueName: QueueName, jobId: string) {
  const queue = createQueue(queueName)
  const job = await queue.getJob(jobId)

  if (!job) {
    return null
  }

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: await job.progress(),
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
    state: await job.getState()
  }
}
```

**Step 8**: Create API Route for Queue Dashboard

File: `app/api/queue/stats/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { getAllQueueStats } from '@/lib/queue/dashboard'
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getAllQueueStats()
    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching queue stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue stats' },
      { status: 500 }
    )
  }
}
```

**Step 9**: Create Example Worker Implementation

File: `lib/workers/orchestrator-worker.ts`
```typescript
import { createWorker } from '@/lib/queue/workers'
import { QueueName, OrchestratorJobData } from '@/lib/queue/types'
import { Job } from 'bullmq'

export function startOrchestratorWorker() {
  return createWorker<OrchestratorJobData>(
    QueueName.ORCHESTRATOR,
    async (job: Job<OrchestratorJobData>) => {
      const { requestId, message, userId } = job.data

      console.log(`Processing request ${requestId} for user ${userId}`)

      // Update job progress
      await job.updateProgress(10)

      // Simulate orchestrator logic
      // In real implementation, this would call the AI agent
      await new Promise(resolve => setTimeout(resolve, 1000))

      await job.updateProgress(50)

      // More processing...
      await new Promise(resolve => setTimeout(resolve, 1000))

      await job.updateProgress(100)

      return {
        success: true,
        requestId,
        nextSteps: ['flight-search', 'client-data']
      }
    },
    {
      concurrency: 3
    }
  )
}

// Start worker if this file is run directly
if (require.main === module) {
  console.log('Starting Orchestrator Worker...')
  startOrchestratorWorker()
  console.log('Worker running. Press Ctrl+C to stop.')
}
```

**Step 10**: Add Queue Health Check

File: `app/api/health/queue/route.ts`
```typescript
import { NextResponse } from 'next/server'
import { getRedisClient } from '@/lib/queue/redis'

export async function GET() {
  try {
    const redis = await getRedisClient()
    const pong = await redis.ping()

    if (pong !== 'PONG') {
      throw new Error('Redis ping failed')
    }

    return NextResponse.json({
      status: 'healthy',
      redis: 'connected'
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: (error as Error).message
      },
      { status: 503 }
    )
  }
}
```

### Implementation Validation

- [ ] Redis responds to PING command
- [ ] Can add jobs to queue
- [ ] Worker processes jobs successfully
- [ ] Failed jobs retry automatically
- [ ] Queue stats API returns data
- [ ] Health check endpoint works

---

## 5. GIT WORKFLOW

```bash
git checkout -b feat/redis-bullmq-setup
git add lib/queue/
git add app/api/queue/
git add app/api/health/queue/
git commit -m "feat(queue): implement Redis and BullMQ infrastructure"
git push origin feat/redis-bullmq-setup
```

---

## 6. DEFINITION OF DONE

- [ ] Redis running and accessible
- [ ] BullMQ queues created for all 6 agent types
- [ ] Worker implementation complete
- [ ] Job retry logic working
- [ ] Queue monitoring API implemented
- [ ] Tests passing (>75% coverage)
- [ ] Documentation complete
- [ ] PR approved and merged

---

## 7. RESOURCES & REFERENCES

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [ioredis Documentation](https://github.com/luin/ioredis)

---

**Task Status**: ⏳ PENDING

**Completed By**: -
**Completed Date**: -
