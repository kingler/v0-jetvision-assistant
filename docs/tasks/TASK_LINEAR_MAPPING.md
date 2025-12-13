# Task to Linear Issue Mapping
# JetVision AI Assistant Project

**Last Updated**: October 21, 2025
**Total Tasks**: 37
**Linear Issues**: DES-73 through DES-109

---

## Complete Task Mapping

This document provides a complete mapping between local task files in `/tasks` and their corresponding Linear issues.

### Week 1: Foundation (October 20-26, 2025)

| Task File | Linear Issue | Title | SubAgent | Priority | Due Date |
|-----------|--------------|-------|----------|----------|----------|
| `active/TASK-000-*.md` | **DES-73** | Fix TypeScript & Vitest Blockers | Coder | Critical | Oct 21 |
| `backlog/TASK-001-*.md` | **DES-78** | Clerk Authentication Integration | Coder | Critical | Oct 24 |
| `backlog/TASK-002-*.md` | **DES-79** | Database Schema & RLS Policies | Coder | Critical | Oct 25 |
| `backlog/TASK-003-*.md` | **DES-77** | Environment Configuration | Ops | Critical | Oct 23 |
| `backlog/TASK-004-*.md` | **DES-81** | Redis & BullMQ Configuration | Ops | Critical | Oct 22 |
| `backlog/TASK-005-*.md` | **DES-82** | Supabase Client Implementation | Coder | High | Oct 23 |
| `backlog/TASK-006-*.md` | **DES-83** | First API Route Implementation | Coder | High | Oct 24 |
| - | **DES-74** | Week 1 Foundation Planning | Planner | High | Oct 22 |
| - | **DES-75** | Code Review Standards & PR Templates | Reviewer | High | Oct 23 |
| - | **DES-76** | Testing Infrastructure Setup | Tester | High | Oct 24 |
| - | **DES-80** | Week 2-3 MCP & Agent Planning | Planner | High | Oct 26 |

**Week 1 Total**: 11 issues (7 from task files + 4 coordination/planning)

---

### Week 2-3: MCP Servers & Agents (October 27 - November 9, 2025)

#### MCP Server Infrastructure

| Task File | Linear Issue | Title | SubAgent | Priority | Due Date |
|-----------|--------------|-------|----------|----------|----------|
| `backlog/TASK-007-*.md` | **DES-84** | MCP Base Server Infrastructure | Coder | Critical | Oct 28 |
| `backlog/TASK-008-*.md` | **DES-85** | Avinode MCP Server | Coder | Critical | Oct 29 |
| `backlog/TASK-009-*.md` | **DES-86** | Gmail MCP Server | Coder | Critical | Oct 30 |
| `backlog/TASK-010-*.md` | **DES-87** | Google Sheets MCP Server | Coder | Critical | Oct 31 |

#### Agent Implementations

| Task File | Linear Issue | Title | SubAgent | Priority | Due Date |
|-----------|--------------|-------|----------|----------|----------|
| `backlog/TASK-011-*.md` | **DES-88** | RFP Orchestrator Agent | Coder | Critical | Nov 1 |
| `backlog/TASK-012-*.md` | **DES-89** | Client Data Manager Agent | Coder | Critical | Nov 2 |
| `backlog/TASK-013-*.md` | **DES-90** | Flight Search Agent | Coder | Critical | Nov 3 |
| `backlog/TASK-014-*.md` | **DES-91** | Proposal Analysis Agent | Coder | Critical | Nov 4 |
| `backlog/TASK-015-*.md` | **DES-92** | Communication Manager Agent | Coder | Critical | Nov 5 |
| `backlog/TASK-016-*.md` | **DES-93** | Error Monitor Agent | Coder | Critical | Nov 6 |

#### Integration Testing

| Task File | Linear Issue | Title | SubAgent | Priority | Due Date |
|-----------|--------------|-------|----------|----------|----------|
| `backlog/TASK-017-*.md` | **DES-94** | Agent Integration Tests | Tester | High | Nov 7 |
| `backlog/TASK-018-*.md` | **DES-95** | MCP Server Integration Tests | Tester | High | Nov 8 |
| `backlog/TASK-019-*.md` | **DES-96** | End-to-End RFP Workflow Test | Tester | Critical | Nov 9 |

**Week 2-3 Total**: 13 issues (all from task files)

---

### Week 4: Frontend Integration (November 10-16, 2025)

| Task File | Linear Issue | Title | SubAgent | Priority | Due Date |
|-----------|--------------|-------|----------|----------|----------|
| `backlog/TASK-020-*.md` | **DES-97** | Dashboard Pages Implementation | Coder | High | Nov 12 |
| `backlog/TASK-021-*.md` | **DES-98** | API Client & Data Fetching | Coder | High | Nov 14 |
| `backlog/TASK-022-*.md` | **DES-99** | Supabase Realtime Integration | Coder | High | Nov 16 |

**Week 4 Total**: 3 issues (all from task files)

---

### Week 5: Testing & QA (November 17-23, 2025)

| Task File | Linear Issue | Title | SubAgent | Priority | Due Date |
|-----------|--------------|-------|----------|----------|----------|
| `backlog/TASK-026-*.md` | **DES-100** | Unit Tests for Agents | Tester | High | Nov 19 |
| `backlog/TASK-027-*.md` | **DES-101** | Integration Tests for API Routes | Tester | High | Nov 21 |
| `backlog/TASK-028-*.md` | **DES-102** | E2E Tests | Tester | Critical | Nov 22 |
| `backlog/TASK-030-*.md` | **DES-103** | Security Audit | Reviewer | Critical | Nov 23 |

**Week 5 Total**: 4 issues (all from task files)

**Note**: TASK-023, TASK-024, TASK-025, TASK-029, TASK-031 may not exist in backlog (gaps in numbering)

---

### Week 6: Production Deployment (November 24-30, 2025)

| Task File | Linear Issue | Title | SubAgent | Priority | Due Date |
|-----------|--------------|-------|----------|----------|----------|
| `backlog/TASK-032-*.md` | **DES-104** | Sentry Integration & Error Monitoring | Ops | High | Nov 25 |
| `backlog/TASK-033-*.md` | **DES-105** | CI/CD Pipeline Configuration | Ops | Critical | Nov 26 |
| `backlog/TASK-034-*.md` | **DES-106** | Staging Environment Deployment | Ops | Critical | Nov 27 |
| `backlog/TASK-035-*.md` | **DES-107** | Production Environment Setup | Ops | Critical | Nov 28 |
| `backlog/TASK-036-*.md` | **DES-108** | API Documentation & Developer Guide | Coder | High | Nov 29 |
| `backlog/TASK-037-*.md` | **DES-109** | Final QA & Production Deployment | Reviewer | Critical | Nov 30 |

**Week 6 Total**: 6 issues (all from task files)

---

## Summary Statistics

### Issue Breakdown by Type

- **From Local Task Files**: 33 issues (TASK-000 through TASK-037, with some gaps)
- **Coordination/Planning Tasks**: 4 issues (DES-74, DES-75, DES-76, DES-80)
- **Total Issues**: 37

### Issue Breakdown by SubAgent

| SubAgent | Count | Percentage |
|----------|-------|------------|
| **Coder** | 20 | 54% |
| **Tester** | 7 | 19% |
| **Ops** | 6 | 16% |
| **Reviewer** | 2 | 5% |
| **Planner** | 2 | 5% |

### Issue Breakdown by Priority

| Priority | Count | Percentage |
|----------|-------|------------|
| **Critical** | 24 | 65% |
| **High** | 13 | 35% |

### Issue Breakdown by Phase

| Phase | Issues | Range | Percentage |
|-------|--------|-------|------------|
| **Foundation** | 11 | DES-73 to DES-83 | 30% |
| **MCP-Agents** | 13 | DES-84 to DES-96 | 35% |
| **Frontend** | 3 | DES-97 to DES-99 | 8% |
| **Testing** | 4 | DES-100 to DES-103 | 11% |
| **Production** | 6 | DES-104 to DES-109 | 16% |

---

## Quick Reference

### Linear MCP Commands

**List all project issues**:
```typescript
mcp__linear__list_issues({
  project: "JetVision Assistant v1",
  team: "DesignThru AI"
})
```

**Get specific issue**:
```typescript
mcp__linear__get_issue({
  id: "DES-73"  // Replace with any issue ID
})
```

**Filter by SubAgent**:
```typescript
mcp__linear__list_issues({
  project: "JetVision Assistant v1",
  label: "SubAgent:Coder"  // or any SubAgent label
})
```

**Filter by Phase**:
```typescript
mcp__linear__list_issues({
  project: "JetVision Assistant v1",
  label: "Phase:Foundation"  // or any Phase label
})
```

**Filter by Priority**:
```typescript
mcp__linear__list_issues({
  project: "JetVision Assistant v1",
  label: "Priority:Critical"
})
```

---

## Dependency Chains

### Critical Path (Week 1)

```
DES-73 (TypeScript/Vitest fixes) [BLOCKER]
  ├─> DES-76 (Testing infrastructure)
  ├─> DES-81 (Redis/BullMQ)
  ├─> DES-82 (Supabase client)
  └─> DES-83 (First API route)

DES-77 (Environment setup) [CRITICAL]
  ├─> DES-78 (Clerk auth)
  └─> All Week 2 MCP servers

DES-78 (Clerk auth)
  └─> DES-79 (Database schema)
      └─> DES-83 (First API route)
          └─> All API development
```

### Week 2-3 Dependencies

```
DES-84 (MCP Base Infrastructure)
  ├─> DES-85 (Avinode MCP)
  ├─> DES-86 (Gmail MCP)
  └─> DES-87 (Google Sheets MCP)

DES-79 (Database schema)
  └─> DES-88 (Orchestrator Agent)
      ├─> DES-89 (Client Data Agent)
      ├─> DES-90 (Flight Search Agent)
      ├─> DES-91 (Proposal Analysis Agent)
      ├─> DES-92 (Communication Agent)
      └─> DES-93 (Error Monitor Agent)

All Agents Complete
  └─> DES-94, DES-95, DES-96 (Integration Tests)
```

### Week 4-6 Dependencies

```
Week 3 Complete (All agents + MCP servers)
  └─> Week 4 Frontend Integration (DES-97 to DES-99)
      └─> Week 5 Testing (DES-100 to DES-103)
          └─> Week 6 Production (DES-104 to DES-109)
```

---

## File Locations

### Local Task Files
- **Active**: `/tasks/active/TASK-000-*.md`
- **Backlog**: `/tasks/backlog/TASK-###-*.md`
- **Completed**: `/tasks/completed/` (after Linear issue marked Done)

### Documentation
- **Task Index**: `/tasks/TASK_INDEX.md`
- **Task README**: `/tasks/README.md`
- **This Mapping**: `/docs/TASK_LINEAR_MAPPING.md`
- **Linear Setup Summary**: `/docs/LINEAR_SETUP_SUMMARY.md`
- **Linear Workflow Guide**: `/docs/LINEAR_SUBAGENT_WORKFLOW.md`
- **Linear Sync Guide**: `/docs/LINEAR_TASK_SYNC.md`

---

## Sync Workflow

### When Starting a Task

1. **Find Linear issue** (filter by SubAgent label)
2. **Update status** to "In Progress"
3. **Read local task file** for detailed implementation steps
4. **Comment on Linear issue** when starting work

### During Implementation

1. **Follow task file instructions** (TDD Red-Green-Blue cycle)
2. **Update Linear comments** with progress
3. **Link PRs** in Linear comments when created
4. **Update local task file** with any learnings or blockers

### When Completing a Task

1. **Update Linear status** to "In Review" (for Coder) or "Done"
2. **Add handoff comment** if passing to another SubAgent
3. **Move local task file** to `/tasks/completed/` (after Linear marked Done)
4. **Update next dependent tasks** in Linear

---

## Quick Links

### Linear Project
- **Project URL**: https://linear.app/designthru-ai/project/jetvision-assistant-v1-8dc142d9fa78
- **Team Board**: https://linear.app/designthru-ai/team/DES

### Filter URLs
- **Coder Tasks**: https://linear.app/designthru-ai/team/DES/label/SubAgent:Coder
- **Tester Tasks**: https://linear.app/designthru-ai/team/DES/label/SubAgent:Tester
- **Ops Tasks**: https://linear.app/designthru-ai/team/DES/label/SubAgent:Ops
- **Critical Priority**: https://linear.app/designthru-ai/team/DES/label/Priority:Critical
- **Current Phase**: https://linear.app/designthru-ai/team/DES/label/Phase:Foundation

---

**Document Version**: 1.0
**Last Updated**: October 21, 2025
**Maintained By**: Development Team
**Next Review**: October 28, 2025
