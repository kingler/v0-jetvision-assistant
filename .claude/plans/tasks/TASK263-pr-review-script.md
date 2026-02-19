# Task ID: TASK263
# Task Name: PR Review Report Script
# Parent User Story: [[US145-generate-pr-review|US145 - PR review report generation]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement a PR review report generation script (code-review-coordinator) that analyzes all changes in the current branch, runs automated checks, and produces a structured review report with actionable findings.

## Acceptance Criteria
- Script analyzes all commits on the current branch vs. main
- Report includes: code quality findings, test coverage status, security scan results
- Report includes: architecture compliance, naming convention violations
- Report generates a checklist of review items organized by category
- Report is saved to `.github/PULL_REQUEST_REVIEW.md`
- Report includes file-level annotations with line numbers
- Report summary shows pass/fail counts and overall status
- `npm run review:pr` runs the script
- Script can be run non-interactively for CI integration
- Report format is Markdown for readability in GitHub PRs

## Implementation Details
- **File(s)**: `scripts/code-review/pr-review.ts`
- **Approach**: Create a Node.js script that uses `git diff main...HEAD` to get changed files. Apply the validation suite (TASK261) checks to changed files only. Run tests and collect coverage for changed files. Compile findings into a Markdown report with sections for each review category. Write the report to the specified file path.

## Dependencies
- [[TASK261-validation-suite|TASK261]] (validation-suite) for code validation rules
- [[TASK259-coverage-thresholds|TASK259]] (coverage-thresholds) for coverage requirements
- Git must be available for diff operations
