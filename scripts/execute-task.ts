#!/usr/bin/env tsx
/**
 * Execute Task with Claude Code SubAgents
 *
 * Usage:
 *   npx tsx scripts/execute-task.ts TASK-001
 *   npx tsx scripts/execute-task.ts TASK-001 --step-by-step
 */

import { AgentExecutor } from '../lib/task-runner/agent-executor'
import { createTaskOrchestrator, displayTask } from '../lib/task-runner/task-orchestrator'

async function main() {
  const args = process.argv.slice(2)
  const taskId = args[0]
  const stepByStep = args.includes('--step-by-step')

  if (!taskId) {
    console.error('\n❌ Error: Task ID required')
    console.log('\nUsage:')
    console.log('  npx tsx scripts/execute-task.ts TASK-001')
    console.log('  npx tsx scripts/execute-task.ts TASK-001 --step-by-step')
    console.log('\nOptions:')
    console.log('  --step-by-step    Execute steps one at a time with approvals')
    console.log('')
    process.exit(1)
  }

  const orchestrator = createTaskOrchestrator()
  const tasks = await orchestrator.discoverTasks()
  const task = tasks.find(t => t.id === taskId || t.id === `TASK-${taskId}`)

  if (!task) {
    console.error(`\n❌ Task not found: ${taskId}`)
    console.log('\nAvailable tasks:')
    console.log('  npm run task:list')
    process.exit(1)
  }

  console.log('\n🤖 AUTOMATED TASK EXECUTION WITH CLAUDE CODE SUBAGENTS\n')
  displayTask(task)

  const plan = await orchestrator.createExecutionPlan(task)

  console.log('📋 Execution Plan:')
  console.log(`   Steps: ${plan.steps.length}`)
  console.log(`   Agents: ${plan.agentsRequired.join(', ')}`)
  console.log(`   Estimated time: ${plan.steps.reduce((sum, s) => sum + s.estimatedMinutes, 0)} minutes`)
  console.log('')

  console.log('⚠️  This will invoke Claude Code subagents to:')
  console.log('   1. Write tests (RED phase) via qa-engineer-seraph')
  console.log('   2. Implement feature (GREEN phase) via recommended agent')
  console.log('   3. Refactor code (BLUE phase) via recommended agent')
  if (task.title.toLowerCase().includes('auth') || task.title.toLowerCase().includes('security')) {
    console.log('   4. Security review via security-engineer')
  }
  console.log('')

  if (stepByStep) {
    console.log('🔧 Mode: Step-by-step execution with approvals\n')
    await AgentExecutor.executeAllSteps(task, plan)
  } else {
    console.log('🚀 Mode: Automated TDD workflow (RED-GREEN-BLUE)\n')

    if (task.title.toLowerCase().includes('auth') || task.title.toLowerCase().includes('security')) {
      await AgentExecutor.executeWithSecurityReview(task, plan)
    } else {
      await AgentExecutor.executeTaskWithAgents(task, plan)
    }
  }

  console.log('\n✅ Task execution complete!')
  console.log('\n📊 Next steps:')
  console.log('   1. Review the changes made by agents')
  console.log('   2. Run quality checks:')
  console.log('      npm run lint')
  console.log('      npm run type-check')
  console.log('      npm test')
  console.log('   3. Create PR:')
  console.log(`      git push -u origin feature/${taskId.toLowerCase()}-${task.title.toLowerCase().replace(/\s+/g, '-')}`)
  console.log('   4. Mark task complete:')
  console.log(`      npm run task:complete ${taskId}`)
  console.log('')
}

main().catch(error => {
  console.error('\n❌ Error:', error)
  process.exit(1)
})
