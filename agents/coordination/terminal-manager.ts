/**
 * Terminal Manager
 * Manages Claude Code terminal instances for agent isolation
 *
 * This module handles:
 * - Spawning Claude Code terminal instances with --dangerously-skip-permissions
 * - Tracking terminal lifecycle (creation, monitoring, cleanup)
 * - Associating terminals with Linear issues and git worktrees
 * - Inter-process communication via message bus
 */

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'
import * as fs from 'fs'
import { messageBus, MessageType } from './message-bus'

/**
 * Terminal Status
 */
export enum TerminalStatus {
  PENDING = 'pending',
  STARTING = 'starting',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TERMINATED = 'terminated',
}

/**
 * Terminal Instance Configuration
 */
export interface TerminalConfig {
  /** Linear issue ID (e.g., ONEK-123) */
  linearIssueId?: string
  /** Branch name for git worktree */
  branch: string
  /** SDLC phase (1-9) */
  phase: number
  /** Agent type to run */
  agentType: string
  /** Initial prompt/task for the agent */
  prompt: string
  /** Working directory (defaults to worktree path) */
  workingDirectory?: string
  /** Environment variables */
  env?: Record<string, string>
  /** Timeout in milliseconds (default: 30 minutes) */
  timeout?: number
}

/**
 * Terminal Instance
 */
export interface TerminalInstance {
  id: string
  config: TerminalConfig
  status: TerminalStatus
  process?: ChildProcess
  pid?: number
  worktreePath?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  exitCode?: number
  output: string[]
  errors: string[]
}

/**
 * Phase name mapping
 */
const PHASE_NAMES: Record<number, string> = {
  1: 'branch-init',
  2: 'test-creation',
  3: 'implementation',
  4: 'code-review',
  5: 'iteration',
  6: 'pr-creation',
  7: 'pr-review',
  8: 'conflict-resolution',
  9: 'merge',
}

/**
 * Terminal Manager
 * Singleton class for managing Claude Code terminal instances
 */
export class TerminalManager extends EventEmitter {
  private static instance: TerminalManager
  private terminals: Map<string, TerminalInstance> = new Map()
  private issueToTerminal: Map<string, string> = new Map() // linearIssueId -> terminalId
  private branchToTerminal: Map<string, string> = new Map() // branch -> terminalId
  private projectRoot: string

  private constructor() {
    super()
    this.projectRoot = process.cwd()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TerminalManager {
    if (!TerminalManager.instance) {
      TerminalManager.instance = new TerminalManager()
    }
    return TerminalManager.instance
  }

  /**
   * Spawn a new Claude Code terminal instance
   */
  async spawnTerminal(config: TerminalConfig): Promise<TerminalInstance> {
    const terminalId = uuidv4()

    // Create terminal instance
    const terminal: TerminalInstance = {
      id: terminalId,
      config,
      status: TerminalStatus.PENDING,
      createdAt: new Date(),
      output: [],
      errors: [],
    }

    this.terminals.set(terminalId, terminal)

    // Track by issue and branch
    if (config.linearIssueId) {
      this.issueToTerminal.set(config.linearIssueId, terminalId)
    }
    this.branchToTerminal.set(config.branch, terminalId)

    console.log(`[TerminalManager] Creating terminal ${terminalId} for ${config.linearIssueId || config.branch}`)

    try {
      // Step 1: Create git worktree
      const worktreePath = await this.createWorktree(config)
      terminal.worktreePath = worktreePath

      // Step 2: Start Claude Code process
      terminal.status = TerminalStatus.STARTING
      await this.startClaudeCodeProcess(terminal)

      // Publish terminal created event
      await messageBus.publish({
        type: MessageType.TASK_STARTED,
        sourceAgent: 'terminal-manager',
        targetAgent: config.agentType,
        payload: {
          terminalId,
          linearIssueId: config.linearIssueId,
          branch: config.branch,
          phase: config.phase,
          worktreePath,
        },
        context: {
          sessionId: terminalId,
          metadata: { terminalConfig: config },
        },
      })

      return terminal
    } catch (error) {
      terminal.status = TerminalStatus.FAILED
      terminal.errors.push((error as Error).message)

      // Publish failure event
      await messageBus.publish({
        type: MessageType.TASK_FAILED,
        sourceAgent: 'terminal-manager',
        payload: {
          terminalId,
          error: (error as Error).message,
        },
        context: {
          sessionId: terminalId,
        },
      })

      throw error
    }
  }

  /**
   * Create git worktree for the terminal
   */
  private async createWorktree(config: TerminalConfig): Promise<string> {
    const phaseName = PHASE_NAMES[config.phase] || `phase-${config.phase}`
    const worktreeBase = path.join(this.projectRoot, '.context', 'workspaces', `phase-${config.phase}-${phaseName}`)
    const worktreePath = path.join(worktreeBase, config.branch)

    // Ensure base directory exists
    if (!fs.existsSync(worktreeBase)) {
      fs.mkdirSync(worktreeBase, { recursive: true })
    }

    // Check if worktree already exists
    if (fs.existsSync(worktreePath)) {
      console.log(`[TerminalManager] Worktree already exists: ${worktreePath}`)
      return worktreePath
    }

    // Create git worktree
    return new Promise((resolve, reject) => {
      const gitArgs = ['worktree', 'add', worktreePath, config.branch]

      const gitProcess = spawn('git', gitArgs, {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''

      gitProcess.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      gitProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      gitProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`[TerminalManager] Created worktree: ${worktreePath}`)

          // Create workspace metadata file
          this.createWorkspaceMetadata(worktreePath, config)

          resolve(worktreePath)
        } else {
          // If branch doesn't exist, try creating it
          if (stderr.includes('is not a commit') || stderr.includes('not a valid object name')) {
            this.createBranchAndWorktree(worktreePath, config)
              .then(resolve)
              .catch(reject)
          } else {
            reject(new Error(`Git worktree creation failed: ${stderr}`))
          }
        }
      })

      gitProcess.on('error', reject)
    })
  }

  /**
   * Create branch and worktree when branch doesn't exist
   */
  private async createBranchAndWorktree(worktreePath: string, config: TerminalConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create worktree with new branch
      const gitArgs = ['worktree', 'add', '-b', config.branch, worktreePath, 'HEAD']

      const gitProcess = spawn('git', gitArgs, {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      let stderr = ''

      gitProcess.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      gitProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`[TerminalManager] Created new branch and worktree: ${worktreePath}`)
          this.createWorkspaceMetadata(worktreePath, config)
          resolve(worktreePath)
        } else {
          reject(new Error(`Failed to create branch and worktree: ${stderr}`))
        }
      })

      gitProcess.on('error', reject)
    })
  }

  /**
   * Create workspace metadata file
   */
  private createWorkspaceMetadata(worktreePath: string, config: TerminalConfig): void {
    const metadata = {
      branch: config.branch,
      linearIssue: config.linearIssueId,
      phase: config.phase,
      phaseName: PHASE_NAMES[config.phase] || `phase-${config.phase}`,
      agentRole: config.agentType,
      agentType: config.agentType,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      status: 'active',
      workflowState: {},
    }

    const metadataPath = path.join(worktreePath, 'WORKSPACE_META.json')
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
    console.log(`[TerminalManager] Created workspace metadata: ${metadataPath}`)
  }

  /**
   * Start Claude Code process
   */
  private async startClaudeCodeProcess(terminal: TerminalInstance): Promise<void> {
    const config = terminal.config
    const worktreePath = terminal.worktreePath || config.workingDirectory || this.projectRoot

    // Build Claude Code command
    const claudeArgs = [
      '--dangerously-skip-permissions',
      '--print', // Non-interactive mode, print output
    ]

    // Add the initial prompt
    if (config.prompt) {
      claudeArgs.push(config.prompt)
    }

    // Environment variables
    const env = {
      ...process.env,
      ...config.env,
      // Pass Linear issue context
      LINEAR_ISSUE_ID: config.linearIssueId || '',
      SDLC_PHASE: String(config.phase),
      AGENT_TYPE: config.agentType,
      WORKTREE_PATH: worktreePath,
    }

    console.log(`[TerminalManager] Starting Claude Code in ${worktreePath}`)
    console.log(`[TerminalManager] Command: claude ${claudeArgs.join(' ')}`)

    const process_instance = spawn('claude', claudeArgs, {
      cwd: worktreePath,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false, // Keep attached for monitoring
    })

    terminal.process = process_instance
    terminal.pid = process_instance.pid
    terminal.status = TerminalStatus.RUNNING
    terminal.startedAt = new Date()

    // Capture stdout
    process_instance.stdout?.on('data', (data) => {
      const output = data.toString()
      terminal.output.push(output)
      this.emit('output', { terminalId: terminal.id, output })
      console.log(`[Terminal ${terminal.id}] ${output}`)
    })

    // Capture stderr
    process_instance.stderr?.on('data', (data) => {
      const error = data.toString()
      terminal.errors.push(error)
      this.emit('error', { terminalId: terminal.id, error })
      console.error(`[Terminal ${terminal.id} ERROR] ${error}`)
    })

    // Handle process exit
    process_instance.on('close', async (code) => {
      terminal.exitCode = code ?? undefined
      terminal.completedAt = new Date()
      terminal.status = code === 0 ? TerminalStatus.COMPLETED : TerminalStatus.FAILED

      console.log(`[TerminalManager] Terminal ${terminal.id} exited with code ${code}`)

      // Publish completion event
      await messageBus.publish({
        type: code === 0 ? MessageType.TASK_COMPLETED : MessageType.TASK_FAILED,
        sourceAgent: 'terminal-manager',
        targetAgent: config.agentType,
        payload: {
          terminalId: terminal.id,
          exitCode: code,
          linearIssueId: config.linearIssueId,
          branch: config.branch,
        },
        context: {
          sessionId: terminal.id,
        },
      })

      this.emit('exit', { terminalId: terminal.id, exitCode: code })
    })

    process_instance.on('error', async (error) => {
      terminal.status = TerminalStatus.FAILED
      terminal.errors.push(error.message)

      await messageBus.publish({
        type: MessageType.ERROR,
        sourceAgent: 'terminal-manager',
        payload: {
          terminalId: terminal.id,
          error: error.message,
        },
        context: {
          sessionId: terminal.id,
        },
      })

      this.emit('error', { terminalId: terminal.id, error: error.message })
    })

    // Set timeout if specified
    if (config.timeout) {
      setTimeout(() => {
        if (terminal.status === TerminalStatus.RUNNING) {
          console.log(`[TerminalManager] Terminal ${terminal.id} timed out`)
          this.terminateTerminal(terminal.id, 'Timeout')
        }
      }, config.timeout)
    }
  }

  /**
   * Terminate a terminal instance
   */
  async terminateTerminal(terminalId: string, reason?: string): Promise<void> {
    const terminal = this.terminals.get(terminalId)
    if (!terminal) {
      throw new Error(`Terminal not found: ${terminalId}`)
    }

    if (terminal.process && terminal.status === TerminalStatus.RUNNING) {
      console.log(`[TerminalManager] Terminating terminal ${terminalId}: ${reason || 'User request'}`)

      terminal.process.kill('SIGTERM')

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (terminal.process && !terminal.process.killed) {
          terminal.process.kill('SIGKILL')
        }
      }, 5000)

      terminal.status = TerminalStatus.TERMINATED
      terminal.completedAt = new Date()
    }
  }

  /**
   * Get terminal by ID
   */
  getTerminal(terminalId: string): TerminalInstance | undefined {
    return this.terminals.get(terminalId)
  }

  /**
   * Get terminal by Linear issue ID
   */
  getTerminalByIssue(issueId: string): TerminalInstance | undefined {
    const terminalId = this.issueToTerminal.get(issueId)
    return terminalId ? this.terminals.get(terminalId) : undefined
  }

  /**
   * Get terminal by branch
   */
  getTerminalByBranch(branch: string): TerminalInstance | undefined {
    const terminalId = this.branchToTerminal.get(branch)
    return terminalId ? this.terminals.get(terminalId) : undefined
  }

  /**
   * Get all terminals
   */
  getAllTerminals(): TerminalInstance[] {
    return Array.from(this.terminals.values())
  }

  /**
   * Get terminals by status
   */
  getTerminalsByStatus(status: TerminalStatus): TerminalInstance[] {
    return this.getAllTerminals().filter((t) => t.status === status)
  }

  /**
   * Get running terminals
   */
  getRunningTerminals(): TerminalInstance[] {
    return this.getTerminalsByStatus(TerminalStatus.RUNNING)
  }

  /**
   * Clean up completed terminals
   */
  async cleanupCompletedTerminals(): Promise<number> {
    const completed = this.getAllTerminals().filter(
      (t) => t.status === TerminalStatus.COMPLETED || t.status === TerminalStatus.FAILED
    )

    let cleanedCount = 0
    for (const terminal of completed) {
      // Remove from maps
      this.terminals.delete(terminal.id)
      if (terminal.config.linearIssueId) {
        this.issueToTerminal.delete(terminal.config.linearIssueId)
      }
      this.branchToTerminal.delete(terminal.config.branch)
      cleanedCount++
    }

    console.log(`[TerminalManager] Cleaned up ${cleanedCount} completed terminals`)
    return cleanedCount
  }

  /**
   * Get terminal statistics
   */
  getStats(): {
    total: number
    running: number
    completed: number
    failed: number
    terminated: number
    pending: number
  } {
    const terminals = this.getAllTerminals()
    return {
      total: terminals.length,
      running: terminals.filter((t) => t.status === TerminalStatus.RUNNING).length,
      completed: terminals.filter((t) => t.status === TerminalStatus.COMPLETED).length,
      failed: terminals.filter((t) => t.status === TerminalStatus.FAILED).length,
      terminated: terminals.filter((t) => t.status === TerminalStatus.TERMINATED).length,
      pending: terminals.filter((t) => t.status === TerminalStatus.PENDING || t.status === TerminalStatus.STARTING).length,
    }
  }

  /**
   * Shutdown all terminals
   */
  async shutdown(): Promise<void> {
    console.log('[TerminalManager] Shutting down all terminals...')

    const running = this.getRunningTerminals()
    await Promise.all(running.map((t) => this.terminateTerminal(t.id, 'Manager shutdown')))

    this.terminals.clear()
    this.issueToTerminal.clear()
    this.branchToTerminal.clear()
  }

  /**
   * Reset manager (useful for testing)
   */
  reset(): void {
    this.terminals.clear()
    this.issueToTerminal.clear()
    this.branchToTerminal.clear()
  }
}

/**
 * Singleton instance
 */
export const terminalManager = TerminalManager.getInstance()
