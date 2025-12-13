# Task Complexity Analysis & Breakdown System

**Version**: 1.0
**Created**: October 21, 2025
**Purpose**: Automated task complexity analysis and intelligent breakdown for subagents

---

## Overview

This system automatically analyzes task complexity and breaks down large, complex tasks into manageable subtasks. It prevents subagents from attempting overly complex work in single sessions, ensuring better code quality and more manageable development cycles.

---

## Core Concepts

### Complexity Scoring

Tasks are scored on a 100-point scale based on multiple factors:

| Factor | Weight | Max Points | Criteria |
|--------|--------|------------|----------|
| **Lines of Code** | 30% | 30 | Estimated code volume |
| **Dependencies** | 20% | 20 | External integrations, services |
| **Testing Required** | 15% | 15 | Unit, integration, E2E coverage |
| **Documentation** | 10% | 10 | API docs, guides, examples |
| **Integration Points** | 15% | 15 | Systems, APIs, databases |
| **Risk Level** | 10% | 10 | Security, performance, data |

**Complexity Tiers**:
- **Simple** (0-49): Can be completed in single session
- **Moderate** (50-69): Consider breakdown, ask user
- **Complex** (70-89): MUST break down before starting
- **Extreme** (90-100): Break into 4+ subtasks minimum

---

## CLI Commands

### 1. Task Complexity Analysis

```bash
# Analyze all tasks in backlog
npm run task:analyze

# Analyze specific task by ID
npm run task:analyze TASK-001

# Analyze with verbose output
npm run task:analyze TASK-001 --verbose

# Generate complexity report
npm run task:analyze --report
```

**Output Example**:
```
Analyzing TASK-001: Clerk Authentication Integration...

Complexity Score: 78/100 (COMPLEX)
  ├─ Lines of Code: 24/30 (800+ lines estimated)
  ├─ Dependencies: 18/20 (Clerk SDK, Supabase, webhooks)
  ├─ Testing: 12/15 (Unit, integration, E2E required)
  ├─ Documentation: 8/10 (API docs, setup guide)
  ├─ Integration Points: 14/15 (Clerk, Supabase, Next.js)
  └─ Risk Level: 8/10 (Auth security critical)

Recommendation: BREAK DOWN (score ≥70)
Estimated Time: 14-18 hours
Suggested Subtasks: 4-5

Action: Run 'npm run task:breakdown TASK-001'
```

### 2. Automated Task Breakdown

```bash
# Break down complex task
npm run task:breakdown TASK-001

# Preview breakdown without creating files
npm run task:breakdown TASK-001 --dry-run

# Custom number of subtasks
npm run task:breakdown TASK-001 --subtasks=6

# Force breakdown even if complexity <70
npm run task:breakdown TASK-001 --force
```

**Output Example**:
```
Breaking down TASK-001: Clerk Authentication Integration...

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

Next step: npm run task:start TASK-001.1
```

### 3. Task Management

```bash
# Start working on task (sets as active)
npm run task:start TASK-001.1

# Complete current task
npm run task:complete TASK-001.1

# View task dependency chain
npm run task:deps TASK-001

# List all subtasks for parent
npm run task:subtasks TASK-001
```

---

## Subagent Decision Logic

### Automatic Workflow

```typescript
// Pseudocode for subagent task processing

async function processTask(taskId: string) {
  // 1. Analyze complexity
  const analysis = await analyzeTask(taskId)

  // 2. Decision logic
  if (analysis.complexity >= 70) {
    // MUST break down
    console.log(`Task ${taskId} is COMPLEX (${analysis.complexity}/100)`)
    console.log('Breaking down automatically...')
    const subtasks = await breakdownTask(taskId)

    // Start with first subtask
    return processTask(subtasks[0].id)

  } else if (analysis.complexity >= 50) {
    // SHOULD consider breakdown
    const response = await askUser(
      `Task ${taskId} is MODERATE (${analysis.complexity}/100). Break it down?`,
      ['Yes, break it down', 'No, proceed as-is']
    )

    if (response === 'Yes, break it down') {
      const subtasks = await breakdownTask(taskId)
      return processTask(subtasks[0].id)
    }
  }

  // 3. Proceed with implementation
  return implementTask(taskId)
}
```

### Decision Matrix

| Complexity Score | Action | Subagent Behavior |
|-----------------|--------|-------------------|
| **0-49** (Simple) | Proceed | Implement directly, no breakdown |
| **50-69** (Moderate) | Ask User | Offer breakdown option, wait for confirmation |
| **70-89** (Complex) | Auto-Break | Break down automatically, notify user |
| **90-100** (Extreme) | Auto-Break + Alert | Break into 4+ subtasks, escalate to Planner |

---

## Task Breakdown Strategy

### 4-Phase TDD Approach

Every subtask follows the Red-Green-Blue cycle:

```
Phase 1: RED (30% time)
  └─ Write failing tests

Phase 2: GREEN (50% time)
  └─ Implement minimum code to pass

Phase 3: BLUE (20% time)
  └─ Refactor and polish
```

### Component Separation

Tasks are broken down by logical components:

**Example: TASK-001 (Clerk Auth)**
1. **Middleware**: Route protection, JWT validation
2. **API Routes**: Sign-in, sign-up, sign-out endpoints
3. **Webhooks**: User sync, event handlers
4. **Database**: User table sync, RLS policies
5. **Testing**: Unit, integration, E2E tests
6. **Documentation**: Setup guide, API reference

### Time Chunking Rules

- **Maximum 4 hours per subtask**
- **Minimum 2 hours per subtask** (avoid over-fragmentation)
- **Include buffer**: Add 20% for unexpected issues
- **Consider dependencies**: Sequential vs parallel execution

### Subtask Template

Each generated subtask includes:

```markdown
# TASK-001.1: Clerk Middleware & Route Protection

**Parent Task**: TASK-001
**Complexity**: 42/100 (SIMPLE)
**Estimated Time**: 3-4 hours
**Dependencies**: None (can start immediately)
**Blocks**: TASK-001.2 (API routes need middleware)

## Objective
[Clear, focused objective]

## TDD Phases

### Phase 1: RED (1h) - Write Tests
- [ ] Test: Unauthenticated requests blocked
- [ ] Test: Authenticated requests allowed
- [ ] Test: JWT validation works

### Phase 2: GREEN (1.5h) - Implementation
- [ ] Install @clerk/nextjs
- [ ] Create middleware.ts
- [ ] Configure protected routes

### Phase 3: BLUE (0.5h) - Refactor
- [ ] Extract route patterns
- [ ] Add error handling
- [ ] Update documentation

## Success Criteria
- All tests passing
- Middleware blocks unauthenticated requests
- No TypeScript errors

## Next Subtask
TASK-001.2: User Authentication API Routes
```

---

## Workflow Integration

### For Claude Code Subagents

When a subagent receives a task assignment:

```typescript
// Example: Backend Developer Tank receives TASK-001

Task({
  subagent_type: "backend-developer-tank",
  description: "Implement Clerk Authentication",
  prompt: `Implement Clerk authentication (TASK-001).

  IMPORTANT: Before starting implementation:

  1. Analyze task complexity:
     npm run task:analyze TASK-001

  2. If complexity ≥70, automatically break down:
     npm run task:breakdown TASK-001

  3. Start with first subtask:
     npm run task:start TASK-001.1

  4. Follow TDD approach for each subtask

  5. Update Linear issue after each subtask completion

  Reference: /tasks/backlog/TASK-001-*.md`
})
```

### Linear Integration

Each subtask maps to Linear sub-issues or comments:

**Option 1: Linear Sub-Issues**
```typescript
// Create sub-issue for each subtask
mcp__linear__create_issue({
  title: "TASK-001.1: Clerk Middleware",
  parent: "DES-78", // Parent issue
  description: "Subtask 1 of 4...",
  labels: ["SubAgent:Coder", "Subtask"]
})
```

**Option 2: Linear Comments**
```typescript
// Track subtasks via comments
mcp__linear__create_comment({
  issueId: "DES-78",
  body: `## Subtask Progress: TASK-001

  - [x] TASK-001.1: Clerk Middleware (3h) ✅
  - [ ] TASK-001.2: API Routes (4h) 🔄
  - [ ] TASK-001.3: Webhooks (3h) ⏳
  - [ ] TASK-001.4: Testing (2h) ⏳

  Current: Implementing API routes (GREEN phase)`
})
```

---

## Generated Artifacts

### 1. Subtask Files

Location: `tasks/backlog/TASK-[ID].[N]-[slug].md`

Example:
```
tasks/backlog/
  ├─ TASK-001.1-clerk-middleware-route-protection.md
  ├─ TASK-001.2-user-authentication-api-routes.md
  ├─ TASK-001.3-supabase-user-sync-webhook.md
  └─ TASK-001.4-authentication-testing-documentation.md
```

### 2. Complexity Analysis Report

Location: `tasks/COMPLEXITY_ANALYSIS_REPORT.md`

```markdown
# Task Complexity Analysis Report
Generated: October 21, 2025

## Summary
- Total Tasks Analyzed: 37
- Simple (0-49): 18 tasks (48%)
- Moderate (50-69): 11 tasks (30%)
- Complex (70-89): 7 tasks (19%)
- Extreme (90-100): 1 task (3%)

## High Complexity Tasks
1. TASK-011: RFP Orchestrator Agent (85/100) → Break into 5 subtasks
2. TASK-001: Clerk Authentication (78/100) → Break into 4 subtasks
3. TASK-002: Database Schema (72/100) → Break into 3 subtasks

## Recommendations
- 8 tasks require breakdown before development
- Estimated time savings: 15-20% via parallelization
- Risk mitigation: 6 high-risk tasks identified
```

### 3. Dependency Graph

Visual representation of subtask dependencies:

```
TASK-001: Clerk Authentication
  ├─ TASK-001.1: Middleware (3h)
  │   └─ Unblocks: TASK-001.2, TASK-001.3
  │
  ├─ TASK-001.2: API Routes (4h)
  │   ├─ Depends on: TASK-001.1
  │   └─ Unblocks: TASK-001.4
  │
  ├─ TASK-001.3: Webhooks (3h)
  │   ├─ Depends on: TASK-001.1
  │   └─ Unblocks: TASK-001.4
  │
  └─ TASK-001.4: Testing (2h)
      └─ Depends on: TASK-001.2, TASK-001.3
```

---

## Complexity Calculation Formula

```typescript
interface ComplexityFactors {
  linesOfCode: number        // 0-30 points
  dependencies: number        // 0-20 points
  testingRequired: number     // 0-15 points
  documentation: number       // 0-10 points
  integrationPoints: number   // 0-15 points
  riskLevel: number          // 0-10 points
}

function calculateComplexity(task: Task): number {
  let score = 0

  // 1. Lines of Code (30 points max)
  const estimatedLOC = task.estimatedLines || 0
  score += Math.min(30, (estimatedLOC / 1000) * 30)

  // 2. Dependencies (20 points max)
  const deps = task.externalDependencies || []
  score += Math.min(20, deps.length * 4)

  // 3. Testing (15 points max)
  const testTypes = task.testingRequired || []
  score += testTypes.length * 5 // unit, integration, e2e

  // 4. Documentation (10 points max)
  const docTypes = task.documentationRequired || []
  score += Math.min(10, docTypes.length * 3)

  // 5. Integration Points (15 points max)
  const integrations = task.integrations || []
  score += Math.min(15, integrations.length * 5)

  // 6. Risk Level (10 points max)
  score += task.riskLevel * 2 // 1-5 scale → 2-10 points

  return Math.round(score)
}
```

---

## Examples

### Example 1: Simple Task (No Breakdown)

**TASK-006: First API Route**
- Complexity: 45/100 (SIMPLE)
- Estimated Time: 3-4h
- Action: Proceed directly

```bash
npm run task:analyze TASK-006
# Output: SIMPLE (45/100) - Proceed with implementation
```

### Example 2: Moderate Task (Ask User)

**TASK-005: Supabase Client Implementation**
- Complexity: 58/100 (MODERATE)
- Estimated Time: 6-8h
- Action: Ask user for confirmation

```bash
npm run task:analyze TASK-005
# Output: MODERATE (58/100) - Consider breakdown
# Prompt: "Break this task into subtasks? [Y/n]"
```

### Example 3: Complex Task (Auto-Breakdown)

**TASK-001: Clerk Authentication**
- Complexity: 78/100 (COMPLEX)
- Estimated Time: 14-18h
- Action: Automatic breakdown

```bash
npm run task:analyze TASK-001
# Output: COMPLEX (78/100) - Breaking down automatically...

npm run task:breakdown TASK-001
# Generated: TASK-001.1 through TASK-001.4
```

### Example 4: Extreme Task (Multiple Levels)

**TASK-011: RFP Orchestrator Agent**
- Complexity: 85/100 (EXTREME)
- Estimated Time: 25-30h
- Action: Break into 5+ subtasks, some may need sub-sub-tasks

```bash
npm run task:breakdown TASK-011
# Generated: TASK-011.1 through TASK-011.5

npm run task:analyze TASK-011.3
# TASK-011.3 is still 68/100 - consider further breakdown
```

---

## Best Practices

### For Subagents

1. **Always analyze first**: Never start implementation without running `task:analyze`
2. **Trust the automation**: If score ≥70, let the system break it down
3. **Follow the chain**: Complete subtasks in dependency order
4. **Update frequently**: Add Linear comments after each subtask
5. **Test continuously**: Run tests after each GREEN phase

### For Project Managers

1. **Review complexity reports**: Weekly review of high-complexity tasks
2. **Adjust estimates**: Use breakdown time estimates for scheduling
3. **Monitor progress**: Track subtask completion in Linear
4. **Identify patterns**: Learn which task types tend to be complex

### For Developers

1. **Use dry-run**: Preview breakdown before committing
2. **Customize subtasks**: Adjust if breakdown doesn't fit your approach
3. **Archive wisely**: Keep original task for reference
4. **Document learnings**: Add notes to subtask files

---

## Configuration

### Complexity Thresholds

Adjust in `scripts/task-complexity-config.ts`:

```typescript
export const COMPLEXITY_THRESHOLDS = {
  SIMPLE: 49,
  MODERATE: 69,
  COMPLEX: 89,
  EXTREME: 100,
}

export const WEIGHTS = {
  linesOfCode: 0.30,
  dependencies: 0.20,
  testing: 0.15,
  documentation: 0.10,
  integrationPoints: 0.15,
  riskLevel: 0.10,
}
```

### Breakdown Rules

Adjust in `scripts/task-breakdown-config.ts`:

```typescript
export const BREAKDOWN_RULES = {
  maxSubtaskTime: 4, // hours
  minSubtaskTime: 2, // hours
  bufferPercentage: 0.20, // 20% buffer
  preferredSubtaskCount: 4,
  tddPhaseRatios: {
    red: 0.30,
    green: 0.50,
    blue: 0.20,
  },
}
```

---

## Troubleshooting

### Issue: Breakdown creates too many subtasks

**Solution**: Increase `maxSubtaskTime` or adjust complexity weights

```bash
npm run task:breakdown TASK-001 --subtasks=3 --max-time=6
```

### Issue: Subtask still too complex

**Solution**: Run breakdown again on subtask

```bash
npm run task:breakdown TASK-001.2
# Creates TASK-001.2.1, TASK-001.2.2, etc.
```

### Issue: Breakdown doesn't match development approach

**Solution**: Use `--dry-run` and manually adjust

```bash
npm run task:breakdown TASK-001 --dry-run > breakdown-preview.txt
# Review, then manually create subtasks
```

---

## Integration with Existing Systems

### With Linear SubAgent Workflow

- Subtasks align with SubAgent specializations
- Each subtask inherits parent's SubAgent label
- Dependencies tracked in Linear relationships

### With TDD Workflow

- All subtasks follow RED-GREEN-BLUE phases
- Test files created in RED phase
- Implementation in GREEN phase
- Refactor in BLUE phase

### With Git Workflow

- One branch per subtask (optional)
- Or single branch with commits per subtask
- PR can include multiple subtask completions

---

**Document Version**: 1.0
**Last Updated**: October 21, 2025
**Maintained By**: Development Team

**Related Documentation**:
- `TASK_INDEX.md` - Task organization
- `LINEAR_SUBAGENT_WORKFLOW.md` - SubAgent coordination
- `SUBAGENT_TO_CLAUDE_AGENT_MAPPING.md` - Agent assignments
