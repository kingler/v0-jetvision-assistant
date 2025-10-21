# Task Complexity System - Integration Examples

**Version**: 1.0
**Created**: October 21, 2025
**Purpose**: Practical examples of how subagents integrate automated task complexity analysis

---

## Overview

This document provides complete, working examples of how Claude Code subagents should integrate the task complexity analysis and breakdown system into their workflow.

---

## Example 1: Simple Task (No Breakdown Required)

### Scenario
SubAgent:Coder receives **TASK-006: First API Route Implementation**

### Complexity Analysis
```bash
$ npm run task:analyze TASK-006

Analyzing TASK-006...

Complexity Score: 45/100 (SIMPLE)

Breakdown:
  ├─ Lines of Code: 12/30
  ├─ Dependencies: 6/20
  ├─ Testing: 10/15
  ├─ Documentation: 5/10
  ├─ Integration Points: 5/15
  └─ Risk Level: 6/10

Recommendation: Proceed with implementation
Estimated Time: 3-4 hours
Suggested Subtasks: 1

Next Action: npm run task:start TASK-006
```

### Agent Implementation

```typescript
// Claude Code conversation - Backend Developer Tank

Task({
  subagent_type: "backend-developer-tank",
  description: "Implement First API Route (TASK-006)",
  prompt: `Implement the first API route for health check (TASK-006).

  Linear Issue: DES-83

  STEP 1: Analyze complexity
  ---
  Run: npm run task:analyze TASK-006

  [Agent executes and reads output: 45/100 SIMPLE]

  STEP 2: Decision
  ---
  Complexity is 45/100 (SIMPLE) - Proceeding with direct implementation.
  No breakdown required.

  STEP 3: Implementation
  ---
  Task File: /tasks/backlog/TASK-006-first-api-route-implementation.md

  Deliverables:
  - Create app/api/health/route.ts
  - Implement GET /api/health endpoint
  - Add Redis connection check
  - Add Supabase connection check
  - Add OpenAI connection check
  - Write unit tests
  - Update API documentation

  Follow TDD: RED → GREEN → BLUE

  Reference: docs/TASK_COMPLEXITY_BREAKDOWN_SYSTEM.md
  `
})
```

**Agent Behavior**:
1. ✅ Runs `npm run task:analyze TASK-006`
2. ✅ Sees score 45/100 (SIMPLE)
3. ✅ Proceeds directly with implementation
4. ✅ No breakdown needed
5. ✅ Completes in single session (3-4 hours)

---

## Example 2: Moderate Task (User Confirmation Required)

### Scenario
SubAgent:Coder receives **TASK-005: Supabase Client Implementation**

### Complexity Analysis
```bash
$ npm run task:analyze TASK-005

Analyzing TASK-005...

Complexity Score: 58/100 (MODERATE)

Breakdown:
  ├─ Lines of Code: 16/30
  ├─ Dependencies: 12/20
  ├─ Testing: 10/15
  ├─ Documentation: 7/10
  ├─ Integration Points: 10/15
  └─ Risk Level: 6/10

Recommendation: Consider breakdown (ask user for confirmation)
Estimated Time: 6-8 hours
Suggested Subtasks: 2

Optional Action: npm run task:breakdown TASK-005
```

### Agent Implementation

```typescript
Task({
  subagent_type: "backend-developer-tank",
  description: "Implement Supabase Client (TASK-005)",
  prompt: `Implement Supabase client library (TASK-005).

  Linear Issue: DES-82

  STEP 1: Analyze complexity
  ---
  Run: npm run task:analyze TASK-005

  [Agent executes: 58/100 MODERATE]

  STEP 2: Ask user for decision
  ---
  Complexity is 58/100 (MODERATE).
  System recommends considering breakdown for better manageability.

  Should we break this task into subtasks?
  `
})
```

**Agent uses AskUserQuestion**:
```typescript
const response = await AskUserQuestion({
  questions: [{
    question: "TASK-005 has moderate complexity (58/100, est. 6-8h). Break it down into subtasks?",
    header: "Task Breakdown",
    multiSelect: false,
    options: [
      {
        label: "Yes, break it down",
        description: "Split into 2 manageable subtasks (~3-4h each)"
      },
      {
        label: "No, proceed as-is",
        description: "Complete in single 6-8 hour session"
      }
    ]
  }]
})

if (response.answers.breakdown === "Yes, break it down") {
  // Run breakdown
  await Bash({
    command: "npm run task:breakdown TASK-005",
    description: "Break down TASK-005 into subtasks"
  })

  // Start with first subtask
  // Proceed with TASK-005.1
} else {
  // Proceed with full task
  // Implement TASK-005 directly
}
```

**If User Says "Yes, break it down"**:
```bash
$ npm run task:breakdown TASK-005

Breaking down TASK-005: Supabase Client Implementation...

Generated 2 subtasks:
  ✓ TASK-005.1: Supabase Client Configuration (3h)
  ✓ TASK-005.2: Supabase Type Generation & Testing (3h)

Files created:
  - tasks/backlog/TASK-005.1-supabase-client-configuration.md
  - tasks/backlog/TASK-005.2-supabase-type-generation-testing.md

Original task archived:
  - tasks/archived/TASK-005-supabase-client-implementation.md

Next step: npm run task:start TASK-005.1
```

**Agent Behavior**:
1. ✅ Runs `npm run task:analyze TASK-005`
2. ✅ Sees score 58/100 (MODERATE)
3. ✅ Asks user for confirmation
4. ✅ If yes: Breaks down into 2 subtasks
5. ✅ If no: Proceeds with full task

---

## Example 3: Complex Task (Automatic Breakdown)

### Scenario
SubAgent:Coder receives **TASK-001: Clerk Authentication Integration**

### Complexity Analysis
```bash
$ npm run task:analyze TASK-001

Analyzing TASK-001...

Complexity Score: 78/100 (COMPLEX)

Breakdown:
  ├─ Lines of Code: 24/30 (800+ lines estimated)
  ├─ Dependencies: 18/20 (Clerk SDK, Supabase, webhooks)
  ├─ Testing: 12/15 (Unit, integration, E2E required)
  ├─ Documentation: 8/10 (API docs, setup guide)
  ├─ Integration Points: 14/15 (Clerk, Supabase, Next.js)
  └─ Risk Level: 8/10 (Auth security critical)

Recommendation: BREAK DOWN (automatic breakdown required)
Estimated Time: 14-18 hours
Suggested Subtasks: 4

Next Action: npm run task:breakdown TASK-001
```

### Agent Implementation

```typescript
Task({
  subagent_type: "backend-developer-tank",
  description: "Implement Clerk Authentication (TASK-001)",
  prompt: `Implement Clerk authentication integration (TASK-001).

  Linear Issue: DES-78

  STEP 1: Analyze complexity
  ---
  Run: npm run task:analyze TASK-001

  [Agent executes: 78/100 COMPLEX]

  STEP 2: Automatic breakdown
  ---
  Complexity is 78/100 (COMPLEX) - Score ≥70 triggers AUTOMATIC BREAKDOWN.
  Breaking down task without user confirmation (mandatory per system rules).

  Run: npm run task:breakdown TASK-001
  `
})
```

**Agent Executes Breakdown Automatically**:
```bash
$ npm run task:breakdown TASK-001

Breaking down TASK-001: Clerk Authentication Integration...

Analyzing task structure...
Identifying logical components...
Calculating optimal breakdown...

Generated 4 subtasks:
  ✓ TASK-001.1: Clerk Middleware & Route Protection (3-4h)
  ✓ TASK-001.2: User Authentication API Routes (4-5h)
  ✓ TASK-001.3: Supabase User Sync Webhook (3-4h)
  ✓ TASK-001.4: Authentication Testing & Documentation (2-3h)

Files created:
  - tasks/backlog/TASK-001.1-clerk-middleware-route-protection.md
  - tasks/backlog/TASK-001.2-user-authentication-api-routes.md
  - tasks/backlog/TASK-001.3-supabase-user-sync-webhook.md
  - tasks/backlog/TASK-001.4-authentication-testing-documentation.md

Original task archived:
  - tasks/archived/TASK-001-clerk-authentication-integration.md

Dependency graph:
  TASK-001.1 (Middleware)
    └─> TASK-001.2 (API Routes) - depends on middleware
    └─> TASK-001.3 (Webhooks) - depends on middleware
        └─> TASK-001.4 (Testing) - depends on all above

Next step: npm run task:start TASK-001.1
```

**Agent continues with first subtask**:
```typescript
// Agent automatically transitions to first subtask
Task({
  subagent_type: "backend-developer-tank",
  description: "Implement Clerk Middleware (TASK-001.1)",
  prompt: `Implement Clerk middleware and route protection (TASK-001.1).

  Parent Task: TASK-001 (broken down due to complexity 78/100)
  Linear Issue: DES-78 (track all subtasks here)
  Subtask: 1 of 4

  Task File: /tasks/backlog/TASK-001.1-clerk-middleware-route-protection.md

  Complexity: 42/100 (SIMPLE - safe to implement)
  Estimated Time: 3-4 hours
  Dependencies: None (can start immediately)

  TDD Phases:
  - RED (1h): Write failing tests for middleware
  - GREEN (1.5h): Implement middleware
  - BLUE (0.5h): Refactor and polish

  Linear Update:
  - Add comment to DES-78: "Starting TASK-001.1 (subtask 1 of 4)"
  - Update when complete: "✅ TASK-001.1 complete - Middleware working"
  `
})
```

**Agent Behavior**:
1. ✅ Runs `npm run task:analyze TASK-001`
2. ✅ Sees score 78/100 (COMPLEX)
3. ✅ Automatically runs `npm run task:breakdown TASK-001` (no user prompt)
4. ✅ Notifies user: "Task broken down into 4 subtasks"
5. ✅ Starts with TASK-001.1
6. ✅ Completes subtask 1, then 2, then 3, then 4
7. ✅ Updates Linear after each subtask

---

## Example 4: Extreme Task (Escalation Required)

### Scenario
SubAgent:Coder receives **TASK-011: RFP Orchestrator Agent**

### Complexity Analysis
```bash
$ npm run task:analyze TASK-011

Analyzing TASK-011...

Complexity Score: 85/100 (EXTREME)

Breakdown:
  ├─ Lines of Code: 28/30 (1200+ lines estimated)
  ├─ Dependencies: 20/20 (OpenAI, MCP, Agents, Queue, DB)
  ├─ Testing: 15/15 (Unit, integration, E2E, performance)
  ├─ Documentation: 10/10 (API, architecture, examples)
  ├─ Integration Points: 15/15 (All systems)
  └─ Risk Level: 10/10 (Core business logic)

Recommendation: BREAK DOWN + ALERT (escalate to Planner)
Estimated Time: 25-30 hours
Suggested Subtasks: 5+

Next Action: npm run task:breakdown TASK-011
⚠️ ALERT: This is an EXTREME complexity task - recommend Planner review
```

### Agent Implementation

```typescript
Task({
  subagent_type: "backend-developer-tank",
  description: "Implement RFP Orchestrator Agent (TASK-011)",
  prompt: `Implement RFP Orchestrator Agent (TASK-011).

  Linear Issue: DES-88

  STEP 1: Analyze complexity
  ---
  Run: npm run task:analyze TASK-011

  [Agent executes: 85/100 EXTREME]

  ⚠️ CRITICAL ALERT: EXTREME Complexity Detected

  STEP 2: Escalate to Planner
  ---
  Complexity score is 85/100 (EXTREME).
  This exceeds the 90-point threshold and requires Planner review.

  Before proceeding, I will:
  1. Break down automatically (mandatory for score ≥70)
  2. Escalate to SubAgent:Planner for review
  3. Wait for Planner approval before starting implementation
  `
})

// Agent launches Planner for review
Task({
  subagent_type: "project-coordinator",
  description: "Review TASK-011 breakdown strategy",
  prompt: `Review and validate the breakdown strategy for TASK-011.

  ESCALATION REASON: Complexity score 85/100 (EXTREME)

  Automated breakdown generated 5 subtasks:
  - TASK-011.1: Agent Core Logic & State Machine
  - TASK-011.2: OpenAI Integration & Prompt Engineering
  - TASK-011.3: MCP Tool Integration & Execution
  - TASK-011.4: Queue Management & Error Handling
  - TASK-011.5: Testing, Monitoring & Documentation

  Please review:
  1. Is the breakdown appropriate?
  2. Should any subtasks be further divided?
  3. Are dependencies correctly identified?
  4. Is the estimated timeline realistic (25-30h)?

  Provide approval or suggest adjustments.
  `
})
```

**Planner Response**:
```markdown
## TASK-011 Breakdown Review

Reviewed: October 21, 2025
Complexity: 85/100 (EXTREME) ✅ Correct assessment

### Analysis
The automated breakdown is sound, but TASK-011.3 (MCP Tool Integration)
is still too complex and should be further divided.

### Recommended Adjustments
1. ✅ TASK-011.1: Agent Core Logic (4-5h) - Approved
2. ✅ TASK-011.2: OpenAI Integration (4-5h) - Approved
3. ❌ TASK-011.3: MCP Tool Integration - TOO COMPLEX
   → Break into:
      - TASK-011.3.1: MCP Client Setup (2-3h)
      - TASK-011.3.2: Tool Discovery & Registration (2-3h)
      - TASK-011.3.3: Tool Execution & Error Handling (3-4h)
4. ✅ TASK-011.4: Queue Management (4-5h) - Approved
5. ✅ TASK-011.5: Testing & Docs (3-4h) - Approved

### Approval
✅ Proceed with adjusted breakdown (7 subtasks total)
✅ Estimated time: 26-31 hours (realistic)
✅ Coder can begin with TASK-011.1
```

**Agent Behavior**:
1. ✅ Runs `npm run task:analyze TASK-011`
2. ✅ Sees score 85/100 (EXTREME)
3. ✅ Automatically breaks down into 5 subtasks
4. ✅ **Escalates to Planner** for review (mandatory for EXTREME)
5. ✅ Planner reviews and suggests further breakdown
6. ✅ Runs `npm run task:breakdown TASK-011.3` (break subtask)
7. ✅ Final structure: 7 subtasks
8. ✅ Starts implementation with Planner approval

---

## Example 5: Real-Time Integration with Linear

### Complete Workflow Example

```typescript
// User assigns TASK-001 to Coder via Linear
// Linear Issue: DES-78
// SubAgent: Coder
// Task File: /tasks/backlog/TASK-001-clerk-authentication-integration.md

// ============================================
// STEP 1: Coder receives task and analyzes
// ============================================

Task({
  subagent_type: "backend-developer-tank",
  description: "Implement Clerk Authentication",
  prompt: `Start work on TASK-001: Clerk Authentication.

  Linear Issue: DES-78
  Current Status: Todo → Moving to In Progress

  Before starting implementation, analyze task complexity...
  `
})

// ============================================
// Agent executes analysis
// ============================================

await Bash({
  command: "npm run task:analyze TASK-001",
  description: "Analyze TASK-001 complexity"
})

// Output: 78/100 (COMPLEX) - Auto-breakdown required

// ============================================
// STEP 2: Auto-breakdown (score ≥70)
// ============================================

await Bash({
  command: "npm run task:breakdown TASK-001",
  description: "Break down TASK-001 automatically"
})

// Generated: TASK-001.1 through TASK-001.4

// ============================================
// STEP 3: Update Linear with breakdown
// ============================================

await mcp__linear__create_comment({
  issueId: "DES-78",
  body: `## Task Breakdown Complete

  Complexity analysis: 78/100 (COMPLEX)
  Automatic breakdown triggered (score ≥70).

  Generated 4 subtasks:
  - TASK-001.1: Clerk Middleware & Route Protection (3-4h)
  - TASK-001.2: User Authentication API Routes (4-5h)
  - TASK-001.3: Supabase User Sync Webhook (3-4h)
  - TASK-001.4: Authentication Testing & Documentation (2-3h)

  Total estimated time: 14-18 hours (vs 14-18h original)

  Starting with TASK-001.1...

  ---
  [Automated by: backend-developer-tank]
  [Reference: docs/TASK_COMPLEXITY_BREAKDOWN_SYSTEM.md]
  `
})

// ============================================
// STEP 4: Start first subtask
// ============================================

Task({
  subagent_type: "backend-developer-tank",
  description: "Clerk Middleware (TASK-001.1)",
  prompt: `Implement TASK-001.1: Clerk Middleware & Route Protection

  Subtask 1 of 4 from TASK-001 breakdown
  Complexity: 42/100 (SIMPLE - safe to implement)
  Estimated: 3-4 hours

  [... implementation ...]
  `
})

// ============================================
// STEP 5: Complete subtask and update Linear
// ============================================

await mcp__linear__create_comment({
  issueId: "DES-78",
  body: `✅ TASK-001.1 Complete: Clerk Middleware

  Phase 1 (RED): Tests written ✓
  Phase 2 (GREEN): Implementation complete ✓
  Phase 3 (BLUE): Refactored ✓

  Results:
  - Middleware protecting all routes ✓
  - JWT validation working ✓
  - Unauthenticated requests blocked ✓
  - Test coverage: 88%

  Time: 3.5 hours (within estimate)

  Next: Starting TASK-001.2 (API Routes)

  Progress: [████░░░░] 1/4 subtasks (25%)
  `
})

// ============================================
// STEP 6: Repeat for remaining subtasks
// ============================================

// TASK-001.2: API Routes (4-5h)
// TASK-001.3: Webhooks (3-4h)
// TASK-001.4: Testing (2-3h)

// ============================================
// STEP 7: Mark Linear issue as complete
// ============================================

await mcp__linear__update_issue({
  id: "DES-78",
  state: "completed"
})

await mcp__linear__create_comment({
  issueId: "DES-78",
  body: `🎉 TASK-001 Complete: Clerk Authentication Integration

  All 4 subtasks completed successfully:
  - ✅ TASK-001.1: Clerk Middleware (3.5h)
  - ✅ TASK-001.2: API Routes (4h)
  - ✅ TASK-001.3: Webhooks (3h)
  - ✅ TASK-001.4: Testing (2.5h)

  Total time: 13 hours (within 14-18h estimate)
  Test coverage: 86% (target: 75%+)
  TypeScript: 0 errors ✓

  System benefits from breakdown:
  - Better code quality (focused sessions)
  - Earlier feedback (4 commits vs 1)
  - Easier review (smaller PRs)
  - Parallel work potential (middleware + webhooks)

  Handoff to SubAgent:Reviewer for final review.
  `
})
```

---

## Best Practices

### For All Subagents

1. **Always run analysis first** - Before any implementation
2. **Trust the automation** - Don't skip breakdown for score ≥70
3. **Update Linear frequently** - After each subtask completion
4. **Follow TDD for subtasks** - RED-GREEN-BLUE cycle
5. **Document learnings** - Add notes to subtask files

### For Complex Tasks

1. **Review generated subtasks** - Ensure they make sense
2. **Check dependencies** - Verify execution order
3. **Adjust if needed** - Use `--dry-run` to preview
4. **Communicate progress** - Linear comments after each subtask
5. **Escalate if unsure** - Use Planner for EXTREME tasks

### For Moderate Tasks

1. **Explain to user** - Share complexity score and reasoning
2. **Provide options** - Let user decide breakdown vs direct
3. **Respect choice** - Proceed as directed
4. **Document decision** - Note in Linear comments

---

## Troubleshooting

### Issue: Breakdown creates too many subtasks

**Solution**: Use custom subtask count

```bash
npm run task:breakdown TASK-001 --subtasks=3
```

### Issue: Subtask still too complex

**Solution**: Run breakdown on subtask

```bash
# After breaking TASK-001 into TASK-001.1-4
npm run task:analyze TASK-001.3
# If still ≥70, break it down further
npm run task:breakdown TASK-001.3
# Creates TASK-001.3.1, TASK-001.3.2, etc.
```

### Issue: Agent doesn't detect complexity

**Solution**: Verify task file format

```bash
# Task file must include metadata
npm run task:analyze TASK-001 --verbose
# Shows detailed breakdown calculation
```

---

**Document Version**: 1.0
**Last Updated**: October 21, 2025
**Related Documentation**:
- `TASK_COMPLEXITY_BREAKDOWN_SYSTEM.md` - Full system documentation
- `SUBAGENT_TO_CLAUDE_AGENT_MAPPING.md` - Agent assignment guide
- `LINEAR_SUBAGENT_WORKFLOW.md` - Linear integration workflow
