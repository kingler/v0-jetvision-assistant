#!/usr/bin/env tsx
/**
 * Code Review Validation Script
 * Uses morpheus-validator to check code quality before commits
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

class CodeReviewValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  async validate(): Promise<ValidationResult> {
    console.log('🔍 Morpheus Validator - Code Review Validation\n');

    // Get staged files
    const stagedFiles = this.getStagedFiles();

    if (stagedFiles.length === 0) {
      console.log('ℹ️  No staged files to validate');
      return { passed: true, errors: [], warnings: [] };
    }

    console.log(`📝 Validating ${stagedFiles.length} staged file(s)...\n`);

    // Run validation checks
    await this.checkFileNaming(stagedFiles);
    await this.checkCodeStyle(stagedFiles);
    await this.checkTestCoverage(stagedFiles);
    await this.checkSecurity(stagedFiles);
    await this.checkArchitecture(stagedFiles);

    return {
      passed: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private getStagedFiles(): string[] {
    try {
      const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
        encoding: 'utf-8',
      });
      return output
        .trim()
        .split('\n')
        .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'));
    } catch {
      return [];
    }
  }

  private async checkFileNaming(files: string[]): Promise<void> {
    console.log('📋 Checking file naming conventions...');

    for (const file of files) {
      const basename = path.basename(file, path.extname(file));

      // Check kebab-case for non-component files
      if (!file.includes('components/') && basename !== basename.toLowerCase()) {
        if (!/^[A-Z][a-zA-Z]+$/.test(basename)) { // Allow PascalCase for classes
          this.warnings.push(`File should use kebab-case: ${file}`);
        }
      }

      // Check PascalCase for React components
      if (file.includes('components/') && file.endsWith('.tsx')) {
        if (!/^[A-Z][a-zA-Z]+$/.test(basename)) {
          this.errors.push(`Component file should use PascalCase: ${file}`);
        }
      }

      // Check test file naming
      if (file.includes('__tests__/') && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx')) {
        this.errors.push(`Test file must end with .test.ts or .test.tsx: ${file}`);
      }
    }

    console.log('✅ File naming check complete\n');
  }

  private async checkCodeStyle(files: string[]): Promise<void> {
    console.log('🎨 Checking code style...');

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for console.log in production code
      if (!file.includes('__tests__/') && !file.includes('scripts/')) {
        const consoleMatches = content.match(/console\.(log|debug|info)/g);
        if (consoleMatches) {
          this.warnings.push(`Found ${consoleMatches.length} console statement(s) in ${file}`);
        }
      }

      // Check for TODO/FIXME comments
      const todoMatches = content.match(/\/\/\s*(TODO|FIXME):/gi);
      if (todoMatches) {
        this.warnings.push(`Found ${todoMatches.length} TODO/FIXME comment(s) in ${file}`);
      }

      // Check for any type usage
      const anyMatches = content.match(/:\s*any\b/g);
      if (anyMatches) {
        this.errors.push(`Found ${anyMatches.length} 'any' type usage in ${file} - use proper types`);
      }

      // Check for missing JSDoc on exported functions
      if (!file.includes('__tests__/')) {
        const exportedFunctions = content.match(/export\s+(async\s+)?function\s+\w+/g);
        if (exportedFunctions) {
          const jsDocComments = content.match(/\/\*\*[\s\S]*?\*\//g) || [];
          if (exportedFunctions.length > jsDocComments.length) {
            this.warnings.push(`Some exported functions missing JSDoc in ${file}`);
          }
        }
      }
    }

    console.log('✅ Code style check complete\n');
  }

  private async checkTestCoverage(files: string[]): Promise<void> {
    console.log('🧪 Checking test coverage...');

    const sourceFiles = files.filter(f =>
      !f.includes('__tests__/') &&
      !f.includes('.test.') &&
      !f.includes('scripts/')
    );

    for (const file of sourceFiles) {
      // Check if corresponding test file exists
      const testPatterns = [
        file.replace(/\.tsx?$/, '.test.ts'),
        file.replace(/\.tsx?$/, '.test.tsx'),
        file.replace(/^(.*\/)([^/]+)\.tsx?$/, '__tests__/unit/$1$2.test.ts'),
      ];

      const hasTest = testPatterns.some(pattern => {
        try {
          return fs.existsSync(pattern);
        } catch {
          return false;
        }
      });

      if (!hasTest && !file.includes('types.ts') && !file.includes('index.ts')) {
        this.warnings.push(`No test file found for ${file}`);
      }
    }

    console.log('✅ Test coverage check complete\n');
  }

  private async checkSecurity(files: string[]): Promise<void> {
    console.log('🔒 Checking security...');

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for hardcoded secrets
      const secretPatterns = [
        /(?:password|secret|key|token)\s*[:=]\s*['"][^'"]{8,}['"]/i,
        /AKIA[0-9A-Z]{16}/,  // AWS Access Key
        /sk_live_[0-9a-zA-Z]{24,}/, // Stripe Secret Key
      ];

      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          this.errors.push(`Potential hardcoded secret found in ${file}`);
          break;
        }
      }

      // Check for unsafe practices
      if (content.includes('eval(')) {
        this.errors.push(`Unsafe 'eval()' usage found in ${file}`);
      }

      if (content.includes('dangerouslySetInnerHTML')) {
        this.warnings.push(`'dangerouslySetInnerHTML' usage found in ${file} - ensure XSS protection`);
      }
    }

    console.log('✅ Security check complete\n');
  }

  private async checkArchitecture(files: string[]): Promise<void> {
    console.log('🏗️  Checking architecture compliance...');

    for (const file of files) {
      // Check JetvisionAgent structure
      if (file.includes('agents/jetvision-agent/') && file.endsWith('.ts')) {
        const content = fs.readFileSync(file, 'utf-8');
        // Verify exports exist for main files
        if (file.includes('index.ts') && !content.includes('export')) {
          this.warnings.push(`Agent index should export JetvisionAgent: ${file}`);
        }
      }

      // Check MCP server structure
      if (file.includes('mcp-servers/') && file.includes('server.ts')) {
        const content = fs.readFileSync(file, 'utf-8');
        if (!content.includes('Server') || !content.includes('@modelcontextprotocol/sdk')) {
          this.warnings.push(`MCP server should use @modelcontextprotocol/sdk: ${file}`);
        }
      }

      // Check that API routes use proper error handling
      if (file.includes('app/api/') && file.includes('route.ts')) {
        const content = fs.readFileSync(file, 'utf-8');
        if (!content.includes('try') || !content.includes('catch')) {
          this.errors.push(`API route must have try/catch error handling: ${file}`);
        }
      }
    }

    console.log('✅ Architecture check complete\n');
  }

  displayResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Validation Results');
    console.log('='.repeat(60) + '\n');

    if (this.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
      console.log();
    }

    if (this.errors.length > 0) {
      console.log('❌ Errors:');
      this.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
      console.log();
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All validation checks passed!\n');
    }
  }
}

// Run validation
async function main() {
  const validator = new CodeReviewValidator();
  const result = await validator.validate();

  validator.displayResults();

  if (!result.passed) {
    console.log('💡 Fix the errors above before committing.');
    console.log('   Run `npm run review:fix` to auto-fix some issues.\n');
    process.exit(1);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
