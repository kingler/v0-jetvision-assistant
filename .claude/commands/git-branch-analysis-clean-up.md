# Git Branch Analysis & Cleanup Workflow

## Overview

Comprehensive workflow for analyzing, prioritizing, and safely cleaning up Git branches while preserving all valuable work. Follows the "review before action" principle established in `docs/GIT_WORKFLOW_PROTOCOL.md`.

---

## Phase 1: Discovery & Inventory

### 1.1 Branch Discovery

Analyze all branches (local, remote, and worktree branches) to create a complete inventory:

**Actions:**

- List all local branches with commit metadata
- List all remote branches with last activity dates
- Identify worktree branches (if using git worktree)
- Generate branch report with key metrics

**Commands:**

```bash
# Local branches with details
git branch -vv --format='%(refname:short) | %(committerdate:relative) | %(authorname) | %(subject)'

# Remote branches
git branch -r --format='%(refname:short) | %(committerdate:relative)'

# Branch comparison with main
git for-each-ref --sort=-committerdate refs/heads/ --format='%(refname:short) | %(committerdate:relative) | %(upstream:short)'
```

**Output:** Create a structured inventory document listing all branches with metadata.

---

## Phase 2: Status Analysis & Categorization

### 2.1 Categorize Branches

Classify each branch into one of these categories:

**Categories:**

1. **ACTIVE** - Recent commits, open PR, or work in progress
2. **MERGED** - Already merged to main (safe to delete)
3. **STALE** - No activity >30 days but potentially valuable
4. **OBsolete** - No activity >90 days, contains nothing of value
5. **BLOCKED** - Has unmerged commits or conflicts
6. **DEPENDENT** - Branch depends on other branches

**Analysis Checks:**

```bash
# Check if merged into main
git branch --merged main

# Check if merged into dev (if applicable)
git branch --merged dev

# Find branches with commits not in main
git for-each-ref --format='%(refname:short)' refs/heads/ | while read branch; do
  echo "$branch: $(git rev-list --count main..$branch) commits ahead"
done

# Find branches with no commits for X days
git for-each-ref --sort=-committerdate refs/heads/ --format='%(refname:short) | %(committerdate)' | awk -v days=30 '{...}'
```

**Output:** Categorized branch list with reasoning for each classification.

---

## Phase 3: Active Work Protection

### 3.1 Identify Active Work

**CRITICAL:** Never delete branches with active work.

**Checks:**

- Open Pull Requests (GitHub/GitLab)
- Recent commits (<7 days)
- Linked Linear/Jira issues in progress
- Branch protection rules
- Recent CI/CD activity

**Commands:**

```bash
# Check PR status (GitHub CLI)
gh pr list --state all --limit 100

# Check recent activity
git for-each-ref --sort=-committerdate refs/heads/ --format='%(refname:short) | %(committerdate)' | head -20

# Check for uncommitted work
git for-each-ref --format='%(refname:short)' refs/heads/ | while read branch; do
  git log --oneline $branch --since="7 days ago" | wc -l
done
```

**Action:** Create a protected branches list - these will not be touched during cleanup.

---

## Phase 4: Merge Decision Matrix

### 4.1 Evaluate Merge Candidates

For branches with unmerged commits, determine merge strategy:

**Decision Matrix:**

- **Squash & Merge** (preferred per GIT_WORKFLOW_PROTOCOL.md):
  - Clean commit history
  - Single feature per branch
  - No complex merge conflicts
- **Rebase & Merge**:
  - Linear history required
  - Small, focused changesets
- **No Merge** (Archive):
  - Experimental work
  - Abandoned features
  - Superseded by newer implementations

**Commands:**

```bash
# Compare branch with main
git log main..<branch-name> --oneline

# Check for conflicts
git checkout main
git merge --no-commit --no-ff <branch-name>
git merge --abort  # Clean up test merge
```

**Documentation:** For each merge candidate, document:

- Branch purpose and commits
- Merge strategy decision and reasoning
- Any manual intervention required

---

## Phase 5: Pull Request Management

### 5.1 Process Open PRs First

**Principle:** Complete active work before cleanup.

**Priority Order:**

1. **High Priority**: Critical bug fixes, security patches
2. **Medium Priority**: Feature implementations
3. **Low Priority**: Documentation, minor improvements

**PR Workflow:**

```bash
# List all PRs with details
gh pr list --state open --json number,title,headRefName,isDraft,additions,deletions

# For each PR:
# 1. Review code changes
gh pr view <number>

# 2. Run quality checks
gh pr checks <number>

# 3. Request review or approve
gh pr review <number> --approve --body "LGTM!"

# 4. Merge following protocol
gh pr merge <number> --squash --delete-branch
```

**Follow Protocol:**

- Use squash merge (GIT_WORKFLOW_PROTOCOL.md)
- Verify all checks pass before merge
- Delete branch automatically on merge
- Update task status to completed

---

## Phase 6: Linear/Jira Integration

### 6.1 Sync with Project Management

Link GitHub PRs with Linear issues or Jira tickets.

**Actions:**

- Identify PRs without linked issues
- Update issue status based on PR status
- Close completed issues
- Archive obsolete work

**Integration:**

```bash
# Find PRs that mention Linear issues
gh pr list --state all --json number,title,body --jq '.[] | select(.body | test("LINEAR|Issue"))'

# Extract issue IDs
gh pr list --state all --json number,body --jq '.[] | select(.body | test("LINEAR-\\d+")) | "PR #\(.number): \(.body)"'
```

**Documentation:** Maintain mapping of PRs → Issues for traceability.

---

## Phase 7: Safe Deletion Process

### 7.1 Pre-Deletion Verification

**Triple-check** before deleting any branch:

**Checklist:**

- [ ] Branch is not in protected list
- [ ] No open PR references this branch
- [ ] All commits are merged OR confirmed obsolete
- [ ] No recent commits (<30 days unless obsolete)
- [ ] Backup created if unsure
- [ ] Team notified if shared branch

**Verification Commands:**

```bash
# List commits unique to branch
git log main..<branch-name> --oneline

# Search for branch references in PRs
gh pr list --state all --json number,headRefName | jq '.[] | select(.headRefName == "<branch-name>")'

# Create backup tag before deletion
git tag archive/<branch-name> <branch-name>
```

### 7.2 Executing Deletions

**Local Branches:**

```bash
# Safe deletion (only if merged)
git branch -d <branch-name>

# Force deletion (only after verification)
git branch -D <branch-name>
```

**Remote Branches:**

```bash
# Delete remote branch
git push origin --delete <branch-name>

# Prune deleted remote branches
git fetch --prune --prune-tags
```

**Batch Cleanup (Local):**

```bash
# Delete all merged branches except main
git branch --merged main | grep -v "^\*\|main\|dev" | xargs -n 1 git branch -d
```

**Batch Cleanup (Remote):**

```bash
# Delete all remote branches merged to main
git branch -r --merged main | grep -v "origin/main\|origin/dev" | sed 's/origin\///' | xargs -I {} git push origin --delete {}
```

---

## Phase 8: Automation & Documentation

### 8.1 Create Cleanup Scripts

Build reusable automation for future cleanup cycles.

**Script Structure:**

```bash
#!/bin/bash
# git-branch-cleanup.sh
# Automated branch cleanup script

set -e  # Exit on error

echo "=== Git Branch Analysis & Cleanup ==="
echo "Date: $(date)"
echo ""

# Phase 1: Discovery
echo "Phase 1: Discovering branches..."
./scripts/branch-inventory.sh > reports/branch-inventory-$(date +%Y%m%d).txt

# Phase 2: Analysis
echo "Phase 2: Categorizing branches..."
./scripts/branch-categorize.sh > reports/branch-categories-$(date +%Y%m%d).txt

# Phase 3: Safety check
echo "Phase 3: Checking for active work..."
./scripts/branch-safety-check.sh

# Phase 4: Generate report
echo "Phase 4: Generating cleanup report..."
./scripts/generate-cleanup-report.sh

echo ""
echo "=== Cleanup Plan Generated ==="
echo "Review reports/ before executing cleanup"
echo ""
echo "To execute cleanup:"
echo "  bash scripts/execute-cleanup.sh --dry-run   # Preview changes"
echo "  bash scripts/execute-cleanup.sh             # Apply changes"
```

**Components:**

- `branch-inventory.sh` - List all branches with metadata
- `branch-categorize.sh` - Classify branches
- `branch-safety-check.sh` - Verify no active work
- `generate-cleanup-report.sh` - Create action plan
- `execute-cleanup.sh` - Apply deletions safely

### 8.2 Documentation

Document the cleanup process for future reference.

**Documentation Includes:**

- Summary report of branches processed
- Deletion log with timestamps
- Rationale for each decision
- Metrics (branches deleted, space recovered, etc.)
- Lessons learned and process improvements

**Template:**

```markdown
# Branch Cleanup Report - YYYY-MM-DD

## Summary

- Total branches analyzed: X
- Branches deleted: Y
- Branches preserved: Z
- Space recovered: ~N MB

## Categories

| Category | Count | Actions                      |
| -------- | ----- | ---------------------------- |
| Active   | X     | Preserved                    |
| Merged   | Y     | Deleted (local & remote)     |
| Stale    | Z     | Archived, scheduled deletion |
| Obsolete | N     | Deleted                      |

## Decisions

[Detailed rationale for each category]

## Automation

[Scripts created/modified]

## Next Cleanup

Scheduled: [Date]
```

---

## Phase 9: Validation & Rollback

### 9.1 Post-Cleanup Verification

Verify the repository is healthy after cleanup.

**Checks:**

```bash
# Verify main branch integrity
git checkout main
git pull origin main
git log --oneline -10  # Should look normal

# Check for broken references
git fsck --full

# Verify remote branches
git remote show origin

# Run full test suite
npm test  # or your test command

# Verify build
npm run build
```

### 9.2 Rollback Procedure

If issues are discovered, know how to restore.

**Recovery Commands:**

```bash
# Restore from backup tag
git checkout -b restored/<branch-name> archive/<branch-name>

# Re-fetch deleted remote (if recently deleted)
git fetch origin <branch-name>:<branch-name>

# Restore from reflog
git reflog  # Find the deletion commit
git checkout -b restored/<branch-name> <commit-hash>
```

---

## Phase 10: Continuous Improvement

### 10.1 Establish Maintenance Schedule

**Recommended Frequency:**

- **Weekly**: Review and merge open PRs
- **Monthly**: Cleanup merged branches
- **Quarterly**: Deep analysis and archival

**Automation:**

- GitHub Actions workflow for monthly cleanup
- Slack/email notifications for stale branches
- Dashboard showing branch health metrics

### 10.2 Metrics & Monitoring

Track key metrics over time:

**Metrics:**

- Total branches count
- Active branches ratio
- Average branch lifetime
- Merge-to-delete time
- Cleanup automation success rate

**Dashboards:**

```bash
# Generate metrics
scripts/branch-metrics.sh > reports/branch-metrics-$(date +%Y%m%d).txt

# Visualize trends
scripts/generate-branch-health-dashboard.sh
```

---

## Safety Principles

### Golden Rules

1. **Never delete without review** - Always analyze before acting
2. **Protect active work** - When in doubt, preserve
3. **Document everything** - Track all decisions and actions
4. **Automate safely** - Use --dry-run extensively
5. **Maintain backups** - Tag before deleting uncertain branches
6. **Verify everything** - Test after cleanup operations
7. **Follow protocol** - Adhere to GIT_WORKFLOW_PROTOCOL.md

### Emergency Contacts

Document who to contact if critical issues arise during cleanup.

---

## Execution Order Summary

1. **Phase 1-2**: Discovery & Categorization (30 min)
2. **Phase 3**: Active Work Protection (15 min)
3. **Phase 4**: Merge Evaluation (1-2 hours)
4. **Phase 5**: PR Management (variable)
5. **Phase 6**: Issue Sync (30 min)
6. **Phase 7**: Safe Deletion (30 min)
7. **Phase 8**: Automation Setup (1 hour)
8. **Phase 9**: Validation (15 min)
9. **Phase 10**: Continuous Monitoring (ongoing)

**Total Time for Initial Cleanup:** 3-6 hours
**Recurring Cleanup:** 30-60 minutes monthly

---

## References

- **Primary Protocol**: `docs/GIT_WORKFLOW_PROTOCOL.md`
- **PR Template**: `.github/PULL_REQUEST_TEMPLATE.md`
- **Task Index**: `tasks/TASK_INDEX.md`
- **Multi-Agent Workflow**: `docs/architecture/MULTI_AGENT_SYSTEM.md`

---

**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team  
**Review Frequency:** Quarterly
