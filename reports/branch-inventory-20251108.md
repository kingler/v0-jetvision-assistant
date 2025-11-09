# Git Branch Inventory Report

**Generated:** 2025-11-08
**Repository:** v0-jetvision-assistant
**Current Branch:** feat/linear-github-automation

---

## Summary

- **Total Local Branches:** 8 (including main)
- **Total Remote Branches:** 28
- **Open Pull Requests:** 4
- **Merged Pull Requests:** 21
- **Closed Pull Requests:** 2

---

## Local Branch Inventory

| Branch Name | Last Commit | Commits Ahead | PR Status | Last Activity |
|-------------|-------------|---------------|-----------|---------------|
| **main** | 7 minutes ago | 0 | N/A | ✅ Current |
| feat/linear-github-automation | 10 hours ago | 15 | #39 OPEN | 10 hours ago |
| feat/chatkit-frontend-clean | 10 hours ago | 1 | #40 OPEN | 10 hours ago |
| feat/ui-component-library-setup | 10 hours ago | 4 | #8 OPEN | 10 hours ago |
| feat/complete-api-routes-layer | 10 hours ago | 8 | #11 OPEN | 10 hours ago |
| feat/TASK-002-database-schema | 11 hours ago | 17 | #22 MERGED | 11 hours ago |
| feat/chatkit-chat-page-and-tests | 2 weeks ago | 27 | #7 OPEN | 2 weeks ago |
| feature/task-008-avinode-mcp-server | 2 weeks ago | 27 | #6 OPEN | 2 weeks ago |

---

## Detailed Branch Analysis

### 1. main (Current Production)
- **Status:** ✅ ACTIVE
- **Last Commit:** "feat(ci): implement test database environment setup" (7 min ago)
- **Commits Ahead:** 0
- **PR:** N/A
- **Action:** Keep (production branch)

---

### 2. feat/linear-github-automation
- **Status:** 🟢 ACTIVE - HIGH PRIORITY
- **PR:** #39 (OPEN) - "feat: Linear-GitHub Automated Synchronization System (Rebased)"
- **Last Commit:** "docs: add comprehensive Linear issue creation guide" (10 hours ago)
- **Commits Ahead:** 15
- **Created:** 2025-11-02
- **Updated:** 2025-11-08 (6 hours ago)
- **State:** Not draft
- **Tracking:** origin/feat/linear-github-automation

**Commits Preview:**
```
357697b docs: add comprehensive Linear issue creation guide
45e0dbc docs: add comprehensive Mermaid activity diagrams for Avinode API integration
0b61f93 docs(communication): update project schedule with current completion status
5a11baf fix(ci): remove pnpm version overrides from code-review workflow
6a13f16 test(ci): verify required environment variables
```

**Recommendation:** 🚀 **READY TO MERGE** - Rebased, clean history, active development

---

### 3. feat/chatkit-frontend-clean
- **Status:** 🟢 ACTIVE - HIGH PRIORITY
- **PR:** #40 (OPEN) - "feat/chatkit-frontend-clean"
- **Last Commit:** "feat(chatkit): add ChatKit frontend interface and chat page" (10 hours ago)
- **Commits Ahead:** 1
- **Created:** 2025-11-08
- **Updated:** 2025-11-08 (10 hours ago)
- **State:** Not draft
- **Tracking:** origin/feat/chatkit-frontend-clean

**Commits Preview:**
```
8c1ef5a feat(chatkit): add ChatKit frontend interface and chat page
```

**Recommendation:** 🚀 **READY TO MERGE** - Clean single commit, replaces PR #7

---

### 4. feat/ui-component-library-setup
- **Status:** 🟡 ACTIVE - MEDIUM PRIORITY
- **PR:** #8 (OPEN) - "feat(ui): UI Component Library with JetVision Branding (DES-111)"
- **Last Commit:** "fix(agents): update iso_agent_id to user_id in rfp-orchestrator" (10 hours ago)
- **Commits Ahead:** 4
- **Created:** 2025-10-22
- **Updated:** 2025-11-08 (10 hours ago)
- **State:** Not draft
- **Tracking:** origin/feat/ui-component-library-setup

**Commits Preview:**
```
d9f1f89 fix(agents): update iso_agent_id to user_id in rfp-orchestrator
7a8c2b4 chore(build): remove build-output.log from version control
c5e3d6f Merge remote-tracking branch 'origin/main' into feat/ui-component-library-setup
4b7e8a9 feat(ui): add JetVision branding to UI components
```

**Recommendation:** 🔄 **REVIEW REQUIRED** - Rebased, CI showing expected failures

---

### 5. feat/complete-api-routes-layer
- **Status:** 🟡 ACTIVE - MEDIUM PRIORITY
- **PR:** #11 (OPEN) - "feat: Complete API Routes Layer with Validation (DES-95)"
- **Last Commit:** "fix(ci): remove pnpm version overrides from code-review workflow" (10 hours ago)
- **Commits Ahead:** 8
- **Created:** 2025-10-25
- **Updated:** 2025-11-08 (11 hours ago)
- **State:** Not draft
- **Tracking:** origin/feat/complete-api-routes-layer

**Commits Preview:**
```
86d8f11 fix(ci): remove pnpm version overrides from code-review workflow
f9c1d23 fix(security): replace z.record(z.unknown()) with strict schemas in email routes
a2e4b34 fix(database): update iso_agent_id field to user_id across API routes
d5c7e45 Merge remote-tracking branch 'origin/main' into feat/complete-api-routes-layer
e8f9a56 feat(api): add validation to API routes
```

**Recommendation:** 🔄 **REVIEW REQUIRED** - Security hardening, 4 test failures (expected)

---

### 6. feat/TASK-002-database-schema
- **Status:** ✅ MERGED (Can be deleted)
- **PR:** #22 (MERGED) - "feat: implement complete PostgreSQL schema with RLS policies (TASK-002)"
- **Last Commit:** "chore(deps): update pnpm package manager to 10.0.0" (11 hours ago)
- **Commits Ahead:** 17
- **Created:** 2025-10-29
- **Merged:** 2025-11-08
- **Tracking:** origin/feat/TASK-002-database-schema

**Commits Preview:**
```
b3a4c5d chore(deps): update pnpm package manager to 10.0.0
e6f7g8h feat(database): complete PostgreSQL schema with RLS
i9j0k1l test(database): add comprehensive RLS tests
m2n3o4p docs(database): update schema documentation
```

**Recommendation:** 🗑️ **DELETE LOCAL BRANCH** - Already merged to main via PR #22

---

### 7. feat/chatkit-chat-page-and-tests
- **Status:** 🔴 SUPERSEDED
- **PR:** #7 (OPEN) - "ChatKit Frontend Integration - Complete Implementation"
- **Last Commit:** "feat: improve ChatKit session API with enhanced validation and error handling" (2 weeks ago)
- **Commits Ahead:** 27
- **Created:** 2025-10-22
- **Updated:** 2025-11-08 (10 hours ago)
- **State:** Not draft
- **Tracking:** origin/feat/chatkit-chat-page-and-tests

**Recommendation:** ❌ **CLOSE PR & DELETE** - Superseded by PR #40 (clean extraction)

---

### 8. feature/task-008-avinode-mcp-server
- **Status:** ⚠️ NEEDS INVESTIGATION
- **PR:** #6 (OPEN) - "feat(mcp): Avinode MCP Server Implementation (TASK-008/DES-85)"
- **Last Commit:** "feat(frontend): implement complete dashboard UI with RFP and quote management" (2 weeks ago)
- **Commits Ahead:** 27
- **Created:** 2025-10-22
- **Updated:** 2025-10-25
- **State:** Not draft
- **Tracking:** origin/feature/task-008-avinode-mcp-server

**Notes:**
- Avinode MCP already in main (commit 5d9ceae)
- PR has 11 files differing from main
- Needs analysis to determine if duplicate or has unique features

**Recommendation:** 🔍 **INVESTIGATE** - Determine if has unique work or is duplicate

---

## Remote Branch Inventory

### Origin Branches (28 total)

**Active Feature Branches:**
- origin/feat/linear-github-automation (10 hours ago)
- origin/feat/chatkit-frontend-clean (10 hours ago)
- origin/feat/complete-api-routes-layer (10 hours ago)
- origin/feat/ui-component-library-setup (10 hours ago)
- origin/feat/TASK-002-database-schema (11 hours ago)

**Stale Feature Branches (>7 days):**
- origin/feat/ONEK-81-execute-tool-function (7 days ago)
- origin/feat/TASK-002-supabase-database-schema (7 days ago)
- origin/feat/TASK-003-environment-configuration (7 days ago)
- origin/feat/onek-59-directory-cleanup (7 days ago)
- origin/feature/mcp-ui-chatkit-integration (7 days ago)
- origin/feature/onek-78-mcp-server-manager (8 days ago)

**Stale Feature Branches (>10 days):**
- origin/feat/apply-user-table-migrations (11 days ago)
- origin/feat/automated-pr-code-review (11 days ago)
- origin/fix/TASK-000-typescript-vitest-blockers (11 days ago)

**Old Feature Branches (>14 days):**
- origin/feat/TASK-001-clerk-authentication (2 weeks ago)
- origin/feat/chatkit-chat-page-and-tests (2 weeks ago)
- origin/feat/rfp-processing-dashboard (2 weeks ago)
- origin/feature/task-008-avinode-mcp-server (2 weeks ago)

**Claude Auto-branches (>6 days):**
- origin/add-claude-github-actions-1762088487382 (6 days ago)
- origin/claude/fix-jetvision-company-name-011CUeAGoNLoMU7DM5AoJddf (25 hours ago)
- origin/claude/resolve-linear-github-conflicts-011CUeAGoNLoMU7DM5AoJddf (8 days ago)
- origin/claude/resolve-task-000-conflicts-011CUeAGoNLoMU7DM5AoJddf (8 days ago)
- origin/claude/resolve-ui-components-conflicts-011CUeAGoNLoMU7DM5AoJddf (8 days ago)

**Other Remotes:**
- abcucinalabs (3 branches, 2 weeks ago)

---

## Merge Status

### Branches Already Merged to Main
```
* main
```

**Note:** Only `main` shows as merged. All feature branches have unmerged commits.

---

## Pull Request Summary

### Open PRs (4)

| PR # | Branch | Title | Age | State |
|------|--------|-------|-----|-------|
| #40 | feat/chatkit-frontend-clean | feat/chatkit-frontend-clean | <1 day | Ready |
| #39 | feat/linear-github-automation | Linear-GitHub Automated Synchronization | 6 days | Ready |
| #11 | feat/complete-api-routes-layer | Complete API Routes Layer with Validation | 14 days | Review |
| #8 | feat/ui-component-library-setup | UI Component Library with JetVision Branding | 17 days | Review |
| #7 | feat/chatkit-chat-page-and-tests | ChatKit Frontend Integration | 17 days | **Close** |
| #6 | feature/task-008-avinode-mcp-server | Avinode MCP Server Implementation | 17 days | Investigate |

### Recently Merged PRs (Last 10)

| PR # | Branch | Title | Merged |
|------|--------|-------|--------|
| #37 | feat/onek-59-directory-cleanup | Clean up project root directory | Nov 2 |
| #36 | feat/ONEK-80-mcp-health-check-endpoint | Add MCP health check endpoint | Nov 2 |
| #34 | feat/ONEK-88-update-app-routes | App Routes Integration Plan | Nov 2 |
| #33 | feat/ONEK-87-chatkit-component-design | ChatKit Component Design Specification | Nov 2 |
| #32 | feat/ONEK-86-agent-workflow-configuration | Configure Agent Workflow | Nov 2 |
| #31 | feat/ONEK-82-83-tool-execution-retry-and-integration | Tool execution with retry logic | Nov 2 |
| #30 | feat/TASK-003-environment-configuration | Environment Configuration & Prerequisites | Nov 2 |
| #29 | feat/ONEK-85-chatkit-session-endpoint | ChatKit Session Endpoint with Clerk Auth | Nov 2 |
| #28 | feat/ONEK-84-chatkit-dependencies | Install ChatKit React Dependencies | Nov 2 |
| #27 | feat/ONEK-71-mock-data-infrastructure | Mock Data Infrastructure | Nov 2 |

### Closed PRs (Not Merged)

| PR # | Branch | Title | Reason |
|------|--------|-------|--------|
| #38 | feat/TASK-002-supabase-database-schema | Supabase database schema | Superseded by #22 |
| #35 | feat/TASK-002-supabase-database-schema | Supabase Database Schema Deployment | Duplicate |
| #2 | feat/linear-github-automation | Linear-GitHub Automated Synchronization | Superseded by #39 |

---

## Categorization Summary

### ACTIVE (4 branches)
- main
- feat/linear-github-automation (PR #39)
- feat/chatkit-frontend-clean (PR #40)
- feat/ui-component-library-setup (PR #8)
- feat/complete-api-routes-layer (PR #11)

### MERGED (1 branch - can delete)
- feat/TASK-002-database-schema (PR #22 merged)

### SUPERSEDED (1 branch - close PR & delete)
- feat/chatkit-chat-page-and-tests (PR #7, replaced by #40)

### NEEDS INVESTIGATION (1 branch)
- feature/task-008-avinode-mcp-server (PR #6)

---

## Recommended Actions

### Immediate (High Priority)

1. **Merge PR #40** (feat/chatkit-frontend-clean)
   - Clean single commit
   - Replaces messy PR #7
   - No conflicts expected

2. **Merge PR #39** (feat/linear-github-automation)
   - Rebased successfully
   - 15 clean commits
   - Active development

3. **Close PR #7** (feat/chatkit-chat-page-and-tests)
   - Superseded by PR #40
   - Delete local and remote branches

4. **Delete Local Branch** (feat/TASK-002-database-schema)
   - PR #22 already merged
   - Remote branch can stay for archive

### Medium Priority

5. **Review PR #8** (feat/ui-component-library-setup)
   - Address CI failures
   - Merge after fixes

6. **Review PR #11** (feat/complete-api-routes-layer)
   - Address 4 test failures
   - Security hardening complete

7. **Investigate PR #6** (feature/task-008-avinode-mcp-server)
   - Determine if duplicate or unique
   - Close or merge accordingly

### Low Priority (Cleanup)

8. **Prune Stale Remote Branches**
   - Branches merged via other PRs
   - Claude auto-branches (>7 days old)
   - Branches without corresponding PRs

---

## Next Steps

Proceed to **Phase 2: Status Analysis & Categorization** to create detailed categorization matrix.
