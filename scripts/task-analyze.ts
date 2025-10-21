#!/usr/bin/env tsx
/**
 * Task Complexity Analyzer
 * Analyzes task complexity and provides breakdown recommendations
 */

import fs from 'fs';
import path from 'path';

// Complexity thresholds
const THRESHOLDS = {
  SIMPLE: 49,
  MODERATE: 69,
  COMPLEX: 89,
  EXTREME: 100,
};

// Complexity weights
const WEIGHTS = {
  linesOfCode: 0.30,
  dependencies: 0.20,
  testing: 0.15,
  documentation: 0.10,
  integrationPoints: 0.15,
  riskLevel: 0.10,
};

interface TaskMetadata {
  id: string;
  title: string;
  estimatedLines?: number;
  externalDependencies?: string[];
  testingRequired?: string[];
  documentationRequired?: string[];
  integrations?: string[];
  riskLevel?: number; // 1-5
}

interface ComplexityAnalysis {
  taskId: string;
  score: number;
  tier: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'EXTREME';
  breakdown: {
    linesOfCode: number;
    dependencies: number;
    testing: number;
    documentation: number;
    integrationPoints: number;
    riskLevel: number;
  };
  recommendation: string;
  estimatedTime: string;
  suggestedSubtasks: number;
}

/**
 * Extract task metadata from markdown file
 */
function parseTaskFile(filePath: string): TaskMetadata | null {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Task file not found: ${filePath}`);
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Extract task ID from filename
  const filename = path.basename(filePath);
  const taskIdMatch = filename.match(/TASK-(\d+)/);
  if (!taskIdMatch) {
    console.error(`❌ Invalid task filename: ${filename}`);
    return null;
  }

  const taskId = `TASK-${taskIdMatch[1]}`;

  // Extract title
  const titleLine = lines.find((line) => line.startsWith('# TASK-'));
  const title = titleLine ? titleLine.replace(/^# TASK-\d+:\s*/, '') : 'Unknown';

  // Parse metadata from content
  const metadata: TaskMetadata = {
    id: taskId,
    title,
    externalDependencies: [],
    testingRequired: [],
    documentationRequired: [],
    integrations: [],
    riskLevel: 3, // Default medium risk
  };

  // Estimate lines of code from implementation sections
  const implementationSections = content.match(/## Implementation|## Phase 2: GREEN/gi);
  const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
  metadata.estimatedLines = codeBlocks.reduce(
    (sum, block) => sum + block.split('\n').length,
    0
  ) * 5; // Multiply by 5 to estimate full implementation

  // Find dependencies
  const depsSection = content.match(/## Dependencies|## Requirements/i);
  if (depsSection) {
    const depsStart = content.indexOf(depsSection[0]);
    const depsContent = content.slice(depsStart, depsStart + 1000);
    const deps = depsContent.match(/- @[\w/]+|npm install|import.*from/g) || [];
    metadata.externalDependencies = [...new Set(deps)];
  }

  // Find testing requirements
  if (content.includes('Unit tests') || content.includes('unit test')) {
    metadata.testingRequired?.push('unit');
  }
  if (content.includes('Integration test') || content.includes('integration test')) {
    metadata.testingRequired?.push('integration');
  }
  if (content.includes('E2E') || content.includes('end-to-end')) {
    metadata.testingRequired?.push('e2e');
  }

  // Find documentation requirements
  if (content.includes('API documentation') || content.includes('API docs')) {
    metadata.documentationRequired?.push('api');
  }
  if (content.includes('README') || content.includes('setup guide')) {
    metadata.documentationRequired?.push('guide');
  }

  // Find integrations
  const integrationKeywords = [
    'Clerk', 'Supabase', 'OpenAI', 'Redis', 'Avinode',
    'Gmail', 'Google Sheets', 'Sentry', 'BullMQ'
  ];
  integrationKeywords.forEach((keyword) => {
    if (content.includes(keyword)) {
      metadata.integrations?.push(keyword);
    }
  });

  // Determine risk level
  if (content.includes('security') || content.includes('authentication')) {
    metadata.riskLevel = 5;
  } else if (content.includes('database') || content.includes('payment')) {
    metadata.riskLevel = 4;
  }

  return metadata;
}

/**
 * Calculate complexity score
 */
function calculateComplexity(metadata: TaskMetadata): ComplexityAnalysis {
  const breakdown = {
    linesOfCode: 0,
    dependencies: 0,
    testing: 0,
    documentation: 0,
    integrationPoints: 0,
    riskLevel: 0,
  };

  // 1. Lines of Code (30 points max)
  const estimatedLOC = metadata.estimatedLines || 0;
  breakdown.linesOfCode = Math.min(30, (estimatedLOC / 1000) * 30);

  // 2. Dependencies (20 points max)
  const deps = metadata.externalDependencies || [];
  breakdown.dependencies = Math.min(20, deps.length * 4);

  // 3. Testing (15 points max)
  const testTypes = metadata.testingRequired || [];
  breakdown.testing = testTypes.length * 5; // unit, integration, e2e

  // 4. Documentation (10 points max)
  const docTypes = metadata.documentationRequired || [];
  breakdown.documentation = Math.min(10, docTypes.length * 3);

  // 5. Integration Points (15 points max)
  const integrations = metadata.integrations || [];
  breakdown.integrationPoints = Math.min(15, integrations.length * 5);

  // 6. Risk Level (10 points max)
  breakdown.riskLevel = (metadata.riskLevel || 3) * 2; // 1-5 scale → 2-10 points

  // Calculate total score
  const score = Math.round(
    breakdown.linesOfCode +
    breakdown.dependencies +
    breakdown.testing +
    breakdown.documentation +
    breakdown.integrationPoints +
    breakdown.riskLevel
  );

  // Determine tier
  let tier: ComplexityAnalysis['tier'];
  if (score <= THRESHOLDS.SIMPLE) {
    tier = 'SIMPLE';
  } else if (score <= THRESHOLDS.MODERATE) {
    tier = 'MODERATE';
  } else if (score <= THRESHOLDS.COMPLEX) {
    tier = 'COMPLEX';
  } else {
    tier = 'EXTREME';
  }

  // Generate recommendation
  let recommendation: string;
  let suggestedSubtasks: number;
  let estimatedTime: string;

  if (tier === 'SIMPLE') {
    recommendation = 'Proceed with implementation';
    suggestedSubtasks = 1;
    estimatedTime = '2-4 hours';
  } else if (tier === 'MODERATE') {
    recommendation = 'Consider breakdown (ask user for confirmation)';
    suggestedSubtasks = 2;
    estimatedTime = '6-8 hours';
  } else if (tier === 'COMPLEX') {
    recommendation = 'BREAK DOWN (automatic breakdown required)';
    suggestedSubtasks = 4;
    estimatedTime = '12-16 hours';
  } else {
    recommendation = 'BREAK DOWN + ALERT (escalate to Planner)';
    suggestedSubtasks = 5;
    estimatedTime = '20-30 hours';
  }

  return {
    taskId: metadata.id,
    score,
    tier,
    breakdown,
    recommendation,
    estimatedTime,
    suggestedSubtasks,
  };
}

/**
 * Display complexity analysis
 */
function displayAnalysis(analysis: ComplexityAnalysis, verbose: boolean = false): void {
  const tierColors = {
    SIMPLE: '\x1b[32m', // Green
    MODERATE: '\x1b[33m', // Yellow
    COMPLEX: '\x1b[31m', // Red
    EXTREME: '\x1b[35m', // Magenta
  };

  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const color = tierColors[analysis.tier];

  console.log(`\n${bold}Analyzing ${analysis.taskId}...${reset}\n`);
  console.log(`${bold}Complexity Score: ${color}${analysis.score}/100 (${analysis.tier})${reset}`);

  if (verbose) {
    console.log('\nBreakdown:');
    console.log(`  ├─ Lines of Code: ${analysis.breakdown.linesOfCode.toFixed(1)}/30`);
    console.log(`  ├─ Dependencies: ${analysis.breakdown.dependencies.toFixed(1)}/20`);
    console.log(`  ├─ Testing: ${analysis.breakdown.testing.toFixed(1)}/15`);
    console.log(`  ├─ Documentation: ${analysis.breakdown.documentation.toFixed(1)}/10`);
    console.log(`  ├─ Integration Points: ${analysis.breakdown.integrationPoints.toFixed(1)}/15`);
    console.log(`  └─ Risk Level: ${analysis.breakdown.riskLevel.toFixed(1)}/10`);
  }

  console.log(`\n${bold}Recommendation:${reset} ${color}${analysis.recommendation}${reset}`);
  console.log(`${bold}Estimated Time:${reset} ${analysis.estimatedTime}`);
  console.log(`${bold}Suggested Subtasks:${reset} ${analysis.suggestedSubtasks}`);

  if (analysis.tier === 'COMPLEX' || analysis.tier === 'EXTREME') {
    console.log(`\n${bold}Next Action:${reset} ${color}npm run task:breakdown ${analysis.taskId}${reset}\n`);
  } else if (analysis.tier === 'MODERATE') {
    console.log(`\n${bold}Optional Action:${reset} npm run task:breakdown ${analysis.taskId}\n`);
  } else {
    console.log(`\n${bold}Next Action:${reset} npm run task:start ${analysis.taskId}\n`);
  }
}

/**
 * Analyze all tasks in backlog
 */
function analyzeAllTasks(): void {
  const backlogDir = path.join(process.cwd(), 'tasks', 'backlog');
  if (!fs.existsSync(backlogDir)) {
    console.error(`❌ Backlog directory not found: ${backlogDir}`);
    process.exit(1);
  }

  const taskFiles = fs.readdirSync(backlogDir).filter((f) => f.endsWith('.md'));
  const analyses: ComplexityAnalysis[] = [];

  console.log(`\n${'\x1b[1m'}Analyzing ${taskFiles.length} tasks...${'\x1b[0m'}\n`);

  taskFiles.forEach((file) => {
    const filePath = path.join(backlogDir, file);
    const metadata = parseTaskFile(filePath);
    if (metadata) {
      const analysis = calculateComplexity(metadata);
      analyses.push(analysis);
    }
  });

  // Sort by complexity (highest first)
  analyses.sort((a, b) => b.score - a.score);

  // Display summary
  const simple = analyses.filter((a) => a.tier === 'SIMPLE').length;
  const moderate = analyses.filter((a) => a.tier === 'MODERATE').length;
  const complex = analyses.filter((a) => a.tier === 'COMPLEX').length;
  const extreme = analyses.filter((a) => a.tier === 'EXTREME').length;

  console.log('Summary:');
  console.log(`  Simple (0-49): ${simple} tasks`);
  console.log(`  Moderate (50-69): ${moderate} tasks`);
  console.log(`  Complex (70-89): ${complex} tasks`);
  console.log(`  Extreme (90-100): ${extreme} tasks`);

  console.log(`\n${'High Complexity Tasks (require breakdown):'}`);
  analyses
    .filter((a) => a.tier === 'COMPLEX' || a.tier === 'EXTREME')
    .forEach((a) => {
      console.log(`  ${a.taskId}: ${a.score}/100 (${a.tier})`);
    });

  // Generate report
  const reportPath = path.join(process.cwd(), 'tasks', 'COMPLEXITY_ANALYSIS_REPORT.md');
  const report = generateReport(analyses);
  fs.writeFileSync(reportPath, report);
  console.log(`\n✅ Report saved: ${reportPath}\n`);
}

/**
 * Generate markdown report
 */
function generateReport(analyses: ComplexityAnalysis[]): string {
  const date = new Date().toLocaleDateString();
  const simple = analyses.filter((a) => a.tier === 'SIMPLE').length;
  const moderate = analyses.filter((a) => a.tier === 'MODERATE').length;
  const complex = analyses.filter((a) => a.tier === 'COMPLEX').length;
  const extreme = analyses.filter((a) => a.tier === 'EXTREME').length;

  let report = `# Task Complexity Analysis Report\n\n`;
  report += `Generated: ${date}\n\n`;
  report += `## Summary\n\n`;
  report += `- Total Tasks Analyzed: ${analyses.length}\n`;
  report += `- Simple (0-49): ${simple} tasks (${((simple / analyses.length) * 100).toFixed(0)}%)\n`;
  report += `- Moderate (50-69): ${moderate} tasks (${((moderate / analyses.length) * 100).toFixed(0)}%)\n`;
  report += `- Complex (70-89): ${complex} tasks (${((complex / analyses.length) * 100).toFixed(0)}%)\n`;
  report += `- Extreme (90-100): ${extreme} tasks (${((extreme / analyses.length) * 100).toFixed(0)}%)\n\n`;

  report += `## High Complexity Tasks\n\n`;
  analyses
    .filter((a) => a.tier === 'COMPLEX' || a.tier === 'EXTREME')
    .forEach((a, i) => {
      report += `${i + 1}. ${a.taskId}: ${a.score}/100 (${a.tier}) - Suggested: ${a.suggestedSubtasks} subtasks\n`;
    });

  report += `\n## All Tasks by Complexity\n\n`;
  report += `| Task ID | Score | Tier | Est. Time | Subtasks |\n`;
  report += `|---------|-------|------|-----------|----------|\n`;
  analyses.forEach((a) => {
    report += `| ${a.taskId} | ${a.score} | ${a.tier} | ${a.estimatedTime} | ${a.suggestedSubtasks} |\n`;
  });

  return report;
}

/**
 * Main CLI handler
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--report') {
    analyzeAllTasks();
    return;
  }

  const taskId = args[0];
  const verbose = args.includes('--verbose') || args.includes('-v');

  // Find task file
  const backlogDir = path.join(process.cwd(), 'tasks', 'backlog');
  const taskFiles = fs.readdirSync(backlogDir).filter((f) => f.includes(taskId));

  if (taskFiles.length === 0) {
    console.error(`❌ Task not found: ${taskId}`);
    process.exit(1);
  }

  const taskFile = path.join(backlogDir, taskFiles[0]);
  const metadata = parseTaskFile(taskFile);

  if (!metadata) {
    process.exit(1);
  }

  const analysis = calculateComplexity(metadata);
  displayAnalysis(analysis, verbose);
}

main();
