#!/bin/bash
# Initialize Git Worktree Agent Workspace Isolation System
#
# Workspaces are stored at ~/.claude/git-workspace/ and mapped to
# Linear Issues, Git Branches, and Pull Requests.

set -e  # Exit on error

WORKSPACE_ROOT="$HOME/.claude/git-workspace"

echo "🚀 Initializing Git Worktree Agent Workspace System"
echo "=================================================="
echo ""
echo "Workspace Root: $WORKSPACE_ROOT"
echo ""

# Create workspace directory structure
echo "📁 Creating workspace directories..."
mkdir -p "$WORKSPACE_ROOT/.archive"
echo "✅ Created workspace root and archive directory"
echo ""

# Make hooks executable
echo "🔧 Configuring hooks..."
if [ -f .claude/hooks/worktree-auto-create.py ]; then
  chmod +x .claude/hooks/worktree-auto-create.py
  echo "✅ Made worktree-auto-create.py executable"
fi

if [ -f .claude/hooks/worktree-auto-cleanup.py ]; then
  chmod +x .claude/hooks/worktree-auto-cleanup.py
  echo "✅ Made worktree-auto-cleanup.py executable"
fi
echo ""

# Check if hooks are registered in settings
echo "📋 Checking hook registration..."
SETTINGS_FILE=".claude/settings.local.json"

if [ -f "$SETTINGS_FILE" ]; then
  echo "ℹ️  Settings file exists"

  # Check if hooks section exists
  if grep -q '"hooks"' "$SETTINGS_FILE"; then
    echo "ℹ️  Hooks section found in settings"
  else
    echo "⚠️  No hooks section found - please add hooks configuration"
  fi
else
  echo "ℹ️  No settings file yet - hooks will need to be configured"
fi
echo ""

# Create initial status report
echo "📊 Generating initial status report..."
cat > "$WORKSPACE_ROOT/status-initial.txt" << EOF
Git Worktree Workspace Status - Initial Setup
Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Workspace Root: $WORKSPACE_ROOT

Workspace Structure: ✅ Created
Active Workspaces: $(ls -d "$WORKSPACE_ROOT"/onek-* 2>/dev/null | wc -l | tr -d ' ')
Disk Space Used: $(du -sh "$WORKSPACE_ROOT" 2>/dev/null | cut -f1)

Next Steps:
1. Create a feature branch linked to a Linear issue
2. Run /worktree-create <branch> <issue-id>
3. Launch a Claude Code instance in the worktree
4. Check status with /worktree-status
EOF
echo "✅ Created initial status report"
echo ""

# Summary
echo "=================================================="
echo "✅ Git Worktree System Initialized Successfully!"
echo "=================================================="
echo ""
echo "📍 Workspace Root: $WORKSPACE_ROOT"
echo ""
echo "📚 Available Commands:"
echo "  /worktree-create <branch> <issue-id>"
echo "  /worktree-status"
echo "  /worktree-cleanup <issue-id|--stale|--all>"
echo ""
echo "🤖 Available Agents:"
echo "  - worktree-manager (manages worktree lifecycle)"
echo ""
echo "🎯 Available Skills:"
echo "  - git-worktree-isolation (best practices guide)"
echo ""
echo "🔔 Hooks (auto-management):"
echo "  - PreToolUse: Auto-create worktrees for agents"
echo "  - SubagentStop: Auto-cleanup completed workspaces"
echo ""
echo "📖 Documentation:"
echo "  - .claude/skills/git-worktree-isolation/SKILL.md"
echo "  - .claude/agents/worktree-manager.md"
echo ""
echo "🎉 Ready to use git worktree agent isolation!"
echo ""
