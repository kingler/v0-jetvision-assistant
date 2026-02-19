# Task ID: TASK261
# Task Name: Code Validation Suite
# Parent User Story: [[US143-precommit-validation|US143 - Validation script for code quality]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement a comprehensive code validation script (morpheus-validator) that checks file naming conventions, code style rules, test coverage requirements, security patterns, and architecture compliance across the codebase.

## Acceptance Criteria
- **File Naming**: kebab-case for non-components, PascalCase for React components, `.test.ts(x)` for tests
- **Code Style**: no `console.log` in production, no `any` type, JSDoc on exports, TODO/FIXME tracking
- **Test Coverage**: corresponding test file exists for each source file
- **Security**: no hardcoded secrets, no `eval()`, safe `dangerouslySetInnerHTML` usage
- **Architecture**: agents extend BaseAgent, MCP servers use SDK, API routes have try/catch
- Script outputs results with pass/fail indicators and file locations
- Exit code 0 if all checks pass, 1 if any fail
- `npm run review:validate` runs the script
- Script is fast enough for pre-commit usage (under 10 seconds)
- Configurable ignore patterns for generated files

## Implementation Details
- **File(s)**: `scripts/code-review/validate.ts`
- **Approach**: Create a Node.js script that uses `glob` to discover source files and applies validation rules to each. Group rules into categories (naming, style, security, architecture). Use AST parsing (ts-morph or regex) for code pattern detection. Output results in a structured format with colors for terminal display.

## Dependencies
- [[TASK260-husky-precommit|TASK260]] (husky-precommit) invokes this script
- Glob and file reading utilities
