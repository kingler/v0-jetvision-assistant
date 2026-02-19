# User Story ID: US145
# Title: Generate PR Review Report
# Parent Epic: [[EPIC035-code-review-cicd|EPIC035 - CI/CD & Code Quality Pipeline]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a developer, I want to generate a PR review report, so I have a quality checklist.

## Acceptance Criteria

### AC1: PR Review Report Generation
**Given** changes are ready for pull request
**When** npm run review:pr executes
**Then** a comprehensive report generates covering code quality, testing, security, and architecture checks

## Tasks
- [[TASK263-pr-review-script|TASK263 - Implement PR review script (code-review-coordinator) with checklist generation]]

## Technical Notes
- Script: `npm run review:pr` (code-review-coordinator agent)
- Report saved to `.github/PULL_REQUEST_REVIEW.md`
- Checklist categories: Code Quality, Testing, Documentation, Security, Architecture, Performance
- Each category contains specific checkpoints with pass/fail/warning status
- Report includes file-level annotations for issues found
- Can be run locally before creating PR or automatically in CI
