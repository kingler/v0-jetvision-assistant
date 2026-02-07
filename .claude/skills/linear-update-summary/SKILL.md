---
name: linear-update-summary
description: Post structured development summaries to Linear issues for UAT review. Use after completing development work, before requesting UAT, or at the end of a coding session to document what was done.
---

# Linear Update Summary Skill

Post professional, structured development summaries to Linear issues with auto-gathered git context, file change groupings, and interactive UAT checklists.

## When to Use This Skill

- **After completing development work** on a Linear issue (feature, bug fix, refactor)
- **Before requesting UAT** from AB or another reviewer
- **At the end of a coding session** to document progress
- **After merging a PR** to summarize what shipped
- **When switching context** to leave a clear record of work done

## Prerequisites

1. **Linear MCP** must be configured in `.claude/config.json` (under `mcp.servers.linear`)
2. **Feature branch** checked out (not `main`) — git diffs are computed against `main`
3. **`gh` CLI** installed and authenticated (for PR detection)
4. **Commits on the branch** — at least one commit since diverging from `main` (conversation-only summaries are supported but less rich)

## Command Usage

```bash
/linear-update-summary ONEK-178
```

The command will:
1. Validate the issue exists in Linear
2. Auto-gather git commits, file diffs, and branch info
3. Detect any associated pull request
4. Extract activities, bug fixes, and decisions from the conversation
5. Compose a structured markdown comment
6. Show it to you for review before posting
7. Post to the Linear issue via MCP

## Comment Structure

The posted comment follows this structure:

### Header
- Issue title, branch name, date
- PR link (if one exists)

### Activities Completed
- Bullet list derived from git commits and conversation context
- Grouped by related work (e.g., "Added email preview", "Fixed reactivity bug")

### Bug Fixes (conditional)
- Table format: Description | Root Cause | Fix Applied
- Only included when bugs were actually fixed

### Changes Summary
- Files grouped by codebase area (components/, lib/, api/, etc.)
- File counts per area with key file names
- Total insertions/deletions stat line

### Known Limitations / Open Items (conditional)
- Incomplete work or acknowledged edge cases
- Only included when relevant

### UAT Request
- `@AB` mention with `- [ ]` checkbox items
- Checkboxes are interactive in Linear
- Environment/setup notes for testing

## Best Practices

### Run From the Feature Branch

Always run from the feature branch, not `main`. The command uses `git merge-base main HEAD` to compute diffs — running from `main` will produce empty results.

```bash
# Correct
git checkout feat/ONEK-178-email-preview
/linear-update-summary ONEK-178

# Wrong — will show no changes
git checkout main
/linear-update-summary ONEK-178
```

### Review Before Posting

The command shows the composed comment before posting. Use this opportunity to:
- Verify the activities list is complete and accurate
- Ensure bug fix descriptions are clear
- Confirm UAT items are specific and testable
- Add any context the auto-gathering missed

### Write Specific UAT Items

Good UAT items are concrete and testable:

| Good | Bad |
|------|-----|
| "Verify email preview shows correct margin values when slider is adjusted" | "Test email feature" |
| "Confirm RFQ price updates refresh in real-time without page reload" | "Check prices work" |
| "Verify round-trip proposals show all legs in correct order" | "Test proposals" |

### Include Environment Notes

If testing requires specific setup, include it:
- "Use Trip ID `trp-123456` which has 3 operator quotes"
- "Clear browser cache before testing — CSS changes may be cached"
- "Requires `.env.local` update: `FEATURE_FLAG_EMAIL=true`"

## Integration with Workflow

### Typical Development Flow

```
1. Pick up Linear issue (ONEK-XXX)
2. Create feature branch
3. Implement the feature
4. Run e2e tests: /e2e-test-issue ONEK-XXX
5. Fix any issues found
6. Post summary: /linear-update-summary ONEK-XXX
7. Create PR if not already done
```

### Pairing with E2E Testing

Run `/e2e-test-issue` first to catch bugs, then `/linear-update-summary` to document the work:

```bash
# Test first
/e2e-test-issue ONEK-178

# Fix any issues found...

# Then summarize
/linear-update-summary ONEK-178
```

The summary will include any bugs found and fixed during the e2e testing phase.

## Troubleshooting

### Linear MCP Not Available

If the Linear MCP server is not running or not configured:
- The command will output the composed comment to the console
- You can copy and paste it into Linear manually
- Check `.claude/config.json` has the `mcp.servers.linear` entry

### No Commits on Branch

If you're on a feature branch with no commits yet:
- The command will warn you but can still proceed
- It will use conversation context only (no git-derived activities)
- Consider committing your work first for a richer summary

### Issue Not Found

If the Linear issue ID is invalid or not accessible:
- Verify the issue ID format (e.g., `ONEK-178`, not `178`)
- Ensure the Linear MCP has access to your team's workspace
- Check that the issue hasn't been deleted or archived

### Branch Has No Merge Base with Main

If the branch was created from a non-main branch:
- The command falls back to `git log --oneline -20` for recent commits
- File diffs may be broader than expected
- Consider rebasing onto `main` first for accurate diffs

## Example Output

Here's what a posted comment looks like in Linear:

```markdown
## Development Summary

**Issue**: Add email preview with margin slider before sending proposal
**Branch**: `feat/ONEK-178-email-preview`
**Date**: 2026-02-05
**PR**: #95

---

### Activities Completed

- Added email preview dialog with live margin percentage slider
- Implemented real-time price recalculation as margin adjusts
- Created proposal fingerprint utility for change detection
- Updated proposal service to support margin-adjusted pricing
- Added confirmation step before sending email via Gmail MCP

### Bug Fixes

| Description | Root Cause | Fix Applied |
|-------------|-----------|-------------|
| RFQ prices not refreshing in chat | Stale closure in useEffect capturing old state | Added custom memo comparison + dependency fix |
| Round-trip proposals showing single leg | Proposal generator not iterating all legs | Fixed leg iteration in proposal-service.ts |

### Changes Summary

| Area | Files Changed | Details |
|------|:------------:|---------|
| UI Components | 3 | chat-interface.tsx, flight-search-progress.tsx, customer-selection-dialog.tsx |
| Libraries | 3 | proposal-service.ts, proposal-fingerprint.ts, jetvision-system-prompt.ts |
| API Routes | 2 | chat/route.ts, proposal/generate/route.ts |
| MCP Servers | 2 | avinode-mcp-server (src + dist) |

**Total**: 10 files changed, 847 insertions(+), 203 deletions(-)

### UAT Request

@AB — Please verify the following:

- [ ] Open a trip with operator quotes and trigger "Send Proposal"
- [ ] Verify email preview dialog appears with margin slider (0-30%)
- [ ] Adjust margin slider and confirm prices update in real-time
- [ ] Send the email and verify it arrives with correct pricing
- [ ] Test with a round-trip (multi-leg) proposal — all legs should appear

**Environment/Setup Notes**: Use Trip ID `trp-789012` which has 3 operator quotes. Run `npm run dev` to start both app and MCP servers.
```

## References

- [e2e-test-issue.md](.claude/commands/e2e-test-issue.md) — E2E testing command (complementary workflow)
- [complete_task.md](.claude/commands/complete_task.md) — Task completion command
- [Linear MCP](https://mcp.linear.app) — Linear MCP server documentation
