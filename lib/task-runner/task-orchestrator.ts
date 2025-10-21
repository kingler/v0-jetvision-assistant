/**
 * Task Orchestrator for JetVision AI Assistant
 *
 * Semi-automated task execution system that:
 * - Monitors tasks directory for new tasks
 * - Guides developers through task execution
 * - Delegates work to specialized agents
 * - Tracks task progress and status
 * - Maintains human oversight for critical decisions
 *
 * @module TaskOrchestrator
 */

import fs from 'fs/promises'
import path from 'path'
import { execSync } from 'child_process'

// ============================================
// Types and Interfaces
// ============================================

export enum TaskStatus {
  BACKLOG = 'backlog',
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface Task {
  id: string
  number: number
  title: string
  filepath: string
  status: TaskStatus
  priority: TaskPriority
  estimatedHours: number
  assignedTo?: string
  dependencies: string[]
  blockedBy?: string
  createdAt: Date
  dueDate?: Date
  metadata: {
    hasTests?: boolean
    hasBranch?: boolean
    hasPR?: boolean
    testsPassing?: boolean
    coveragePercent?: number
  }
}

export interface TaskExecutionPlan {
  task: Task
  steps: TaskStep[]
  currentStep: number
  agentsRequired: string[]
  humanApprovalRequired: boolean[]
}

export interface TaskStep {
  id: string
  description: string
  type: 'automated' | 'manual' | 'agent-assisted'
  agentType?: string
  estimatedMinutes: number
  requiresApproval: boolean
  completed: boolean
  output?: string
}

// ============================================
// Task Discovery and Parsing
// ============================================

export class TaskOrchestrator {
  private tasksDir: string
  private projectRoot: string

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
    this.tasksDir = path.join(projectRoot, 'tasks')
  }

  /**
   * Scans tasks directory and returns all tasks with their current status
   */
  async discoverTasks(): Promise<Task[]> {
    const tasks: Task[] = []

    // Scan each directory
    for (const status of ['backlog', 'active', 'completed']) {
      const dir = path.join(this.tasksDir, status)

      try {
        const files = await fs.readdir(dir)

        for (const file of files) {
          if (file.endsWith('.md') && file.startsWith('TASK-')) {
            const filepath = path.join(dir, file)
            const task = await this.parseTask(filepath, status as TaskStatus)
            if (task) {
              tasks.push(task)
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}`)
      }
    }

    return tasks.sort((a, b) => a.number - b.number)
  }

  /**
   * Parses a task markdown file and extracts metadata
   */
  private async parseTask(filepath: string, status: TaskStatus): Promise<Task | null> {
    try {
      const content = await fs.readFile(filepath, 'utf-8')
      const filename = path.basename(filepath)

      // Extract task number from filename: TASK-001-name.md
      const match = filename.match(/TASK-(\d+)-(.+)\.md/)
      if (!match) return null

      const [, numberStr, titleSlug] = match
      const number = parseInt(numberStr, 10)

      // Parse metadata from markdown content
      const metadata = this.extractMetadata(content)

      return {
        id: `TASK-${numberStr}`,
        number,
        title: metadata.title || this.slugToTitle(titleSlug),
        filepath,
        status,
        priority: metadata.priority || TaskPriority.MEDIUM,
        estimatedHours: metadata.estimatedHours || 0,
        assignedTo: metadata.assignedTo,
        dependencies: metadata.dependencies || [],
        blockedBy: metadata.blockedBy,
        createdAt: metadata.createdAt || new Date(),
        dueDate: metadata.dueDate,
        metadata: {
          hasTests: await this.checkForTests(number),
          hasBranch: await this.checkForBranch(number, titleSlug),
          hasPR: false, // Would need GitHub API integration
          testsPassing: undefined,
          coveragePercent: undefined,
        },
      }
    } catch (error) {
      console.error(`Error parsing task ${filepath}:`, error)
      return null
    }
  }

  /**
   * Extracts metadata from task markdown content
   */
  private extractMetadata(content: string): Record<string, any> {
    const metadata: Record<string, any> = {}

    // Extract priority
    const priorityMatch = content.match(/\*\*Priority\*\*:\s*(HIGH|MEDIUM|LOW)/i)
    if (priorityMatch) {
      metadata.priority = priorityMatch[1].toUpperCase() as TaskPriority
    }

    // Extract estimated time
    const timeMatch = content.match(/\*\*Estimated Time\*\*:\s*(\d+(?:-\d+)?)\s*hours?/i)
    if (timeMatch) {
      const hours = timeMatch[1].split('-')
      metadata.estimatedHours = parseInt(hours[0], 10)
    }

    // Extract assigned to
    const assignedMatch = content.match(/\*\*Assigned To\*\*:\s*(.+)/i)
    if (assignedMatch) {
      metadata.assignedTo = assignedMatch[1].trim()
    }

    // Extract due date
    const dueDateMatch = content.match(/\*\*Due Date\*\*:\s*(\d{4}-\d{2}-\d{2})/i)
    if (dueDateMatch) {
      metadata.dueDate = new Date(dueDateMatch[1])
    }

    // Extract dependencies
    const depsMatch = content.match(/\*\*Depends on\*\*:\s*(.+)/i)
    if (depsMatch) {
      metadata.dependencies = depsMatch[1]
        .split(',')
        .map(d => d.trim().match(/TASK-\d+/)?.[0])
        .filter(Boolean)
    }

    // Extract blocker
    const blockerMatch = content.match(/\*\*Blocked by\*\*:\s*(.+)/i)
    if (blockerMatch) {
      metadata.blockedBy = blockerMatch[1].trim()
    }

    return metadata
  }

  /**
   * Checks if tests exist for a task
   */
  private async checkForTests(taskNumber: number): Promise<boolean> {
    const testDirs = [
      path.join(this.projectRoot, '__tests__', 'unit'),
      path.join(this.projectRoot, '__tests__', 'integration'),
      path.join(this.projectRoot, '__tests__', 'e2e'),
    ]

    for (const dir of testDirs) {
      try {
        const files = await fs.readdir(dir, { recursive: true })
        const hasTaskTests = (files as string[]).some(file =>
          file.includes(`task-${taskNumber}`) ||
          file.includes(`TASK-${taskNumber}`)
        )
        if (hasTaskTests) return true
      } catch {
        // Directory might not exist
      }
    }

    return false
  }

  /**
   * Checks if a feature branch exists for a task
   */
  private async checkForBranch(taskNumber: number, titleSlug: string): Promise<boolean> {
    try {
      const branches = execSync('git branch -a', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      })

      const branchName = `feature/TASK-${String(taskNumber).padStart(3, '0')}-${titleSlug}`
      return branches.includes(branchName)
    } catch {
      return false
    }
  }

  /**
   * Converts slug to title: "clerk-authentication" -> "Clerk Authentication"
   */
  private slugToTitle(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // ============================================
  // Task Filtering and Selection
  // ============================================

  /**
   * Get all tasks that are ready to start (not blocked, dependencies met)
   */
  async getReadyTasks(): Promise<Task[]> {
    const allTasks = await this.discoverTasks()
    const activeTasks = allTasks.filter(t => t.status === TaskStatus.ACTIVE)

    return activeTasks.filter(task => {
      // Check if blocked
      if (task.blockedBy) return false

      // Check if dependencies are completed
      if (task.dependencies.length > 0) {
        const completedTaskIds = allTasks
          .filter(t => t.status === TaskStatus.COMPLETED)
          .map(t => t.id)

        const allDependenciesMet = task.dependencies.every(dep =>
          completedTaskIds.includes(dep)
        )

        if (!allDependenciesMet) return false
      }

      return true
    })
  }

  /**
   * Get highest priority ready task
   */
  async getNextTask(): Promise<Task | null> {
    const readyTasks = await this.getReadyTasks()

    if (readyTasks.length === 0) return null

    // Sort by priority (HIGH > MEDIUM > LOW)
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
    readyTasks.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff

      // If same priority, sort by task number (earlier tasks first)
      return a.number - b.number
    })

    return readyTasks[0]
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    const allTasks = await this.discoverTasks()
    return allTasks.filter(t => t.status === status)
  }

  // ============================================
  // Task Execution Planning
  // ============================================

  /**
   * Creates an execution plan for a task by analyzing the task file
   */
  async createExecutionPlan(task: Task): Promise<TaskExecutionPlan> {
    const content = await fs.readFile(task.filepath, 'utf-8')
    const steps = this.extractImplementationSteps(content)

    return {
      task,
      steps,
      currentStep: 0,
      agentsRequired: this.identifyRequiredAgents(content),
      humanApprovalRequired: steps.map(s => s.requiresApproval),
    }
  }

  /**
   * Extracts implementation steps from task markdown
   */
  private extractImplementationSteps(content: string): TaskStep[] {
    const steps: TaskStep[] = []

    // Find implementation steps section
    const stepsSection = content.match(/## 4\. Implementation Steps(.+?)(?=## 5\.|$)/s)
    if (!stepsSection) return steps

    // Extract steps (looking for ### Step patterns)
    const stepMatches = stepsSection[1].matchAll(/### Step \d+: (.+?)\n([\s\S]*?)(?=### Step \d+:|$)/g)

    let stepId = 0
    for (const match of stepMatches) {
      const [, description, content] = match

      // Determine step type based on content
      let type: 'automated' | 'manual' | 'agent-assisted' = 'manual'
      let agentType: string | undefined
      let requiresApproval = true

      if (content.includes('neo-sdlc-orchestrator') || content.includes('agent')) {
        type = 'agent-assisted'
        agentType = this.detectAgentType(content)
        requiresApproval = true // Always require approval for agent work
      } else if (content.includes('npm') || content.includes('git')) {
        type = 'automated'
        requiresApproval = content.includes('commit') || content.includes('push')
      }

      steps.push({
        id: `step-${++stepId}`,
        description: description.trim(),
        type,
        agentType,
        estimatedMinutes: this.estimateStepTime(content),
        requiresApproval,
        completed: false,
      })
    }

    return steps
  }

  /**
   * Identifies which agents are needed for a task
   */
  private identifyRequiredAgents(content: string): string[] {
    const agents: string[] = []

    // Look for agent mentions in task content
    const agentPatterns = {
      'backend-developer-tank': /backend|API|database|server/i,
      'frontend-developer-mouse': /frontend|UI|component|React/i,
      'system-architect': /architecture|design|system/i,
      'security-engineer': /security|auth|encryption/i,
      'qa-engineer-seraph': /test|QA|coverage/i,
      'devops-engineer-link': /deploy|CI\/CD|infrastructure/i,
    }

    for (const [agent, pattern] of Object.entries(agentPatterns)) {
      if (pattern.test(content)) {
        agents.push(agent)
      }
    }

    return agents
  }

  /**
   * Detects which agent type should handle a step
   */
  private detectAgentType(stepContent: string): string | undefined {
    if (/backend|API|database/i.test(stepContent)) return 'backend-developer-tank'
    if (/frontend|UI|component/i.test(stepContent)) return 'frontend-developer-mouse'
    if (/test|QA/i.test(stepContent)) return 'qa-engineer-seraph'
    if (/security|auth/i.test(stepContent)) return 'security-engineer'
    if (/deploy|CI/i.test(stepContent)) return 'devops-engineer-link'
    return undefined
  }

  /**
   * Estimates time for a step based on content
   */
  private estimateStepTime(content: string): number {
    const lineCount = content.split('\n').length

    // Rough heuristic: 2 minutes per line of description
    // Minimum 5 minutes, maximum 60 minutes per step
    return Math.min(Math.max(lineCount * 2, 5), 60)
  }

  // ============================================
  // Task Status Management
  // ============================================

  /**
   * Updates task status by moving file to appropriate directory
   */
  async updateTaskStatus(task: Task, newStatus: TaskStatus): Promise<void> {
    const currentDir = path.dirname(task.filepath)
    const filename = path.basename(task.filepath)
    const newDir = path.join(this.tasksDir, newStatus)
    const newPath = path.join(newDir, filename)

    // Ensure target directory exists
    await fs.mkdir(newDir, { recursive: true })

    // Move file
    await fs.rename(task.filepath, newPath)

    // Update task object
    task.filepath = newPath
    task.status = newStatus

    console.log(`✅ Task ${task.id} moved to ${newStatus}`)
  }

  /**
   * Updates task metadata in the markdown file
   */
  async updateTaskMetadata(task: Task, updates: Partial<Task>): Promise<void> {
    let content = await fs.readFile(task.filepath, 'utf-8')

    // Update status emoji
    if (updates.status) {
      const statusEmojis = {
        [TaskStatus.BACKLOG]: '🔵',
        [TaskStatus.ACTIVE]: '🟡',
        [TaskStatus.IN_PROGRESS]: '🟠',
        [TaskStatus.BLOCKED]: '🔴',
        [TaskStatus.COMPLETED]: '🟢',
        [TaskStatus.CANCELLED]: '⚫',
      }

      content = content.replace(
        /\*\*Status\*\*:\s*[🔵🟡🟠🔴🟢⚫]\s*\w+/,
        `**Status**: ${statusEmojis[updates.status]} ${updates.status}`
      )
    }

    // Update priority
    if (updates.priority) {
      content = content.replace(
        /\*\*Priority\*\*:\s*(HIGH|MEDIUM|LOW)/,
        `**Priority**: ${updates.priority}`
      )
    }

    // Update assigned to
    if (updates.assignedTo) {
      content = content.replace(
        /\*\*Assigned To\*\*:\s*.+/,
        `**Assigned To**: ${updates.assignedTo}`
      )
    }

    await fs.writeFile(task.filepath, content, 'utf-8')
    console.log(`✅ Task ${task.id} metadata updated`)
  }

  /**
   * Marks a task as complete and fills completion summary
   */
  async completeTask(task: Task, summary: {
    testResults: string
    performanceMetrics?: string
    challenges?: string
    lessonsLearned?: string
  }): Promise<void> {
    let content = await fs.readFile(task.filepath, 'utf-8')

    // Update completion summary section
    const completionDate = new Date().toISOString().split('T')[0]
    const completionSummary = `
### Implementation Summary
Task completed successfully on ${completionDate}.

### Test Results
\`\`\`
${summary.testResults}
\`\`\`

${summary.performanceMetrics ? `### Performance Metrics
\`\`\`
${summary.performanceMetrics}
\`\`\`
` : ''}

${summary.challenges ? `### Challenges & Solutions
${summary.challenges}
` : ''}

${summary.lessonsLearned ? `### Lessons Learned
${summary.lessonsLearned}
` : ''}
`

    // Replace completion summary section
    content = content.replace(
      /## 11\. Completion Summary[\s\S]*?(?=\*\*Task Created By\*\*|$)/,
      `## 11. Completion Summary\n${completionSummary}\n\n`
    )

    // Update completion date
    content = content.replace(
      /\*\*Completion Date\*\*:\s*_TBD_/,
      `**Completion Date**: ${completionDate}`
    )

    await fs.writeFile(task.filepath, content, 'utf-8')

    // Move to completed
    await this.updateTaskStatus(task, TaskStatus.COMPLETED)
  }

  // ============================================
  // Git Integration
  // ============================================

  /**
   * Creates a feature branch for a task (requires user confirmation)
   */
  async createFeatureBranch(task: Task): Promise<string> {
    const branchName = `feature/TASK-${String(task.number).padStart(3, '0')}-${this.titleToSlug(task.title)}`

    console.log(`\n📝 Ready to create branch: ${branchName}`)
    console.log('This will run:')
    console.log('  git checkout main')
    console.log('  git pull origin main')
    console.log(`  git checkout -b ${branchName}`)
    console.log('\n⚠️  Please confirm this action manually')

    return branchName
  }

  /**
   * Converts title to slug: "Clerk Authentication" -> "clerk-authentication"
   */
  private titleToSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  /**
   * Checks if task branch exists
   */
  async checkBranchExists(task: Task): Promise<boolean> {
    return task.metadata.hasBranch || false
  }

  // ============================================
  // Reporting and Analytics
  // ============================================

  /**
   * Generates task status report
   */
  async generateStatusReport(): Promise<string> {
    const tasks = await this.discoverTasks()

    const byStatus = {
      backlog: tasks.filter(t => t.status === TaskStatus.BACKLOG).length,
      active: tasks.filter(t => t.status === TaskStatus.ACTIVE).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      blocked: tasks.filter(t => t.blockedBy).length,
    }

    const readyTasks = await this.getReadyTasks()
    const nextTask = await this.getNextTask()

    let report = '# Task Status Report\n\n'
    report += `**Total Tasks**: ${tasks.length}\n\n`
    report += '## Status Breakdown\n'
    report += `- 🔵 Backlog: ${byStatus.backlog}\n`
    report += `- 🟡 Active: ${byStatus.active}\n`
    report += `- 🟢 Completed: ${byStatus.completed}\n`
    report += `- 🔴 Blocked: ${byStatus.blocked}\n\n`
    report += `## Ready to Start\n`
    report += `${readyTasks.length} tasks are ready (no blockers, dependencies met)\n\n`

    if (nextTask) {
      report += `## Next Recommended Task\n`
      report += `**${nextTask.id}**: ${nextTask.title}\n`
      report += `- Priority: ${nextTask.priority}\n`
      report += `- Estimated: ${nextTask.estimatedHours} hours\n`
      report += `- Has tests: ${nextTask.metadata.hasTests ? '✅' : '❌'}\n`
      report += `- Has branch: ${nextTask.metadata.hasBranch ? '✅' : '❌'}\n`
    }

    return report
  }
}

// ============================================
// CLI Helper Functions
// ============================================

/**
 * Initialize task orchestrator for current project
 */
export function createTaskOrchestrator(): TaskOrchestrator {
  const projectRoot = process.cwd()
  return new TaskOrchestrator(projectRoot)
}

/**
 * Display task summary in console
 */
export function displayTask(task: Task): void {
  console.log('\n' + '='.repeat(60))
  console.log(`📋 ${task.id}: ${task.title}`)
  console.log('='.repeat(60))
  console.log(`Status: ${task.status}`)
  console.log(`Priority: ${task.priority}`)
  console.log(`Estimated: ${task.estimatedHours} hours`)
  console.log(`Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}`)
  if (task.blockedBy) console.log(`⚠️  Blocked by: ${task.blockedBy}`)
  console.log('\nMetadata:')
  console.log(`  - Tests: ${task.metadata.hasTests ? '✅' : '❌'}`)
  console.log(`  - Branch: ${task.metadata.hasBranch ? '✅' : '❌'}`)
  console.log('='.repeat(60) + '\n')
}
