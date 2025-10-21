# Task Management and Execution System
# JetVision AI Assistant

**Version**: 1.0
**Last Updated**: October 20, 2025

---

## Overview

This is a **semi-automated task execution system** designed to help developers work efficiently with Claude Code agents while maintaining human oversight and control.

### What It Does

- ✅ Discovers and manages tasks from the `tasks/` directory
- ✅ Creates execution plans based on task requirements
- ✅ Generates optimized prompts for Claude Code agents
- ✅ Guides developers through TDD workflow (Red-Green-Blue)
- ✅ Tracks task status and dependencies
- ✅ Provides intelligent agent recommendations
- ✅ Maintains Git workflow best practices

### What It Doesn't Do

- ❌ Automatically execute code without human approval
- ❌ Make commits or push code autonomously
- ❌ Spawn independent Claude Code sessions
- ❌ Deploy changes to production automatically

**Philosophy**: This system is a **development assistant**, not an autonomous agent. Humans remain in control of all critical decisions.

---

## Components

### 1. Task Orchestrator (`task-orchestrator.ts`)

Core system that manages tasks and their lifecycle.

**Key Features**:
- Task discovery from `tasks/` directory
- Metadata extraction from task markdown files
- Dependency and blocker tracking
- Status management
- Execution plan generation

**Example Usage**:
```typescript
import { createTaskOrchestrator } from './task-orchestrator'

const orchestrator = createTaskOrchestrator()

// Get all tasks
const tasks = await orchestrator.discoverTasks()

// Get next recommended task
const nextTask = await orchestrator.getNextTask()

// Create execution plan
const plan = await orchestrator.createExecutionPlan(task)

// Update task status
await orchestrator.updateTaskStatus(task, TaskStatus.COMPLETED)
```

### 2. Task CLI (`task-cli.ts`)

Command-line interface for task management.

**Available Commands**:
```bash
# List all tasks
npm run task:list

# Show next recommended task
npm run task:next

# Show detailed task status
npm run task:status TASK-001

# Start working on a task
npm run task:start TASK-001

# Generate status report
npm run task:report
```

### 3. Agent Delegator (`agent-delegator.ts`)

Generates optimized prompts for Claude Code agents.

**Key Features**:
- Prompt generation for TDD phases (Red, Green, Blue)
- Agent type recommendation based on task content
- Security review prompts
- Performance optimization prompts
- Code review prompts

**Example Usage**:
```typescript
import { AgentDelegator, AgentType } from './agent-delegator'

// Generate prompt for TDD Red phase
const prompt = await AgentDelegator.generateTaskPrompt(
  task,
  AgentType.BACKEND,
  'red'
)

// Recommend agent for a task
const agent = AgentDelegator.recommendAgent(task)

// Generate security review prompt
const securityPrompt = AgentDelegator.generateSecurityReviewPrompt(task)
```

### 4. Guided Executor (`guided-executor.ts`)

Interactive guide that walks through task execution step-by-step.

**Features**:
- Interactive terminal prompts
- Step-by-step TDD workflow
- Automatic prompt generation
- Git workflow guidance
- Quality check reminders

**Usage**:
```bash
npm run task:guide TASK-001
```

---

## Quick Start

### Step 1: View Available Tasks

```bash
npm run task:list
```

Output:
```
📋 JetVision Task List

🟡 ACTIVE (2)
────────────────────────────────────────────────────────────
  TASK-001: Clerk Authentication
    🔴 HIGH | 4h | Tests: ❌
  TASK-002: Supabase Database Schema
    🔴 HIGH | 3h | Tests: ❌
```

### Step 2: Get Next Recommended Task

```bash
npm run task:next
```

Output:
```
🎯 Next Recommended Task

============================================================
📋 TASK-001: Clerk Authentication
============================================================
Status: active
Priority: HIGH
Estimated: 4 hours

📖 To read the full task file:
   cat tasks/active/TASK-001-clerk-authentication.md

🚀 To start working on this task:
   npm run task:start TASK-001
```

### Step 3: Start Guided Execution

```bash
npm run task:guide TASK-001
```

This will walk you through:
1. Prerequisites check
2. Feature branch creation
3. TDD Red Phase (write failing tests)
4. TDD Green Phase (implement feature)
5. TDD Blue Phase (refactor)
6. Quality checks
7. Pull request creation

---

## Workflows

### Workflow 1: Manual Task Execution with Prompts

For developers who prefer more control:

```bash
# 1. View next task
npm run task:next

# 2. Create feature branch
git checkout -b feature/TASK-001-clerk-authentication

# 3. Read task file
cat tasks/active/TASK-001-clerk-authentication.md

# 4. Generate prompts using CLI or programmatically
npm run task:status TASK-001

# 5. Copy prompts to Claude Code as needed

# 6. Follow TDD workflow manually

# 7. Create PR when done
```

### Workflow 2: Guided Interactive Execution

For developers who want step-by-step guidance:

```bash
# Run guided executor
npm run task:guide TASK-001

# Follow interactive prompts:
# - Creates branch
# - Generates agent prompts
# - Walks through TDD phases
# - Reminds about quality checks
# - Guides PR creation
```

### Workflow 3: Programmatic Integration

For custom automation scripts:

```typescript
import { createTaskOrchestrator } from './lib/task-runner/task-orchestrator'
import { AgentDelegator, AgentType } from './lib/task-runner/agent-delegator'

async function customWorkflow() {
  const orchestrator = createTaskOrchestrator()

  // Get next high-priority task
  const tasks = await orchestrator.getReadyTasks()
  const highPriority = tasks.filter(t => t.priority === 'HIGH')[0]

  if (highPriority) {
    // Generate prompts
    const redPrompt = await AgentDelegator.generateTaskPrompt(
      highPriority,
      AgentType.QA,
      'red'
    )

    console.log('Use this prompt with qa-engineer-seraph:')
    console.log(redPrompt)

    // Create execution plan
    const plan = await orchestrator.createExecutionPlan(highPriority)
    console.log(`Task has ${plan.steps.length} steps`)
  }
}
```

---

## Agent Recommendation System

The system automatically recommends agents based on task content:

### Agent Types

| Agent | Use When Task Involves |
|-------|----------------------|
| `backend-developer-tank` | APIs, databases, server logic |
| `frontend-developer-mouse` | UI components, React, styling |
| `qa-engineer-seraph` | Testing (always recommended) |
| `security-engineer` | Authentication, encryption, security |
| `system-architect` | Architecture, design patterns |
| `devops-engineer-link` | Deployment, CI/CD, infrastructure |
| `integration-specialist` | External APIs, webhooks, MCP |
| `tech-researcher-keymaker` | Technology evaluation, POCs |
| `ux-designer-trinity` | User experience, accessibility |

### Automatic Recommendations

```bash
npm run task:status TASK-001
```

Output:
```
💡 Recommended agents for this task:
   - backend-developer-tank
   - security-engineer
   - qa-engineer-seraph
```

---

## Prompt Templates

### TDD Red Phase (Write Tests)

```bash
I need help with TASK-001: Clerk Authentication

## Current Phase: RED
Write comprehensive tests that currently fail. Follow the TDD approach.

## Your Role as qa-engineer-seraph
Write unit, integration, and E2E tests for the authentication feature.

## Requirements
1. Tests should fail initially
2. Cover all acceptance criteria
3. Include edge cases
4. Target >75% coverage
```

### TDD Green Phase (Implement)

```bash
I need help with TASK-001: Clerk Authentication

## Current Phase: GREEN
Write minimal code to make all tests pass.

## Your Role as backend-developer-tank
Implement Clerk authentication integration.

## Requirements
1. All tests must pass
2. Follow implementation steps in task file
3. Use TypeScript strict mode
4. Follow coding guidelines
```

### TDD Blue Phase (Refactor)

```bash
I need help with TASK-001: Clerk Authentication

## Current Phase: BLUE
Improve code quality while keeping tests passing.

## Your Role as backend-developer-tank
Refactor authentication code for better quality.

## Requirements
1. Tests must still pass
2. Extract reusable functions
3. Add JSDoc comments
4. Remove code duplication
```

---

## Task Status Tracking

### Status Flow

```
backlog → active → in_progress → completed
                      ↓
                   blocked
```

### Update Task Status

```typescript
// Move task to completed
await orchestrator.updateTaskStatus(task, TaskStatus.COMPLETED)

// This moves the file:
// tasks/active/TASK-001.md → tasks/completed/TASK-001.md
```

### Fill Completion Summary

```typescript
await orchestrator.completeTask(task, {
  testResults: 'Test Suites: 8 passed\nCoverage: 87%',
  performanceMetrics: 'Auth check: 42ms',
  challenges: 'Had to refactor middleware for Clerk 5.x',
  lessonsLearned: 'Clerk requires App Router specific config'
})
```

---

## Integration with Git Workflow

### Branch Naming

System automatically suggests branch names:

```
feature/TASK-001-clerk-authentication
fix/TASK-042-auth-session-timeout
```

### Commit Message Format

System provides templates:

```bash
# Red Phase
git commit -m "test(auth): add tests for Clerk authentication

Red phase - tests currently failing

Related to: TASK-001"

# Green Phase
git commit -m "feat(auth): implement Clerk authentication

Green phase - tests now passing
Coverage: 87%

Implements: TASK-001"

# Blue Phase
git commit -m "refactor(auth): extract auth utilities

Blue phase - refactoring complete
Tests still passing

Related to: TASK-001"
```

---

## Reports and Analytics

### Generate Status Report

```bash
npm run task:report
```

Output:
```
# Task Status Report

**Total Tasks**: 15

## Status Breakdown
- 🔵 Backlog: 8
- 🟡 Active: 2
- 🟢 Completed: 5
- 🔴 Blocked: 0

## Ready to Start
2 tasks are ready (no blockers, dependencies met)

## Next Recommended Task
**TASK-001**: Clerk Authentication
- Priority: HIGH
- Estimated: 4 hours
- Has tests: ❌
- Has branch: ❌

## Insights

Completed: 5 tasks (18 estimated hours)

🔴 High Priority Ready Tasks: 2
   - TASK-001: Clerk Authentication (4h)
   - TASK-002: Supabase Database Schema (3h)
```

---

## Advanced Usage

### Custom Agent Prompts

```typescript
import { AgentDelegator } from './lib/task-runner/agent-delegator'

// Security review
const securityPrompt = AgentDelegator.generateSecurityReviewPrompt(task)

// Performance optimization
const perfPrompt = AgentDelegator.generatePerformancePrompt(
  task,
  'API response: 2.3s (target: <1s)'
)

// Code review
const reviewPrompt = AgentDelegator.generateReviewPrompt(
  task,
  'https://github.com/org/repo/pull/123'
)
```

### Filtering Tasks

```typescript
const orchestrator = createTaskOrchestrator()

// Get high-priority tasks
const tasks = await orchestrator.discoverTasks()
const highPriority = tasks.filter(t => t.priority === 'HIGH')

// Get tasks without tests
const noTests = tasks.filter(t => !t.metadata.hasTests)

// Get blocked tasks
const blocked = tasks.filter(t => t.blockedBy)
```

### Custom Execution Plans

```typescript
const plan = await orchestrator.createExecutionPlan(task)

console.log(`Total steps: ${plan.steps.length}`)
console.log(`Estimated time: ${plan.steps.reduce((sum, s) => sum + s.estimatedMinutes, 0)} min`)

// Execute specific step
const step = plan.steps[plan.currentStep]
const stepPrompt = await AgentDelegator.generateStepPrompt(task, step, plan)

console.log(stepPrompt)
```

---

## Best Practices

### DO ✅

1. **Use guided executor for first-time tasks**
   - Ensures you don't miss any steps
   - Provides proper prompts

2. **Read full task file before starting**
   - Understand requirements completely
   - Check dependencies and blockers

3. **Follow TDD workflow strictly**
   - Red → Green → Blue
   - Commit after each phase

4. **Let system recommend agents**
   - System analyzes task content
   - Suggests best-fit agents

5. **Generate status reports regularly**
   - Track progress
   - Identify blockers early

### DON'T ❌

1. **Don't skip quality checks**
   - System reminds you for a reason
   - Linting, type-checking, tests must pass

2. **Don't ignore dependencies**
   - System won't let blocked tasks start
   - Complete dependencies first

3. **Don't automate without approval**
   - System generates prompts, not executes
   - Human review required

4. **Don't skip test phases**
   - TDD is mandatory
   - Tests must be written first

---

## Troubleshooting

### "No tasks ready to start"

**Cause**: All active tasks are blocked or have unmet dependencies

**Solution**:
```bash
# Check what's blocking
npm run task:list active

# Review dependencies
npm run task:status TASK-XXX

# Complete dependencies or resolve blockers
```

### "Task not found"

**Cause**: Task file not in expected directory

**Solution**:
```bash
# List all tasks
npm run task:list

# Check if task file exists
ls tasks/{active,backlog,completed}/*.md
```

### "Branch already exists"

**Cause**: Feature branch wasn't cleaned up

**Solution**:
```bash
# Delete old branch
git branch -D feature/TASK-XXX-name

# Or use different branch name
```

---

## Examples

### Example 1: Starting TASK-001

```bash
# 1. Check task details
npm run task:status TASK-001

# 2. Start guided execution
npm run task:guide TASK-001

# 3. Follow interactive prompts
# 4. Use generated prompts with Claude Code
# 5. Complete TDD workflow
# 6. Create PR
```

### Example 2: Generating Test Prompts

```typescript
import { AgentDelegator } from './lib/task-runner/agent-delegator'

const task = await orchestrator.discoverTasks()
  .then(tasks => tasks.find(t => t.id === 'TASK-001'))

// Unit tests
const unitPrompt = await AgentDelegator.generateTestCreationPrompt(task, 'unit')
console.log('For qa-engineer-seraph:')
console.log(unitPrompt)

// Integration tests
const integrationPrompt = await AgentDelegator.generateTestCreationPrompt(task, 'integration')
console.log(integrationPrompt)
```

### Example 3: Custom Workflow Script

```typescript
// custom-workflow.ts
import { createTaskOrchestrator } from './lib/task-runner/task-orchestrator'
import { AgentDelegator, AgentType } from './lib/task-runner/agent-delegator'

async function dailyTaskCheck() {
  const orchestrator = createTaskOrchestrator()

  // Get ready tasks
  const ready = await orchestrator.getReadyTasks()

  console.log(`\n📋 ${ready.length} tasks ready to start today\n`)

  // Show top 3 by priority
  const top3 = ready
    .sort((a, b) => {
      const priority = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return priority[b.priority] - priority[a.priority]
    })
    .slice(0, 3)

  for (const task of top3) {
    console.log(`${task.id}: ${task.title} (${task.priority})`)
    const agents = AgentDelegator.recommendAgents(task)
    console.log(`  Agents: ${agents.join(', ')}`)
    console.log(`  Time: ${task.estimatedHours}h`)
    console.log('')
  }
}

dailyTaskCheck()
```

---

## API Reference

See TypeScript interfaces in source files for complete API:

- `task-orchestrator.ts` - Core task management
- `agent-delegator.ts` - Prompt generation
- `task-cli.ts` - CLI commands
- `guided-executor.ts` - Interactive guide

---

## Future Enhancements

Planned features:

- [ ] GitHub integration for PR creation
- [ ] Slack/Discord notifications for task status
- [ ] Time tracking and velocity metrics
- [ ] Task templates for common patterns
- [ ] Agent performance analytics
- [ ] Automated dependency resolution
- [ ] Task estimation improvement based on actual times

---

## Support

**Documentation**:
- Task template: `tasks/templates/TASK_TEMPLATE.md`
- Git workflow: `docs/GIT_WORKFLOW.md`
- Coding guidelines: `docs/AGENTS.md`
- Prerequisites: `docs/DEVELOPMENT_PREREQUISITES.md`

**Commands**:
```bash
npm run task:list     # See all tasks
npm run task:next     # Get next task
npm run task:report   # Status report
npm run task:guide    # Interactive guide
```

---

**Document Owner**: Development Team
**Last Updated**: October 20, 2025
**Version**: 1.0
