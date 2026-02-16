# Epic ID: EPIC034
# Epic Name: Test Infrastructure
# Parent Feature: [[F015-testing-quality|F015 - Developer Experience and Quality]]
# Status: Implemented
# Priority: High

## Description
Comprehensive testing framework built on Vitest and Playwright that supports unit, integration, E2E, and agent-specific test suites. Enforces a 75% coverage threshold across lines, functions, branches, and statements, with dedicated test directories, mock utilities for external services, and watch mode for rapid development feedback.

## Goals
- Establish a complete test pyramid with unit, integration, E2E, and agent tests
- Enforce 75% code coverage threshold as a quality gate
- Provide comprehensive mock utilities for external services (OpenAI, Supabase, MCP)
- Enable rapid test feedback with watch mode and parallel execution

## User Stories
- [[US138-run-unit-tests|US138 - Run unit tests for individual functions and classes]]
- [[US139-run-integration-tests|US139 - Run integration tests for agent coordination and workflows]]
- [[US140-run-e2e-tests|US140 - Run E2E tests with Playwright for full user flow validation]]
- [[US141-run-agent-tests|US141 - Run agent-specific tests that validate tool calling and response generation]]
- [[US142-generate-coverage-report|US142 - Generate coverage report with per-file breakdown and threshold enforcement]]

## Acceptance Criteria Summary
- Unit tests run in under 30 seconds with no external dependencies
- Integration tests validate multi-component interactions with mocked services
- E2E tests cover critical user flows (create session, send message, receive response)
- Agent tests validate tool selection, parameter extraction, and response formatting
- Coverage report generates HTML output with line-by-line annotation
- Coverage thresholds enforced: 75% lines, 75% functions, 70% branches, 75% statements
- Test configuration supports path aliases matching tsconfig.json

## Technical Scope
- vitest.config.ts - Test runner configuration with path aliases, coverage thresholds, and test suites
- __tests__/unit/ - Unit test files mirroring source directory structure
- __tests__/integration/ - Integration tests for multi-component workflows
- __tests__/e2e/ - Playwright E2E test specifications
- __tests__/mocks/ - Shared mock utilities for OpenAI, Supabase, Redis, MCP servers
- playwright.config.ts - E2E test configuration with browser and viewport settings
- package.json scripts - test, test:unit, test:integration, test:agents, test:watch, test:coverage
