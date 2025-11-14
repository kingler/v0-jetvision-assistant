/**
 * Example: Linear Context Sync Integration
 * 
 * This example demonstrates how to use the Linear Context Sync system
 * to synchronize .context/ directory status with Linear project management.
 */

import {
  parseContextDirectory,
  syncContextToLinear,
  generateSyncReport,
  type ContextTaskStatus,
  type SyncResult,
} from './context-sync';

/**
 * Example 1: Parse .context/ directory
 */
async function example1_parseContext() {
  console.log('Example 1: Parse .context/ directory\n');

  const tasks = await parseContextDirectory('./.context');

  console.log(`Found ${tasks.length} tasks:\n`);
  
  tasks.forEach(task => {
    console.log(`- ${task.identifier}: ${task.status} (${task.completionPercentage || 'N/A'}%)`);
    console.log(`  Source: ${task.source}`);
    console.log(`  Title: ${task.title}`);
    console.log('');
  });
}

/**
 * Example 2: Dry run sync (preview changes)
 */
async function example2_dryRunSync() {
  console.log('Example 2: Dry run sync (preview changes)\n');

  const result = await syncContextToLinear('./.context', 'ONEK', true);

  console.log('Dry run results:');
  console.log(`- Would sync: ${result.synced.length} issues`);
  console.log(`- Would skip: ${result.skipped.length} issues`);
  console.log(`- Would fail: ${result.failed.length} issues`);
  console.log('');

  if (result.synced.length > 0) {
    console.log('Issues that would be synced:');
    result.synced.forEach(id => console.log(`  - ${id}`));
  }
}

/**
 * Example 3: Live sync to Linear
 */
async function example3_liveSync() {
  console.log('Example 3: Live sync to Linear\n');

  const result = await syncContextToLinear('./.context', 'ONEK', false);

  console.log('Sync results:');
  console.log(`- Synced: ${result.synced.length} issues`);
  console.log(`- Skipped: ${result.skipped.length} issues`);
  console.log(`- Failed: ${result.failed.length} issues`);
  console.log('');

  if (result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(({ identifier, error }) => {
      console.log(`  - ${identifier}: ${error}`);
    });
  }
}

/**
 * Example 4: Generate and save sync report
 */
async function example4_generateReport() {
  console.log('Example 4: Generate and save sync report\n');

  const result = await syncContextToLinear('./.context', 'ONEK', false);
  const report = generateSyncReport(result);

  console.log('Generated report:');
  console.log(report);

  // In real usage, save to file:
  // await fs.writeFile('.context/linear-sync-report.md', report, 'utf-8');
}

/**
 * Example 5: Sync specific team
 */
async function example5_syncDifferentTeam() {
  console.log('Example 5: Sync to different team\n');

  // Sync to DES team instead of ONEK
  const result = await syncContextToLinear('./.context', 'DES', false);

  console.log(`Synced ${result.synced.length} issues to DES team`);
}

/**
 * Example 6: Filter tasks by status
 */
async function example6_filterByStatus() {
  console.log('Example 6: Filter tasks by status\n');

  const tasks = await parseContextDirectory('./.context');

  const completeTasks = tasks.filter(t => t.status === 'complete');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  console.log(`Complete: ${completeTasks.length}`);
  console.log(`In Progress: ${inProgressTasks.length}`);
  console.log(`Blocked: ${blockedTasks.length}`);
  console.log('');

  if (blockedTasks.length > 0) {
    console.log('Blocked tasks:');
    blockedTasks.forEach(task => {
      console.log(`  - ${task.identifier}: ${task.title}`);
    });
  }
}

/**
 * Example 7: Integration with codebase analysis
 */
async function example7_codebaseAnalysisIntegration() {
  console.log('Example 7: Integration with codebase analysis\n');

  // Step 1: Update .context/ files (done by analyze_codebase command)
  console.log('1. Analyzing codebase and updating .context/ files...');

  // Step 2: Parse updated context
  console.log('2. Parsing .context/ directory...');
  const tasks = await parseContextDirectory('./.context');
  console.log(`   Found ${tasks.length} tasks`);

  // Step 3: Sync to Linear
  console.log('3. Syncing to Linear...');
  const result = await syncContextToLinear('./.context', 'ONEK', false);
  console.log(`   Synced: ${result.synced.length}, Skipped: ${result.skipped.length}`);

  // Step 4: Generate report
  console.log('4. Generating sync report...');
  const report = generateSyncReport(result);
  console.log('   Report saved to .context/linear-sync-report.md');

  // Step 5: Display summary
  console.log('\n✅ Codebase analysis and Linear sync complete!');
}

// Run examples
async function runExamples() {
  try {
    await example1_parseContext();
    await example2_dryRunSync();
    // await example3_liveSync(); // Uncomment to run live sync
    // await example4_generateReport();
    // await example5_syncDifferentTeam();
    await example6_filterByStatus();
    await example7_codebaseAnalysisIntegration();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run:
// runExamples();

