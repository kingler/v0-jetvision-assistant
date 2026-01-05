#!/usr/bin/env tsx
/**
 * Sync .context/ directory status to Linear
 * 
 * Usage:
 *   npm run sync:linear              # Sync to ONEK team
 *   npm run sync:linear -- --dry-run # Preview changes without syncing
 *   npm run sync:linear -- --team DES # Sync to different team
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { syncContextToLinear, generateSyncReport } from '../../lib/linear/context-sync';

interface CLIOptions {
  dryRun: boolean;
  team: string;
  contextPath: string;
  verbose: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  
  const options: CLIOptions = {
    dryRun: false,
    team: 'ONEK', // Default team
    contextPath: path.join(process.cwd(), '.context'),
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--team' || arg === '-t') {
      options.team = args[++i];
    } else if (arg === '--context-path' || arg === '-c') {
      options.contextPath = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Sync .context/ Directory to Linear

USAGE:
  npm run sync:linear [OPTIONS]

OPTIONS:
  --dry-run, -d          Preview changes without syncing to Linear
  --team, -t <TEAM>      Linear team key (default: ONEK)
  --context-path, -c     Path to .context directory (default: ./.context)
  --verbose, -v          Enable verbose logging
  --help, -h             Show this help message

EXAMPLES:
  # Sync to ONEK team
  npm run sync:linear

  # Preview changes without syncing
  npm run sync:linear -- --dry-run

  # Sync to different team
  npm run sync:linear -- --team DES

  # Verbose output
  npm run sync:linear -- --verbose
`);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('🔄 Linear Context Sync');
  console.log('='.repeat(50));
  console.log(`Team: ${options.team}`);
  console.log(`Context Path: ${options.contextPath}`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE SYNC'}`);
  console.log('='.repeat(50));
  console.log('');

  // Verify .context directory exists
  try {
    await fs.access(options.contextPath);
  } catch (error) {
    console.error(`❌ Error: .context directory not found at ${options.contextPath}`);
    process.exit(1);
  }

  // Get team ID (in real implementation, would query Linear API)
  const teamId = options.team; // Simplified for now

  // Perform sync
  console.log('📊 Parsing .context/ directory...\n');
  
  const result = await syncContextToLinear(
    options.contextPath,
    teamId,
    options.dryRun
  );

  // Generate and display report
  console.log('');
  console.log('='.repeat(50));
  const report = generateSyncReport(result);
  console.log(report);
  console.log('='.repeat(50));

  // Save report to .context/
  const reportPath = path.join(options.contextPath, 'linear-sync-report.md');
  await fs.writeFile(reportPath, report, 'utf-8');
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Exit with appropriate code
  if (!result.success) {
    console.error('\n❌ Sync completed with errors');
    process.exit(1);
  } else if (result.failed.length > 0) {
    console.warn('\n⚠️  Sync completed with some failures');
    process.exit(0);
  } else {
    console.log('\n✅ Sync completed successfully');
    process.exit(0);
  }
}

// Run main function
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
