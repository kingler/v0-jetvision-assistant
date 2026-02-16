# Task ID: TASK259
# Task Name: Configure Coverage Thresholds
# Parent User Story: [[US142-generate-coverage-report|US142 - Configure 75% coverage thresholds]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
Configure Vitest coverage thresholds to enforce a minimum of 75% code coverage across lines, functions, branches, and statements. The build should fail if coverage drops below these thresholds.

## Acceptance Criteria
- Coverage thresholds are set in `vitest.config.ts`:
  - Lines: 75%
  - Functions: 75%
  - Branches: 70%
  - Statements: 75%
- `npm run test:coverage` generates a coverage report and enforces thresholds
- Build fails (non-zero exit code) if any threshold is not met
- Coverage report formats: text (terminal), lcov (CI), html (local viewing)
- Coverage excludes: test files, type definitions, config files, mock files
- Coverage includes: `agents/`, `lib/`, `components/`, `app/api/`
- `coverage/` directory is gitignored

## Implementation Details
- **File(s)**: `vitest.config.ts`
- **Approach**: Add a `coverage` block to the Vitest config with `provider: 'v8'`, `thresholds` object with the specified percentages, `reporter: ['text', 'lcov', 'html']`, `include` patterns for source directories, and `exclude` patterns for test/config files. Set `thresholds.perFile: false` for overall thresholds.

## Dependencies
- [[TASK254-configure-vitest-unit|TASK254]] (configure-vitest-unit) for base Vitest configuration
- `@vitest/coverage-v8` must be installed
