# Post Development Summary to Linear Issue

Post a structured development summary comment to a Linear issue, auto-gathering git context, file changes, and conversation highlights for UAT review.

## Parameters:

- **Linear Issue ID** (required): The Linear issue identifier (e.g., `ONEK-178`)
- Usage: `/linear-update-summary <linear-issue-id>`

## Actions to Execute:

### Step 1: Validate Input and Fetch Issue

1. **Parse the Linear issue ID** from `$ARGUMENTS`
   - If no argument provided, ask the user: "Which Linear issue should I post the summary to? (e.g., ONEK-178)"
   - Validate format matches `ONEK-\d+` pattern

2. **Fetch issue details** using the Linear MCP `get_issue` tool:
   - Retrieve issue title, status, assignee, and labels
   - If the issue is not found, report the error and stop
   - Store the issue title for the comment header

### Step 2: Gather Git Context

1. **Identify the current branch**:
   ```bash
   git branch --show-current
   ```

2. **Find the merge base with main**:
   ```bash
   git merge-base main HEAD
   ```

3. **Collect commits since divergence from main**:
   ```bash
   git log --oneline $(git merge-base main HEAD)..HEAD
   ```
   - If no commits found, warn the user and ask whether to proceed with a manual summary

4. **Gather file changes grouped by area**:
   ```bash
   git diff --stat $(git merge-base main HEAD)..HEAD
   ```
   - Group changed files by directory area:
     - `components/` - UI Components
     - `lib/` - Libraries & Utilities
     - `app/api/` - API Routes
     - `mcp-servers/` - MCP Servers
     - `agents/` - Agent System
     - `__tests__/` - Tests
     - Other - Configuration & Other

5. **Count insertions and deletions**:
   ```bash
   git diff --shortstat $(git merge-base main HEAD)..HEAD
   ```

### Step 3: Detect Associated Pull Request

1. **Check for an existing PR** on the current branch:
   ```bash
   gh pr list --head $(git branch --show-current) --json number,title,url --limit 1
   ```
   - If a PR exists, store its URL and number for the header
   - If no PR, omit the PR link from the summary

### Step 4: Gather Conversation Context

1. **Review the current conversation** for key activities:
   - Features implemented or enhanced
   - Bug fixes applied (with root cause and fix description)
   - Architectural decisions made
   - Refactoring or code quality improvements
   - Configuration changes

2. **Identify any known limitations or open items**:
   - Incomplete features or TODOs mentioned
   - Edge cases acknowledged but not addressed
   - Follow-up work discussed

3. **Extract UAT-relevant testing points**:
   - Key workflows to verify
   - Specific scenarios to test
   - Environment or setup requirements

### Step 5: Compose the Summary Comment

Build the comment using this markdown template structure:

```markdown
## Development Summary

**Issue**: {issue-title}
**Branch**: `{branch-name}`
**Date**: {YYYY-MM-DD}
**PR**: #{pr-number} (if exists, link to PR URL)

---

### Activities Completed

- {bullet list of completed work derived from commits and conversation}
- {each item should be a concise, human-readable description}
- {group related items together}

### Bug Fixes (only include if bugs were fixed)

| Description | Root Cause | Fix Applied |
|-------------|-----------|-------------|
| {bug description} | {what caused it} | {how it was fixed} |

### Changes Summary

| Area | Files Changed | Details |
|------|:------------:|---------|
| UI Components | {N} | {list of key files} |
| Libraries & Utilities | {N} | {list of key files} |
| API Routes | {N} | {list of key files} |
| MCP Servers | {N} | {list of key files} |
| Tests | {N} | {list of key files} |

**Total**: {N} files changed, {insertions} insertions(+), {deletions} deletions(-)

### Known Limitations / Open Items (only include if applicable)

- {items that are incomplete or need follow-up}
- {acknowledged edge cases}

### UAT Request

@AB — Please verify the following:

- [ ] {specific testable item 1}
- [ ] {specific testable item 2}
- [ ] {specific testable item 3}
- [ ] {regression check: existing functionality still works}

**Environment/Setup Notes**: {any special instructions for testing, e.g., "Clear browser cache", "Use Trip ID trp-XXX for testing", "Run `npm run dev` with latest .env"}
```

### Step 6: Post to Linear

1. **Show the composed comment** to the user for review before posting
2. **Ask for confirmation**: "Ready to post this summary to {issue-id}? (yes/edit/cancel)"
   - If **yes**: proceed to post
   - If **edit**: let the user suggest modifications, then recompose
   - If **cancel**: abort without posting
3. **Post the comment** using the Linear MCP `create_comment` tool with the issue ID and composed markdown
4. **Confirm success**: Report that the comment was posted, including a link to the Linear issue

### Step 7: Post-Action Summary

Report to the user:

- The comment was posted to {issue-id}: {issue-title}
- Number of activities documented
- Number of UAT items requested
- Reminder: "The UAT checkboxes are interactive in Linear — AB can check them off as verified"

## Notes:

- Always run this command from the **feature branch** (not main) to get accurate git diffs
- If the Linear MCP is not available, output the composed comment to the console so it can be copied manually
- The Bug Fixes table and Known Limitations sections are **conditional** — only include them if relevant content exists
- UAT items should be **specific and testable**, not generic (e.g., "Verify email preview shows correct margin values" not "Test the feature")
- If there are no commits on the branch yet, the command can still work with conversation-derived context only
- The comment is posted as-is — Linear renders markdown including checkboxes, tables, and code blocks
