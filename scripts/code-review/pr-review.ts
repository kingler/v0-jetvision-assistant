#!/usr/bin/env tsx
/**
 * Pull Request Code Review Coordinator
 * Uses code-review-coordinator to manage PR review process
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface PRReviewConfig {
  prNumber?: string;
  branch: string;
  baseBranch: string;
}

interface ReviewChecklist {
  category: string;
  items: ReviewChecklistItem[];
}

interface ReviewChecklistItem {
  item: string;
  checked: boolean;
  required: boolean;
}

class PRReviewCoordinator {
  private config: PRReviewConfig;
  private checklist: ReviewChecklist[] = [];

  constructor() {
    this.config = this.detectConfig();
    this.initializeChecklist();
  }

  private detectConfig(): PRReviewConfig {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
      const baseBranch = 'main'; // Default base branch

      return { branch, baseBranch };
    } catch {
      throw new Error('Not in a git repository');
    }
  }

  async runReview(): Promise<void> {
    console.log('📋 Pull Request Code Review Coordinator\n');
    console.log(`Branch: ${this.config.branch}`);
    console.log(`Base: ${this.config.baseBranch}\n`);

    // Run automated checks
    await this.runAutomatedChecks();

    // Display checklist
    this.displayChecklist();

    // Generate review report
    await this.generateReviewReport();
  }

  private async runAutomatedChecks(): Promise<void> {
    console.log('🤖 Running Automated Checks\n');

    const checks = [
      { name: 'Type Check', command: 'npm run type-check', required: true },
      { name: 'Linting', command: 'npm run lint', required: true },
      { name: 'Unit Tests', command: 'npm run test:unit -- --run', required: true },
      { name: 'Integration Tests', command: 'npm run test:integration', required: true },
      { name: 'Test Coverage', command: 'npm run test:coverage', required: true },
      { name: 'Code Validation', command: 'npm run review:validate', required: true },
    ];

    const results: { name: string; passed: boolean; required: boolean }[] = [];

    for (const check of checks) {
      process.stdout.write(`  ${check.name}... `);
      try {
        execSync(check.command, { stdio: 'pipe' });
        console.log('✅');
        results.push({ name: check.name, passed: true, required: check.required });
      } catch {
        console.log('❌');
        results.push({ name: check.name, passed: false, required: check.required });
      }
    }

    console.log();

    // Check if all required checks passed
    const failedRequired = results.filter(r => r.required && !r.passed);
    if (failedRequired.length > 0) {
      console.log('❌ Required checks failed:');
      failedRequired.forEach(r => console.log(`   - ${r.name}`));
      console.log('\nFix these issues before requesting review.\n');
      process.exit(1);
    }

    console.log('✅ All automated checks passed!\n');
  }

  private initializeChecklist(): void {
    this.checklist = [
      {
        category: 'Code Quality',
        items: [
          { item: 'Code follows project style guidelines', checked: false, required: true },
          { item: 'No unused imports or variables', checked: false, required: true },
          { item: 'Proper error handling implemented', checked: false, required: true },
          { item: 'No hardcoded values (use config/env)', checked: false, required: true },
          { item: 'Functions are single-purpose and well-named', checked: false, required: false },
        ],
      },
      {
        category: 'Testing',
        items: [
          { item: 'Unit tests cover new functionality', checked: false, required: true },
          { item: 'Integration tests added if needed', checked: false, required: false },
          { item: 'Edge cases are tested', checked: false, required: true },
          { item: 'Tests follow AAA pattern (Arrange, Act, Assert)', checked: false, required: false },
          { item: 'Coverage meets 75% threshold', checked: false, required: true },
        ],
      },
      {
        category: 'Documentation',
        items: [
          { item: 'JSDoc comments on public APIs', checked: false, required: true },
          { item: 'README updated if needed', checked: false, required: false },
          { item: 'CHANGELOG updated', checked: false, required: false },
          { item: 'Complex logic has inline comments', checked: false, required: false },
        ],
      },
      {
        category: 'Security',
        items: [
          { item: 'No secrets or API keys in code', checked: false, required: true },
          { item: 'Input validation implemented', checked: false, required: true },
          { item: 'SQL injection prevention (if applicable)', checked: false, required: true },
          { item: 'XSS prevention (if applicable)', checked: false, required: true },
        ],
      },
      {
        category: 'Architecture',
        items: [
          { item: 'Follows existing project structure', checked: false, required: true },
          { item: 'Agents extend BaseAgent (if applicable)', checked: false, required: true },
          { item: 'Proper separation of concerns', checked: false, required: true },
          { item: 'No circular dependencies', checked: false, required: true },
        ],
      },
      {
        category: 'Performance',
        items: [
          { item: 'No unnecessary re-renders (React)', checked: false, required: false },
          { item: 'Efficient database queries', checked: false, required: false },
          { item: 'Proper caching implemented', checked: false, required: false },
          { item: 'No memory leaks', checked: false, required: true },
        ],
      },
    ];
  }

  private displayChecklist(): void {
    console.log('📋 Code Review Checklist\n');

    this.checklist.forEach(category => {
      console.log(`\n${category.category}:`);
      category.items.forEach(item => {
        const required = item.required ? ' (Required)' : ' (Optional)';
        console.log(`  [ ] ${item.item}${required}`);
      });
    });

    console.log();
  }

  private async generateReviewReport(): Promise<void> {
    console.log('📄 Generating Review Report...\n');

    const changedFiles = this.getChangedFiles();
    const stats = this.getChangeStats();

    const report = this.buildReportMarkdown(changedFiles, stats);

    // Save report
    const reportPath = path.join(process.cwd(), '.github', 'PULL_REQUEST_REVIEW.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);

    console.log(`✅ Review report saved to: ${reportPath}\n`);
    console.log('📌 Next steps:');
    console.log('  1. Review the checklist above');
    console.log('  2. Address any remaining items');
    console.log('  3. Create PR with: gh pr create');
    console.log('  4. Use the generated review report as PR description\n');
  }

  private getChangedFiles(): string[] {
    try {
      const output = execSync(
        `git diff --name-only ${this.config.baseBranch}...${this.config.branch}`,
        { encoding: 'utf-8' }
      );
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  private getChangeStats(): { additions: number; deletions: number } {
    try {
      const output = execSync(
        `git diff --shortstat ${this.config.baseBranch}...${this.config.branch}`,
        { encoding: 'utf-8' }
      );

      const addMatch = output.match(/(\d+) insertion/);
      const delMatch = output.match(/(\d+) deletion/);

      return {
        additions: addMatch ? parseInt(addMatch[1]) : 0,
        deletions: delMatch ? parseInt(delMatch[1]) : 0,
      };
    } catch {
      return { additions: 0, deletions: 0 };
    }
  }

  private buildReportMarkdown(files: string[], stats: { additions: number; deletions: number }): string {
    const requiredItems = this.checklist.flatMap(c =>
      c.items.filter(i => i.required).map(i => `- [ ] ${i.item}`)
    );

    return `# Code Review Report

## Branch Information
- **Branch**: \`${this.config.branch}\`
- **Base**: \`${this.config.baseBranch}\`
- **Files Changed**: ${files.length}
- **Additions**: +${stats.additions}
- **Deletions**: -${stats.deletions}

## Changed Files
${files.map(f => `- \`${f}\``).join('\n')}

## Automated Checks
All automated checks have passed:
- ✅ Type Check
- ✅ Linting
- ✅ Unit Tests
- ✅ Integration Tests
- ✅ Test Coverage (≥75%)
- ✅ Code Validation

## Review Checklist

### Required Items
${requiredItems.join('\n')}

### Full Checklist
${this.checklist.map(category => `
#### ${category.category}
${category.items.map(item => {
  const tag = item.required ? '**[Required]**' : '*[Optional]*';
  return `- [ ] ${item.item} ${tag}`;
}).join('\n')}
`).join('\n')}

## Reviewer Notes
<!-- Add notes for reviewers here -->

## Testing
<!-- Describe how this was tested -->

## Screenshots
<!-- Add screenshots if UI changes -->

---
*Generated by Jetvision Code Review Coordinator*
`;
  }
}

// Run PR review
async function main() {
  const coordinator = new PRReviewCoordinator();
  await coordinator.runReview();
}

main().catch(error => {
  console.error('❌ PR review failed:', error.message);
  process.exit(1);
});
