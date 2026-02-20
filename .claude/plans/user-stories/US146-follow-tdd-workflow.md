# User Story ID: US146
# Title: TDD Workflow Script
# Parent Epic: [[EPIC035-code-review-cicd|EPIC035 - CI/CD & Code Quality Pipeline]]
# Status: Implemented
# Priority: Medium
# Story Points: 3

## User Story
As a developer, I want a TDD workflow script, so I can follow RED-GREEN-REFACTOR properly.

## Acceptance Criteria

### AC1: Guided TDD Phases
**Given** I start a TDD workflow
**When** npm run review:tdd executes
**Then** it guides me through RED (write failing test), GREEN (make it pass), and REFACTOR (improve code) phases sequentially

## Tasks
- [[TASK264-tdd-workflow-script|TASK264 - Implement TDD workflow script with phase tracking and validation]]

## Technical Notes
- Script: `npm run review:tdd`
- RED phase: prompts to write test, verifies test exists and fails
- GREEN phase: prompts to implement, verifies test passes with minimal code
- REFACTOR phase: prompts to improve, runs full validation suite
- Phase transitions enforced: cannot skip from RED to REFACTOR
- Progress tracked per feature/file being developed
- Integrates with morpheus-validator for code quality checks at each phase
