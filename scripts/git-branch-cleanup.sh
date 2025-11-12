#!/bin/bash
# Git Branch Cleanup Script
# Automated branch cleanup following GIT_WORKFLOW_PROTOCOL.md
# Generated: 2025-11-12

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
REPORT_DIR="reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--dry-run]"
      echo ""
      echo "Options:"
      echo "  --dry-run    Show what would be deleted without actually deleting"
      echo "  --help       Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Header
echo -e "${BLUE}=== Git Branch Cleanup ===${NC}"
echo "Date: $(date)"
echo "Repository: $(basename $(git rev-parse --show-toplevel))"
echo "Current branch: $(git branch --show-current)"
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}Mode: DRY RUN (no changes will be made)${NC}"
else
  echo -e "${RED}Mode: LIVE (branches will be deleted)${NC}"
fi
echo ""

# Safety check: Ensure we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}Error: Not a git repository${NC}"
  exit 1
fi

# Safety check: Ensure main branch exists
if ! git show-ref --verify --quiet refs/heads/main; then
  echo -e "${RED}Error: main branch not found${NC}"
  exit 1
fi

# Safety check: Don't run from non-main branch with uncommitted changes
if [ "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
  if [ "$DRY_RUN" = false ]; then
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Aborted"
      exit 1
    fi
  fi
fi

# Create reports directory if it doesn't exist
mkdir -p "$REPORT_DIR"

# List of merged remote branches to delete
BRANCHES_TO_DELETE=(
  "feat/chatkit-frontend-clean"
  "feat/TASK-002-database-schema"
  "claude/fix-jetvision-company-name-011CUeAGoNLoMU7DM5AoJddf"
  "add-claude-github-actions-1762088487382"
  "feat/ONEK-81-execute-tool-function"
  "feat/TASK-002-supabase-database-schema"
  "feature/mcp-ui-chatkit-integration"
  "feature/onek-78-mcp-server-manager"
  "fix/TASK-000-typescript-vitest-blockers"
  "feat/automated-pr-code-review"
  "feat/apply-user-table-migrations"
  "feat/TASK-001-clerk-authentication"
  "feat/rfp-processing-dashboard"
)

# Count branches
TOTAL_BRANCHES=${#BRANCHES_TO_DELETE[@]}
DELETED_COUNT=0
SKIPPED_COUNT=0
ERROR_COUNT=0

echo -e "${BLUE}Phase 1: Analyzing branches...${NC}"
echo "Found $TOTAL_BRANCHES branches to process"
echo ""

# Verify each branch exists on remote
echo -e "${BLUE}Phase 2: Verifying remote branches...${NC}"
for branch in "${BRANCHES_TO_DELETE[@]}"; do
  if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
    echo -e "${GREEN}✓${NC} $branch (exists on remote)"
  else
    echo -e "${YELLOW}⊘${NC} $branch (not found on remote, will skip)"
    ((SKIPPED_COUNT++))
  fi
done
echo ""

# Confirm deletion (if not dry run)
if [ "$DRY_RUN" = false ]; then
  echo -e "${RED}WARNING: This will delete $((TOTAL_BRANCHES - SKIPPED_COUNT)) remote branches${NC}"
  read -p "Are you sure you want to proceed? (yes/NO) " -r
  echo
  if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Aborted"
    exit 1
  fi
fi

# Phase 3: Delete branches
echo -e "${BLUE}Phase 3: Deleting remote branches...${NC}"
DELETION_LOG="$REPORT_DIR/branch-deletion-log-$TIMESTAMP.txt"
echo "Branch Deletion Log - $(date)" > "$DELETION_LOG"
echo "======================================" >> "$DELETION_LOG"
echo "" >> "$DELETION_LOG"

for branch in "${BRANCHES_TO_DELETE[@]}"; do
  # Check if branch exists on remote
  if ! git ls-remote --heads origin "$branch" | grep -q "$branch"; then
    echo -e "${YELLOW}⊘${NC} Skipping $branch (not found)"
    echo "SKIPPED: $branch (not found on remote)" >> "$DELETION_LOG"
    ((SKIPPED_COUNT++))
    continue
  fi

  # Delete branch
  if [ "$DRY_RUN" = true ]; then
    echo -e "${BLUE}[DRY RUN]${NC} Would delete: origin/$branch"
    echo "DRY RUN: Would delete origin/$branch" >> "$DELETION_LOG"
    ((DELETED_COUNT++))
  else
    if git push origin --delete "$branch" 2>&1 | tee -a "$DELETION_LOG"; then
      echo -e "${GREEN}✓${NC} Deleted: origin/$branch"
      echo "SUCCESS: Deleted origin/$branch at $(date)" >> "$DELETION_LOG"
      ((DELETED_COUNT++))
    else
      echo -e "${RED}✗${NC} Failed to delete: origin/$branch"
      echo "ERROR: Failed to delete origin/$branch at $(date)" >> "$DELETION_LOG"
      ((ERROR_COUNT++))
    fi
  fi
done
echo ""

# Phase 4: Prune local references
echo -e "${BLUE}Phase 4: Pruning local references...${NC}"
if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}[DRY RUN]${NC} Would run: git fetch --prune --prune-tags"
else
  if git fetch --prune --prune-tags; then
    echo -e "${GREEN}✓${NC} Pruned stale remote references"
  else
    echo -e "${YELLOW}⚠${NC} Warning: Failed to prune references"
  fi
fi
echo ""

# Phase 5: Summary report
echo -e "${BLUE}=== Cleanup Summary ===${NC}"
echo "Total branches processed: $TOTAL_BRANCHES"
echo -e "${GREEN}Deleted: $DELETED_COUNT${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED_COUNT${NC}"
if [ $ERROR_COUNT -gt 0 ]; then
  echo -e "${RED}Errors: $ERROR_COUNT${NC}"
fi
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}This was a DRY RUN. No changes were made.${NC}"
  echo "To execute cleanup, run: $0"
else
  echo -e "${GREEN}Cleanup completed successfully!${NC}"
  echo "Deletion log saved to: $DELETION_LOG"
fi
echo ""

# Phase 6: Verification
if [ "$DRY_RUN" = false ] && [ $DELETED_COUNT -gt 0 ]; then
  echo -e "${BLUE}Phase 5: Verifying repository health...${NC}"

  # Check main branch
  git checkout main > /dev/null 2>&1
  if git pull origin main > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Main branch is healthy"
  else
    echo -e "${YELLOW}⚠${NC} Warning: Could not pull main branch"
  fi

  # List remaining remote branches
  echo ""
  echo "Remaining remote branches:"
  git branch -r | grep -v "HEAD" | grep "origin/" | sed 's/origin\///' | head -10
  echo ""
fi

# Recommendations
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Review deletion log: cat $DELETION_LOG"
echo "2. Verify repository: git fsck --full"
echo "3. Run tests: npm test"
echo "4. Schedule next cleanup: Add to calendar (monthly)"
echo ""

exit 0
