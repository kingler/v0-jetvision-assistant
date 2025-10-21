#!/usr/bin/env tsx
/**
 * Generate All Tasks from Implementation Plan
 *
 * Creates complete task files for the entire 6-7 week development plan
 * Based on IMPLEMENTATION_PLAN.md
 */

import fs from 'fs/promises'
import path from 'path'

const PROJECT_ROOT = process.cwd()
const TASKS_DIR = path.join(PROJECT_ROOT, 'tasks')

interface TaskDefinition {
  id: string
  number: number
  title: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  estimatedHours: number
  week: number
  dependencies: string[]
  type: 'backend' | 'frontend' | 'fullstack' | 'infrastructure' | 'testing'
  agents: string[]
  description: string
  acceptanceCriteria: string[]
}

const ALL_TASKS: TaskDefinition[] = [
  // ============================================
  // WEEK 1: Foundation & Authentication
  // ============================================
  {
    id: 'TASK-001',
    number: 1,
    title: 'Clerk Authentication Integration',
    priority: 'HIGH',
    estimatedHours: 4,
    week: 1,
    dependencies: [],
    type: 'fullstack',
    agents: ['backend-developer-tank', 'security-engineer', 'qa-engineer-seraph'],
    description: 'Integrate Clerk authentication with JWT tokens, user session management, and Supabase user sync',
    acceptanceCriteria: [
      'Users can sign up with email/password',
      'Users can log in with Google OAuth',
      'Protected routes redirect unauthenticated users',
      'User profiles sync to Supabase users table',
      'JWT tokens validated on every request',
      'Test coverage >80%',
    ],
  },
  {
    id: 'TASK-002',
    number: 2,
    title: 'Supabase Database Schema Deployment',
    priority: 'HIGH',
    estimatedHours: 3,
    week: 1,
    dependencies: [],
    type: 'backend',
    agents: ['backend-developer-tank', 'system-architect'],
    description: 'Deploy complete database schema with Row Level Security policies for multi-tenant isolation',
    acceptanceCriteria: [
      'All 7 tables created (users, clients, flight_requests, quotes, proposals, communications, workflow_history)',
      'RLS policies prevent cross-tenant data access',
      'Foreign key relationships established',
      'Indexes created for query optimization',
      'Migration and rollback scripts work',
    ],
  },
  {
    id: 'TASK-003',
    number: 3,
    title: 'Redis and BullMQ Task Queue Setup',
    priority: 'HIGH',
    estimatedHours: 2,
    week: 1,
    dependencies: [],
    type: 'infrastructure',
    agents: ['devops-engineer-link', 'backend-developer-tank'],
    description: 'Configure Redis and BullMQ for background job processing and async task execution',
    acceptanceCriteria: [
      'Redis installed and running locally',
      'BullMQ configured with TypeScript',
      'Job queue processes tasks in background',
      'Failed jobs retry with exponential backoff',
      'Job status can be monitored',
    ],
  },
  {
    id: 'TASK-004',
    number: 4,
    title: 'API Route Protection with Clerk Middleware',
    priority: 'HIGH',
    estimatedHours: 3,
    week: 1,
    dependencies: ['TASK-001'],
    type: 'backend',
    agents: ['backend-developer-tank', 'security-engineer'],
    description: 'Protect all API routes with Clerk middleware and implement proper authorization checks',
    acceptanceCriteria: [
      'All /api routes require authentication',
      'Unauthenticated requests return 401',
      'User context available in all API routes',
      'Rate limiting implemented',
      'CORS configured properly',
    ],
  },

  // ============================================
  // WEEK 2: MCP Servers & Core Agents
  // ============================================
  {
    id: 'TASK-005',
    number: 5,
    title: 'Avinode MCP Server Implementation',
    priority: 'HIGH',
    estimatedHours: 6,
    week: 2,
    dependencies: [],
    type: 'backend',
    agents: ['integration-specialist', 'backend-developer-tank'],
    description: 'Build MCP server for Avinode API integration (flight search, RFP distribution, quote retrieval)',
    acceptanceCriteria: [
      'MCP server connects to Avinode API',
      'Search aircraft by route and date',
      'Distribute RFPs to operators',
      'Retrieve quotes from operators',
      'Error handling for API failures',
      'Rate limiting compliance',
    ],
  },
  {
    id: 'TASK-006',
    number: 6,
    title: 'Gmail MCP Server Implementation',
    priority: 'MEDIUM',
    estimatedHours: 4,
    week: 2,
    dependencies: [],
    type: 'backend',
    agents: ['integration-specialist', 'backend-developer-tank'],
    description: 'Build MCP server for Gmail API integration (send emails, track delivery)',
    acceptanceCriteria: [
      'MCP server connects to Gmail API',
      'Send emails with HTML templates',
      'Track email delivery status',
      'Handle OAuth 2.0 authentication',
      'Error handling for API failures',
    ],
  },
  {
    id: 'TASK-007',
    number: 7,
    title: 'Google Sheets MCP Server Implementation',
    priority: 'MEDIUM',
    estimatedHours: 4,
    week: 2,
    dependencies: [],
    type: 'backend',
    agents: ['integration-specialist', 'backend-developer-tank'],
    description: 'Build MCP server for Google Sheets API (client data synchronization)',
    acceptanceCriteria: [
      'MCP server connects to Google Sheets API',
      'Read client data from spreadsheet',
      'Sync client preferences to Supabase',
      'Handle service account authentication',
      'Error handling for API failures',
    ],
  },
  {
    id: 'TASK-008',
    number: 8,
    title: 'RFP Orchestrator Agent Implementation',
    priority: 'HIGH',
    estimatedHours: 8,
    week: 2,
    dependencies: ['TASK-002', 'TASK-003'],
    type: 'backend',
    agents: ['backend-developer-tank', 'system-architect'],
    description: 'Implement RFP Orchestrator agent for request analysis, routing, and workflow coordination',
    acceptanceCriteria: [
      'Validates incoming flight requests',
      'Initializes workflow state machine',
      'Delegates to appropriate agents',
      'Handles state transitions',
      'Logs all decisions to database',
      'Test coverage >85%',
    ],
  },
  {
    id: 'TASK-009',
    number: 9,
    title: 'Client Data Manager Agent Implementation',
    priority: 'HIGH',
    estimatedHours: 6,
    week: 2,
    dependencies: ['TASK-002', 'TASK-007'],
    type: 'backend',
    agents: ['backend-developer-tank'],
    description: 'Implement Client Data Manager agent for profile retrieval and preference management',
    acceptanceCriteria: [
      'Retrieves client data from Supabase',
      'Syncs with Google Sheets via MCP',
      'Learns client preferences over time',
      'Returns structured client profile',
      'Handles missing client data gracefully',
    ],
  },

  // ============================================
  // WEEK 3: Advanced Agents & Workflow
  // ============================================
  {
    id: 'TASK-010',
    number: 10,
    title: 'Flight Search Agent Implementation',
    priority: 'HIGH',
    estimatedHours: 8,
    week: 3,
    dependencies: ['TASK-005', 'TASK-009'],
    type: 'backend',
    agents: ['backend-developer-tank', 'integration-specialist'],
    description: 'Implement Flight Search agent for aircraft search and RFP distribution via Avinode',
    acceptanceCriteria: [
      'Searches Avinode for available aircraft',
      'Distributes RFPs to operators',
      'Tracks RFP delivery status',
      'Stores quotes in database',
      'Handles search timeouts gracefully',
    ],
  },
  {
    id: 'TASK-011',
    number: 11,
    title: 'Proposal Analysis Agent Implementation',
    priority: 'HIGH',
    estimatedHours: 8,
    week: 3,
    dependencies: ['TASK-010'],
    type: 'backend',
    agents: ['backend-developer-tank', 'system-architect'],
    description: 'Implement Proposal Analysis agent for multi-factor quote scoring and ranking',
    acceptanceCriteria: [
      'Analyzes quotes on 6 factors (price, aircraft, availability, operator, route, client match)',
      'Generates weighted scores',
      'Ranks quotes by total score',
      'Provides reasoning for rankings',
      'Stores analysis in proposals table',
    ],
  },
  {
    id: 'TASK-012',
    number: 12,
    title: 'Communication Manager Agent Implementation',
    priority: 'MEDIUM',
    estimatedHours: 6,
    week: 3,
    dependencies: ['TASK-006', 'TASK-011'],
    type: 'backend',
    agents: ['backend-developer-tank'],
    description: 'Implement Communication Manager agent for email generation and delivery',
    acceptanceCriteria: [
      'Generates email from proposal data',
      'Personalizes based on client preferences',
      'Sends via Gmail MCP',
      'Tracks delivery status',
      'Logs all communications',
    ],
  },
  {
    id: 'TASK-013',
    number: 13,
    title: 'Error Monitor Agent Implementation',
    priority: 'MEDIUM',
    estimatedHours: 5,
    week: 3,
    dependencies: ['TASK-008'],
    type: 'backend',
    agents: ['backend-developer-tank', 'devops-engineer-link'],
    description: 'Implement Error Monitor agent for error detection, recovery, and escalation',
    acceptanceCriteria: [
      'Detects errors in workflow',
      'Attempts automatic recovery',
      'Escalates to human if needed',
      'Logs all errors to Sentry',
      'Sends notifications for critical errors',
    ],
  },
  {
    id: 'TASK-014',
    number: 14,
    title: 'Workflow State Machine Implementation',
    priority: 'HIGH',
    estimatedHours: 6,
    week: 3,
    dependencies: ['TASK-008'],
    type: 'backend',
    agents: ['system-architect', 'backend-developer-tank'],
    description: 'Implement workflow state machine with 11 states and transition validation',
    acceptanceCriteria: [
      'State machine enforces valid transitions',
      'All 11 states implemented',
      'State history tracked in database',
      'Invalid transitions throw errors',
      'State can be rolled back',
    ],
  },

  // ============================================
  // WEEK 4: Frontend Integration
  // ============================================
  {
    id: 'TASK-015',
    number: 15,
    title: 'Dashboard Page with Real-time Updates',
    priority: 'HIGH',
    estimatedHours: 8,
    week: 4,
    dependencies: ['TASK-001', 'TASK-002'],
    type: 'frontend',
    agents: ['frontend-developer-mouse', 'ux-designer-trinity'],
    description: 'Build dashboard page showing active requests with Supabase Realtime updates',
    acceptanceCriteria: [
      'Lists all user flight requests',
      'Shows current workflow status',
      'Updates in real-time via Supabase',
      'Responsive design (mobile/tablet/desktop)',
      'Loading and error states',
    ],
  },
  {
    id: 'TASK-016',
    number: 16,
    title: 'RFP Request Creation Form',
    priority: 'HIGH',
    estimatedHours: 6,
    week: 4,
    dependencies: ['TASK-001', 'TASK-015'],
    type: 'frontend',
    agents: ['frontend-developer-mouse', 'ux-designer-trinity'],
    description: 'Build form for creating new flight requests with validation',
    acceptanceCriteria: [
      'Form validates all required fields',
      'Airport autocomplete works',
      'Date picker for departure/return',
      'Client selection dropdown',
      'Form submits to API route',
      'Success/error feedback',
    ],
  },
  {
    id: 'TASK-017',
    number: 17,
    title: 'Quote Comparison View',
    priority: 'MEDIUM',
    estimatedHours: 6,
    week: 4,
    dependencies: ['TASK-011', 'TASK-015'],
    type: 'frontend',
    agents: ['frontend-developer-mouse', 'ux-designer-trinity'],
    description: 'Build UI for comparing quotes side-by-side with scoring visualization',
    acceptanceCriteria: [
      'Displays all quotes for a request',
      'Shows scoring breakdown',
      'Highlights top recommendation',
      'Sortable by different factors',
      'Export to PDF functionality',
    ],
  },
  {
    id: 'TASK-018',
    number: 18,
    title: 'Client Profile Management UI',
    priority: 'MEDIUM',
    estimatedHours: 5,
    week: 4,
    dependencies: ['TASK-009', 'TASK-015'],
    type: 'frontend',
    agents: ['frontend-developer-mouse'],
    description: 'Build UI for viewing and editing client profiles and preferences',
    acceptanceCriteria: [
      'List all clients',
      'View client details',
      'Edit client preferences',
      'Add new clients',
      'Search and filter clients',
    ],
  },
  {
    id: 'TASK-019',
    number: 19,
    title: 'Workflow Visualization Component',
    priority: 'LOW',
    estimatedHours: 4,
    week: 4,
    dependencies: ['TASK-014', 'TASK-015'],
    type: 'frontend',
    agents: ['frontend-developer-mouse'],
    description: 'Build visual component showing workflow progression and current state',
    acceptanceCriteria: [
      'Displays all 11 workflow states',
      'Highlights current state',
      'Shows state history',
      'Animated transitions',
      'Responsive design',
    ],
  },

  // ============================================
  // WEEK 5: Testing & Optimization
  // ============================================
  {
    id: 'TASK-020',
    number: 20,
    title: 'Comprehensive Integration Testing Suite',
    priority: 'HIGH',
    estimatedHours: 8,
    week: 5,
    dependencies: ['TASK-001', 'TASK-002', 'TASK-008', 'TASK-009', 'TASK-010', 'TASK-011'],
    type: 'testing',
    agents: ['qa-engineer-seraph'],
    description: 'Create integration tests covering full RFP workflow end-to-end',
    acceptanceCriteria: [
      'Tests cover happy path (request to proposal)',
      'Tests cover error scenarios',
      'Tests verify RLS policies',
      'Tests check agent interactions',
      'All tests pass',
      'Coverage >80%',
    ],
  },
  {
    id: 'TASK-021',
    number: 21,
    title: 'End-to-End Testing with Playwright',
    priority: 'HIGH',
    estimatedHours: 8,
    week: 5,
    dependencies: ['TASK-015', 'TASK-016', 'TASK-017'],
    type: 'testing',
    agents: ['qa-engineer-seraph'],
    description: 'Create E2E tests for critical user workflows using Playwright',
    acceptanceCriteria: [
      'Test sign-up and login flow',
      'Test creating RFP request',
      'Test viewing quotes',
      'Test sending proposal',
      'All tests pass on CI',
    ],
  },
  {
    id: 'TASK-022',
    number: 22,
    title: 'Performance Optimization and Monitoring',
    priority: 'MEDIUM',
    estimatedHours: 6,
    week: 5,
    dependencies: ['TASK-015'],
    type: 'fullstack',
    agents: ['performance-analyst', 'backend-developer-tank'],
    description: 'Optimize application performance and set up monitoring',
    acceptanceCriteria: [
      'API routes respond in <200ms',
      'Database queries optimized',
      'No N+1 query problems',
      'Sentry error tracking configured',
      'Performance monitoring dashboards',
    ],
  },
  {
    id: 'TASK-023',
    number: 23,
    title: 'Security Audit and Penetration Testing',
    priority: 'HIGH',
    estimatedHours: 6,
    week: 5,
    dependencies: ['TASK-001', 'TASK-004'],
    type: 'testing',
    agents: ['security-engineer', 'security-auditor'],
    description: 'Comprehensive security audit and vulnerability assessment',
    acceptanceCriteria: [
      'No SQL injection vulnerabilities',
      'No XSS vulnerabilities',
      'CSRF protection verified',
      'RLS policies prevent data leaks',
      'All API keys secured',
      'No secrets in code',
    ],
  },

  // ============================================
  // WEEK 6: Production Readiness
  // ============================================
  {
    id: 'TASK-024',
    number: 24,
    title: 'CI/CD Pipeline Setup with GitHub Actions',
    priority: 'HIGH',
    estimatedHours: 5,
    week: 6,
    dependencies: ['TASK-020', 'TASK-021'],
    type: 'infrastructure',
    agents: ['devops-engineer-link'],
    description: 'Set up complete CI/CD pipeline with automated testing and deployment',
    acceptanceCriteria: [
      'Tests run on every PR',
      'Linting enforced',
      'Build verification',
      'Automatic deployment to Vercel',
      'Environment variables managed securely',
    ],
  },
  {
    id: 'TASK-025',
    number: 25,
    title: 'Production Environment Configuration',
    priority: 'HIGH',
    estimatedHours: 4,
    week: 6,
    dependencies: ['TASK-024'],
    type: 'infrastructure',
    agents: ['devops-engineer-link'],
    description: 'Configure production environment with proper secrets and scaling',
    acceptanceCriteria: [
      'All environment variables set',
      'Database connection pooling',
      'Redis configured for production',
      'Sentry error tracking active',
      'Vercel auto-scaling configured',
    ],
  },
  {
    id: 'TASK-026',
    number: 26,
    title: 'Documentation and User Guides',
    priority: 'MEDIUM',
    estimatedHours: 6,
    week: 6,
    dependencies: [],
    type: 'fullstack',
    agents: ['documentation-manager-merovingian'],
    description: 'Create comprehensive documentation for users and developers',
    acceptanceCriteria: [
      'User guide for brokers',
      'API documentation',
      'Deployment runbook',
      'Troubleshooting guide',
      'Architecture diagrams updated',
    ],
  },
  {
    id: 'TASK-027',
    number: 27,
    title: 'Error Handling and Recovery Procedures',
    priority: 'HIGH',
    estimatedHours: 5,
    week: 6,
    dependencies: ['TASK-013'],
    type: 'backend',
    agents: ['backend-developer-tank', 'devops-engineer-link'],
    description: 'Implement comprehensive error handling and automatic recovery procedures',
    acceptanceCriteria: [
      'All errors logged to Sentry',
      'Failed jobs retry automatically',
      'Circuit breaker for external APIs',
      'Graceful degradation implemented',
      'Error alerts configured',
    ],
  },
  {
    id: 'TASK-028',
    number: 28,
    title: 'Load Testing and Capacity Planning',
    priority: 'MEDIUM',
    estimatedHours: 4,
    week: 6,
    dependencies: ['TASK-022'],
    type: 'testing',
    agents: ['qa-engineer-seraph', 'performance-analyst'],
    description: 'Perform load testing and establish capacity limits',
    acceptanceCriteria: [
      'System handles 100 concurrent users',
      'API handles 1000 requests/minute',
      'Database performance acceptable under load',
      'Identified bottlenecks documented',
      'Scaling strategy defined',
    ],
  },
]

async function generateTask(task: TaskDefinition): Promise<void> {
  const template = `# ${task.id}: ${task.title}

**Status**: 🔵 Backlog
**Priority**: ${task.priority}
**Estimated Time**: ${task.estimatedHours} hours
**Assigned To**: Neo Agent
**Created**: October 20, 2025
**Due Date**: Week ${task.week} of Implementation Plan

---

## 1. Task Overview

### Objective
${task.description}

### User Story
\`\`\`
As a broker/developer
I want ${task.title.toLowerCase()}
So that the system can handle RFP workflow efficiently
\`\`\`

### Business Value
- Enables ${task.title.toLowerCase()}
- Part of Week ${task.week} deliverables
- Critical for production readiness

### Success Metrics
${task.acceptanceCriteria.map(c => `- ✅ ${c}`).join('\n')}

---

## 2. Requirements & Acceptance Criteria

### Functional Requirements

${task.acceptanceCriteria.map((criterion, idx) => `**FR-${idx + 1}: ${criterion}**
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Code reviewed
`).join('\n')}

### Non-Functional Requirements

**NFR-1: Performance**
- Implementation completes within estimated time
- Code is optimized for production use

**NFR-2: Quality**
- Test coverage >75%
- No linting errors
- TypeScript compiles successfully

**NFR-3: Security**
- No security vulnerabilities introduced
- Follows security best practices

### Dependencies

${task.dependencies.length > 0 ? `**Depends on**:
${task.dependencies.map(dep => `- ${dep}`).join('\n')}

These tasks must be completed before starting this task.` : 'No dependencies - can start immediately'}

---

## 3. Test-Driven Development (TDD) Approach

### Phase 1: Red - Write Failing Tests

**Step 1**: Create test file structure
\`\`\`bash
mkdir -p __tests__/${task.type === 'frontend' ? 'unit/components' : task.type === 'backend' ? 'unit/api' : 'integration'}
\`\`\`

**Step 2**: Write comprehensive tests that fail initially

**Step 3**: Commit tests
\`\`\`bash
git commit -m "test: add tests for ${task.title.toLowerCase()}

Red phase - tests currently failing

Related to: ${task.id}"
\`\`\`

### Phase 2: Green - Implement Feature

**Step 1**: Write minimal code to pass tests

**Step 2**: Verify all tests pass

**Step 3**: Commit implementation
\`\`\`bash
git commit -m "feat: implement ${task.title.toLowerCase()}

Green phase - tests now passing

Implements: ${task.id}"
\`\`\`

### Phase 3: Blue - Refactor

**Step 1**: Improve code quality

**Step 2**: Verify tests still pass

**Step 3**: Commit refactoring
\`\`\`bash
git commit -m "refactor: improve ${task.title.toLowerCase()}

Blue phase - refactoring complete

Related to: ${task.id}"
\`\`\`

---

## 4. Implementation Steps

### Recommended Agents
${task.agents.map(agent => `- ${agent}`).join('\n')}

### Implementation Checklist
- [ ] Review task requirements completely
- [ ] Check dependencies are met
- [ ] Create feature branch
- [ ] Write tests first (TDD Red)
- [ ] Implement feature (TDD Green)
- [ ] Refactor code (TDD Blue)
- [ ] Run quality checks (lint, type-check, build)
- [ ] Update documentation
- [ ] Create pull request
- [ ] Code review and approval
- [ ] Merge to main

---

## 5. Git Workflow

### Branch Creation
\`\`\`bash
git checkout main
git pull origin main
git checkout -b feature/${task.id.toLowerCase()}-${task.title.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

### Pull Request
\`\`\`bash
git push -u origin feature/${task.id.toLowerCase()}-${task.title.toLowerCase().replace(/\s+/g, '-')}
# Create PR on GitHub
# Title: [${task.id}] ${task.title}
\`\`\`

---

## 6. Code Review Checklist

- [ ] Functionality meets all acceptance criteria
- [ ] Code quality is high
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities
- [ ] Performance is acceptable
- [ ] Documentation updated

---

## 7. Testing Requirements

### Test Coverage Target
- Unit tests: >85%
- Integration tests: >80%
- E2E tests: Critical paths covered

### Test Scenarios
${task.acceptanceCriteria.map(c => `- [ ] Test: ${c}`).join('\n')}

---

## 8. Definition of Done

- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] Code coverage >75%
- [ ] ESLint passes
- [ ] TypeScript compiles
- [ ] Build succeeds
- [ ] PR reviewed and approved
- [ ] Documentation updated
- [ ] Task moved to completed

---

## 9. Resources & References

### Documentation
- Implementation Plan: \`docs/IMPLEMENTATION_PLAN.md\` (Week ${task.week})
- PRD: \`docs/PRD.md\`
- BRD: \`docs/BRD.md\`
- System Architecture: \`docs/SYSTEM_ARCHITECTURE.md\`
- Coding Guidelines: \`docs/AGENTS.md\`

### Related Tasks
${task.dependencies.length > 0 ? `Dependencies:
${task.dependencies.map(dep => `- ${dep}`).join('\n')}` : 'No dependencies'}

---

## 10. Notes & Questions

### Open Questions
- [ ] Any clarifications needed?

### Known Issues
- None yet

### Future Enhancements
- To be determined during implementation

---

## 11. Completion Summary

**To be filled out when task is completed**

### Implementation Summary
<!-- Brief description of what was implemented -->

### Test Results
\`\`\`
Test Suites: X passed, X total
Tests:       X passed, X total
Coverage:    XX% statements, XX% branches, XX% functions, XX% lines
\`\`\`

### Challenges & Solutions
<!-- Document any issues encountered and how they were resolved -->

### Lessons Learned
<!-- What did we learn from this task? -->

---

**Task Created By**: Task Generator Script
**Last Updated**: October 20, 2025
**Completion Date**: _TBD_
`

  const filename = `${task.id}-${task.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.md`
  const filepath = path.join(TASKS_DIR, 'backlog', filename)

  await fs.writeFile(filepath, template, 'utf-8')
  console.log(`✅ Created ${task.id}: ${task.title}`)
}

async function main() {
  console.log('\n📋 Generating All Tasks from Implementation Plan\n')

  // Ensure backlog directory exists
  await fs.mkdir(path.join(TASKS_DIR, 'backlog'), { recursive: true })

  // Move existing TASK-001 and TASK-002 from active to backlog
  console.log('📦 Moving existing sample tasks to backlog...')
  try {
    const task001 = path.join(TASKS_DIR, 'active', 'TASK-001-clerk-authentication.md')
    const task002 = path.join(TASKS_DIR, 'active', 'TASK-002-supabase-database-schema.md')

    await fs.rename(
      task001,
      path.join(TASKS_DIR, 'backlog', 'TASK-001-clerk-authentication-integration.md')
    )
    await fs.rename(
      task002,
      path.join(TASKS_DIR, 'backlog', 'TASK-002-supabase-database-schema-deployment.md')
    )
    console.log('✅ Moved TASK-001 and TASK-002 to backlog\n')
  } catch (error) {
    console.log('ℹ️  Sample tasks already in backlog or not found\n')
  }

  // Generate all tasks (skip 001 and 002 since they exist)
  for (const task of ALL_TASKS.slice(2)) {
    await generateTask(task)
  }

  console.log(`\n✅ Generated ${ALL_TASKS.length - 2} tasks`)
  console.log('\n📊 Summary:')
  console.log(`   Week 1: ${ALL_TASKS.filter(t => t.week === 1).length} tasks`)
  console.log(`   Week 2: ${ALL_TASKS.filter(t => t.week === 2).length} tasks`)
  console.log(`   Week 3: ${ALL_TASKS.filter(t => t.week === 3).length} tasks`)
  console.log(`   Week 4: ${ALL_TASKS.filter(t => t.week === 4).length} tasks`)
  console.log(`   Week 5: ${ALL_TASKS.filter(t => t.week === 5).length} tasks`)
  console.log(`   Week 6: ${ALL_TASKS.filter(t => t.week === 6).length} tasks`)
  console.log(`\n   Total: ${ALL_TASKS.length} tasks`)
  console.log(`   Total Hours: ${ALL_TASKS.reduce((sum, t) => sum + t.estimatedHours, 0)} hours\n`)

  console.log('🎯 Next steps:')
  console.log('   1. Review generated tasks in tasks/backlog/')
  console.log('   2. Move Week 1 tasks to tasks/active/')
  console.log('   3. Start with TASK-001 using: npm run task:guide TASK-001\n')
}

main().catch(console.error)
