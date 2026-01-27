# Branch Conflict & Architecture Alignment Analysis

**Generated:** 2025-12-17
**Current Main HEAD:** d3d5325 (Merge PR #58 - ONEK-130 RFP Chat Flow)

---

## Executive Summary

| Category | Count | Status |
|----------|-------|--------|
| **Total Unmerged Branches** | 19 | - |
| **Clean Merge (No Conflicts)** | 14 | ✅ Safe to merge |
| **Has Merge Conflicts** | 3 | ⚠️ Requires resolution |
| **Stale (>30 days behind)** | 4 | 🔄 Consider rebasing |
| **Duplicate Branches** | 4 pairs | 🗑️ Can consolidate |

---

## 1. Conflict Matrix

### Merge Conflict Status with Main

| Branch | Conflicts? | Behind Main | Ahead | Last Commit |
|--------|------------|-------------|-------|-------------|
| **LOCAL BRANCHES** |
| feat/ONEK-53-streaming-response-hook | ✅ Clean | 17 | 1 | Dec 13 |
| feat/ONEK-94-action-buttons | ✅ Clean | 10 | 6 | Dec 13 |
| feat/ONEK-95-conversational-rfq-flow | ✅ Clean | 10 | 9 | Dec 13 |
| feat/ONEK-96-rich-message-renderer | ✅ Clean | 22 | 3 | Nov 15 |
| feat/ONEK-99-conversation-state | ✅ Clean | 5 | 1 | Dec 13 |
| feat/chatkit-chat-page-and-tests | ⚠️ **10 CONFLICTS** | 171 | 27 | Oct 22 |
| feat/complete-api-routes-layer | ⚠️ **6 CONFLICTS** | 91 | 15 | Oct 31 |
| fix/TASK-000-typescript-vitest-blockers | ⚠️ **BLOCKED** | 171 | 18 | Oct 28 |
| **REMOTE ORIGIN BRANCHES** |
| origin/claude/fix-jetvision-company-name-* | ✅ Clean | 21 | 2 | Dec 9 |
| origin/claude/jetvision-ux-requirements-* | ✅ Clean | 0 | 1 | Dec 18 |
| origin/claude/update-avinode-api-integration-* | ✅ Clean | 0 | 1 | Dec 16 |
| origin/feat/ONEK-117-avinode-trip-display | ✅ Clean | 19 | 2 | Dec 13 |
| origin/feat/ONEK-30-flight-search-agent-avinode | ⚠️ **1 CONFLICT** | 25 | 1 | Nov 14 |
| origin/feat/ONEK-53-streaming-response-hook | ✅ Clean | 17 | 1 | Dec 13 |
| origin/feat/ONEK-94-action-buttons | ✅ Clean | 10 | 6 | Dec 13 |
| origin/feat/ONEK-95-conversational-rfq-flow | ✅ Clean | 10 | 9 | Dec 13 |
| origin/feat/ONEK-96-rich-message-renderer | ✅ Clean | 22 | 2 | Nov 15 |
| origin/feat/ONEK-98-orchestrator-conversational | ✅ Clean | 23 | 3 | Nov 14 |
| **THIRD-PARTY** |
| abcucinalabs/authentication-&-database | ARCHIVED | 172 | 1 | Oct 25 |

**Note:** The abcucinalabs fork has been assessed and archived (2025-12-18). All database infrastructure from TASK-001/002 has been superseded by main branch evolution through ONEK-series tickets. See [ABCUCINALABS_FORK_ASSESSMENT.md](./ABCUCINALABS_FORK_ASSESSMENT.md) for details.

### Cross-Branch File Conflicts

These files are modified in multiple branches and will require careful merge ordering:

| File | Branches |
|------|----------|
| `agents/implementations/flight-search-agent.ts` | chatkit-chat-page-and-tests, ONEK-117, ONEK-30 |
| `agents/implementations/orchestrator-agent.ts` | chatkit-chat-page-and-tests, ONEK-98 |
| `components/chat-interface.tsx` | TASK-000, ONEK-117 |
| `components/chat-sidebar.tsx` | chatkit-chat-page-and-tests, TASK-000, ONEK-117 |
| `.github/workflows/pr-code-review.yml` | ONEK-94, complete-api-routes-layer |
| `__tests__/helpers/setup.ts` | chatkit-chat-page-and-tests, ONEK-98 |
| `lib/mock-data.ts` | chatkit-chat-page-and-tests, TASK-000 |

---

## 2. Detailed Conflict Analysis

### HIGH SEVERITY: Branches with Merge Conflicts

#### ⚠️ feat/chatkit-chat-page-and-tests (10 Conflicts)
**Status:** 171 commits behind, 27 ahead
**Last Activity:** Oct 22, 2025 (55+ days stale)

**Conflicting Files:**
- `.gitignore`
- `__tests__/helpers/setup.ts`
- `__tests__/unit/agents/flight-search-agent.test.ts`
- `agents/implementations/communication-agent.ts`
- `agents/implementations/flight-search-agent.ts`
- `agents/implementations/orchestrator-agent.ts`
- `agents/implementations/proposal-analysis-agent.ts`
- `app/api/chatkit/session/route.ts`
- `app/layout.tsx`
- `components/chat-sidebar.tsx`

**Recommendation:** 🔴 **ABANDON or EXTENSIVE REBASE**
This branch is extremely stale with fundamental conflicts in core agent implementations. Most of its changes have likely been superseded by ONEK-129/130 work. Consider cherry-picking only the ChatKit-specific components if still needed.

---

#### ⚠️ feat/complete-api-routes-layer (6 Conflicts)
**Status:** 91 commits behind, 15 ahead
**Last Activity:** Oct 31, 2025 (47+ days stale)

**Conflicting Files:**
- `.github/workflows/code-review.yml`
- `.github/workflows/pr-code-review.yml`
- `app/api/analytics/route.ts`
- `app/api/email/route.ts`
- `app/sign-in/[[...sign-in]]/page.tsx`

**Recommendation:** 🟡 **SELECTIVE REBASE**
API routes may still be valuable. Rebase and resolve workflow/auth conflicts. Verify routes don't duplicate ONEK-130 webhook work.

---

#### ⚠️ fix/TASK-000-typescript-vitest-blockers (Blocked)
**Status:** 171 commits behind, 18 ahead
**Last Activity:** Oct 28, 2025 (50+ days stale)

**Issue:** Blocked by uncommitted local changes to `lib/mock-data.ts`

**Recommendation:** 🔴 **ABANDON**
This was a blockers fix from early development. All blockers have been resolved in main. The branch is obsolete.

---

#### ⚠️ origin/feat/ONEK-30-flight-search-agent-avinode (1 Conflict)
**Status:** 25 commits behind, 1 ahead
**Last Activity:** Nov 14, 2025

**Conflicting File:**
- `agents/implementations/flight-search-agent.ts`

**Recommendation:** 🟡 **REVIEW & MERGE IF VALUABLE**
Single file conflict. Check if Avinode integration logic is already in main from ONEK-129. If unique, rebase and merge.

---

## 3. Database Migration Conflicts

### Current Main Migrations (14 total)
Latest migrations:
- `015_modify_existing_tables.sql`
- `016_rls_policies.sql`
- `020_extend_quotes_for_webhooks.sql` (from ONEK-130)
- `20250101000000_create_chatkit_sessions.sql`

### Branch Migration Analysis

| Branch | Migrations | Conflict Risk |
|--------|------------|---------------|
| feat/ONEK-99-conversation-state | `010_conversation_state.sql` | 🟡 Number conflict (010 may exist) |
| feat/chatkit-chat-page-and-tests | `001_initial_schema.sql`, `002_rls_policies.sql`, `003_seed_data.sql` | 🔴 SEVERE - These are foundational migrations that have evolved significantly |

**Recommendation:** ONEK-99's migration should be renumbered to `021_conversation_state.sql` before merge. Chatkit branch migrations are completely outdated.

---

## 4. Architecture Alignment Assessment

### Compliance with Multi-Agent System (MAS) Architecture

| Branch | BaseAgent | MessageBus | A2A Pattern | MCP Integration | Score |
|--------|-----------|------------|-------------|-----------------|-------|
| ONEK-53 | N/A | N/A | N/A | N/A | ✅ (Hook only) |
| ONEK-94 | N/A | N/A | N/A | N/A | ✅ (UI only) |
| ONEK-95 | ✅ Uses AgentFactory | ⚠️ Missing | ⚠️ Direct calls | N/A | 🟡 70% |
| ONEK-96 | N/A | N/A | N/A | N/A | ✅ (UI only) |
| ONEK-98 | ✅ Extends BaseAgent | ⚠️ Missing | ⚠️ Needs tools | N/A | 🟡 75% |
| ONEK-99 | N/A | N/A | N/A | N/A | ✅ (State only) |
| ONEK-117 | ✅ Extends BaseAgent | N/A | N/A | ✅ Uses AvinodeMCP | ✅ 90% |
| ONEK-30 | ✅ Extends BaseAgent | N/A | N/A | ⚠️ Older pattern | 🟡 80% |

### Architecture Notes:

**ONEK-95 (Conversational RFP Flow)**
- ✅ Correctly uses `AgentFactory` singleton
- ✅ Defines proper workflow states matching `WorkflowStateMachine`
- ⚠️ Missing `MessageBus` integration for A2A communication
- ⚠️ Direct agent calls instead of handoff pattern

**ONEK-98 (Orchestrator Conversational)**
- ✅ Correctly extends `BaseAgent`
- ✅ Well-structured conversation tools (IntentParser, DataExtractor)
- ✅ Proper message component types
- ⚠️ Tools not registered via `registerTool()` pattern
- ⚠️ Missing MessageBus pub/sub

**ONEK-117 (Avinode Trip Display)**
- ✅ Properly extends `BaseAgent`
- ✅ Uses `AvinodeMCPServer` correctly
- ✅ Has `updateRequestWithAvinodeTrip` for database updates
- Minor: Could benefit from MessageBus status updates

---

## 5. Duplicate Branch Consolidation

### Identical Local/Remote Pairs (Safe to Delete Local)

| Local | Remote | Status |
|-------|--------|--------|
| feat/ONEK-53-streaming-response-hook | origin/feat/ONEK-53-streaming-response-hook | ✅ Identical |
| feat/ONEK-94-action-buttons | origin/feat/ONEK-94-action-buttons | ✅ Identical |
| feat/ONEK-95-conversational-rfq-flow | origin/feat/ONEK-95-conversational-rfq-flow | ✅ Identical |

### Diverged Pair

| Local | Remote | Status |
|-------|--------|--------|
| feat/ONEK-96-rich-message-renderer | origin/feat/ONEK-96-rich-message-renderer | ⚠️ Local has 1 extra commit |

**Action:** Push local ONEK-96 to sync, or discard local changes.

---

## 6. Priority Merge Order Recommendation

### Phase 1: Immediate Safe Merges (No Conflicts)

```
1. origin/claude/jetvision-ux-requirements-58e9p     (0 behind, docs only)
2. origin/claude/update-avinode-api-integration-nlUeM (0 behind, docs only)
3. feat/ONEK-99-conversation-state                   (5 behind, new feature)
4. feat/ONEK-53-streaming-response-hook              (17 behind, isolated hook)
```

### Phase 2: UI Component Merges

```
5. feat/ONEK-94-action-buttons                       (10 behind, UI only)
6. feat/ONEK-96-rich-message-renderer                (22 behind, UI only)
```

### Phase 3: Agent Enhancement Merges (Require Careful Review)

```
7. origin/feat/ONEK-98-orchestrator-conversational   (23 behind, extends orchestrator)
8. origin/feat/ONEK-117-avinode-trip-display         (19 behind, extends flight-search)
9. feat/ONEK-95-conversational-rfq-flow              (10 behind, service layer)
```

### Phase 4: Requires Conflict Resolution

```
10. origin/feat/ONEK-30-flight-search-agent-avinode  (Rebase required - 1 conflict)
11. feat/complete-api-routes-layer                   (Rebase required - 6 conflicts)
```

### Phase 5: Abandon/Archive

```
❌ feat/chatkit-chat-page-and-tests                  (Too stale, 10 conflicts)
❌ fix/TASK-000-typescript-vitest-blockers           (Obsolete)
❌ origin/claude/fix-jetvision-company-name-*        (Outdated assessments)
ARCHIVED abcucinalabs/authentication-&-database      (Fork superseded, remote removed)
```

---

## 7. Actionable Recommendations

### Immediate Actions

1. **Delete duplicate local branches** (ONEK-53, ONEK-94, ONEK-95) after confirming remote is synced
2. **Push local ONEK-96** to sync with remote
3. **Renumber migration** in ONEK-99 from `010_` to `021_`

### Merge Sequence

```bash
# Phase 1: Safe documentation merges
gh pr create --base main --head claude/jetvision-ux-requirements-58e9p --title "docs: UX requirements for Avinode workflow"
gh pr create --base main --head claude/update-avinode-api-integration-nlUeM --title "docs: Avinode UX workflow alignment"

# Phase 2: New feature (after migration renumber)
gh pr create --base main --head feat/ONEK-99-conversation-state --title "feat(ONEK-99): Add conversation state management"

# Phase 3: Streaming hook
gh pr create --base main --head feat/ONEK-53-streaming-response-hook --title "feat(ONEK-53): Add streaming response hook"
```

### Architecture Improvements Needed

For ONEK-95 and ONEK-98 before merge:
1. Add MessageBus subscription for `TASK_COMPLETED` events
2. Use `handoffManager.handoff()` instead of direct agent calls
3. Register tools via `agent.registerTool()` pattern

### Branch Cleanup Commands

```bash
# Delete stale local branches
git branch -D fix/TASK-000-typescript-vitest-blockers
git branch -D feat/chatkit-chat-page-and-tests

# Delete synced local branches (keep remote)
git branch -D feat/ONEK-53-streaming-response-hook
git branch -D feat/ONEK-94-action-buttons
git branch -D feat/ONEK-95-conversational-rfq-flow

# Prune remote tracking branches
git remote prune origin
```

---

## 8. Risk Assessment Summary

| Risk Level | Branches | Action |
|------------|----------|--------|
| 🟢 LOW | ONEK-53, ONEK-94, ONEK-96, ONEK-99, claude/* docs | Safe to merge |
| 🟡 MEDIUM | ONEK-95, ONEK-98, ONEK-117 | Review architecture alignment |
| 🟠 HIGH | ONEK-30, complete-api-routes-layer | Requires conflict resolution |
| 🔴 CRITICAL | chatkit-chat-page-and-tests, TASK-000 | Abandon |

---

*Report generated by Claude Code branch analysis workflow*
