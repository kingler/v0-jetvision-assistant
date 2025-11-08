#!/bin/bash
# PR #39 Conflict Resolution Script
# Generated: 2025-11-02
# Purpose: Automated conflict resolution and validation for PR #39

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}PR #39 Conflict Resolution Script${NC}"
echo -e "${YELLOW}========================================${NC}\n"

# Step 1: Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Step 1: Current branch check${NC}"
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" = "feat/linear-github-automation" ]; then
  echo -e "${GREEN}✓ Already on PR #39 branch${NC}\n"
else
  echo -e "${RED}✗ Not on PR #39 branch${NC}"
  echo "Current work needs to be saved first."
  echo ""

  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}You have uncommitted changes. Choose an option:${NC}"
    echo "1. Stash changes and switch to PR #39 branch"
    echo "2. Abort (save changes manually first)"
    read -p "Enter choice (1 or 2): " CHOICE

    if [ "$CHOICE" = "1" ]; then
      echo "Stashing changes..."
      git stash push -m "WIP: ${CURRENT_BRANCH} - auto-stashed before PR #39 fix"
      echo -e "${GREEN}✓ Changes stashed${NC}\n"
    else
      echo -e "${RED}Aborting. Please save your changes and re-run this script.${NC}"
      exit 1
    fi
  fi

  # Switch to PR branch
  echo "Switching to feat/linear-github-automation..."
  git fetch origin feat/linear-github-automation
  git checkout feat/linear-github-automation
  echo -e "${GREEN}✓ Switched to PR #39 branch${NC}\n"
fi

# Step 2: Check for merge conflicts
echo -e "${YELLOW}Step 2: Checking for merge conflicts${NC}"
if git diff --check --cached; then
  echo -e "${GREEN}✓ No staged merge conflicts${NC}\n"
else
  echo -e "${RED}✗ Merge conflicts detected in staged files${NC}\n"
fi

# Step 3: Fix package.json conflicts
echo -e "${YELLOW}Step 3: Fixing package.json${NC}"

if grep -q "<<<<<<< HEAD" package.json 2>/dev/null; then
  echo -e "${RED}✗ Merge conflict markers found in package.json${NC}"
  echo "Creating backup..."
  cp package.json package.json.backup

  echo "This script cannot automatically resolve package.json conflicts."
  echo "Please manually edit package.json to:"
  echo "  1. Remove conflict markers (<<<<<<, =======, >>>>>>>)"
  echo "  2. Keep BOTH script sets (clerk AND redis scripts)"
  echo "  3. Remove duplicate dependencies"
  echo ""
  echo "Opening package.json in default editor..."

  # Try to open in VS Code, fall back to default editor
  if command -v code &> /dev/null; then
    code package.json
  elif [ -n "$EDITOR" ]; then
    $EDITOR package.json
  else
    echo "Please manually edit: package.json"
  fi

  echo ""
  read -p "Press Enter after you've fixed package.json..."

  # Verify no conflict markers remain
  if grep -q "<<<<<<< HEAD" package.json; then
    echo -e "${RED}✗ Conflict markers still present in package.json${NC}"
    echo "Please complete the merge resolution and re-run this script."
    exit 1
  else
    echo -e "${GREEN}✓ package.json conflict markers removed${NC}\n"
  fi
else
  echo -e "${GREEN}✓ No conflict markers in package.json${NC}\n"
fi

# Step 4: Validate package.json
echo -e "${YELLOW}Step 4: Validating package.json${NC}"
if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))"; then
  echo -e "${GREEN}✓ package.json is valid JSON${NC}\n"
else
  echo -e "${RED}✗ package.json has JSON syntax errors${NC}"
  echo "Please fix syntax errors and re-run this script."
  exit 1
fi

# Step 5: Update pnpm lockfile
echo -e "${YELLOW}Step 5: Updating pnpm lockfile${NC}"
echo "Running: pnpm install"
if pnpm install; then
  echo -e "${GREEN}✓ Dependencies installed successfully${NC}\n"
else
  echo -e "${RED}✗ Dependency installation failed${NC}"
  echo "Check the error messages above and fix any issues."
  exit 1
fi

# Step 6: Check for other conflict files
echo -e "${YELLOW}Step 6: Checking other files for conflicts${NC}"
CONFLICT_FILES=$(git diff --name-only --diff-filter=U 2>/dev/null || echo "")

if [ -z "$CONFLICT_FILES" ]; then
  echo -e "${GREEN}✓ No unmerged files${NC}\n"
else
  echo -e "${RED}✗ Unmerged files found:${NC}"
  echo "$CONFLICT_FILES"
  echo ""
  echo "Please resolve these conflicts manually:"
  for file in $CONFLICT_FILES; do
    echo "  - $file"
  done
  echo ""
  read -p "Press Enter after resolving conflicts..."
fi

# Step 7: Stage resolved files
echo -e "${YELLOW}Step 7: Staging resolved files${NC}"
git add package.json pnpm-lock.yaml 2>/dev/null || true
echo -e "${GREEN}✓ Files staged${NC}\n"

# Step 8: Run validation
echo -e "${YELLOW}Step 8: Running validation${NC}"

echo "Type checking..."
if npm run type-check; then
  echo -e "${GREEN}✓ Type check passed${NC}"
else
  echo -e "${YELLOW}⚠ Type check failed (review errors above)${NC}"
fi

echo ""
echo "Linting..."
if npm run lint; then
  echo -e "${GREEN}✓ Lint passed${NC}"
else
  echo -e "${YELLOW}⚠ Lint failed (review errors above)${NC}"
fi

echo ""
echo "Running code validation..."
if npm run review:validate; then
  echo -e "${GREEN}✓ Code validation passed${NC}"
else
  echo -e "${YELLOW}⚠ Code validation failed (review errors above)${NC}"
fi

# Step 9: Commit if changes exist
echo ""
echo -e "${YELLOW}Step 9: Committing changes${NC}"

if git diff --cached --quiet; then
  echo -e "${YELLOW}⚠ No changes to commit${NC}\n"
else
  echo "Changes ready to commit:"
  git diff --cached --name-only
  echo ""
  read -p "Commit these changes? (y/n): " COMMIT_CHOICE

  if [ "$COMMIT_CHOICE" = "y" ] || [ "$COMMIT_CHOICE" = "Y" ]; then
    git commit -m "fix: resolve merge conflicts and update dependencies for PR #39

- Merge clerk scripts and redis scripts in package.json
- Update pnpm-lock.yaml with avinode-mcp-server dependencies
- Resolve conflicts in component files

Resolves CI failures:
- ERR_PNPM_OUTDATED_LOCKFILE
- JSON parse errors in package.json"

    echo -e "${GREEN}✓ Changes committed${NC}\n"
  else
    echo -e "${YELLOW}⚠ Changes staged but not committed${NC}\n"
  fi
fi

# Step 10: Summary and next steps
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Summary${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo "Next steps:"
echo "1. Review the changes:"
echo "   git diff origin/feat/linear-github-automation"
echo ""
echo "2. Push to trigger CI:"
echo "   git push origin feat/linear-github-automation --force-with-lease"
echo ""
echo "3. Monitor CI checks at:"
echo "   https://github.com/kingler/v0-jetvision-assistant/pull/39/checks"
echo ""
echo "4. Once all checks pass, the PR will be ready for merge."
echo ""
echo -e "${GREEN}Script completed!${NC}"
