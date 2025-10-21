# Task Management System
# JetVision AI Assistant

**Version**: 1.0
**Last Updated**: October 20, 2025

---

## Overview

This directory contains the task management system for the JetVision AI Assistant project. Each task is a self-contained document that guides implementation using Test-Driven Development (TDD), proper Git workflow, and code review best practices.

---

## Directory Structure

```
tasks/
├── README.md                    # This file - task management guide
├── templates/
│   └── TASK_TEMPLATE.md        # Standardized task template
├── active/
│   ├── TASK-001-clerk-authentication.md
│   └── TASK-002-supabase-database-schema.md
├── completed/
│   └── (completed tasks moved here)
└── backlog/
    └── (future tasks planned here)
```

### Directory Descriptions

**`templates/`**: Contains the standardized task template that all new tasks should follow.

**`active/`**: Tasks currently being worked on or ready to start. Each task file is a complete guide for implementing a specific feature.

**`completed/`**: Archive of finished tasks. Tasks are moved here after PR is merged and work is verified in production.

**`backlog/`**: Future tasks that are planned but not yet started. Tasks are moved to `active/` when ready to begin work.

---

## Task Lifecycle

```
┌─────────────┐
│   BACKLOG   │  Planning phase - task created but not ready
└──────┬──────┘
       │
       │ Move when ready to start
       ▼
┌─────────────┐
│   ACTIVE    │  Development phase - actively being implemented
└──────┬──────┘
       │
       │ Move when PR merged and deployed
       ▼
┌─────────────┐
│  COMPLETED  │  Archive - task finished and verified
└─────────────┘
```

### Status Indicators

Each task has a status emoji in the header:

- 🔵 **Backlog** - Planned but not started
- 🟡 **Active** - Currently being worked on
- 🟢 **Completed** - Finished and verified
- 🔴 **Blocked** - Waiting on dependencies
- ⚫ **Cancelled** - Will not be implemented

---

## Creating a New Task

### Option 1: Using the Template (Recommended)

```bash
# 1. Copy the template
cp tasks/templates/TASK_TEMPLATE.md tasks/backlog/TASK-XXX-feature-name.md

# 2. Open and fill in all sections
code tasks/backlog/TASK-XXX-feature-name.md

# 3. Update task metadata
# - Status: 🔵 Backlog
# - Priority: HIGH/MEDIUM/LOW
# - Estimated Time: X hours
# - Due Date: YYYY-MM-DD

# 4. Move to active when ready to start
mv tasks/backlog/TASK-XXX-feature-name.md tasks/active/
```

### Option 2: Manual Creation

Create a new file following the naming convention:

```
TASK-XXX-brief-description.md
```

**Naming Rules**:
- Start with `TASK-` prefix
- Use 3-digit zero-padded number (001, 002, 003, etc.)
- Use kebab-case for description
- Maximum 50 characters total

**Examples**:
- ✅ `TASK-001-clerk-authentication.md`
- ✅ `TASK-015-rfp-orchestrator-agent.md`
- ✅ `TASK-042-proposal-ranking-algorithm.md`
- ❌ `task-1-auth.md` (lowercase, single digit)
- ❌ `TASK-001_Clerk_Authentication.md` (underscores, capitals)

### Required Task Sections

Every task must include these 11 sections (see template for details):

1. **Task Overview** - Objective, user story, business value
2. **Requirements & Acceptance Criteria** - What must be done
3. **TDD Approach** - Red-Green-Blue cycle with code examples
4. **Implementation Steps** - Step-by-step guide
5. **Git Workflow** - Branch, commits, PR process
6. **Code Review Checklist** - Quality standards
7. **Testing Requirements** - Test coverage and scenarios
8. **Definition of Done** - When is it truly complete?
9. **Resources & References** - Links and documentation
10. **Notes & Questions** - Open items and decisions
11. **Completion Summary** - Post-implementation report

---

## Working on a Task

### Step 1: Select Task from Active Directory

```bash
# View available tasks
ls -la tasks/active/

# Read the task file
cat tasks/active/TASK-001-clerk-authentication.md
```

### Step 2: Follow the TDD Workflow

The task file includes detailed TDD steps:

#### Red Phase - Write Failing Tests
```bash
# 1. Create test files (unit, integration, e2e)
# 2. Write comprehensive tests that fail
# 3. Commit tests
git commit -m "test(scope): add tests for feature X

Red phase - tests currently failing

Related to: TASK-XXX"
```

#### Green Phase - Make Tests Pass
```bash
# 1. Write minimal code to pass tests
# 2. Verify all tests pass
# 3. Commit implementation
git commit -m "feat(scope): implement feature X

Green phase - tests now passing

Implements: TASK-XXX"
```

#### Blue Phase - Refactor
```bash
# 1. Improve code quality
# 2. Verify tests still pass
# 3. Commit refactoring
git commit -m "refactor(scope): improve code quality

Blue phase - refactoring complete

Related to: TASK-XXX"
```

### Step 3: Create Pull Request

```bash
# Push branch
git push -u origin feature/TASK-XXX-feature-name

# Create PR on GitHub
# - Use PR template (.github/PULL_REQUEST_TEMPLATE.md)
# - Link task file in description
# - Add screenshots if UI changes
# - Paste test coverage report
```

### Step 4: Code Review

- Address all reviewer comments
- Update task file with any changes
- Mark PR conversations as resolved
- Request re-review if needed

### Step 5: Merge and Complete

```bash
# After PR approved and merged
git checkout main
git pull origin main

# Move task to completed
mv tasks/active/TASK-XXX-feature-name.md tasks/completed/

# Fill out completion summary in task file
code tasks/completed/TASK-XXX-feature-name.md
```

---

## Task Prioritization

### Priority Levels

**HIGH** - Critical path items
- Blocks other development work
- Required for MVP launch
- Security or data integrity issues
- Example: Authentication, Database Schema

**MEDIUM** - Important but not blocking
- Enhances core functionality
- Improves user experience
- Performance optimizations
- Example: Proposal ranking algorithm, Email templates

**LOW** - Nice to have
- UI polish
- Additional features
- Documentation improvements
- Example: Dark mode, Export features

### Dependency Management

Some tasks depend on others. Track dependencies in task file:

```markdown
### Dependencies
- **Depends on**: TASK-001 (Clerk auth must be working)
- **Blocks**: TASK-015 (Agents need database schema)
- **Related to**: TASK-005 (User profile management)
```

**Rule**: Complete dependency tasks before starting dependent tasks.

---

## Best Practices

### DO ✅

- **Read the entire task before starting** - Understand requirements fully
- **Follow TDD approach** - Red-Green-Blue cycle is mandatory
- **Write tests first** - Always write failing tests before implementation
- **Commit frequently** - Each phase (Red, Green, Blue) gets its own commit
- **Update task file** - Keep notes section updated with discoveries
- **Link PRs to tasks** - Always reference task number in commits and PR
- **Fill completion summary** - Document what you learned and metrics
- **Ask questions early** - Use Notes & Questions section liberally

### DON'T ❌

- **Skip tests** - TDD is not optional
- **Rush through steps** - Each step has a purpose
- **Ignore code review feedback** - Reviews improve quality
- **Leave tasks incomplete** - Finish what you start
- **Commit directly to main** - Always use feature branches
- **Skip documentation** - Update docs as you go
- **Forget acceptance criteria** - These define "done"

---

## Task Numbering Convention

Tasks are numbered sequentially starting from 001:

```
TASK-001: Foundation tasks (auth, database, core infrastructure)
TASK-002: Core features (agents, workflow)
TASK-050: Enhancements (UI polish, optimizations)
TASK-100: Nice-to-have features
```

### Next Available Task Number

**Current**: TASK-003

**How to find next number**:
```bash
# List all tasks sorted
ls tasks/{active,completed,backlog}/*.md | sort

# Create next task
cp tasks/templates/TASK_TEMPLATE.md tasks/backlog/TASK-003-next-feature.md
```

---

## Task Template Quick Reference

### Minimal Task File

At minimum, every task needs:

1. **Header** with status, priority, time estimate
2. **Objective** - What are we building?
3. **User Story** - Who needs it and why?
4. **Acceptance Criteria** - How do we know it's done?
5. **Implementation Steps** - What to do
6. **Testing Requirements** - How to verify it works

### Full Template

For comprehensive tasks, use all 11 sections from `TASK_TEMPLATE.md`:

```bash
# View full template
cat tasks/templates/TASK_TEMPLATE.md

# Or open in editor
code tasks/templates/TASK_TEMPLATE.md
```

---

## Example Tasks

### Sample Tasks Included

**TASK-001: Clerk Authentication** (`tasks/active/TASK-001-clerk-authentication.md`)
- Demonstrates auth integration task
- Shows TDD approach with actual code examples
- Includes comprehensive testing requirements
- Good example for integration tasks

**TASK-002: Supabase Database Schema** (`tasks/active/TASK-002-supabase-database-schema.md`)
- Demonstrates infrastructure setup task
- Shows database migration approach
- Includes RLS policy testing
- Good example for database tasks

### Study These Examples

New task creators should review these examples to understand:
- How to write clear acceptance criteria
- How to structure TDD phases
- How to document implementation steps
- How to define testing requirements
- How to write commit messages

---

## Integration with Development Workflow

### Git Workflow

Every task follows this Git workflow:

```bash
# 1. Create feature branch
git checkout -b feature/TASK-XXX-feature-name

# 2. Follow TDD cycle with commits
git commit -m "test(scope): Red phase"
git commit -m "feat(scope): Green phase"
git commit -m "refactor(scope): Blue phase"

# 3. Push and create PR
git push -u origin feature/TASK-XXX-feature-name

# 4. After merge, move task to completed
mv tasks/active/TASK-XXX.md tasks/completed/
```

See `docs/GIT_WORKFLOW.md` for full Git guidelines.

### PR Template Integration

The PR template (`.github/PULL_REQUEST_TEMPLATE.md`) includes a section to link the task file:

```markdown
### Related Task/Issue
Closes #TASK-XXX (link to task file or GitHub issue)
```

Always link your task file in the PR description.

### Code Review Integration

The task's "Code Review Checklist" section maps to PR review requirements:

- **Functionality** - Does it meet acceptance criteria?
- **Code Quality** - Follows coding guidelines?
- **Testing** - Tests comprehensive and passing?
- **Security** - No vulnerabilities introduced?
- **Performance** - Meets performance requirements?
- **Documentation** - Docs updated?

---

## Metrics and Reporting

### Task Velocity

Track how long tasks take to measure estimation accuracy:

```markdown
## Completion Summary

**Estimated Time**: 4-6 hours
**Actual Time**: 5.5 hours
**Variance**: -0.5 hours (under estimate)
```

### Coverage Tracking

Each task should report test coverage:

```markdown
**Coverage Results**:
Test Suites: 8 passed, 8 total
Tests:       45 passed, 45 total
Coverage:    87% statements, 82% branches, 91% functions, 86% lines
```

### Quality Metrics

Track quality indicators:
- Tests passing percentage
- Code review rounds needed
- Bugs found in QA
- Time to production

---

## Troubleshooting

### Common Issues

**Issue**: Task too large to complete in one PR
**Solution**: Break into smaller sub-tasks (TASK-XXX-A, TASK-XXX-B)

**Issue**: Blocked by dependency
**Solution**: Update status to 🔴 Blocked, document blocker in Notes section

**Issue**: Requirements changed during development
**Solution**: Update task file, notify reviewer of changes in PR

**Issue**: Tests failing after merge
**Solution**: Create hotfix task, reference original task

### Getting Help

1. **Check documentation**:
   - `docs/AGENTS.md` - Coding guidelines
   - `docs/GIT_WORKFLOW.md` - Git process
   - `docs/DEVELOPMENT_PREREQUISITES.md` - Setup help

2. **Review example tasks** in `tasks/active/`

3. **Ask in PR comments** for task-specific questions

4. **Update task Notes section** with questions for team

---

## Task Lifecycle Examples

### Example 1: Typical Feature Task

```
1. Task created in backlog/TASK-015-rfp-orchestrator.md (🔵)
2. Moved to active/TASK-015-rfp-orchestrator.md (🟡)
3. Developer creates feature branch
4. Follows TDD approach (Red-Green-Blue)
5. Creates PR linking task
6. Code review and approval
7. PR merged to main
8. Task moved to completed/TASK-015-rfp-orchestrator.md (🟢)
9. Completion summary filled out
```

### Example 2: Blocked Task

```
1. Task created: TASK-020-flight-search-integration.md (🟡)
2. Discovers Avinode API not ready (🔴 Blocked)
3. Updates task with blocker:
   "Blocked by: Waiting for Avinode API credentials (5-10 days)"
4. Creates workaround task: TASK-021-mock-flight-search.md
5. Works on TASK-021 instead
6. When blocker resolved, updates TASK-020 back to 🟡
7. Resumes work on TASK-020
```

### Example 3: Cancelled Task

```
1. Task created: TASK-050-advanced-analytics.md (🔵)
2. Product decision to defer feature
3. Status updated to ⚫ Cancelled
4. Notes section updated with reason:
   "Cancelled: Deferred to Phase 3 per product roadmap review"
5. Kept in backlog for future reference
```

---

## Version History

**v1.0** (October 20, 2025)
- Initial task management system
- Created template and example tasks
- Established directory structure
- Integrated with Git workflow and PR process

---

## Quick Start Checklist

New to the task system? Follow these steps:

- [ ] Read this README completely
- [ ] Review `TASK_TEMPLATE.md` in templates/
- [ ] Study example tasks in active/
- [ ] Read `docs/GIT_WORKFLOW.md`
- [ ] Read `docs/AGENTS.md` for coding standards
- [ ] Select your first task from active/
- [ ] Follow the TDD workflow
- [ ] Create PR using template
- [ ] Complete code review
- [ ] Move completed task and fill summary

---

**Questions?**
- Check `docs/` directory for detailed documentation
- Review example tasks for guidance
- Ask in PR comments or team chat

**Document Owner**: Development Team
**Review Frequency**: Monthly or as needed
**Last Review**: October 20, 2025
**Next Review**: November 20, 2025
