# SubAgent to Claude Code Agent Mapping

**Created**: October 21, 2025
**Purpose**: Map Linear SubAgent roles to available Claude Code specialized agents for task execution

---
## Overview

This document maps the 5 Linear SubAgent roles to the available Claude Code specialized agents. When executing tasks from Linear, use the appropriate Claude Code agent based on the SubAgent label.

### ⚠️ CRITICAL: Task Complexity Analysis Required

**Before starting ANY task, all subagents MUST run complexity analysis.**

This automated system prevents agents from attempting overly complex tasks in single sessions and ensures proper task breakdown for better code quality and manageable development cycles.

#### Mandatory Pre-Task Workflow

```typescript
// STEP 1: Analyze task complexity BEFORE starting work
const analysis = await Bash({
  command: "npm run task:analyze TASK-001",
  description: "Analyze task complexity"
})

// STEP 2: Check complexity score and take action
if (complexity_score >= 70) {
  // MUST automatically break down
  await Bash({
    command: "npm run task:breakdown TASK-001",
    description: "Break down complex task automatically"
  })
  // Then start with first subtask: TASK-001.1

} else if (complexity_score >= 50) {
  // SHOULD ask user for confirmation
  const response = await AskUserQuestion({
    questions: [{
      question: "This task has moderate complexity (${score}/100). Break it down into subtasks?",
      header: "Task Breakdown",
      multiSelect: false,
      options: [
        { label: "Yes, break it down", description: "Split into manageable subtasks" },
        { label: "No, proceed as-is", description: "Complete in single session" }
      ]
    }]
  })

} else {
  // Can proceed directly (complexity < 50)
  // Start implementation
}
```

#### Complexity Decision Matrix

| Score Range | Tier | Required Action | Subagent Behavior |
|-------------|------|----------------|-------------------|
| **0-49** | SIMPLE | Proceed | Implement directly, no breakdown needed |
| **50-69** | MODERATE | Ask User | Offer breakdown option, wait for user confirmation |
| **70-89** | COMPLEX | **AUTO-BREAK** | **Automatically break down, notify user** |
| **90-100** | EXTREME | **AUTO-BREAK + Alert** | **Break into 4+ subtasks, escalate to Planner** |

#### CLI Commands Available

```bash
# Analyze task complexity (returns 0-100 score)
npm run task:analyze TASK-001

# Automatically break down complex task
npm run task:breakdown TASK-001

# Start working on (sub)task
npm run task:start TASK-001.1

# View subtask dependency chain
npm run task:deps TASK-001
```

**See** `docs/TASK_COMPLEXITY_BREAKDOWN_SYSTEM.md` for complete documentation.

---

## SubAgent to Claude Agent Mapping

### 🟣 SubAgent:Planner → Claude Code Agents

**Primary Agents**:
- **project-coordinator** - Project planning, milestone tracking, resource allocation
- **product-owner-oracle** - Product vision, requirements, prioritization
- **oracle-reasoner** - Strategic analysis, risk assessment, predictive planning
- **business-analyst** - Business analysis, stakeholder alignment

**Usage Pattern**:
```typescript
// For planning tasks (DES-74, DES-80)
Task({
  subagent_type: "project-coordinator",
  description: "Week 1 Foundation Planning",
  prompt: `Analyze the Week 1 foundation tasks and create a detailed execution plan:
  - DES-73 through DES-83
  - Map dependencies
  - Estimate effort
  - Identify risks
  - Create timeline`
})
```

**Example Linear Issues**:
- DES-74: Week 1 Foundation Planning
- DES-80: Week 2-3 MCP & Agent Planning

---

### 🔵 SubAgent:Coder → Claude Code Agents

**Primary Agents**:
- **backend-developer-tank** - Backend APIs, database, services, integrations
- **frontend-developer-mouse** - UI components, React, state management
- **nextjs-vercel-pro:fullstack-developer** - Full-stack Next.js development
- **integration-specialist** - System integrations, APIs, data flows
- **tech-researcher-keymaker** - Technology research, POCs, evaluation

**Secondary Agents**:
- **system-architect** - Architecture design, technical decisions
- **nextjs-vercel-pro:frontend-developer** - Frontend-specific React work

**Usage Patterns**:

**Backend Development** (DES-78, DES-79, DES-82, DES-83):
```typescript
Task({
  subagent_type: "backend-developer-tank",
  description: "Implement Clerk Authentication",
  prompt: `Implement Clerk authentication integration (TASK-001):

  Current Linear Issue: DES-78

  ⚠️ CRITICAL: Run complexity analysis FIRST:

  STEP 1: Analyze task complexity
    npm run task:analyze TASK-001

  STEP 2: If complexity ≥70, auto-break down:
    npm run task:breakdown TASK-001
    # Then start with TASK-001.1

  STEP 3: If complexity ≥50, ask user for confirmation

  STEP 4: If complexity <50, proceed with implementation

  Requirements:
  - Set up Clerk middleware
  - Create auth API routes
  - Sync users to Supabase
  - Implement RLS policies

  Follow TDD approach from /tasks/backlog/TASK-001-*.md

  Reference: docs/TASK_COMPLEXITY_BREAKDOWN_SYSTEM.md`
})
```

**Frontend Development** (DES-97, DES-98, DES-99):
```typescript
Task({
  subagent_type: "frontend-developer-mouse",
  description: "Dashboard Pages Implementation",
  prompt: `Implement dashboard pages (TASK-020):

  Current Linear Issue: DES-97

  Requirements:
  - Create dashboard layout
  - Implement request list view
  - Add quote comparison view
  - Integrate with backend API

  Replace mock data from lib/mock-data.ts with real Supabase queries`
})
```

**Full-Stack Features** (DES-84 to DES-93):
```typescript
Task({
  subagent_type: "nextjs-vercel-pro:fullstack-developer",
  description: "RFP Orchestrator Agent",
  prompt: `Implement RFP Orchestrator Agent (TASK-011):

  Current Linear Issue: DES-88

  Requirements:
  - Implement agent core logic
  - Create API route /api/agents/orchestrate
  - Integrate with OpenAI Assistants API
  - Set up task queue processing

  Reference: agents/core/base-agent.ts for foundation`
})
```

**MCP Server Development** (DES-84 to DES-87):
```typescript
Task({
  subagent_type: "integration-specialist",
  description: "Avinode MCP Server",
  prompt: `Implement Avinode MCP Server (TASK-008):

  Current Linear Issue: DES-85

  Requirements:
  - Create MCP server base on stdio transport
  - Implement Avinode API client
  - Create tools: search_flights, create_rfp, get_quotes
  - Handle authentication and error cases

  Reference: mcp-servers/shared/ for utilities`
})
```

**Example Linear Issues**:
- DES-73: Fix TypeScript & Vitest Blockers
- DES-78: Clerk Authentication (Backend)
- DES-79: Database Schema & RLS (Backend)
- DES-82: Supabase Client Implementation (Backend)
- DES-83: First API Route (Backend)
- DES-84 to DES-87: MCP Servers (Integration)
- DES-88 to DES-93: AI Agents (Full-stack)
- DES-97 to DES-99: Frontend Integration
- DES-108: API Documentation (Backend)

---

### 🔴 SubAgent:Reviewer → Claude Code Agents

**Primary Agents**:
- **morpheus-validator** - Code validation, standards enforcement, quality gates
- **code-review-coordinator** - Review process management, PR coordination
- **security-auditor** - Security audits, compliance checks, vulnerability assessment
- **architecture-validator** - Architecture validation, pattern compliance

**Usage Patterns**:

**Code Review** (DES-75):
```typescript
Task({
  subagent_type: "code-review-coordinator",
  description: "Establish Code Review Standards",
  prompt: `Create code review standards and PR templates (DES-75):

  Requirements:
  - Create .github/PULL_REQUEST_TEMPLATE.md
  - Define quality gates (test coverage, linting, types)
  - Document review workflow
  - Create reviewer guidelines

  Reference existing project standards in docs/AGENTS.md`
})
```

**Validation & Review**:
```typescript
Task({
  subagent_type: "morpheus-validator",
  description: "Validate TypeScript Fixes",
  prompt: `Review and validate the TypeScript/Vitest fixes from DES-73:

  Validate:
  - All TypeScript errors resolved
  - Vitest dependency properly configured
  - Tests are passing
  - Code follows project standards
  - No security vulnerabilities introduced

  Use morpheus-validator to enforce coding standards and best practices`
})
```

**Security Audit** (DES-103):
```typescript
Task({
  subagent_type: "security-auditor",
  description: "Conduct Security Audit",
  prompt: `Perform comprehensive security audit (TASK-030):

  Current Linear Issue: DES-103

  Audit areas:
  - Authentication & authorization (Clerk, RLS)
  - API security (rate limiting, validation)
  - Data protection (encryption, secrets)
  - Dependency vulnerabilities
  - OWASP Top 10 compliance

  Generate security report with findings and recommendations`
})
```

**Example Linear Issues**:
- DES-75: Code Review Standards & PR Templates
- DES-103: Security Audit
- All issues in "In Review" status

---

### 🟢 SubAgent:Tester → Claude Code Agents

**Primary Agents**:
- **qa-engineer-seraph** - Comprehensive QA, test strategy, test creation
- **testing-suite:test-engineer** - Test automation, coverage analysis, CI/CD testing
- **performance-analyst** - Performance testing, benchmarking, optimization

**Usage Patterns**:

**Test Infrastructure Setup** (DES-76):
```typescript
Task({
  subagent_type: "qa-engineer-seraph",
  description: "Setup Testing Infrastructure",
  prompt: `Set up testing infrastructure (DES-76):

  Requirements:
  - Configure Vitest test utilities in __tests__/utils
  - Create mock factories in __tests__/mocks
  - Set up coverage thresholds (75% per vitest.config.ts)
  - Create test database fixtures
  - Document testing approach

  Blocked by: DES-73 (vitest dependency fix)
  Reference: vitest.config.ts for configuration`
})
```

**Unit Tests** (DES-100):
```typescript
Task({
  subagent_type: "qa-engineer-seraph",
  description: "Create Unit Tests for Agents",
  prompt: `Write comprehensive unit tests for AI agents (TASK-026):

  Current Linear Issue: DES-100

  Test coverage for:
  - agents/implementations/orchestrator-agent.ts
  - agents/implementations/client-data-agent.ts
  - agents/implementations/flight-search-agent.ts
  - agents/implementations/proposal-analysis-agent.ts
  - agents/implementations/communication-agent.ts
  - agents/implementations/error-monitor-agent.ts

  Target: 80%+ coverage per agent
  Use TDD approach: Red → Green → Refactor`
})
```

**Integration Tests** (DES-94, DES-95, DES-101):
```typescript
Task({
  subagent_type: "testing-suite:test-engineer",
  description: "Agent Integration Tests",
  prompt: `Create integration tests for agent coordination (TASK-017):

  Current Linear Issue: DES-94

  Test scenarios:
  - Message bus communication between agents
  - Handoff manager task delegation
  - Task queue processing (BullMQ)
  - Workflow state machine transitions
  - Multi-agent RFP workflow

  Use __tests__/integration/ directory
  Reference: agents/coordination/ for components to test`
})
```

**E2E Tests** (DES-102):
```typescript
Task({
  subagent_type: "qa-engineer-seraph",
  description: "End-to-End RFP Tests",
  prompt: `Create end-to-end tests for complete RFP workflow (TASK-028):

  Current Linear Issue: DES-102

  E2E scenarios:
  1. User submits RFP → Orchestrator analyzes → Flight search → Quotes received → Proposal sent
  2. Multi-client workflow with different margin types
  3. Error handling and retry logic
  4. Real-time updates via Supabase subscriptions

  Use Playwright or Cypress
  Test against staging environment`
})
```

**Example Linear Issues**:
- DES-76: Testing Infrastructure Setup
- DES-94: Agent Integration Tests
- DES-95: MCP Server Integration Tests
- DES-96: End-to-End RFP Workflow Test
- DES-100: Unit Tests for Agents
- DES-101: Integration Tests for API Routes
- DES-102: E2E Tests

---

### 🟠 SubAgent:Ops → Claude Code Agents

**Primary Agents**:
- **devops-engineer-link** - CI/CD, deployments, infrastructure, monitoring
- **devops-automation:cloud-architect** - Cloud infrastructure, IaC, optimization
- **security-engineer** - Security configuration, secrets management, compliance

**Usage Patterns**:

**Environment Configuration** (DES-77, DES-81):
```typescript
Task({
  subagent_type: "devops-engineer-link",
  description: "Configure Development Environment",
  prompt: `Set up complete development environment (TASK-003):

  Current Linear Issue: DES-77

  Tasks:
  - Create .env.local.example with all required variables
  - Set up Redis (Docker recommended)
  - Configure Supabase project (tables, RLS, realtime)
  - Set up Clerk application (webhooks, JWT)
  - Verify all service connections
  - Document setup in docs/GETTING_STARTED.md

  Priority: CRITICAL - Unblocks all Week 2 MCP servers and agents`
})
```

**Redis & BullMQ** (DES-81):
```typescript
Task({
  subagent_type: "devops-engineer-link",
  description: "Configure Redis & BullMQ",
  prompt: `Set up Redis and BullMQ task queue (TASK-004):

  Current Linear Issue: DES-81

  Requirements:
  - Set up Redis (Docker or cloud)
  - Configure BullMQ queues for agent tasks
  - Set up queue monitoring (Bull Board)
  - Configure job retries and error handling
  - Document Redis setup and connection

  Reference: agents/coordination/task-queue.ts for usage`
})
```

**CI/CD Pipeline** (DES-105):
```typescript
Task({
  subagent_type: "devops-engineer-link",
  description: "Configure CI/CD Pipeline",
  prompt: `Set up GitHub Actions CI/CD pipeline (TASK-033):

  Current Linear Issue: DES-105

  Pipeline stages:
  1. Lint & Type Check
  2. Run Tests (Unit + Integration)
  3. Build Next.js app
  4. Deploy to Vercel (preview/production)
  5. Run E2E tests on deployed preview

  Create .github/workflows/ci.yml
  Integrate with Linear for status updates`
})
```

**Production Deployment** (DES-104, DES-106, DES-107):
```typescript
Task({
  subagent_type: "devops-automation:cloud-architect",
  description: "Production Environment Setup",
  prompt: `Set up production infrastructure (TASK-035):

  Current Linear Issue: DES-107

  Infrastructure:
  - Vercel production deployment
  - Supabase production database
  - Redis production instance (Upstash recommended)
  - Sentry error monitoring
  - Environment variables management
  - Domain configuration
  - SSL certificates
  - CDN setup

  Create infrastructure as code (Terraform if applicable)
  Document deployment process`
})
```

**Monitoring** (DES-104):
```typescript
Task({
  subagent_type: "devops-engineer-link",
  description: "Sentry Integration",
  prompt: `Set up Sentry error monitoring (TASK-032):

  Current Linear Issue: DES-104

  Requirements:
  - Install @sentry/nextjs
  - Configure Sentry DSN
  - Set up error tracking for agents
  - Configure performance monitoring
  - Create error alerts and notifications
  - Test error capture in staging

  Reference: lib/config/sentry.ts (create this file)`
})
```

**Example Linear Issues**:
- DES-77: Environment Configuration
- DES-81: Redis & BullMQ Configuration
- DES-104: Sentry Integration
- DES-105: CI/CD Pipeline
- DES-106: Staging Deployment
- DES-107: Production Setup

---

## Special Case Agents

### Documentation Tasks

**Agent**: documentation-manager-merovingian

```typescript
// For DES-108: API Documentation
Task({
  subagent_type: "documentation-manager-merovingian",
  description: "Create API Documentation",
  prompt: `Generate comprehensive API documentation (TASK-036):

  Current Linear Issue: DES-108

  Documentation needed:
  - All API routes (GET, POST, PUT, DELETE)
  - Request/response schemas
  - Authentication requirements
  - Rate limits and quotas
  - Error codes and handling
  - Usage examples

  Create docs/API_REFERENCE.md
  Consider using OpenAPI/Swagger spec`
})
```

### Architecture Design Tasks

**Agent**: system-architect

```typescript
// For architectural decisions
Task({
  subagent_type: "system-architect",
  description: "Design MCP Server Architecture",
  prompt: `Design architecture for MCP server infrastructure:

  Requirements:
  - Define base MCP server class
  - Design transport layer (stdio, HTTP+SSE)
  - Plan tool/function structure
  - Design error handling strategy
  - Plan authentication flow

  Create architecture diagram
  Document in docs/architecture/MCP_SERVERS.md`
})
```

### Technical Research

**Agent**: tech-researcher-keymaker

```typescript
// For technology evaluation
Task({
  subagent_type: "tech-researcher-keymaker",
  description: "Research Avinode API",
  prompt: `Research and evaluate Avinode API integration:

  Research:
  - API capabilities and limitations
  - Authentication methods
  - Rate limits
  - Data formats
  - Error handling
  - Best practices

  Create POC for basic flight search
  Document findings in docs/integrations/AVINODE.md`
})
```

---

## Agent Selection Decision Tree

```
Is this a Linear issue?
  ├─ Yes → Check SubAgent label
  │    ├─ SubAgent:Planner → project-coordinator / oracle-reasoner
  │    ├─ SubAgent:Coder → Check task type
  │    │    ├─ Backend → backend-developer-tank
  │    │    ├─ Frontend → frontend-developer-mouse
  │    │    ├─ Full-stack → nextjs-vercel-pro:fullstack-developer
  │    │    └─ Integration → integration-specialist
  │    ├─ SubAgent:Reviewer → morpheus-validator / security-auditor
  │    ├─ SubAgent:Tester → qa-engineer-seraph / testing-suite:test-engineer
  │    └─ SubAgent:Ops → devops-engineer-link / devops-automation:cloud-architect
  │
  └─ No → Use general-purpose or task-specific agent
```

---

## Execution Workflow

### 1. Start Working on Linear Issue

```typescript
// Step 1: Get issue details from Linear
mcp__linear__get_issue({ id: "DES-78" })

// Step 2: Update status to In Progress
mcp__linear__update_issue({
  id: "DES-78",
  state: "started"
})

// Step 3: Launch appropriate Claude Code agent
Task({
  subagent_type: "backend-developer-tank", // Based on SubAgent:Coder + backend work
  description: "Implement Clerk Authentication",
  prompt: `Implement Clerk authentication integration (TASK-001)...`
})
```

### 2. Track Progress

```typescript
// Add progress comments to Linear
mcp__linear__create_comment({
  issueId: "DES-78",
  body: `✅ Phase 1 Complete: Clerk middleware configured

  Next: Create auth API routes

  [Claude Code Agent: backend-developer-tank]`
})
```

### 3. Complete and Handoff

```typescript
// Step 1: Complete the work
// Step 2: Update Linear status
mcp__linear__update_issue({
  id: "DES-78",
  state: "started" // Move to In Review
})

// Step 3: Add handoff comment
mcp__linear__create_comment({
  issueId: "DES-78",
  body: `## Handoff to SubAgent:Reviewer

  ### Completed
  - ✅ Clerk middleware implemented
  - ✅ Auth API routes created
  - ✅ User sync to Supabase working
  - ✅ RLS policies configured
  - ✅ Tests passing (85% coverage)

  ### PR
  https://github.com/user/repo/pull/123

  ### Review Focus
  - Clerk middleware implementation
  - RLS policy security
  - Test coverage

  [Completed by: backend-developer-tank]
  [Next: morpheus-validator for review]`
})

// Step 4: Reviewer uses validator agent
Task({
  subagent_type: "morpheus-validator",
  description: "Review Clerk Authentication PR",
  prompt: `Review PR #123 for Clerk authentication (DES-78)...`
})
```

---

## Quick Reference Table

| Linear SubAgent | Primary Claude Agent | Secondary Agents | Example Issues |
|----------------|---------------------|------------------|----------------|
| **SubAgent:Planner** | project-coordinator | oracle-reasoner, product-owner-oracle | DES-74, DES-80 |
| **SubAgent:Coder** | backend-developer-tank | frontend-developer-mouse, integration-specialist | DES-73, DES-78-99, DES-108 |
| **SubAgent:Reviewer** | morpheus-validator | security-auditor, code-review-coordinator | DES-75, DES-103, All "In Review" |
| **SubAgent:Tester** | qa-engineer-seraph | testing-suite:test-engineer, performance-analyst | DES-76, DES-94-96, DES-100-102 |
| **SubAgent:Ops** | devops-engineer-link | devops-automation:cloud-architect, security-engineer | DES-77, DES-81, DES-104-107 |

---

## Best Practices

### 1. Always Link to Linear Issue
Include the Linear issue ID in the agent prompt:
```typescript
prompt: `Implement feature X (TASK-001)
Current Linear Issue: DES-78
...`
```

### 2. Reference Local Task Files
Point agents to detailed task files:
```typescript
prompt: `...
Follow TDD approach from /tasks/backlog/TASK-001-*.md
...`
```

### 3. Update Linear Throughout
Add comments at key milestones:
- When starting work
- After major phases complete
- When blocked
- When ready for review
- When complete

### 4. Use Agent Name in Comments
Track which agent did the work:
```
[Completed by: backend-developer-tank]
[Next: morpheus-validator for review]
```

### 5. Chain Agents for Complex Tasks
Some tasks may require multiple agents:
```typescript
// 1. Research phase
Task({ subagent_type: "tech-researcher-keymaker", ... })

// 2. Architecture design
Task({ subagent_type: "system-architect", ... })

// 3. Implementation
Task({ subagent_type: "backend-developer-tank", ... })

// 4. Testing
Task({ subagent_type: "qa-engineer-seraph", ... })

// 5. Review
Task({ subagent_type: "morpheus-validator", ... })
```

---

**Document Version**: 1.0
**Last Updated**: October 21, 2025
**Maintained By**: Development Team
**Related Docs**:
- `LINEAR_SUBAGENT_WORKFLOW.md`
- `TASK_LINEAR_MAPPING.md`
- `LINEAR_SETUP_SUMMARY.md`
