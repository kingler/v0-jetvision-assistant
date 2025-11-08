#!/usr/bin/env tsx
/**
 * Task Management CLI
 *
 * Interactive command-line interface for managing and executing tasks
 *
 * Usage:
 *   npx tsx lib/task-runner/task-cli.ts list
 *   npx tsx lib/task-runner/task-cli.ts next
 *   npx tsx lib/task-runner/task-cli.ts start TASK-001
 *   npx tsx lib/task-runner/task-cli.ts status TASK-001
 *   npx tsx lib/task-runner/task-cli.ts report
 *   npx tsx lib/task-runner/task-cli.ts analyze
 *   npx tsx lib/task-runner/task-cli.ts analyze TASK-001
 *   npx tsx lib/task-runner/task-cli.ts breakdown TASK-001
 */

import { createTaskOrchestrator, displayTask, Task, TaskStatus } from './task-orchestrator'
import { TaskBreakdownAnalyzer, TaskDecompositionEngine, TaskComplexityAnalyzer } from './task-breakdown-engine'
import { readFileSync } from 'fs'
import { join } from 'path'

const orchestrator = createTaskOrchestrator()
const breakdownAnalyzer = new TaskBreakdownAnalyzer()
const decompositionEngine = new TaskDecompositionEngine()
const complexityAnalyzer = new TaskComplexityAnalyzer()

// ============================================
// CLI Commands
// ============================================

async function listTasks(status?: TaskStatus) {
  console.log('\n📋 Jetvision Task List\n')

  const tasks = status
    ? await orchestrator.getTasksByStatus(status)
    : await orchestrator.discoverTasks()

  if (tasks.length === 0) {
    console.log('No tasks found.')
    return
  }

  // Group by status
  const grouped = tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = []
    acc[task.status].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  for (const [status, statusTasks] of Object.entries(grouped)) {
    const emoji = {
      backlog: '🔵',
      active: '🟡',
      in_progress: '🟠',
      completed: '🟢',
      blocked: '🔴',
      cancelled: '⚫',
    }[status] || '⚪'

    console.log(`\n${emoji} ${status.toUpperCase()} (${statusTasks.length})`)
    console.log('─'.repeat(60))

    for (const task of statusTasks) {
      const priority = task.priority === 'HIGH' ? '🔴' : task.priority === 'MEDIUM' ? '🟡' : '🟢'
      console.log(`  ${task.id}: ${task.title}`)
      console.log(`    ${priority} ${task.priority} | ${task.estimatedHours}h | Tests: ${task.metadata.hasTests ? '✅' : '❌'}`)
      if (task.dependencies.length > 0) {
        console.log(`    📦 Depends on: ${task.dependencies.join(', ')}`)
      }
      if (task.blockedBy) {
        console.log(`    ⚠️  Blocked: ${task.blockedBy}`)
      }
    }
  }

  console.log('')
}

async function showNextTask() {
  console.log('\n🎯 Next Recommended Task\n')

  const nextTask = await orchestrator.getNextTask()

  if (!nextTask) {
    console.log('✨ No tasks ready to start!')
    console.log('\nPossible reasons:')
    console.log('  - All active tasks are blocked')
    console.log('  - Tasks have unmet dependencies')
    console.log('  - No tasks in active/ directory')
    console.log('\nTry: npx tsx lib/task-runner/task-cli.ts list')
    return
  }

  displayTask(nextTask)

  console.log('📖 To read the full task file:')
  console.log(`   cat ${nextTask.filepath}`)
  console.log('\n🚀 To start working on this task:')
  console.log(`   npx tsx lib/task-runner/task-cli.ts start ${nextTask.id}`)
  console.log('')
}

async function showTaskStatus(taskId: string) {
  const tasks = await orchestrator.discoverTasks()
  const task = tasks.find(t => t.id === taskId || t.id === `TASK-${taskId}`)

  if (!task) {
    console.error(`❌ Task not found: ${taskId}`)
    return
  }

  displayTask(task)

  // Show execution plan
  console.log('📝 Execution Plan:\n')
  const plan = await orchestrator.createExecutionPlan(task)

  console.log(`Total Steps: ${plan.steps.length}`)
  console.log(`Agents Required: ${plan.agentsRequired.length > 0 ? plan.agentsRequired.join(', ') : 'None'}`)
  console.log('')

  plan.steps.forEach((step, idx) => {
    const icon = step.type === 'automated' ? '🤖' : step.type === 'agent-assisted' ? '👨‍💻' : '✋'
    console.log(`${idx + 1}. ${icon} ${step.description}`)
    console.log(`   Type: ${step.type} | Est: ${step.estimatedMinutes}min | Approval: ${step.requiresApproval ? 'Required' : 'Not needed'}`)
    if (step.agentType) {
      console.log(`   Agent: ${step.agentType}`)
    }
  })

  console.log('')
}

async function startTask(taskId: string) {
  const tasks = await orchestrator.discoverTasks()
  const task = tasks.find(t => t.id === taskId || t.id === `TASK-${taskId}`)

  if (!task) {
    console.error(`❌ Task not found: ${taskId}`)
    return
  }

  console.log('\n🚀 Starting Task Execution\n')
  displayTask(task)

  // Check dependencies
  if (task.dependencies.length > 0) {
    const completedTasks = await orchestrator.getTasksByStatus(TaskStatus.COMPLETED)
    const completedIds = completedTasks.map(t => t.id)

    const unmetDeps = task.dependencies.filter(dep => !completedIds.includes(dep))

    if (unmetDeps.length > 0) {
      console.error('❌ Cannot start task - unmet dependencies:')
      unmetDeps.forEach(dep => console.error(`   - ${dep}`))
      return
    }
  }

  // Check if blocked
  if (task.blockedBy) {
    console.error(`❌ Cannot start task - blocked by: ${task.blockedBy}`)
    return
  }

  // Create execution plan
  const plan = await orchestrator.createExecutionPlan(task)

  console.log('📋 Execution Plan Created\n')
  console.log(`This task has ${plan.steps.length} steps`)
  console.log(`Estimated total time: ${plan.steps.reduce((sum, s) => sum + s.estimatedMinutes, 0)} minutes`)
  console.log('')

  // Show next steps
  console.log('📝 Next Steps:\n')
  console.log('1. Create feature branch:')
  const branchName = await orchestrator.createFeatureBranch(task)
  console.log(`   git checkout -b ${branchName}`)
  console.log('')
  console.log('2. Read the full task file:')
  console.log(`   cat ${task.filepath}`)
  console.log('')
  console.log('3. Follow TDD approach (Red-Green-Blue)')
  console.log('   - Write tests first (Red phase)')
  console.log('   - Implement to pass tests (Green phase)')
  console.log('   - Refactor (Blue phase)')
  console.log('')
  console.log('4. For agent assistance, use Claude Code with prompts like:')
  console.log(`   "Help me implement ${task.title} following the task file at ${task.filepath}"`)
  console.log('')

  if (plan.agentsRequired.length > 0) {
    console.log('💡 Recommended agents for this task:')
    plan.agentsRequired.forEach(agent => {
      console.log(`   - ${agent}`)
    })
    console.log('')
  }
}

async function generateReport() {
  const report = await orchestrator.generateStatusReport()
  console.log(report)

  // Additional insights
  const tasks = await orchestrator.discoverTasks()
  const readyTasks = await orchestrator.getReadyTasks()

  console.log('## Insights\n')

  // Velocity calculation (if we have completed tasks)
  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED)
  if (completedTasks.length > 0) {
    const totalHours = completedTasks.reduce((sum, t) => sum + t.estimatedHours, 0)
    console.log(`Completed: ${completedTasks.length} tasks (${totalHours} estimated hours)`)
  }

  // Blocked tasks
  const blockedTasks = tasks.filter(t => t.blockedBy)
  if (blockedTasks.length > 0) {
    console.log(`\n⚠️  Blocked Tasks: ${blockedTasks.length}`)
    blockedTasks.forEach(t => {
      console.log(`   - ${t.id}: ${t.title}`)
      console.log(`     Blocked by: ${t.blockedBy}`)
    })
  }

  // High priority tasks
  const highPriority = readyTasks.filter(t => t.priority === 'HIGH')
  if (highPriority.length > 0) {
    console.log(`\n🔴 High Priority Ready Tasks: ${highPriority.length}`)
    highPriority.forEach(t => {
      console.log(`   - ${t.id}: ${t.title} (${t.estimatedHours}h)`)
    })
  }

  console.log('')
}

async function completeTask(taskId: string) {
  const tasks = await orchestrator.discoverTasks()
  const task = tasks.find(t => t.id === taskId || t.id === `TASK-${taskId}`)

  if (!task) {
    console.error(`❌ Task not found: ${taskId}`)
    return
  }

  console.log('\n✅ Completing Task\n')
  displayTask(task)

  console.log('To complete this task, you need to:')
  console.log('\n1. Ensure all tests pass:')
  console.log('   npm test')
  console.log('   npm run test:coverage')
  console.log('')
  console.log('2. Verify PR is merged:')
  console.log('   git log --oneline -1 main')
  console.log('')
  console.log('3. Fill out completion summary in task file:')
  console.log(`   code ${task.filepath}`)
  console.log('')
  console.log('4. Move task to completed:')
  console.log(`   mv ${task.filepath} tasks/completed/`)
  console.log('')
  console.log('Or use the orchestrator API:')
  console.log(`   await orchestrator.completeTask(task, {`)
  console.log(`     testResults: "Test coverage: 87%",`)
  console.log(`     challenges: "Had to refactor X",`)
  console.log(`     lessonsLearned: "Learned about Y"`)
  console.log(`   })`)
  console.log('')
}

async function analyzeComplexity(taskId?: string) {
  console.log('\n🔍 Task Complexity Analysis\n')

  const tasks = await orchestrator.discoverTasks()

  if (taskId) {
    // Analyze specific task
    const task = tasks.find(t => t.id === taskId || t.id === `TASK-${taskId}`)

    if (!task) {
      console.error(`❌ Task not found: ${taskId}`)
      return
    }

    console.log(`Analyzing: ${task.id} - ${task.title}\n`)

    const score = await complexityAnalyzer.analyzeComplexity(task)

    // Display score breakdown
    console.log('📊 Complexity Score Breakdown:\n')
    console.log(`  Total Score: ${score.total}/100`)
    console.log(`  Recommendation: ${score.recommendation.toUpperCase().replace(/_/g, ' ')}\n`)

    console.log('  Breakdown:')
    console.log(`    Line Count:       ${score.breakdown.lineCount}/20 points`)
    console.log(`    Step Count:       ${score.breakdown.stepCount}/15 points`)
    console.log(`    Dependencies:     ${score.breakdown.dependencyCount}/10 points`)
    console.log(`    Estimated Hours:  ${score.breakdown.estimatedHours}/25 points`)
    console.log(`    Scope Complexity: ${score.breakdown.scopeScore}/20 points`)
    console.log(`    Test Complexity:  ${score.breakdown.testComplexity}/10 points\n`)

    console.log('  Reasoning:')
    score.reasoning.forEach(reason => {
      console.log(`    • ${reason}`)
    })
    console.log('')

    if (score.recommendation === 'must_split' || score.recommendation === 'consider_split') {
      console.log('💡 Recommendation:')
      console.log(`   This task should be broken down into smaller subtasks.`)
      console.log(`   Run: npx tsx lib/task-runner/task-cli.ts breakdown ${task.id}`)
      console.log('')
    }
  } else {
    // Analyze all tasks
    const result = await breakdownAnalyzer.analyzeAllTasks(tasks)

    console.log(`📊 Analyzed ${result.tasksAnalyzed} tasks\n`)
    console.log(`🔴 Tasks requiring breakdown: ${result.shouldBreakdown.length}\n`)

    if (result.shouldBreakdown.length > 0) {
      console.log('Tasks that should be broken down:\n')

      for (const task of result.shouldBreakdown) {
        const score = await complexityAnalyzer.analyzeComplexity(task)
        const icon = score.recommendation === 'must_split' ? '🔴' : '🟡'
        console.log(`  ${icon} ${task.id}: ${task.title}`)
        console.log(`     Score: ${score.total}/100 | Est: ${task.estimatedHours}h | ${score.recommendation.replace(/_/g, ' ')}`)
      }
      console.log('')
    }

    // Save report to file
    const reportPath = join(process.cwd(), 'tasks', 'COMPLEXITY_ANALYSIS_REPORT.md')
    const fs = await import('fs')
    fs.writeFileSync(reportPath, result.report)

    console.log(`📄 Full report saved to: ${reportPath}`)
    console.log('')

    if (result.shouldBreakdown.length > 0) {
      const first = result.shouldBreakdown[0]
      console.log('💡 To break down a task:')
      console.log(`   npx tsx lib/task-runner/task-cli.ts breakdown ${first.id}`)
      console.log('')
    }
  }
}

async function breakdownTask(taskId: string) {
  if (!taskId) {
    console.error('❌ Usage: task-cli.ts breakdown TASK-XXX')
    return
  }

  const tasks = await orchestrator.discoverTasks()
  const task = tasks.find(t => t.id === taskId || t.id === `TASK-${taskId}`)

  if (!task) {
    console.error(`❌ Task not found: ${taskId}`)
    return
  }

  console.log('\n🔨 Breaking Down Task\n')
  displayTask(task)

  // Analyze complexity first
  console.log('\n📊 Analyzing complexity...\n')
  const score = await complexityAnalyzer.analyzeComplexity(task)

  console.log(`Complexity Score: ${score.total}/100 (${score.recommendation.replace(/_/g, ' ')})`)

  if (score.recommendation === 'keep') {
    console.log('\n✅ This task does not need to be broken down.')
    console.log('   It is already at an appropriate level of granularity.')
    return
  }

  console.log('\n🔄 Decomposing task into subtasks...\n')

  const decomposition = await decompositionEngine.decomposeTask(task)

  console.log(`✅ Created ${decomposition.subtasks.length} subtasks using strategy: ${decomposition.strategy}\n`)

  // Display subtasks
  console.log('📋 Subtasks:\n')

  for (const subtask of decomposition.subtasks) {
    const depIcon = subtask.dependencies.length > 0 ? '🔗' : '  '
    console.log(`  ${depIcon} ${subtask.id}: ${subtask.title}`)
    console.log(`     Est: ${subtask.estimatedHours}h | Priority: ${subtask.priority}`)

    if (subtask.dependencies.length > 0) {
      console.log(`     Dependencies: ${subtask.dependencies.join(', ')}`)
    }
  }

  // Show execution order
  console.log('\n🔄 Recommended Execution Order:\n')

  decomposition.executionOrder.forEach((id, idx) => {
    const subtask = decomposition.subtasks.find(st => st.id === id)
    if (subtask) {
      console.log(`  ${idx + 1}. ${subtask.id}: ${subtask.title}`)
    }
  })

  // Generate subtask files
  console.log('\n📁 Generating subtask files...\n')

  const outputDir = join(process.cwd(), 'tasks', 'backlog')
  const filepaths = await decompositionEngine.generateSubtaskFiles(decomposition, outputDir)

  console.log(`✅ Created ${filepaths.length} subtask files in tasks/backlog/:\n`)

  filepaths.forEach(filepath => {
    const filename = filepath.split('/').pop()
    console.log(`   - ${filename}`)
  })

  // Suggest next steps
  console.log('\n💡 Next Steps:\n')
  console.log(`1. Review the generated subtask files to ensure they are correct`)
  console.log(`2. Archive the original task:`)
  console.log(`   mv ${task.filepath} tasks/archived/`)
  console.log(`3. Start with the first subtask:`)
  console.log(`   npx tsx lib/task-runner/task-cli.ts start ${decomposition.subtasks[0].id}`)
  console.log('')
}

// ============================================
// Main CLI Entry Point
// ============================================

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const param = args[1]

  try {
    switch (command) {
      case 'list':
        await listTasks(param as TaskStatus)
        break

      case 'next':
        await showNextTask()
        break

      case 'status':
        if (!param) {
          console.error('Usage: task-cli.ts status TASK-001')
          process.exit(1)
        }
        await showTaskStatus(param)
        break

      case 'start':
        if (!param) {
          console.error('Usage: task-cli.ts start TASK-001')
          process.exit(1)
        }
        await startTask(param)
        break

      case 'report':
        await generateReport()
        break

      case 'complete':
        if (!param) {
          console.error('Usage: task-cli.ts complete TASK-001')
          process.exit(1)
        }
        await completeTask(param)
        break

      case 'analyze':
        await analyzeComplexity(param)
        break

      case 'breakdown':
        if (!param) {
          console.error('Usage: task-cli.ts breakdown TASK-001')
          process.exit(1)
        }
        await breakdownTask(param)
        break

      case 'help':
      default:
        console.log('\n📋 Jetvision Task Management CLI\n')
        console.log('Commands:')
        console.log('  list [status]        List all tasks (optionally filter by status)')
        console.log('  next                 Show next recommended task')
        console.log('  status TASK-XXX      Show detailed status of a task')
        console.log('  start TASK-XXX       Start working on a task')
        console.log('  report               Generate comprehensive status report')
        console.log('  complete TASK-XXX    Mark task as complete')
        console.log('  analyze [TASK-XXX]   Analyze task complexity (all or specific task)')
        console.log('  breakdown TASK-XXX   Break down complex task into subtasks')
        console.log('  help                 Show this help message')
        console.log('\nExamples:')
        console.log('  npx tsx lib/task-runner/task-cli.ts list')
        console.log('  npx tsx lib/task-runner/task-cli.ts next')
        console.log('  npx tsx lib/task-runner/task-cli.ts start TASK-001')
        console.log('  npx tsx lib/task-runner/task-cli.ts report')
        console.log('  npx tsx lib/task-runner/task-cli.ts analyze              # Analyze all tasks')
        console.log('  npx tsx lib/task-runner/task-cli.ts analyze TASK-001     # Analyze specific task')
        console.log('  npx tsx lib/task-runner/task-cli.ts breakdown TASK-001   # Break down task')
        console.log('')
        break
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { main }
