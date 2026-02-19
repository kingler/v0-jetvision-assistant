# User Story ID: US147
# Title: CI/CD Runs on Every PR
# Parent Epic: [[EPIC035-code-review-cicd|EPIC035 - CI/CD & Code Quality Pipeline]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a developer, I want CI/CD to run on every PR, so code is validated before merge.

## Acceptance Criteria

### AC1: Automated PR Validation
**Given** a pull request is opened or updated on GitHub
**When** GitHub Actions triggers the workflow
**Then** code review, security audit, architecture compliance, and performance checks all run automatically

## Tasks
- [[TASK265-github-actions-ci|TASK265 - Configure GitHub Actions workflow for PR validation pipeline]]

## Technical Notes
- Workflow file: `.github/workflows/code-review.yml`
- Jobs run in parallel where possible:
  - **code-review**: lint, type-check, unit tests, coverage, code validation
  - **security-review**: npm audit, secret scanning, dependency checks
  - **architecture-review**: architecture compliance, import structure, naming conventions
  - **performance-review**: bundle size analysis, build time tracking
- Results posted as PR comments with pass/fail summary
- All jobs must pass before merge is allowed (branch protection rules)
- Runs on: push to PR branch, PR opened, PR synchronized
