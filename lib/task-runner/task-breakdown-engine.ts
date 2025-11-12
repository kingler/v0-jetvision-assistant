/**
 * Task Breakdown Engine for JetVision AI Assistant
 *
 * Automatically decomposes large, complex tasks into smaller, manageable subtasks
 * to optimize task distribution to subagents and improve execution efficiency.
 *
 * Features:
 * - Complexity scoring algorithm
 * - Automatic breakdown detection
 * - Intelligent task decomposition
 * - Dependency graph management
 * - Subtask generation with proper scoping
 *
 * @module TaskBreakdownEngine
 */

import fs from 'fs/promises'
import path from 'path'
import { Task, TaskPriority, TaskStatus } from './task-orchestrator'

// ============================================
// Types and Interfaces
// ============================================

export interface ComplexityScore {
  total: number
  breakdown: {
    lineCount: number
    stepCount: number
    dependencyCount: number
    estimatedHours: number
    scopeScore: number
    testComplexity: number
  }
  recommendation: 'keep' | 'consider_split' | 'must_split'
  reasoning: string[]
}

export interface SubTask {
  id: string
  parentTaskId: string
  number: number // e.g., 001.1, 001.2
  title: string
  description: string
  estimatedHours: number
  priority: TaskPriority
  dependencies: string[] // Other subtask IDs this depends on
  implementationSteps: string[]
  testingRequirements: string[]
  acceptanceCriteria: string[]
  order: number // Execution order within parent
}

export interface TaskDecomposition {
  originalTask: Task
  shouldBreakdown: boolean
  complexityScore: ComplexityScore
  subtasks: SubTask[]
  executionOrder: string[][] // Groups of subtasks that can run in parallel
}

// ============================================
// Complexity Scoring Algorithm
// ============================================

export class TaskComplexityAnalyzer {
  /**
   * Analyzes task complexity and returns a comprehensive score
   *
   * Scoring criteria:
   * - Line count (>500 lines = high complexity)
   * - Number of implementation steps (>8 steps = complex)
   * - Number of dependencies (>3 = complex)
   * - Estimated hours (>6 hours = should split)
   * - Scope breadth (multiple systems/components)
   * - Testing complexity (E2E + Integration + Unit)
   */
  async analyzeComplexity(task: Task): Promise<ComplexityScore> {
    const content = await fs.readFile(task.filepath, 'utf-8')

    // Calculate individual complexity metrics
    const lineCount = this.calculateLineCount(content)
    const stepCount = this.calculateStepCount(content)
    const dependencyCount = task.dependencies.length
    const estimatedHours = task.estimatedHours
    const scopeScore = this.calculateScopeComplexity(content)
    const testComplexity = this.calculateTestComplexity(content)

    // Weighted scoring (max 100 points)
    const lineScore = Math.min((lineCount / 500) * 20, 20) // Max 20 points
    const stepScore = Math.min((stepCount / 8) * 15, 15) // Max 15 points
    const depScore = Math.min((dependencyCount / 3) * 10, 10) // Max 10 points
    const hourScore = Math.min((estimatedHours / 6) * 25, 25) // Max 25 points
    const scopeScoreWeighted = Math.min(scopeScore * 20, 20) // Max 20 points
    const testScore = Math.min(testComplexity * 10, 10) // Max 10 points

    const total = Math.round(
      lineScore + stepScore + depScore + hourScore + scopeScoreWeighted + testScore
    )

    // Generate recommendation
    const reasoning: string[] = []
    let recommendation: 'keep' | 'consider_split' | 'must_split'

    if (lineCount > 500) {
      reasoning.push(`Task file is ${lineCount} lines (>500 suggests high complexity)`)
    }
    if (stepCount > 8) {
      reasoning.push(`Task has ${stepCount} implementation steps (>8 is difficult to track)`)
    }
    if (estimatedHours > 6) {
      reasoning.push(`Estimated ${estimatedHours} hours (>6 hours suggests splitting into multiple sessions)`)
    }
    if (scopeScore > 0.7) {
      reasoning.push(`Task spans multiple systems/components (high scope complexity)`)
    }
    if (testComplexity > 0.7) {
      reasoning.push(`Requires comprehensive testing across multiple layers`)
    }
    if (dependencyCount > 3) {
      reasoning.push(`Has ${dependencyCount} dependencies (coordination complexity)`)
    }

    if (total >= 70) {
      recommendation = 'must_split'
      reasoning.unshift('⚠️ CRITICAL: Task is too complex and MUST be broken down')
    } else if (total >= 50) {
      recommendation = 'consider_split'
      reasoning.unshift('⚡ RECOMMENDED: Task should be considered for breakdown')
    } else {
      recommendation = 'keep'
      reasoning.unshift('✅ Task complexity is manageable as-is')
    }

    return {
      total,
      breakdown: {
        lineCount,
        stepCount,
        dependencyCount,
        estimatedHours,
        scopeScore,
        testComplexity,
      },
      recommendation,
      reasoning,
    }
  }

  private calculateLineCount(content: string): number {
    return content.split('\n').length
  }

  private calculateStepCount(content: string): number {
    // Count implementation steps from markdown
    const stepMatches = content.match(/###\s+Step\s+\d+:|^\s*-\s+\[\s*\]\s+/gm)
    return stepMatches ? stepMatches.length : 0
  }

  private calculateScopeComplexity(content: string): number {
    // Check how many different systems/components are mentioned
    const systems = [
      /clerk/i,
      /supabase/i,
      /redis/i,
      /openai/i,
      /avinode/i,
      /gmail/i,
      /database/i,
      /authentication/i,
      /webhook/i,
      /middleware/i,
      /api/i,
      /frontend/i,
      /backend/i,
    ]

    const matchedSystems = systems.filter(regex => regex.test(content)).length
    return Math.min(matchedSystems / 5, 1) // Normalize to 0-1
  }

  private calculateTestComplexity(content: string): number {
    let complexity = 0

    if (/unit\s+test/i.test(content)) complexity += 0.2
    if (/integration\s+test/i.test(content)) complexity += 0.3
    if (/e2e|end-to-end/i.test(content)) complexity += 0.3
    if (/coverage/i.test(content)) complexity += 0.1
    if (/playwright|cypress/i.test(content)) complexity += 0.1

    return Math.min(complexity, 1)
  }
}

// ============================================
// Task Decomposition Engine
// ============================================

export class TaskDecompositionEngine {
  private analyzer: TaskComplexityAnalyzer

  constructor() {
    this.analyzer = new TaskComplexityAnalyzer()
  }

  /**
   * Determines if a task should be broken down and generates subtasks
   */
  async decomposeTask(task: Task): Promise<TaskDecomposition> {
    const complexityScore = await this.analyzer.analyzeComplexity(task)
    const shouldBreakdown = complexityScore.recommendation !== 'keep'

    if (!shouldBreakdown) {
      return {
        originalTask: task,
        shouldBreakdown: false,
        complexityScore,
        subtasks: [],
        executionOrder: [],
      }
    }

    const content = await fs.readFile(task.filepath, 'utf-8')
    const subtasks = await this.generateSubtasks(task, content, complexityScore)
    const executionOrder = this.determineExecutionOrder(subtasks)

    return {
      originalTask: task,
      shouldBreakdown: true,
      complexityScore,
      subtasks,
      executionOrder,
    }
  }

  /**
   * Generates logical subtasks from a large task
   */
  private async generateSubtasks(
    task: Task,
    content: string,
    complexity: ComplexityScore
  ): Promise<SubTask[]> {
    const subtasks: SubTask[] = []

    // Strategy 1: Break down by implementation phases (TDD: Test, Implement, Refactor)
    if (this.isTDDTask(content)) {
      subtasks.push(...this.breakdownByTDDPhases(task, content))
    }
    // Strategy 2: Break down by major sections
    else if (complexity.breakdown.stepCount > 8) {
      subtasks.push(...this.breakdownBySteps(task, content))
    }
    // Strategy 3: Break down by components/systems
    else if (complexity.breakdown.scopeScore > 0.7) {
      subtasks.push(...this.breakdownByComponents(task, content))
    }
    // Strategy 4: Break down by time chunks (4 hour max per subtask)
    else {
      subtasks.push(...this.breakdownByTimeChunks(task, content))
    }

    return subtasks
  }

  private isTDDTask(content: string): boolean {
    return /test-driven|tdd|red-green-blue/i.test(content)
  }

  private breakdownByTDDPhases(task: Task, content: string): SubTask[] {
    const subtasks: SubTask[] = []
    const baseNumber = task.number

    // Phase 1: RED - Write Tests
    subtasks.push({
      id: `${task.id}.1`,
      parentTaskId: task.id,
      number: parseFloat(`${baseNumber}.1`),
      title: `${task.title} - Write Tests (RED Phase)`,
      description: 'Write comprehensive failing tests following TDD approach',
      estimatedHours: Math.ceil(task.estimatedHours * 0.3),
      priority: task.priority,
      dependencies: [],
      implementationSteps: this.extractTestSteps(content),
      testingRequirements: ['All tests should fail initially (RED phase)'],
      acceptanceCriteria: [
        'Unit tests written and failing',
        'Integration tests written and failing',
        'E2E tests written if applicable',
        'Test coverage plan documented',
      ],
      order: 1,
    })

    // Phase 2: GREEN - Implementation
    subtasks.push({
      id: `${task.id}.2`,
      parentTaskId: task.id,
      number: parseFloat(`${baseNumber}.2`),
      title: `${task.title} - Implementation (GREEN Phase)`,
      description: 'Implement minimal code to make all tests pass',
      estimatedHours: Math.ceil(task.estimatedHours * 0.5),
      priority: task.priority,
      dependencies: [`${task.id}.1`],
      implementationSteps: this.extractImplementationSteps(content),
      testingRequirements: ['All tests must pass'],
      acceptanceCriteria: [
        'All RED phase tests now passing',
        'Core functionality implemented',
        'Edge cases handled',
        'Error handling implemented',
      ],
      order: 2,
    })

    // Phase 3: BLUE - Refactor
    subtasks.push({
      id: `${task.id}.3`,
      parentTaskId: task.id,
      number: parseFloat(`${baseNumber}.3`),
      title: `${task.title} - Refactor & Polish (BLUE Phase)`,
      description: 'Refactor code, improve quality, add documentation',
      estimatedHours: Math.ceil(task.estimatedHours * 0.2),
      priority: task.priority,
      dependencies: [`${task.id}.2`],
      implementationSteps: [
        'Extract reusable utilities',
        'Add comprehensive JSDoc comments',
        'Optimize performance',
        'Improve error messages',
        'Update documentation',
      ],
      testingRequirements: ['Tests still passing after refactoring'],
      acceptanceCriteria: [
        'Code follows best practices',
        'No code duplication',
        'Documentation complete',
        'Performance optimized',
      ],
      order: 3,
    })

    return subtasks
  }

  private breakdownBySteps(task: Task, content: string): SubTask[] {
    const steps = this.extractAllSteps(content)
    const subtasks: SubTask[] = []
    const baseNumber = task.number

    // Group steps into logical chunks (max 4 steps per subtask)
    const stepsPerSubtask = 4
    const numSubtasks = Math.ceil(steps.length / stepsPerSubtask)

    for (let i = 0; i < numSubtasks; i++) {
      const startIdx = i * stepsPerSubtask
      const endIdx = Math.min(startIdx + stepsPerSubtask, steps.length)
      const subtaskSteps = steps.slice(startIdx, endIdx)

      subtasks.push({
        id: `${task.id}.${i + 1}`,
        parentTaskId: task.id,
        number: parseFloat(`${baseNumber}.${i + 1}`),
        title: `${task.title} - Part ${i + 1}`,
        description: `Implementation steps ${startIdx + 1}-${endIdx}`,
        estimatedHours: Math.ceil(task.estimatedHours / numSubtasks),
        priority: task.priority,
        dependencies: i > 0 ? [`${task.id}.${i}`] : [],
        implementationSteps: subtaskSteps,
        testingRequirements: ['Unit tests for implemented steps'],
        acceptanceCriteria: [`Steps ${startIdx + 1}-${endIdx} completed and tested`],
        order: i + 1,
      })
    }

    return subtasks
  }

  private breakdownByComponents(task: Task, content: string): SubTask[] {
    const subtasks: SubTask[] = []
    const baseNumber = task.number
    let order = 1

    // Identify major components/systems in the task
    const components = this.identifyComponents(content)

    for (const component of components) {
      subtasks.push({
        id: `${task.id}.${order}`,
        parentTaskId: task.id,
        number: parseFloat(`${baseNumber}.${order}`),
        title: `${task.title} - ${component.name}`,
        description: component.description,
        estimatedHours: Math.ceil(task.estimatedHours / components.length),
        priority: task.priority,
        dependencies: component.dependencies,
        implementationSteps: component.steps,
        testingRequirements: [`Tests for ${component.name}`],
        acceptanceCriteria: [`${component.name} fully functional`],
        order,
      })
      order++
    }

    return subtasks
  }

  private breakdownByTimeChunks(task: Task, content: string): SubTask[] {
    const MAX_HOURS_PER_SUBTASK = 4
    const numSubtasks = Math.ceil(task.estimatedHours / MAX_HOURS_PER_SUBTASK)
    const subtasks: SubTask[] = []
    const baseNumber = task.number

    for (let i = 0; i < numSubtasks; i++) {
      subtasks.push({
        id: `${task.id}.${i + 1}`,
        parentTaskId: task.id,
        number: parseFloat(`${baseNumber}.${i + 1}`),
        title: `${task.title} - Session ${i + 1}`,
        description: `Work session ${i + 1} of ${numSubtasks}`,
        estimatedHours: Math.min(MAX_HOURS_PER_SUBTASK, task.estimatedHours - i * MAX_HOURS_PER_SUBTASK),
        priority: task.priority,
        dependencies: i > 0 ? [`${task.id}.${i}`] : [],
        implementationSteps: [`Continue implementation from session ${i}`],
        testingRequirements: ['Incremental testing'],
        acceptanceCriteria: [`Session ${i + 1} goals achieved`],
        order: i + 1,
      })
    }

    return subtasks
  }

  /**
   * Determines execution order and identifies parallelizable subtasks
   */
  private determineExecutionOrder(subtasks: SubTask[]): string[][] {
    const order: string[][] = []
    const processed = new Set<string>()

    while (processed.size < subtasks.length) {
      const batch: string[] = []

      for (const subtask of subtasks) {
        if (processed.has(subtask.id)) continue

        // Check if all dependencies are processed
        const allDepsMet = subtask.dependencies.every(dep => processed.has(dep))

        if (allDepsMet) {
          batch.push(subtask.id)
          processed.add(subtask.id)
        }
      }

      if (batch.length === 0) {
        throw new Error('Circular dependency detected in subtasks')
      }

      order.push(batch)
    }

    return order
  }

  // Helper methods for content parsing
  private extractTestSteps(content: string): string[] {
    const steps: string[] = []
    const testSection = content.match(/###\s+Phase 1:\s+Red[\s\S]*?(?=###\s+Phase 2|$)/i)

    if (testSection) {
      const stepMatches = testSection[0].match(/\*\*Step \d+\*\*:([^\n]+)/g)
      if (stepMatches) {
        steps.push(...stepMatches.map(s => s.replace(/\*\*Step \d+\*\*:\s*/, '')))
      }
    }

    return steps.length > 0 ? steps : ['Write unit tests', 'Write integration tests']
  }

  private extractImplementationSteps(content: string): string[] {
    const steps: string[] = []
    const implSection = content.match(/## \d+\.\s+Implementation Steps[\s\S]*?(?=##\s+\d+\.|$)/i)

    if (implSection) {
      const stepMatches = implSection[0].match(/###\s+Step\s+\d+:([^\n]+)/g)
      if (stepMatches) {
        steps.push(...stepMatches.map(s => s.replace(/###\s+Step\s+\d+:\s*/, '')))
      }
    }

    return steps.length > 0 ? steps : ['Implementation step 1', 'Implementation step 2']
  }

  private extractAllSteps(content: string): string[] {
    const steps: string[] = []
    const stepMatches = content.match(/- \[ \]\s+(.+)/g)

    if (stepMatches) {
      steps.push(...stepMatches.map(s => s.replace(/- \[ \]\s+/, '')))
    }

    return steps
  }

  private identifyComponents(content: string): Array<{
    name: string
    description: string
    steps: string[]
    dependencies: string[]
  }> {
    const components = []

    // Check for common component patterns
    if (/middleware/i.test(content)) {
      components.push({
        name: 'Middleware',
        description: 'Configure route protection middleware',
        steps: ['Create middleware.ts', 'Configure protected routes'],
        dependencies: [],
      })
    }

    if (/webhook/i.test(content)) {
      components.push({
        name: 'Webhook Handler',
        description: 'Implement webhook endpoint',
        steps: ['Create webhook route', 'Verify signature', 'Handle events'],
        dependencies: [],
      })
    }

    if (/database|supabase/i.test(content)) {
      components.push({
        name: 'Database Integration',
        description: 'Set up database sync',
        steps: ['Create database client', 'Implement sync logic'],
        dependencies: [],
      })
    }

    return components.length > 0 ? components : [
      {
        name: 'Core Implementation',
        description: 'Main implementation',
        steps: ['Implement core functionality'],
        dependencies: [],
      },
    ]
  }

  /**
   * Generates markdown files for each subtask
   */
  async generateSubtaskFiles(
    decomposition: TaskDecomposition,
    outputDir: string
  ): Promise<string[]> {
    const generatedFiles: string[] = []

    for (const subtask of decomposition.subtasks) {
      const filename = `TASK-${String(Math.floor(subtask.number)).padStart(3, '0')}-${subtask.id.split('.')[1]}-${this.slugify(subtask.title)}.md`
      const filepath = path.join(outputDir, filename)

      const content = this.generateSubtaskMarkdown(subtask, decomposition.originalTask)
      await fs.writeFile(filepath, content, 'utf-8')
      generatedFiles.push(filepath)
    }

    return generatedFiles
  }

  private generateSubtaskMarkdown(subtask: SubTask, originalTask: Task): string {
    return `# ${subtask.title}

**Status**: 🟡 Active
**Priority**: ${subtask.priority}
**Estimated Time**: ${subtask.estimatedHours} hours
**Parent Task**: ${originalTask.id} - ${originalTask.title}
**Dependencies**: ${subtask.dependencies.length > 0 ? subtask.dependencies.join(', ') : 'None'}
**Order**: ${subtask.order}
**Created**: ${new Date().toLocaleDateString()}

---

## 1. Task Overview

### Objective
${subtask.description}

This is subtask ${subtask.order} of the parent task "${originalTask.title}".

### Success Metrics
${subtask.acceptanceCriteria.map(c => `- ✅ ${c}`).join('\n')}

---

## 2. Requirements

### Functional Requirements
${subtask.implementationSteps.map((step, i) => `**FR-${i + 1}**: ${step}`).join('\n\n')}

### Acceptance Criteria
${subtask.acceptanceCriteria.map((c, i) => `- [ ] ${c}`).join('\n')}

---

## 3. Implementation Steps

${subtask.implementationSteps.map((step, i) => `### Step ${i + 1}: ${step}\n- [ ] Implement ${step}\n- [ ] Test ${step}`).join('\n\n')}

---

## 4. Testing Requirements

${subtask.testingRequirements.map(req => `- [ ] ${req}`).join('\n')}

---

## 5. Definition of Done

- [ ] All implementation steps completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Parent task can progress to next subtask

---

**Created from**: Automatic task decomposition
**Parent task file**: ${originalTask.filepath}
`
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

// ============================================
// Batch Analysis & Reporting
// ============================================

export class TaskBreakdownAnalyzer {
  private engine: TaskDecompositionEngine

  constructor() {
    this.engine = new TaskDecompositionEngine()
  }

  /**
   * Analyzes all tasks in a directory and reports which should be broken down
   */
  async analyzeAllTasks(tasks: Task[]): Promise<{
    tasksAnalyzed: number
    shouldBreakdown: Task[]
    decompositions: TaskDecomposition[]
    report: string
  }> {
    const decompositions: TaskDecomposition[] = []
    const shouldBreakdown: Task[] = []

    for (const task of tasks) {
      const decomposition = await this.engine.decomposeTask(task)
      decompositions.push(decomposition)

      if (decomposition.shouldBreakdown) {
        shouldBreakdown.push(task)
      }
    }

    const report = this.generateReport(decompositions)

    return {
      tasksAnalyzed: tasks.length,
      shouldBreakdown,
      decompositions,
      report,
    }
  }

  private generateReport(decompositions: TaskDecomposition[]): string {
    const mustSplit = decompositions.filter(d => d.complexityScore.recommendation === 'must_split')
    const shouldConsider = decompositions.filter(d => d.complexityScore.recommendation === 'consider_split')
    const ok = decompositions.filter(d => d.complexityScore.recommendation === 'keep')

    let report = '# Task Breakdown Analysis Report\n\n'
    report += `**Generated**: ${new Date().toLocaleString()}\n\n`
    report += `## Summary\n\n`
    report += `- Total tasks analyzed: ${decompositions.length}\n`
    report += `- ⚠️ MUST breakdown: ${mustSplit.length}\n`
    report += `- ⚡ Should consider: ${shouldConsider.length}\n`
    report += `- ✅ OK as-is: ${ok.length}\n\n`

    if (mustSplit.length > 0) {
      report += `## ⚠️ Tasks That MUST Be Broken Down\n\n`
      for (const d of mustSplit) {
        report += `### ${d.originalTask.id}: ${d.originalTask.title}\n\n`
        report += `**Complexity Score**: ${d.complexityScore.total}/100\n\n`
        report += `**Reasoning**:\n${d.complexityScore.reasoning.map(r => `- ${r}`).join('\n')}\n\n`
        report += `**Recommended Subtasks**: ${d.subtasks.length}\n\n`
        report += `Subtasks:\n${d.subtasks.map(st => `  ${st.id}. ${st.title} (${st.estimatedHours}h)`).join('\n')}\n\n`
      }
    }

    if (shouldConsider.length > 0) {
      report += `## ⚡ Tasks to Consider Breaking Down\n\n`
      for (const d of shouldConsider) {
        report += `### ${d.originalTask.id}: ${d.originalTask.title}\n\n`
        report += `**Complexity Score**: ${d.complexityScore.total}/100\n\n`
        report += `**Reasoning**:\n${d.complexityScore.reasoning.map(r => `- ${r}`).join('\n')}\n\n`
      }
    }

    return report
  }
}
