#!/bin/bash
# Comprehensive branch analysis script

echo "# Branch Analysis Report"
echo "Generated: $(date)"
echo ""

BRANCHES=(
  "docs/workflow-and-coordination-system"
  "feat/PHASE-2-mcp-servers"
  "feat/TASK-002-database-schema"
  "feat/chatkit-chat-page-and-tests"
  "feat/complete-api-routes-layer"
  "feat/linear-github-automation"
  "feat/rfp-orchestrator-agent"
  "feat/rfp-processing-dashboard"
  "feat/ui-component-library-setup"
  "feat/user-profile-ui"
  "feature/task-008-avinode-mcp-server"
  "fix/TASK-000-typescript-vitest-blockers"
)

for branch in "${BRANCHES[@]}"; do
  echo "## Branch: $branch"
  echo ""

  # Checkout branch quietly
  git checkout "$branch" 2>/dev/null

  if [ $? -eq 0 ]; then
    # Get commit count
    commit_count=$(git log main..HEAD --oneline | wc -l | tr -d ' ')
    echo "**Commits ahead of main:** $commit_count"

    # Get last commit
    last_commit=$(git log -1 --format="%h - %s (%ar)" 2>/dev/null)
    echo "**Last commit:** $last_commit"

    # Get file changes
    echo "**Files changed:**"
    git diff main...HEAD --stat | head -20

    # Check for conflicts with main
    echo ""
    echo "**Merge check with main:**"
    git merge-tree $(git merge-base main HEAD) main HEAD > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo "✅ No conflicts detected"
    else
      echo "⚠️ Potential conflicts with main"
    fi

    echo ""
    echo "---"
    echo ""
  else
    echo "❌ Failed to checkout branch"
    echo ""
    echo "---"
    echo ""
  fi
done

# Return to main
git checkout main 2>/dev/null
