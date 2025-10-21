# Linear ↔ Local Task Synchronization Guide
# JetVision AI Assistant Project

**Version**: 1.0
**Created**: October 21, 2025
**Purpose**: Maintain synchronization between Linear issues and local task files

---

## Table of Contents

1. [Overview](#overview)
2. [Sync Philosophy](#sync-philosophy)
3. [Directory Structure](#directory-structure)
4. [Task Lifecycle](#task-lifecycle)
5. [Sync Procedures](#sync-procedures)
6. [Automation Scripts](#automation-scripts)
7. [Conflict Resolution](#conflict-resolution)
8. [Best Practices](#best-practices)

---

## Overview

The JetVision project maintains **dual task management systems**:

1. **Linear** - Project management, status tracking, SubAgent coordination
2. **Local Task Files** - Detailed implementation guides, TDD workflow, Git integration

**Linear is the single source of truth** for task status and project coordination.
**Local files provide implementation details** that are too granular for Linear.

### Why Both Systems?

| Aspect | Linear | Local Task Files |
|--------|--------|------------------|
| **Purpose** | Project coordination | Implementation guide |
| **Audience** | All SubAgents | Developers (Coder) |
| **Granularity** | High-level | Step-by-step |
| **Status Tracking** | Real-time | Updated on completion |
| **Collaboration** | Multi-agent | Individual developer |
| **Integration** | Team coordination | Git workflow, TDD |

---

## Sync Philosophy

### Source of Truth Rules

1. **Task Status** → Linear is authoritative
2. **Task Priority** → Linear is authoritative
3. **Task Assignment** → Linear is authoritative
4. **Implementation Details** → Local files are authoritative
5. **TDD Workflow** → Local files are authoritative
6. **Completion Summary** → Local files are authoritative

### Sync Flow

```
┌────────────────┐         ┌─────────────────┐
│     LINEAR     │ ◄─────► │  LOCAL TASKS    │
│ (Source: Status)         │ (Source: Details)│
└────────────────┘         └─────────────────┘
        │                           │
        │   Status Changes          │   Implementation
        │   Priority Updates        │   TDD Steps
        │   Assignments             │   Commit Messages
        │   Comments                │   Completion Data
        │                           │
        └───────────┬───────────────┘
                    │
              Bidirectional
                 Sync
```

---

## Directory Structure

### Local Task Files

```
tasks/
├── README.md                    # Task management guide
├── TASK_INDEX.md               # Master task list
├── templates/
│   └── TASK_TEMPLATE.md       # Task template
├── active/                     # Currently being worked on
│   └── TASK-000-fix-typescript-vitest-blockers.md
├── backlog/                    # Planned but not started
│   ├── TASK-001-clerk-authentication-integration.md
│   ├── TASK-002-supabase-database-schema.md
│   └── TASK-003-environment-configuration.md
└── completed/                  # Finished tasks (archive)
    └── (completed tasks moved here)
```

### Linear Project Structure

```
Linear Workspace: DesignThru AI
├── Project: JetVision Assistant v1
    ├── DES-73: SubAgent:Coder — Fix TypeScript... (TASK-000)
    ├── DES-74: SubAgent:Planner — Week 1 Planning
    ├── DES-75: SubAgent:Reviewer — Code Review Standards
    ├── DES-76: SubAgent:Tester — Testing Infrastructure
    ├── DES-77: SubAgent:Ops — Environment Setup (TASK-003)
    ├── DES-78: SubAgent:Coder — Clerk Auth (TASK-001)
    ├── DES-79: SubAgent:Coder — Database Schema (TASK-002)
    └── DES-80: SubAgent:Planner — Week 2-3 Planning
```

---

## Task Lifecycle

### Stage 1: Planning (Backlog)

```bash
# 1. Planner creates Linear issue
Linear Issue: DES-78 (Backlog)
Title: "SubAgent:Coder — Clerk Authentication (TASK-001)"

# 2. Local task file exists in backlog
File: tasks/backlog/TASK-001-clerk-authentication-integration.md
Status: 🔵 Backlog

# Sync: Linear → Local
- Linear status: Backlog
- Local file: In backlog/ directory
- Status emoji: 🔵 Backlog
```

### Stage 2: Ready to Start (Todo → Active)

```bash
# 1. Move Linear issue to Todo
Linear: DES-78 (Todo)

# 2. Move local file to active/
mv tasks/backlog/TASK-001-*.md tasks/active/

# 3. Update status in local file
Status: 🟡 Active

# Sync Actions:
- Linear status: Todo
- Local file: In active/ directory
- Status emoji: 🟡 Active
- Ready for Coder to pick up
```

### Stage 3: In Progress (Development)

```bash
# 1. Coder starts work in Linear
Linear: DES-78 (In Progress)
Assigned to: Kingler Bercy

# 2. Coder follows local task file
File: tasks/active/TASK-001-*.md
Following: TDD steps, implementation guide

# 3. Coder updates Linear with progress
Linear comments:
- "Started Red phase - writing tests"
- "Green phase - tests passing"
- "Blue phase - refactoring complete"

# Sync Actions:
- Update Linear status: In Progress
- Follow local file for implementation
- Add comments in Linear for progress
- Update local file Notes section
```

### Stage 4: Code Review (In Review)

```bash
# 1. Coder completes and creates PR
Git: PR created with reference to TASK-001

# 2. Update Linear status
Linear: DES-78 (In Review)
Comment: "PR ready for review: [link]"

# 3. Local file still in active/
File: tasks/active/TASK-001-*.md
Status: 🟡 Active (until merged)

# Sync Actions:
- Linear status: In Review
- Linear comment: PR link
- Local file: Still in active/
- Waiting for Reviewer
```

### Stage 5: Completion (Done)

```bash
# 1. PR approved and merged
Git: PR merged to main

# 2. Update Linear
Linear: DES-78 (Done)
Comment: "Completed and merged"

# 3. Move local file to completed/
mv tasks/active/TASK-001-*.md tasks/completed/

# 4. Fill completion summary in local file
Status: 🟢 Completed
Completion summary filled out

# Sync Actions:
- Linear status: Done
- Local file: Moved to completed/
- Status emoji: 🟢 Completed
- Completion data recorded
```

---

## Sync Procedures

### Procedure 1: Create Linear Issue from Local Task

**When**: New task file created locally

```bash
# 1. Read local task file
cat tasks/backlog/TASK-001-clerk-authentication.md

# 2. Extract key information
- Title: From task overview
- Description: From requirements & implementation steps
- Priority: From task metadata
- Estimated Time: From task metadata
- Due Date: From timeline

# 3. Create Linear issue via MCP
mcp__linear__create_issue({
  team: "DesignThru AI",
  project: "JetVision Assistant v1",
  title: "SubAgent:Coder — Clerk Authentication Integration (TASK-001)",
  description: "# [Extracted from local file]...",
  priority: 1,  # HIGH/CRITICAL
  labels: ["SubAgent:Coder", "Priority:Critical", "Phase:Foundation"],
  state: "backlog",
  dueDate: "2025-10-24"
})

# 4. Update local file with Linear issue ID
## Linear Issue
- **Linear ID**: DES-78
- **URL**: https://linear.app/designthru-ai/issue/DES-78/...
```

### Procedure 2: Update Local File from Linear Changes

**When**: Linear issue status changes

```bash
# 1. Check Linear issue status
mcp__linear__get_issue({ id: "DES-78" })

# Linear status: "In Progress"

# 2. Update local file header
Status: 🟡 Active  # (was 🔵 Backlog)
Assigned To: Kingler Bercy  # (was Development Team)

# 3. Move file if needed
# If Linear: Todo → In Progress
mv tasks/backlog/TASK-001-*.md tasks/active/

# If Linear: Done
mv tasks/active/TASK-001-*.md tasks/completed/
```

### Procedure 3: Update Linear from Local Progress

**When**: Implementation milestones reached

```bash
# 1. Complete Red phase (tests written)
git commit -m "test(auth): add Clerk authentication tests (Red phase)"

# 2. Add Linear comment
mcp__linear__create_comment({
  issueId: "DES-78",
  body: "✅ Red phase complete - Tests written and failing as expected"
})

# 3. Complete Green phase (tests passing)
git commit -m "feat(auth): implement Clerk authentication (Green phase)"

# 4. Add Linear comment
mcp__linear__create_comment({
  issueId: "DES-78",
  body: "✅ Green phase complete - All tests passing"
})

# 5. Complete Blue phase (refactored)
git commit -m "refactor(auth): improve code quality (Blue phase)"

# 6. Update Linear to In Review
mcp__linear__update_issue({
  id: "DES-78",
  state: "started"  # In Review
})

# 7. Add PR link
mcp__linear__create_comment({
  issueId: "DES-78",
  body: "✅ PR created: https://github.com/user/repo/pull/123"
})
```

### Procedure 4: Sync Task Completion

**When**: Task fully completed and merged

```bash
# 1. PR merged
git checkout main
git pull origin main

# 2. Update Linear to Done
mcp__linear__update_issue({
  id: "DES-78",
  state: "completed"
})

# 3. Move local file
mv tasks/active/TASK-001-*.md tasks/completed/

# 4. Fill completion summary
vim tasks/completed/TASK-001-*.md

## Completion Summary

**Completed On**: October 24, 2025
**Actual Time**: 5 hours
**Variance**: +1 hour (estimated 4 hours)

### What Worked Well
- TDD approach caught auth edge cases early
- Clerk webhook integration smooth
- Tests comprehensive (85% coverage)

### Challenges Faced
- Supabase user sync timing issues
- Had to add retry logic for webhook

### Improvements for Next Time
- Allocate more time for webhook debugging
- Create reusable auth test utilities

### Metrics
Test Suites: 3 passed, 3 total
Tests: 24 passed, 24 total
Coverage: 85% statements, 82% branches

# 5. Update TASK_INDEX.md
## Week 1 Tasks
- ✅ TASK-001: Clerk Authentication (Completed Oct 24)
```

---

## Automation Scripts

### Script 1: Sync Status Check

```bash
#!/bin/bash
# File: scripts/sync-check.sh
# Purpose: Check sync status between Linear and local files

echo "Checking Linear ↔ Local Task Sync..."

# Get all Linear issues
linear_issues=$(linear-cli issue list --project "JetVision Assistant v1")

# Get all local task files
local_tasks=$(find tasks -name "TASK-*.md")

# Compare and report
echo "Linear Issues: $(echo "$linear_issues" | wc -l)"
echo "Local Tasks: $(echo "$local_tasks" | wc -l)"

# Check for mismatches
# ... (implementation)
```

### Script 2: Create Linear Issue from Task File

```bash
#!/bin/bash
# File: scripts/task-to-linear.sh
# Purpose: Create Linear issue from local task file

TASK_FILE=$1

if [[ ! -f "$TASK_FILE" ]]; then
  echo "Error: Task file not found: $TASK_FILE"
  exit 1
fi

# Extract metadata
TITLE=$(grep "^# " "$TASK_FILE" | head -1 | sed 's/# //')
PRIORITY=$(grep "**Priority**:" "$TASK_FILE" | cut -d: -f2 | tr -d ' ')

# Create Linear issue via CLI
linear-cli issue create \
  --project "JetVision Assistant v1" \
  --title "$TITLE" \
  --priority "$PRIORITY" \
  # ... (additional fields)

echo "Linear issue created for $TASK_FILE"
```

### Script 3: Sync Local File from Linear

```bash
#!/bin/bash
# File: scripts/linear-to-task.sh
# Purpose: Update local task file from Linear issue

LINEAR_ID=$1

if [[ -z "$LINEAR_ID" ]]; then
  echo "Usage: $0 <LINEAR_ID>"
  exit 1
fi

# Get Linear issue details
issue_data=$(linear-cli issue view "$LINEAR_ID" --json)

# Extract status
status=$(echo "$issue_data" | jq -r '.status')

# Find corresponding local file
task_file=$(grep -l "$LINEAR_ID" tasks/**/*.md)

if [[ -z "$task_file" ]]; then
  echo "Error: No local file found for $LINEAR_ID"
  exit 1
fi

# Update local file header
# ... (implementation)

echo "Updated $task_file from Linear issue $LINEAR_ID"
```

---

## Conflict Resolution

### Conflict 1: Linear and Local Status Mismatch

**Scenario**: Linear shows "In Progress" but local file is in `backlog/`

**Resolution**:
1. **Linear wins** - it's the source of truth for status
2. Move local file to `active/`
3. Update file header to match Linear status
4. Investigate why mismatch occurred

### Conflict 2: Task File Missing for Linear Issue

**Scenario**: Linear issue exists (DES-78) but no local file

**Resolution**:
1. Check if task requires local file (implementation tasks do, planning tasks may not)
2. If needed, create local file from Linear issue description
3. Use task template: `cp tasks/templates/TASK_TEMPLATE.md tasks/active/TASK-XXX.md`
4. Fill in details from Linear issue

### Conflict 3: Linear Issue Missing for Local File

**Scenario**: Local file exists but no corresponding Linear issue

**Resolution**:
1. Create Linear issue from local file (use Procedure 1)
2. Update local file with Linear issue ID
3. Ensure future tasks are created in Linear first

### Conflict 4: Duplicate Information

**Scenario**: Implementation details duplicated in both systems

**Resolution**:
1. **Keep detailed steps in local file only**
2. **Keep summary in Linear issue**
3. Link Linear issue to local file path
4. Example:
   ```markdown
   # Linear Issue Description
   See detailed implementation guide:
   `/tasks/active/TASK-001-clerk-authentication.md`
   ```

---

## Best Practices

### For Task Creation

1. **Always create in Linear first** for visibility
2. **Then create detailed local file** from template
3. **Link the two** in both directions:
   - Linear description: Link to local file path
   - Local file: Link to Linear issue URL

### For Status Updates

1. **Update Linear immediately** when status changes
2. **Update local file header** to match
3. **Move local files** when transitioning stages:
   - Backlog → Active: `mv tasks/backlog/*.md tasks/active/`
   - Active → Completed: `mv tasks/active/*.md tasks/completed/`

### For Progress Tracking

1. **Use Linear comments** for daily progress
2. **Use local file Notes section** for implementation discoveries
3. **Link commits** in Linear comments for traceability

### For Completion

1. **Mark Linear issue as Done** first
2. **Move local file to completed/** immediately after
3. **Fill completion summary** in local file
4. **Update TASK_INDEX.md** with completion date

### For Handoffs

1. **Update Linear status** to reflect handoff (e.g., In Review)
2. **Add Linear comment** explaining handoff
3. **Keep local file in active/** until fully merged
4. **SubAgent:Reviewer** reviews both PR and Linear issue

---

## Maintenance

### Weekly Sync Check

Every Monday:

```bash
# 1. List all Linear issues in progress
linear-cli issue list --status "In Progress" --project "JetVision Assistant v1"

# 2. List all local files in active/
ls -la tasks/active/

# 3. Verify they match
# Each In Progress Linear issue should have a file in active/

# 4. Fix any mismatches
# - Missing local file → Create from Linear
# - Missing Linear issue → Create from local file
# - Status mismatch → Update local file (Linear wins)
```

### Monthly Archive

End of each month:

```bash
# 1. Review completed/ directory
# 2. Move completed tasks older than 30 days to archive/
mkdir -p tasks/archive/$(date +%Y-%m)
mv tasks/completed/* tasks/archive/$(date +%Y-%m)/

# 3. Update Linear project
# Mark old completed issues as archived
```

---

## Quick Reference

### Task File → Linear Issue

```bash
# Create Linear issue from task file
# 1. Extract title, description, priority from file
# 2. Run:
mcp__linear__create_issue({
  team: "DesignThru AI",
  project: "JetVision Assistant v1",
  title: "[From task file]",
  description: "[From task file]",
  labels: ["SubAgent:Coder", "Phase:Foundation"],
  state: "backlog"
})
# 3. Note Linear ID in task file
```

### Linear Issue → Task File

```bash
# Create task file from Linear issue
# 1. Get Linear issue:
mcp__linear__get_issue({ id: "DES-78" })
# 2. Copy template:
cp tasks/templates/TASK_TEMPLATE.md tasks/active/TASK-XXX.md
# 3. Fill in from Linear issue
```

### Status Sync

```bash
# Linear status changed → Update local file
# 1. Get new status from Linear
# 2. Update file header
# 3. Move file if needed:
#    - Backlog → backlog/
#    - Todo/In Progress → active/
#    - Done → completed/
```

### File Movement Shortcuts

```bash
# Start work (Backlog → Active)
mv tasks/backlog/TASK-XXX-*.md tasks/active/

# Complete work (Active → Completed)
mv tasks/active/TASK-XXX-*.md tasks/completed/

# Cancel task (Any → Backlog)
mv tasks/*/TASK-XXX-*.md tasks/backlog/
```

---

## Troubleshooting

### Issue: Can't find Linear issue for task file

```bash
# Search Linear by task number
mcp__linear__list_issues({
  query: "TASK-001",
  team: "DesignThru AI"
})

# If not found, create it
# Use Procedure 1: Create Linear Issue from Local Task
```

### Issue: Can't find task file for Linear issue

```bash
# Search local files by Linear ID
grep -r "DES-78" tasks/

# If not found, check if planning task (may not need file)
# If implementation task, create file from template
```

### Issue: Status out of sync

```bash
# Always trust Linear
# 1. Get Linear status
# 2. Update local file to match
# 3. Move file if needed
```

---

## Future Automation

### Phase 2: Automated Sync Tool

```bash
# Planned CLI tool
jetvision-sync --check        # Check sync status
jetvision-sync --sync         # Auto-sync bidirectional
jetvision-sync --create-issue TASK-001  # Create Linear from file
jetvision-sync --create-file DES-78     # Create file from Linear
```

### Phase 3: GitHub Actions Integration

```yaml
# .github/workflows/linear-sync.yml
name: Sync Linear Issues
on:
  push:
    paths:
      - 'tasks/**/*.md'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Sync to Linear
        run: ./scripts/sync-to-linear.sh
```

---

**Document Owner**: Development Team
**Review Frequency**: Weekly
**Last Updated**: October 21, 2025
**Next Review**: October 28, 2025

**Questions?** Create Linear issue with label `SubAgent:Planner`
