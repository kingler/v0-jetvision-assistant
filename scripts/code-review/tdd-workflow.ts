#!/usr/bin/env tsx
/**
 * TDD Workflow Integration with Code Review
 * Ensures proper TDD cycle: RED -> GREEN -> REFACTOR with validation
 */

import { execSync } from 'child_process';
import * as readline from 'readline';

enum TDDPhase {
  RED = 'RED',     // Write failing test
  GREEN = 'GREEN', // Make test pass
  REFACTOR = 'REFACTOR', // Improve code quality
}

interface TDDWorkflowConfig {
  feature: string;
  phase: TDDPhase;
  testFile?: string;
  implementationFile?: string;
}

class TDDWorkflow {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async run(): Promise<void> {
    console.log('🔄 Jetvision TDD Workflow with Code Review\n');
    console.log('This workflow enforces proper TDD practices:\n');
    console.log('  1. RED   - Write a failing test');
    console.log('  2. GREEN - Make the test pass');
    console.log('  3. REFACTOR - Improve code quality\n');

    const config = await this.getConfiguration();
    await this.executeWorkflow(config);

    this.rl.close();
  }

  private async getConfiguration(): Promise<TDDWorkflowConfig> {
    const feature = await this.question('Feature name: ');
    const phaseInput = await this.question('Current phase (RED/GREEN/REFACTOR): ');
    const phase = phaseInput.toUpperCase() as TDDPhase;

    if (!Object.values(TDDPhase).includes(phase)) {
      throw new Error('Invalid phase. Must be RED, GREEN, or REFACTOR');
    }

    return { feature, phase };
  }

  private async executeWorkflow(config: TDDWorkflowConfig): Promise<void> {
    console.log(`\n🎯 Starting ${config.phase} phase for: ${config.feature}\n`);

    switch (config.phase) {
      case TDDPhase.RED:
        await this.executeRedPhase(config);
        break;
      case TDDPhase.GREEN:
        await this.executeGreenPhase(config);
        break;
      case TDDPhase.REFACTOR:
        await this.executeRefactorPhase(config);
        break;
    }
  }

  private async executeRedPhase(config: TDDWorkflowConfig): Promise<void> {
    console.log('🔴 RED Phase - Write Failing Test\n');
    console.log('Steps:');
    console.log('  1. Create test file');
    console.log('  2. Write test case that defines desired behavior');
    console.log('  3. Verify test fails (as expected)\n');

    const ready = await this.question('Have you written the failing test? (y/n): ');
    if (ready.toLowerCase() !== 'y') {
      console.log('⏸️  Complete the test first, then re-run this workflow.');
      return;
    }

    console.log('\n🧪 Running tests to verify failure...\n');
    try {
      execSync('npm run test:unit -- --run', { stdio: 'inherit' });
      console.log('\n⚠️  WARNING: Tests passed! This is not the RED phase.');
      console.log('   In RED phase, tests should FAIL.');
      console.log('   Make sure your test actually checks the new behavior.\n');
      process.exit(1);
    } catch {
      console.log('\n✅ Test failed as expected! RED phase complete.\n');
      console.log('Next step: Run this script with GREEN phase to implement the feature.');
    }
  }

  private async executeGreenPhase(config: TDDWorkflowConfig): Promise<void> {
    console.log('🟢 GREEN Phase - Make Test Pass\n');
    console.log('Steps:');
    console.log('  1. Implement minimal code to make test pass');
    console.log('  2. Run tests to verify they pass');
    console.log('  3. Commit with "feat" or "fix" prefix\n');

    const ready = await this.question('Have you implemented the code? (y/n): ');
    if (ready.toLowerCase() !== 'y') {
      console.log('⏸️  Complete the implementation first, then re-run this workflow.');
      return;
    }

    console.log('\n🧪 Running tests...\n');
    try {
      execSync('npm run test:unit -- --run', { stdio: 'inherit' });
      console.log('\n✅ Tests passed! GREEN phase complete.\n');
    } catch {
      console.log('\n❌ Tests still failing. Fix the implementation and try again.\n');
      process.exit(1);
    }

    console.log('🔍 Running code review validation...\n');
    try {
      execSync('npm run review:validate', { stdio: 'inherit' });
      console.log('\n✅ Code review validation passed!\n');
    } catch {
      console.log('\n❌ Code review validation failed. Fix issues and try again.\n');
      process.exit(1);
    }

    console.log('📝 Ready to commit?\n');
    const commit = await this.question('Commit message (or "skip" to commit later): ');

    if (commit.toLowerCase() !== 'skip') {
      try {
        execSync(`git add .`, { stdio: 'inherit' });
        execSync(`git commit -m "${commit}"`, { stdio: 'inherit' });
        console.log('\n✅ Changes committed!\n');
      } catch (error) {
        console.log('\n❌ Commit failed. Check the error above.\n');
        process.exit(1);
      }
    }

    console.log('Next step: Run this script with REFACTOR phase to improve code quality.');
  }

  private async executeRefactorPhase(config: TDDWorkflowConfig): Promise<void> {
    console.log('🔵 REFACTOR Phase - Improve Code Quality\n');
    console.log('Steps:');
    console.log('  1. Improve code structure and readability');
    console.log('  2. Remove duplication');
    console.log('  3. Verify tests still pass');
    console.log('  4. Run full validation suite\n');

    const ready = await this.question('Have you refactored the code? (y/n): ');
    if (ready.toLowerCase() !== 'y') {
      console.log('⏸️  Complete the refactoring first, then re-run this workflow.');
      return;
    }

    console.log('\n🧪 Running full test suite...\n');
    try {
      execSync('npm run test:coverage', { stdio: 'inherit' });
      console.log('\n✅ All tests passed!\n');
    } catch {
      console.log('\n❌ Tests failed after refactoring. Revert changes and try again.\n');
      process.exit(1);
    }

    console.log('🔍 Running comprehensive code review...\n');
    try {
      execSync('npm run review:validate', { stdio: 'inherit' });
      execSync('npm run type-check', { stdio: 'inherit' });
      execSync('npm run lint', { stdio: 'inherit' });
      console.log('\n✅ All validation checks passed!\n');
    } catch {
      console.log('\n❌ Validation failed. Fix issues and try again.\n');
      process.exit(1);
    }

    console.log('📝 Ready to commit refactoring?\n');
    const commit = await this.question('Commit message (or "skip" to commit later): ');

    if (commit.toLowerCase() !== 'skip') {
      try {
        execSync(`git add .`, { stdio: 'inherit' });
        execSync(`git commit -m "${commit}"`, { stdio: 'inherit' });
        console.log('\n✅ Refactoring committed!\n');
      } catch (error) {
        console.log('\n❌ Commit failed. Check the error above.\n');
        process.exit(1);
      }
    }

    console.log('🎉 TDD cycle complete!\n');
    console.log('Feature is ready for code review and PR creation.');
  }

  private question(query: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(query, resolve);
    });
  }
}

// Run workflow
const workflow = new TDDWorkflow();
workflow.run().catch(error => {
  console.error('❌ Workflow failed:', error.message);
  process.exit(1);
});
