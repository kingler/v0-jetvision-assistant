# Stash Review Plan — 16 Remaining Stashes

**Date**: 2026-02-09
**Context**: Dropped 65 safe-to-drop stashes. 16 remain at `stash@{0}` through `stash@{15}` requiring deeper review against git logs, branches, commits, and merges to main.

---

## Summary Table

| Stash | Branch/Context | Files | Risk | Issue Merged? | Likely Verdict |
|-------|---------------|-------|------|--------------|----------------|
| @{0} | fix/onek-208 | 2 | LOW | No (active) | Compare vs branch HEAD |
| @{1} | onek-207 (current) | 5 | MED | No (PR #100 open) | Compare vs committed work |
| @{2} | onek-207 (current) | 4 | MED | No (PR #100 open) | Compare vs committed work |
| @{3} | chat-title-dup-e93e4 | 2 (294 lines) | HIGH | N/A (local only) | Check if superseded |
| @{4} | fix/ONEK-177 | 5 | MED | YES | Likely DROP |
| @{5} | main (ONEK-190 post-merge) | 6 (-171 lines) | HIGH | YES | Likely DROP |
| @{6} | main (ONEK-190 leftover) | 9 | MED | YES | Likely DROP |
| @{7} | fix/ONEK-190 | 8 (190 lines) | HIGH | YES | Likely DROP |
| @{8} | fix/ONEK-177-service-charge | 1 | LOW | YES (ONEK-178) | Likely DROP |
| @{9} | main (unrelated) | 2 | MED | N/A | Check map-db-message |
| @{10} | main (bidir sync rollback) | 22 (-1978 net) | HIGH | Rolled back | Extract or DROP |
| @{11} | main (Jan 15 debug) | 2 | MED | N/A | Likely DROP |
| @{12} | main (empty-leg WIP) | 13 | HIGH | N/A | Check empty-leg status |
| @{13} | main (PR merge temp) | 21 (+2779) | HIGH | Temp for merge | Likely DROP |
| @{14} | main (pre-refactor) | 2 (6 lines) | LOW | N/A | DROP |
| @{15} | main (RFQ format) | 4 (305 lines) | MED | N/A | Likely DROP |

---

## Review Methodology

For each stash:

1. **Examine the diff**: `git stash show -p stash@{N}`
2. **Check merge status**: Was the associated issue/branch merged to main?
3. **Compare against current main**: Are the changes already present (possibly in different form)?
4. **Identify unique code**: Any functionality not yet on main that should be preserved?
5. **Decision**: DROP, extract to patch, or apply to a branch

---

## Priority Order

### Tier 1 — Quick Wins (LOW risk, likely DROP)
- **@{14}**: 6 lines, 33 days old, pre-refactoring — almost certainly superseded
- **@{8}**: 1 file, ONEK-178 fully merged — likely redundant
- **@{0}**: 2 files on active branch — just compare vs branch HEAD

### Tier 2 — Merged Issues (check for stragglers)
- **@{4}**: ONEK-177 merged, branch deleted — verify no unique changes
- **@{5}, @{6}, @{7}**: ONEK-190 merged, post-merge leftovers — verify cleanup
- **@{11}**: Debugging changes, 25 days old — likely just console.logs

### Tier 3 — Current Work (need careful comparison)
- **@{1}, @{2}**: On current onek-207 branch — compare against committed work
- **@{9}**: map-db-message changes on main — check current state

### Tier 4 — Large/Complex (need thorough analysis)
- **@{3}**: 294 lines on local-only branch — may contain unreleased feature work
- **@{10}**: 22-file bidirectional sync rollback — may contain reusable integration code
- **@{12}**: empty-leg components — check if feature is planned
- **@{13}**: Avinode MCP dist + source — check if source changes are unique
- **@{15}**: RFQ format changes, oldest stash — likely fully superseded

---

## Execution Plan

### Phase 1: Quick Drops (est. 5 min)
Review and drop Tier 1 stashes (@{14}, @{8}, @{0}).

### Phase 2: Merged Issue Cleanup (est. 10 min)
Review Tier 2 stashes (@{4}, @{5}, @{6}, @{7}, @{11}) against merged commits.

### Phase 3: Current Work Comparison (est. 10 min)
Review Tier 3 stashes (@{1}, @{2}, @{9}) against current branch state.

### Phase 4: Deep Analysis (est. 20 min)
Review Tier 4 stashes (@{3}, @{10}, @{12}, @{13}, @{15}) with full diff examination.
Extract any unique code to patch files before dropping.

### Post-Review
- Verify `git stash list` is empty (or only contains intentional WIP)
- Run `git stash list | wc -l` to confirm final count
- Delete any orphan local branches identified during review (e.g., chat-title-dup-e93e4)
