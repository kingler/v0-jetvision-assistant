# PR Follow-Up Issues

Analyze a GitHub PR and generate categorized follow-up Linear issues from failing CI checks, review feedback, tech debt, missing tests, and performance concerns.

## Parameters:

- **PR Number** (required): GitHub PR number or full URL
- **`--categories`** (optional): Comma-separated category filter — `ci`, `testing`, `performance`, `tech-debt`, `docs`, `security`
- **`--dry-run`** (optional): Show analysis without creating issues
- Usage: `/pr-followup-issues <pr-number|pr-url> [--categories=ci,testing] [--dry-run]`

## Actions to Execute:

### Step 1: Parse Arguments and Fetch PR Context

1. **Parse `$ARGUMENTS`**:
   - Extract PR number from bare number or full GitHub URL
   - Parse `--categories` filter if provided
   - Parse `--dry-run` flag if provided

2. **Fetch PR data** using `gh` CLI (run these in parallel):

   ```bash
   # PR metadata
   gh pr view {number} --json title,body,state,mergedAt,author,labels,reviewDecision,url,number,headRefName

   # CI check results
   gh pr checks {number} --json name,state,description

   # Review comments
   gh api repos/{owner}/{repo}/pulls/{number}/reviews --jq '.[].body'

   # Diff stats
   gh pr diff {number} --stat
   ```

3. **Display PR summary** to the user before analysis.

### Step 2: Analyze Follow-Ups by Category

Scan the fetched PR data to identify follow-ups in each category:

| Category | What to Scan | Signals |
|----------|-------------|---------|
| **CI/CD** | `gh pr checks` output | Checks with `state: FAILURE` or `PENDING` |
| **Testing** | Diff + checks | Coverage failures, missing test files, `skip`/`todo` in tests |
| **Performance** | Checks + diff | Performance check failures, large dependency additions |
| **Tech Debt** | Review comments + diff | TODO/FIXME/HACK comments, `any` types, `console.log` |
| **Documentation** | Diff + reviews | Missing JSDoc, outdated docs, review comments about docs |
| **Security** | Checks + diff | npm audit failures, hardcoded secrets patterns |

If `--categories` is provided, only analyze the specified categories.

### Step 3: Present Analysis for User Confirmation

Show categorized follow-ups with:
- Issue title, trigger signal, suggested priority, and effort estimate
- Let user: create all, select specific, edit, add custom, or cancel
- If `--dry-run`, display only — do not offer creation

### Step 4: Create Linear Issues

For each confirmed follow-up:

```
create_issue({
  title: "{Category}: {title}",
  description: "## Context\n\nFollow-up from PR #{number}: {pr_title}\n**PR**: {pr_url}\n**Trigger**: {signal}\n\n## Tasks\n\n{checklist}\n\n## Acceptance Criteria\n\n{generated criteria}\n\n## References\n\n- PR: {pr_url}",
  team: "One Kaleidoscope",
  labels: [{category labels}],
  priority: {1-4},
  estimate: {hours},
  state: "Backlog"
})
```

### Step 5: Set Dependencies

Link issues with logical dependencies (e.g., testing blocked by CI setup).

### Step 6: Display Final Report

Show all created issues with IDs, priorities, dependencies, and next steps.

## Error Handling

- **PR not found**: Stop with error message
- **No follow-ups detected**: Inform user, offer custom issue creation
- **Linear MCP unavailable**: Save as markdown to `docs/pr-followups/PR-{number}-followups.md`
- **gh CLI not authenticated**: Stop with `gh auth login` instructions

## Notes

- All issues are created in the **One Kaleidoscope** team with state **Backlog**
- Issue titles use category prefix for easy filtering (e.g., "CI/CD: Fix test environment")
- Dependencies are auto-detected (e.g., coverage issues depend on CI environment issues)
- The `--dry-run` flag is useful for reviewing before committing to issue creation
