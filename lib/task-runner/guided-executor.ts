#!/usr/bin/env tsx
/**
 * Guided Task Executor
 *
 * Interactive guide that walks developers through task execution step-by-step
 * Provides prompts for Claude Code agents at each phase
 *
 * Usage:
 *   npx tsx lib/task-runner/guided-executor.ts TASK-001
 */

import { createTaskOrchestrator, displayTask } from './task-orchestrator'
import { AgentDelegator, formatPromptForClaude, AgentType } from './agent-delegator'
import readline from 'readline'

const orchestrator = createTaskOrchestrator()

// ============================================
// Interactive Helpers
// ============================================

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, answer => resolve(answer.trim()))
  })
}

// ============================================
// Guided Execution
// ============================================

async function guideTaskExecution(taskId: string) {
  const rl = createInterface()

  console.log('\n🎯 JetVision Guided Task Executor\n')

  // Load task
  const tasks = await orchestrator.discoverTasks()
  const task = tasks.find(t => t.id === taskId || t.id === `TASK-${taskId}`)

  if (!task) {
    console.error(`❌ Task not found: ${taskId}`)
    rl.close()
    return
  }

  displayTask(task)

  // Create execution plan
  console.log('📋 Creating execution plan...\n')
  const plan = await orchestrator.createExecutionPlan(task)

  console.log(`✅ Plan created with ${plan.steps.length} steps`)
  console.log(`⏱️  Estimated total time: ${plan.steps.reduce((sum, s) => sum + s.estimatedMinutes, 0)} minutes\n`)

  // Step 1: Check Prerequisites
  console.log('━'.repeat(70))
  console.log('📦 STEP 0: Prerequisites Check')
  console.log('━'.repeat(70))
  console.log('')

  if (task.dependencies.length > 0) {
    console.log('⚠️  This task has dependencies:')
    task.dependencies.forEach(dep => console.log(`   - ${dep}`))
    console.log('')
    const depsOk = await question(rl, 'Are all dependencies completed? (y/n): ')
    if (depsOk.toLowerCase() !== 'y') {
      console.log('\n❌ Please complete dependencies first.')
      rl.close()
      return
    }
  }

  if (task.blockedBy) {
    console.log(`⚠️  This task is blocked by: ${task.blockedBy}`)
    const blockOk = await question(rl, 'Has this blocker been resolved? (y/n): ')
    if (blockOk.toLowerCase() !== 'y') {
      console.log('\n❌ Please resolve blocker first.')
      rl.close()
      return
    }
  }

  console.log('✅ Prerequisites check passed!\n')

  // Step 2: Create Branch
  console.log('━'.repeat(70))
  console.log('🌿 STEP 1: Create Feature Branch')
  console.log('━'.repeat(70))
  console.log('')

  const branchName = await orchestrator.createFeatureBranch(task)
  console.log('Run these commands:')
  console.log('  git checkout main')
  console.log('  git pull origin main')
  console.log(`  git checkout -b ${branchName}`)
  console.log('')

  const branchCreated = await question(rl, 'Branch created? (y/n): ')
  if (branchCreated.toLowerCase() !== 'y') {
    console.log('\n⏸️  Pausing execution. Create branch and run script again.')
    rl.close()
    return
  }

  console.log('✅ Branch created!\n')

  // Step 3: TDD Phase 1 - RED (Write Failing Tests)
  console.log('━'.repeat(70))
  console.log('🔴 STEP 2: TDD RED PHASE - Write Failing Tests')
  console.log('━'.repeat(70))
  console.log('')

  console.log('In this phase, you will write tests that FAIL.\n')

  // Recommend agents
  const recommendedAgents = AgentDelegator.recommendAgents(task)
  console.log('💡 Recommended agents for this task:')
  recommendedAgents.forEach(agent => console.log(`   - ${agent}`))
  console.log('')

  // Generate test prompts
  console.log('📝 Use these prompts with Claude Code:\n')

  console.log('--- Unit Tests Prompt ---')
  const unitTestPrompt = await AgentDelegator.generateTestCreationPrompt(task, 'unit')
  console.log(formatPromptForClaude(unitTestPrompt))

  const unitTestsReady = await question(rl, '\nUnit tests written? (y/n/skip): ')

  if (unitTestsReady.toLowerCase() === 'y') {
    console.log('\n--- Integration Tests Prompt ---')
    const integrationTestPrompt = await AgentDelegator.generateTestCreationPrompt(task, 'integration')
    console.log(formatPromptForClaude(integrationTestPrompt))

    await question(rl, '\nIntegration tests written? (y/n/skip): ')

    console.log('\n--- E2E Tests Prompt (optional) ---')
    const e2eTestPrompt = await AgentDelegator.generateTestCreationPrompt(task, 'e2e')
    console.log(formatPromptForClaude(e2eTestPrompt))

    await question(rl, '\nE2E tests written? (y/n/skip): ')
  }

  console.log('\n✅ Verify tests are failing:')
  console.log('   npm test')
  console.log('')

  const testsFailing = await question(rl, 'Are tests failing as expected? (y/n): ')
  if (testsFailing.toLowerCase() !== 'y') {
    console.log('\n⚠️  Tests should fail in RED phase. Review test implementation.')
    rl.close()
    return
  }

  console.log('\n💾 Commit the failing tests:')
  console.log(`   git add .`)
  console.log(`   git commit -m "test: add tests for ${task.title}`)
  console.log(``)
  console.log(`   Red phase - tests currently failing`)
  console.log(``)
  console.log(`   Related to: ${task.id}"`)
  console.log('')

  await question(rl, 'Tests committed? Press Enter to continue...')

  // Step 4: TDD Phase 2 - GREEN (Implement Feature)
  console.log('\n━'.repeat(70))
  console.log('🟢 STEP 3: TDD GREEN PHASE - Implement Feature')
  console.log('━'.repeat(70))
  console.log('')

  console.log('In this phase, you will implement the feature to make tests PASS.\n')

  const agentType = AgentDelegator.recommendAgent(task)
  console.log(`💡 Primary agent for implementation: ${agentType}\n`)

  console.log('📝 Use this prompt with Claude Code:\n')
  const greenPrompt = await AgentDelegator.generateTaskPrompt(task, agentType, 'green')
  console.log(formatPromptForClaude(greenPrompt))

  const implementationDone = await question(rl, '\nImplementation complete? (y/n): ')
  if (implementationDone.toLowerCase() !== 'y') {
    console.log('\n⏸️  Pausing. Continue implementation and run script again.')
    rl.close()
    return
  }

  console.log('\n✅ Verify all tests pass:')
  console.log('   npm test')
  console.log('   npm run test:coverage')
  console.log('')

  const testsPassing = await question(rl, 'Are all tests passing? (y/n): ')
  if (testsPassing.toLowerCase() !== 'y') {
    console.log('\n⚠️  Fix failing tests before proceeding.')
    rl.close()
    return
  }

  const coverage = await question(rl, 'Enter coverage percentage (e.g., 87): ')
  const coverageNum = parseInt(coverage, 10)

  if (coverageNum < 75) {
    console.log('\n⚠️  Coverage is below 75% threshold. Add more tests.')
    const proceed = await question(rl, 'Proceed anyway? (y/n): ')
    if (proceed.toLowerCase() !== 'y') {
      rl.close()
      return
    }
  }

  console.log('\n💾 Commit the implementation:')
  console.log(`   git add .`)
  console.log(`   git commit -m "feat: implement ${task.title}`)
  console.log(``)
  console.log(`   Green phase - tests now passing`)
  console.log(`   Coverage: ${coverage}%`)
  console.log(``)
  console.log(`   Implements: ${task.id}"`)
  console.log('')

  await question(rl, 'Implementation committed? Press Enter to continue...')

  // Step 5: TDD Phase 3 - BLUE (Refactor)
  console.log('\n━'.repeat(70))
  console.log('🔵 STEP 4: TDD BLUE PHASE - Refactor')
  console.log('━'.repeat(70))
  console.log('')

  console.log('In this phase, you will improve code quality while keeping tests passing.\n')

  console.log('📝 Use this prompt with Claude Code:\n')
  const bluePrompt = await AgentDelegator.generateTaskPrompt(task, agentType, 'blue')
  console.log(formatPromptForClaude(bluePrompt))

  const refactoringDone = await question(rl, '\nRefactoring complete? (y/n/skip): ')

  if (refactoringDone.toLowerCase() === 'y') {
    console.log('\n✅ Verify tests still pass after refactoring:')
    console.log('   npm test')
    console.log('')

    const testsStillPass = await question(rl, 'Tests still passing? (y/n): ')
    if (testsStillPass.toLowerCase() !== 'y') {
      console.log('\n⚠️  Refactoring broke tests. Fix or revert changes.')
      rl.close()
      return
    }

    console.log('\n💾 Commit the refactoring:')
    console.log(`   git add .`)
    console.log(`   git commit -m "refactor: improve code quality for ${task.title}`)
    console.log(``)
    console.log(`   Blue phase - refactoring complete`)
    console.log(`   Tests still passing`)
    console.log(``)
    console.log(`   Related to: ${task.id}"`)
    console.log('')

    await question(rl, 'Refactoring committed? Press Enter to continue...')
  }

  // Step 6: Final Checks
  console.log('\n━'.repeat(70))
  console.log('✅ STEP 5: Final Quality Checks')
  console.log('━'.repeat(70))
  console.log('')

  console.log('Run these checks:')
  console.log('  npm run lint       # ESLint check')
  console.log('  npm run type-check # TypeScript compilation')
  console.log('  npm run build      # Production build')
  console.log('')

  const qualityOk = await question(rl, 'All quality checks passing? (y/n): ')
  if (qualityOk.toLowerCase() !== 'y') {
    console.log('\n⚠️  Fix quality issues before creating PR.')
    rl.close()
    return
  }

  // Step 7: Security Review (if needed)
  if (task.title.toLowerCase().includes('auth') || task.title.toLowerCase().includes('security')) {
    console.log('\n━'.repeat(70))
    console.log('🔒 STEP 6: Security Review')
    console.log('━'.repeat(70))
    console.log('')

    console.log('This task involves security concerns. Running security review...\n')

    console.log('📝 Use this prompt with security-engineer agent:\n')
    const securityPrompt = AgentDelegator.generateSecurityReviewPrompt(task)
    console.log(formatPromptForClaude(securityPrompt))

    await question(rl, '\nSecurity review complete? Press Enter to continue...')
  }

  // Step 8: Create Pull Request
  console.log('\n━'.repeat(70))
  console.log('📤 STEP 7: Create Pull Request')
  console.log('━'.repeat(70))
  console.log('')

  console.log('Push your branch:')
  console.log(`  git push -u origin ${branchName}`)
  console.log('')

  const pushed = await question(rl, 'Branch pushed? (y/n): ')
  if (pushed.toLowerCase() !== 'y') {
    console.log('\n⏸️  Push branch and continue.')
    rl.close()
    return
  }

  console.log('\nCreate PR on GitHub:')
  console.log('1. Go to repository on GitHub')
  console.log('2. Click "Pull requests" → "New pull request"')
  console.log(`3. Select branch: ${branchName}`)
  console.log('4. Fill out PR template')
  console.log(`5. Link task file: ${task.filepath}`)
  console.log('6. Add reviewers')
  console.log('7. Create pull request')
  console.log('')

  const prUrl = await question(rl, 'Enter PR URL (or press Enter to skip): ')

  if (prUrl) {
    console.log('\n📝 Use this prompt for code review agent:\n')
    const reviewPrompt = AgentDelegator.generateReviewPrompt(task, prUrl)
    console.log(formatPromptForClaude(reviewPrompt))
  }

  // Summary
  console.log('\n━'.repeat(70))
  console.log('🎉 TASK EXECUTION COMPLETE!')
  console.log('━'.repeat(70))
  console.log('')

  console.log('✅ Checklist:')
  console.log('  [✓] Feature branch created')
  console.log('  [✓] Tests written (RED phase)')
  console.log('  [✓] Feature implemented (GREEN phase)')
  console.log('  [✓] Code refactored (BLUE phase)')
  console.log('  [✓] Quality checks passed')
  console.log('  [✓] Pull request created')
  console.log('')

  console.log('📋 Next Steps:')
  console.log('1. Wait for code review')
  console.log('2. Address review comments')
  console.log('3. Get approval')
  console.log('4. Merge PR')
  console.log(`5. Move task to completed: mv ${task.filepath} tasks/completed/`)
  console.log('')

  console.log('📊 Task Summary:')
  console.log(`  Task: ${task.id} - ${task.title}`)
  console.log(`  Priority: ${task.priority}`)
  console.log(`  Estimated: ${task.estimatedHours} hours`)
  console.log(`  Coverage: ${coverage}%`)
  if (prUrl) console.log(`  PR: ${prUrl}`)
  console.log('')

  rl.close()
}

// ============================================
// Main Entry Point
// ============================================

async function main() {
  const args = process.argv.slice(2)
  const taskId = args[0]

  if (!taskId) {
    console.error('\n❌ Error: Task ID required')
    console.log('\nUsage:')
    console.log('  npx tsx lib/task-runner/guided-executor.ts TASK-001')
    console.log('')
    console.log('To see available tasks:')
    console.log('  npx tsx lib/task-runner/task-cli.ts list')
    console.log('  npx tsx lib/task-runner/task-cli.ts next')
    console.log('')
    process.exit(1)
  }

  try {
    await guideTaskExecution(taskId)
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { guideTaskExecution }
