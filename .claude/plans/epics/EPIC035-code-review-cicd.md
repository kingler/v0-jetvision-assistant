# Epic ID: EPIC035
# Epic Name: Code Review and CI/CD Pipeline
# Parent Feature: [[F015-testing-quality|F015 - Developer Experience and Quality]]
# Status: Implemented
# Priority: High

## Description
Automated code review system with git hooks for pre-commit and pre-push validation, a TDD workflow enforcer, PR review report generation, and GitHub Actions CI/CD pipeline. Ensures code quality gates are enforced at every stage from local development through pull request merge.

## Goals
- Enforce quality gates automatically on every commit and push
- Automate PR review with checklist generation and validation reports
- Support TDD workflow with RED/GREEN/REFACTOR phase tracking
- Run comprehensive CI/CD checks on every pull request via GitHub Actions

## User Stories
- [[US143-precommit-validation|US143 - Pre-commit hook runs type checking, linting, unit tests, and code validation automatically]]
- [[US144-prepush-full-suite|US144 - Pre-push hook runs full test suite with coverage enforcement]]
- [[US145-generate-pr-review|US145 - Generate PR review report with code quality checklist and validation results]]
- [[US146-follow-tdd-workflow|US146 - Follow guided TDD workflow with RED, GREEN, and REFACTOR phases]]
- [[US147-cicd-runs-on-pr|US147 - CI/CD pipeline runs code review, security review, architecture review, and performance review on PR]]

## Acceptance Criteria Summary
- Pre-commit hook completes within 30 seconds for typical changesets
- Pre-push hook enforces 75% coverage threshold before allowing push
- Commit messages follow conventional commits format (enforced by commit-msg hook)
- PR review report covers code quality, testing, documentation, security, architecture, and performance
- TDD workflow script guides developer through RED -> GREEN -> REFACTOR phases
- GitHub Actions workflow runs 4 parallel jobs: code-review, security-review, architecture-review, performance-review
- CI/CD results are posted as PR comments with pass/fail summary
- Emergency bypass available via --no-verify flag (documented, discouraged)

## Technical Scope
- .husky/pre-commit - Type check, lint, unit tests, code validation
- .husky/pre-push - Full test suite with coverage
- .husky/commit-msg - Conventional commits format enforcement
- scripts/code-review/validate.ts - Automated code validation (naming, style, security, architecture)
- scripts/code-review/pr-review.ts - PR review report generation
- scripts/code-review/tdd-workflow.ts - TDD phase tracker and enforcer
- .github/workflows/code-review.yml - GitHub Actions CI/CD pipeline with 4 review jobs
- package.json scripts - review:validate, review:tdd, review:pr, review:fix
