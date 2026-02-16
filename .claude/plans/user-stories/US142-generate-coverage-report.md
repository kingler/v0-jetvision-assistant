# User Story ID: US142
# Title: Generate Coverage Report
# Parent Epic: [[EPIC034-test-infrastructure|EPIC034 - Testing Infrastructure]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As a developer, I want to generate a coverage report, so I know which code needs more tests.

## Acceptance Criteria

### AC1: Coverage Report with Thresholds
**Given** the full test suite has been executed
**When** npm run test:coverage runs
**Then** a coverage report generates showing line, function, branch, and statement coverage with 75% minimum thresholds

## Tasks
- [[TASK259-coverage-thresholds|TASK259 - Configure coverage thresholds in vitest.config.ts]]

## Technical Notes
- Coverage provider: v8 (via Vitest)
- Thresholds: lines 75%, functions 75%, branches 70%, statements 75%
- Report formats: text (terminal), html (browseable), lcov (CI integration)
- Report output: `coverage/` directory
- CI fails if any threshold is not met
- Excludes: test files, type declarations, config files, node_modules
