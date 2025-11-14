#!/bin/bash
# Initialize Git Worktree Agent Workspace Isolation System
#
# This script sets up the directory structure and configuration
# for git worktree-based agent workspace isolation.

set -e  # Exit on error

echo "🚀 Initializing Git Worktree Agent Workspace System"
echo "=================================================="
echo ""

# Create workspace directory structure
echo "📁 Creating workspace directories..."
mkdir -p .claude/workspaces/{phase-1-branch-init,phase-2-test-creation,phase-3-implementation,phase-4-code-review,phase-5-iteration,phase-6-pr-creation,phase-7-pr-review,phase-8-conflict-resolution,phase-9-merge}
mkdir -p .claude/workspaces/.archive

echo "✅ Created workspace directories"
echo ""

# Create .gitignore for workspaces
echo "📝 Configuring git ignore rules..."
if [ ! -f .claude/workspaces/.gitignore ]; then
  cat > .claude/workspaces/.gitignore << 'EOF'
# Ignore all worktree directories
phase-*/

# Keep archive directory
!.archive/

# Keep this .gitignore
!.gitignore

# Keep README
!README.md
EOF
  echo "✅ Created .claude/workspaces/.gitignore"
else
  echo "ℹ️  .gitignore already exists"
fi
echo ""

# Create README for workspace directory
echo "📄 Creating workspace README..."
cat > .claude/workspaces/README.md << 'EOF'
# Git Worktree Agent Workspaces

This directory contains isolated git worktree workspaces for AI agent work organized by SDLC phase.

## Directory Structure

```
.claude/workspaces/
├── phase-1-branch-init/        # Pull Request Agent
├── phase-2-test-creation/      # Test Agent
├── phase-3-implementation/     # Coding Agent
├── phase-4-code-review/        # Code Review Agent
├── phase-5-iteration/          # Coding Agent (refinement)
├── phase-6-pr-creation/        # Pull Request Agent
├── phase-7-pr-review/          # Code Review Agent
├── phase-8-conflict-resolution/# Conflict Resolution Agent
├── phase-9-merge/              # Pull Request Agent
└── .archive/                   # Archived workspace metadata
```

## Usage

### Create Worktree
```bash
/worktree-create <phase> <branch-name> [linear-issue-id]
```

### View Status
```bash
/worktree-status
```

### Cleanup
```bash
/worktree-cleanup <branch-name>
/worktree-cleanup --stale
/worktree-cleanup --all
```

## Automatic Management

Worktrees are automatically:
- **Created** when agents are invoked (via PreToolUse hook)
- **Cleaned up** when phases complete (via SubagentStop hook)
- **Archived** with metadata for audit trail

## Metadata

Each worktree contains `WORKSPACE_META.json`:
```json
{
  "branch": "feature/name",
  "linearIssue": "ONEK-123",
  "phase": 2,
  "phaseName": "test-creation",
  "agentRole": "Test Agent",
  "status": "active"
}
```

## Safety

Before worktree removal:
- ✅ Check for uncommitted changes
- ✅ Check for unpushed commits
- ✅ Archive metadata
- ✅ Verify phase completion

## Documentation

See [git-worktree-isolation skill](.claude/skills/git-worktree-isolation/SKILL.md) for comprehensive usage guide.
EOF
echo "✅ Created workspace README"
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
    echo ""
    echo "⚠️  Please manually register hooks in $SETTINGS_FILE:"
    echo ""
    echo '  "hooks": {'
    echo '    "PreToolUse": ['
    echo '      {'
    echo '        "matcher": "Task",'
    echo '        "hooks": ['
    echo '          {'
    echo '            "type": "command",'
    echo '            "command": ".claude/hooks/worktree-auto-create.py"'
    echo '          }'
    echo '        ]'
    echo '      }'
    echo '    ],'
    echo '    "SubagentStop": ['
    echo '      {'
    echo '        "matcher": "",'
    echo '        "hooks": ['
    echo '          {'
    echo '            "type": "command",'
    echo '            "command": ".claude/hooks/worktree-auto-cleanup.py"'
    echo '          }'
    echo '        ]'
    echo '      }'
    echo '    ]'
    echo '  }'
  else
    echo "⚠️  No hooks section found - please add hooks configuration"
  fi
else
  echo "ℹ️  No settings file yet - hooks will need to be configured"
fi
echo ""

# Create initial status report
echo "📊 Generating initial status report..."
if command -v python3 &> /dev/null; then
  cat > .claude/workspaces/status-initial.txt << EOF
Git Worktree Workspace Status - Initial Setup
Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

Workspace Structure: ✅ Created
Active Worktrees: 0
Disk Space Used: $(du -sh .claude/workspaces 2>/dev/null | cut -f1)

Directory Structure:
$(find .claude/workspaces -type d -maxdepth 1 | sort)

Next Steps:
1. Create your first feature branch
2. Invoke an agent (worktree auto-created)
3. Check status with /worktree-status
EOF
  echo "✅ Created initial status report"
else
  echo "⚠️  python3 not found - skipping status report"
fi
echo ""

# Summary
echo "=================================================="
echo "✅ Git Worktree System Initialized Successfully!"
echo "=================================================="
echo ""
echo "📚 Available Commands:"
echo "  /worktree-create <phase> <branch> [issue-id]"
echo "  /worktree-status"
echo "  /worktree-cleanup <branch|--stale|--all>"
echo ""
echo "🤖 Available Agents:"
echo "  - worktree-manager (manages worktree lifecycle)"
echo ""
echo "🎯 Available Skills:"
echo "  - git-worktree-isolation (best practices guide)"
echo ""
echo "🔔 Hooks (auto-management):"
echo "  - PreToolUse: Auto-create worktrees for agents"
echo "  - SubagentStop: Auto-cleanup completed phases"
echo ""
echo "📖 Documentation:"
echo "  - .claude/workspaces/README.md"
echo "  - .claude/skills/git-worktree-isolation/SKILL.md"
echo "  - .claude/agents/worktree-manager.md"
echo ""
echo "🎉 Ready to use git worktree agent isolation!"
echo ""
