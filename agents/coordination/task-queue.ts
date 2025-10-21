/**
 * Task Queue
 * Asynchronous task management using BullMQ
 */

import { Queue, Worker, type Job } from 'bullmq'
import type { AgentTask, AgentContext } from '../core/types'
import { Redis } from 'ioredis'

/**
 * Task Queue Configuration
 */
export interface TaskQueueConfig {
  redis?: {
    host: string
    port: number
    password?: string
  }
  queueName?: string
  concurrency?: number
}

/**
 * Task Job Data
 */
export interface TaskJobData {
  task: AgentTask
  context?: AgentContext
}

/**
 * Task Result
 */
export interface TaskResult {
  success: boolean
  data?: unknown
  error?: string
}

/**
 * Agent Task Queue
 * Manages asynchronous task execution
 */
export class AgentTaskQueue {
  private queue: Queue<TaskJobData, TaskResult>
  private worker?: Worker<TaskJobData, TaskResult>
  private config: TaskQueueConfig

  constructor(config: TaskQueueConfig = {}) {
    this.config = {
      queueName: 'agent-tasks',
      concurrency: 5,
      ...config,
    }

    const connection = config.redis
      ? new Redis(config.redis)
      : new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          maxRetriesPerRequest: null, // Required for BullMQ
        })

    this.queue = new Queue<TaskJobData, TaskResult>(this.config.queueName!, {
      connection,
    })

    console.log(`[TaskQueue] Initialized queue: ${this.config.queueName}`)
  }

  /**
   * Add task to queue
   */
  async addTask(
    task: AgentTask,
    context?: AgentContext,
    options?: {
      priority?: number
      delay?: number
      attempts?: number
    }
  ): Promise<string> {
    const job = await this.queue.add(
      task.type,
      { task, context },
      {
        priority: this.getPriorityValue(task.priority),
        delay: options?.delay,
        attempts: options?.attempts || 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 100, // Keep last 100 jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      }
    )

    console.log(
      `[TaskQueue] Added task ${task.id} to queue (Job: ${job.id}) - Priority: ${task.priority}`
    )

    return job.id!
  }

  /**
   * Start worker to process tasks
   */
  async startWorker(
    processor: (job: Job<TaskJobData>) => Promise<TaskResult>
  ): Promise<void> {
    if (this.worker) {
      console.warn('[TaskQueue] Worker already running')
      return
    }

    const connection = this.queue.opts.connection as Redis

    this.worker = new Worker<TaskJobData, TaskResult>(
      this.config.queueName!,
      processor,
      {
        connection,
        concurrency: this.config.concurrency,
        autorun: true,
      }
    )

    this.worker.on('completed', (job) => {
      console.log(`[TaskQueue] Job ${job.id} completed successfully`)
    })

    this.worker.on('failed', (job, error) => {
      console.error(`[TaskQueue] Job ${job?.id} failed:`, error.message)
    })

    this.worker.on('error', (error) => {
      console.error('[TaskQueue] Worker error:', error)
    })

    console.log(`[TaskQueue] Worker started with concurrency: ${this.config.concurrency}`)
  }

  /**
   * Stop worker
   */
  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close()
      this.worker = undefined
      console.log('[TaskQueue] Worker stopped')
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(jobId: string): Promise<{
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown'
    data?: TaskJobData
    result?: TaskResult
    progress?: number
    error?: string
  }> {
    const job = await this.queue.getJob(jobId)

    if (!job) {
      return { status: 'unknown' }
    }

    const state = await job.getState()
    const progress = job.progress

    return {
      status: state as any,
      data: job.data,
      result: job.returnvalue,
      progress: typeof progress === 'number' ? progress : undefined,
      error: job.failedReason,
    }
  }

  /**
   * Cancel task
   */
  async cancelTask(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId)

    if (!job) {
      return false
    }

    try {
      await job.remove()
      console.log(`[TaskQueue] Cancelled job: ${jobId}`)
      return true
    } catch (error) {
      console.error(`[TaskQueue] Failed to cancel job ${jobId}:`, error)
      return false
    }
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<{
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ])

    return { waiting, active, completed, failed, delayed }
  }

  /**
   * Clean old jobs
   */
  async cleanJobs(
    grace: number = 3600000 // 1 hour
  ): Promise<{ completed: string[]; failed: string[] }> {
    const [completed, failed] = await Promise.all([
      this.queue.clean(grace, 100, 'completed'),
      this.queue.clean(grace * 24, 100, 'failed'), // Keep failed jobs longer
    ])

    console.log(
      `[TaskQueue] Cleaned ${completed.length} completed and ${failed.length} failed jobs`
    )

    return { completed, failed }
  }

  /**
   * Close queue
   */
  async close(): Promise<void> {
    await this.stopWorker()
    await this.queue.close()
    console.log('[TaskQueue] Queue closed')
  }

  /**
   * Convert task priority to numeric value
   */
  private getPriorityValue(priority: AgentTask['priority']): number {
    const priorities = {
      low: 10,
      normal: 5,
      high: 2,
      urgent: 1,
    }
    return priorities[priority]
  }
}
