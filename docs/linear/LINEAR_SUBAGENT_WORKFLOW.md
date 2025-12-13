# Linear SubAgent Coordination Workflow
# JetVision AI Assistant Multi-Agent Project Management

**Version**: 1.0
**Created**: October 21, 2025
**Project**: JetVision AI Assistant v1
**Linear Project**: [JetVision Assistant v1](https://linear.app/designthru-ai/project/jetvision-assistant-v1-8dc142d9fa78)

---

## Table of Contents

1. [Overview](#overview)
2. [SubAgent Roles & Responsibilities](#subagent-roles--responsibilities)
3. [Linear Project Structure](#linear-project-structure)
4. [Workflow States](#workflow-states)
5. [Task Assignment Process](#task-assignment-process)
6. [Handoff Protocols](#handoff-protocols)
7. [Dependency Management](#dependency-management)
8. [Sync with Local Tasks](#sync-with-local-tasks)
9. [Best Practices](#best-practices)

---

## Overview

The JetVision Assistant project uses a **multi-agent workflow** where specialized "SubAgents" own specific aspects of the development lifecycle. **Linear serves as the single source of truth** for all project tasks, status tracking, and workflow coordination.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LINEAR PROJECT                            │
│         "JetVision Assistant v1" (Single Source of Truth)    │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Planner │  │  Coder  │  │Reviewer │
│ SubAgent│  │SubAgent │  │SubAgent │
└─────────┘  └─────────┘  └─────────┘
    │            │            │
    ▼            ▼            ▼
┌─────────┐  ┌─────────┐
│ Tester  │  │   Ops   │
│SubAgent │  │SubAgent │
└─────────┘  └─────────┘
```

### Key Principles

1. **Linear is the source of truth** - All task state lives in Linear
2. **SubAgent specialization** - Each agent has clear responsibilities
3. **Explicit handoffs** - Tasks transition between agents via Linear status changes
4. **Dependency tracking** - Linear tracks blockers and dependencies
5. **Bidirectional sync** - Local task files sync with Linear issues

---

## SubAgent Roles & Responsibilities

### 🟣 SubAgent:Planner (Purple - #9B59B6)

**Primary Responsibility**: Task decomposition, milestone planning, and dependency mapping

**Owns**:
- Breaking down epics into actionable tasks
- Creating detailed implementation plans
- Mapping dependencies between tasks
- Estimating effort and timelines
- Identifying risks and blockers
- Sprint planning and milestone tracking

**Linear Status**: `Todo` → `In Progress` → `Done`

**Handoff To**:
- SubAgent:Coder (after planning complete)
- SubAgent:Ops (for infrastructure planning)

**Example Issues**:
- DES-74: Week 1 Foundation Planning
- DES-80: Week 2-3 MCP & Agent Planning

---

### 🔵 SubAgent:Coder (Blue - #3498DB)

**Primary Responsibility**: Implementation tasks, code development, and technical execution

**Owns**:
- Writing production code
- Implementing features and bug fixes
- Creating API endpoints
- Implementing database schemas
- Agent implementations
- Integration with external services

**Linear Status**: `Backlog` → `In Progress` → `In Review`

**Handoff To**:
- SubAgent:Reviewer (after implementation complete)
- SubAgent:Tester (for test implementation)

**Example Issues**:
- DES-73: Fix TypeScript & Vitest Blockers (TASK-000)
- DES-78: Clerk Authentication Integration (TASK-001)
- DES-79: Supabase Database Schema (TASK-002)

---

### 🔴 SubAgent:Reviewer (Red - #E74C3C)

**Primary Responsibility**: Code reviews, quality assurance, and approval processes

**Owns**:
- Code review execution
- Quality gate enforcement
- Approval/rejection decisions
- Feedback and iteration requests
- Merge decisions
- Code quality standards

**Linear Status**: `In Review` → `Done` or back to `In Progress`

**Handoff To**:
- SubAgent:Coder (if changes requested)
- SubAgent:Ops (after approval, for deployment)
- Mark as `Done` (if approved and merged)

**Example Issues**:
- DES-75: Establish Code Review Standards

---

### 🟢 SubAgent:Tester (Green - #2ECC71)

**Primary Responsibility**: Testing strategies, test implementation, and validation

**Owns**:
- Test infrastructure setup
- Unit test creation
- Integration test creation
- E2E test creation
- Test coverage monitoring
- Quality metrics tracking
- Bug verification

**Linear Status**: `Todo` → `In Progress` → `Done`

**Handoff To**:
- SubAgent:Reviewer (test review)
- SubAgent:Coder (if bugs found)

**Example Issues**:
- DES-76: Setup Testing Infrastructure

---

### 🟠 SubAgent:Ops (Orange - #F39C12)

**Primary Responsibility**: Deployment, monitoring, and operational concerns

**Owns**:
- Environment configuration
- Infrastructure setup
- CI/CD pipeline configuration
- Deployment automation
- Monitoring and alerting
- Performance optimization
- Production incident response

**Linear Status**: `Todo` → `In Progress` → `Done`

**Handoff To**:
- SubAgent:Coder (infrastructure ready)
- SubAgent:Tester (for deployment testing)

**Example Issues**:
- DES-77: Environment Configuration (TASK-003)

---

## Linear Project Structure

### Labels

#### SubAgent Labels (Primary)
- `SubAgent:Planner` - Purple (#9B59B6)
- `SubAgent:Coder` - Blue (#3498DB)
- `SubAgent:Reviewer` - Red (#E74C3C)
- `SubAgent:Tester` - Green (#2ECC71)
- `SubAgent:Ops` - Orange (#F39C12)

#### Priority Labels
- `Priority:Critical` - Red (#FF0000) - Blocking issues
- `Priority:High` - Orange (#FFA500) - Critical path tasks

#### Phase Labels
- `Phase:Foundation` - Week 1 tasks
- `Phase:MCP-Agents` - Week 2-3 tasks
- `Phase:Frontend` - Week 4 tasks
- `Phase:Testing` - Week 5 tasks
- `Phase:Production` - Week 6 tasks

### Issue Naming Convention

```
SubAgent:[Role] — [Task Description] ([TASK-ID])
```

**Examples**:
- `SubAgent:Coder — Fix TypeScript Compilation & Vitest Dependency Blockers (TASK-000)`
- `SubAgent:Planner — Week 1 Foundation Planning & Task Decomposition`
- `SubAgent:Ops — Environment Configuration & Infrastructure Setup (TASK-003)`

---

## Workflow States

### Standard Linear Workflow

```
Backlog → Todo → In Progress → In Review → Done
                                    ↓
                            (if changes needed)
                                    ↓
                              In Progress
```

### State Descriptions

| State | Description | SubAgent Owner |
|-------|-------------|----------------|
| **Backlog** | Planned but not ready to start | Planner |
| **Todo** | Ready to start, waiting for assignment | Any |
| **In Progress** | Actively being worked on | Coder/Tester/Ops |
| **In Review** | Code review in progress | Reviewer |
| **Done** | Completed and merged | - |
| **Canceled** | Will not be implemented | - |
| **Duplicate** | Duplicate of another issue | - |

### SubAgent-Specific Transitions

#### Planner → Coder
```
Planner creates issue with "SubAgent:Planner" label
  ↓
Planner completes planning
  ↓
Planner updates status: Todo → Done
  ↓
Planner creates implementation issue with "SubAgent:Coder" label
  ↓
Coder picks up: Backlog → In Progress
```

#### Coder → Reviewer
```
Coder completes implementation
  ↓
Coder updates status: In Progress → In Review
  ↓
Coder assigns to Reviewer
  ↓
Reviewer reviews code
  ↓
If approved: In Review → Done
If changes needed: In Review → In Progress (back to Coder)
```

#### Coder → Tester (Parallel)
```
Coder implements feature (In Progress)
  ↓
Tester writes tests in parallel (In Progress)
  ↓
Both complete
  ↓
Reviewer reviews both → Done
```

---

## Task Assignment Process

### 1. Task Creation (Planner)

```bash
# Planner creates issue via Linear UI or MCP
mcp__linear__create_issue:
  team: "DesignThru AI"
  project: "JetVision Assistant v1"
  title: "SubAgent:Planner — [Description]"
  labels: ["SubAgent:Planner", "Priority:High", "Phase:Foundation"]
  state: "todo"
```

### 2. Planning Execution (Planner)

Planner transitions issue to `In Progress` and:
- Breaks down task into subtasks
- Identifies dependencies
- Estimates effort
- Creates implementation issues for Coder

### 3. Implementation Assignment (Coder)

```bash
# Coder picks up task
mcp__linear__update_issue:
  id: "DES-78"
  state: "started"  # Backlog → In Progress
```

### 4. Review Assignment (Reviewer)

```bash
# Coder completes and assigns to reviewer
mcp__linear__update_issue:
  id: "DES-78"
  state: "started"  # In Progress → In Review
  # Reviewer notified automatically
```

---

## Handoff Protocols

### Explicit Handoffs

All handoffs between SubAgents must be **explicit** and tracked in Linear:

1. **Update issue status** to reflect handoff
2. **Add comment** explaining what was completed and what's next
3. **Assign to next SubAgent** if applicable
4. **Update labels** if SubAgent responsibility changes

### Handoff Checklist

When handing off an issue:

- [ ] All acceptance criteria met
- [ ] Status updated in Linear
- [ ] Comment added with handoff notes
- [ ] Next SubAgent assigned (if applicable)
- [ ] Blockers documented (if any)
- [ ] Local task file updated (if applicable)

### Example Handoff Comment

```markdown
## Handoff to SubAgent:Reviewer

### Completed
- ✅ Implemented Clerk authentication
- ✅ Created sign-in/sign-up pages
- ✅ Set up Clerk webhook
- ✅ All tests passing (85% coverage)

### PR
https://github.com/user/repo/pull/123

### Review Focus
- Clerk middleware implementation
- RLS policy integration
- Test coverage for edge cases

### Blockers
None

@reviewer please review when available
```

---

## Dependency Management

### Blocking Dependencies

Use Linear's built-in "Blocked by" relationship:

```bash
# Mark DES-78 as blocked by DES-73
mcp__linear__update_issue:
  id: "DES-78"
  # Use Linear UI to add "Blocked by DES-73"
```

### Dependency Notation in Issue Description

Always document dependencies in issue description:

```markdown
## 🔗 Dependencies

### Blocked by
- **DES-73**: TypeScript fixes must complete first
- **DES-77**: Environment setup required

### Blocks
- **DES-79**: Database schema needs authenticated user IDs
- **All Week 2 tasks**: Auth required for API routes
```

### Dependency Graph Example

```
DES-73 (TASK-000: TypeScript fixes) [CRITICAL]
  ├─> DES-76 (Testing infrastructure)
  ├─> DES-78 (Clerk auth)
  └─> All other development tasks

DES-77 (Environment setup) [CRITICAL]
  ├─> DES-78 (Clerk auth)
  ├─> Week 2 MCP servers
  └─> All agent implementations

DES-78 (Clerk auth)
  └─> DES-79 (Database schema)
      └─> All API routes
          └─> All agent implementations
```

---

## Sync with Local Tasks

### Bidirectional Sync Strategy

**Linear → Local**:
- Linear issues are the source of truth
- Local task files are detailed implementation guides
- Update local files when Linear issues change

**Local → Linear**:
- Create Linear issues from local task files
- Update Linear issue descriptions with task file details
- Keep Linear status current with local progress

### Sync Mapping

| Local Task File | Linear Issue | Sync Direction |
|----------------|--------------|----------------|
| `tasks/active/TASK-000-*.md` | DES-73 | Bidirectional |
| `tasks/backlog/TASK-001-*.md` | DES-78 | Linear → Local |
| `tasks/backlog/TASK-002-*.md` | DES-79 | Linear → Local |
| `tasks/backlog/TASK-003-*.md` | DES-77 | Linear → Local |

### Sync Process

1. **Create Linear issue** from task file
2. **Link task file** in Linear issue description
3. **Update Linear status** as you work
4. **Update task file** completion summary when done
5. **Move task file** to `tasks/completed/` when Linear issue is `Done`

### Automation Opportunities

Future enhancements:
- GitHub Action to sync Linear issues with task files
- Webhook to update local files on Linear changes
- CLI tool to create Linear issues from task templates

---

## Best Practices

### For All SubAgents

1. **Check Linear daily** for assigned tasks
2. **Update status promptly** when starting/completing work
3. **Add meaningful comments** for context
4. **Document blockers immediately** - don't wait
5. **Respect handoff protocols** - explicit is better than implicit
6. **Keep descriptions updated** - Linear is the source of truth

### For Planner

1. **Break tasks into 4-8 hour chunks** - no larger
2. **Map all dependencies explicitly** in issue descriptions
3. **Estimate conservatively** - add buffer for unknowns
4. **Create issues in advance** - plan one week ahead
5. **Review dependency graph** before each sprint

### For Coder

1. **Move to "In Progress" when starting** - visibility is key
2. **Update regularly** - add comments on progress
3. **Link PRs in comments** as soon as created
4. **Follow task file instructions** for implementation
5. **Mark "In Review" when PR ready** - clear handoff

### For Reviewer

1. **Review within 24 hours** of assignment
2. **Provide actionable feedback** - be specific
3. **Use PR template checklist** for consistency
4. **Approve or request changes** - don't leave hanging
5. **Move to "Done" after merge** - close the loop

### For Tester

1. **Write tests in parallel** with Coder when possible
2. **Track coverage metrics** in issue comments
3. **Create bug issues** with reproduction steps
4. **Link test runs** in comments for visibility
5. **Verify fixes** before closing bug issues

### For Ops

1. **Document all config changes** in issue comments
2. **Verify deployments** before marking done
3. **Monitor after deployment** - watch for issues
4. **Create runbooks** for common tasks
5. **Update environment docs** as you configure

---

## Quick Reference

### Linear MCP Commands

```typescript
// List all JetVision issues
mcp__linear__list_issues({
  project: "JetVision Assistant v1",
  team: "DesignThru AI"
})

// Get issue details
mcp__linear__get_issue({ id: "DES-73" })

// Update issue status
mcp__linear__update_issue({
  id: "DES-73",
  state: "started" // or "completed"
})

// Create new issue
mcp__linear__create_issue({
  team: "DesignThru AI",
  project: "JetVision Assistant v1",
  title: "SubAgent:Coder — Task Description",
  labels: ["SubAgent:Coder", "Priority:High"],
  state: "backlog"
})

// Add comment
mcp__linear__create_comment({
  issueId: "DES-73",
  body: "Handoff to SubAgent:Reviewer..."
})
```

### Status Quick Commands

```bash
# Start work
Status: Todo → In Progress

# Submit for review
Status: In Progress → In Review

# Approve and complete
Status: In Review → Done

# Request changes
Status: In Review → In Progress

# Block task
Add "Blocked by" relationship in Linear UI
```

---

## Project Metrics

Track these metrics weekly:

- **Velocity**: Issues completed per week
- **Cycle Time**: Average time from Todo → Done
- **Blocked Time**: Average time issues spend blocked
- **Handoff Time**: Time from Coder → Reviewer → Done
- **Rework Rate**: % of issues returned to In Progress

### Current Project Status

- **Total Issues**: 8 created
- **In Progress**: 1 (DES-73)
- **Backlog**: 5
- **Todo**: 2
- **Completed**: 0

---

## Troubleshooting

### Issue: Task stuck in "In Progress"

**Solution**:
1. Add comment with current blocker
2. If blocked by another task, add "Blocked by" relationship
3. If truly stuck, request help in comment
4. Consider breaking into smaller subtasks

### Issue: Handoff unclear

**Solution**:
1. Add explicit handoff comment
2. Tag next SubAgent in comment
3. Update issue description with handoff checklist
4. Ensure all acceptance criteria are clear

### Issue: Dependency loop detected

**Solution**:
1. Map full dependency graph
2. Identify circular dependency
3. Break one of the dependencies
4. Consider refactoring task breakdown

### Issue: Local task file out of sync

**Solution**:
1. Check Linear issue for latest status
2. Update local file with Linear information
3. If conflict, Linear wins (source of truth)
4. Consider automation for future

---

## Future Enhancements

### Phase 2 (Post-MVP)
- [ ] Automated Linear ↔ GitHub sync
- [ ] Slack notifications for handoffs
- [ ] Dashboard for SubAgent metrics
- [ ] Automated dependency validation
- [ ] CI/CD integration with Linear status

### Phase 3 (Advanced)
- [ ] AI-powered task estimation
- [ ] Predictive blocker detection
- [ ] Automated sprint planning
- [ ] Advanced analytics and reporting

---

**Document Owner**: Development Team
**Review Frequency**: Weekly during project
**Last Updated**: October 21, 2025
**Next Review**: October 28, 2025

**Questions?** Check Linear issues or create a new issue with label `SubAgent:Planner`
