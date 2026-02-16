# Task ID: TASK264
# Task Name: TDD Workflow Script
# Parent User Story: [[US146-follow-tdd-workflow|US146 - RED-GREEN-REFACTOR guided workflow]]
# Status: Done
# Priority: Medium
# Estimate: 3h

## Description
Implement a guided TDD workflow script that walks developers through the RED-GREEN-REFACTOR cycle with interactive prompts, automated test execution, and phase validation.

## Acceptance Criteria
- **RED Phase**: Prompts developer to write a failing test, verifies test fails
- **GREEN Phase**: Prompts developer to implement minimal code, verifies test passes
- **REFACTOR Phase**: Prompts developer to improve code, verifies tests still pass
- Script tracks current phase and prevents skipping steps
- Each phase transition includes validation (test results match expected state)
- Script runs tests automatically after each phase change
- Progress is displayed with clear phase indicators
- `npm run review:tdd` launches the workflow
- Script can resume from a saved state if interrupted
- Summary is displayed at completion with timing for each phase

## Implementation Details
- **File(s)**: `scripts/code-review/tdd-workflow.ts`
- **Approach**: Create an interactive Node.js script using readline or inquirer for prompts. Implement a state machine with three states (RED, GREEN, REFACTOR). In RED phase, run tests and expect failure. In GREEN phase, run tests and expect success. In REFACTOR phase, run full validation suite. Save phase state to a `.tdd-state.json` temp file for resumability.

## Dependencies
- [[TASK254-configure-vitest-unit|TASK254]] (configure-vitest-unit) for test execution
- [[TASK261-validation-suite|TASK261]] (validation-suite) for refactor phase validation
