#!/usr/bin/env python3
"""
Automatic worktree creation hook for agent isolation.
Triggers when agents are invoked for SDLC phases.

Hook Event: PreToolUse (Task tool - agent invocation)
"""
import json
import sys
import subprocess
import os
from datetime import datetime
from pathlib import Path

# Phase to agent type mapping
PHASE_AGENT_MAP = {
    1: {"name": "branch-init", "agents": ["Pull Request Agent", "git-workflow"]},
    2: {"name": "test-creation", "agents": ["Test Agent", "qa-engineer-seraph", "testing"]},
    3: {"name": "implementation", "agents": ["Coding Agent", "backend-developer", "frontend-developer"]},
    4: {"name": "code-review", "agents": ["Code Review Agent", "code-review-coordinator", "morpheus-validator"]},
    5: {"name": "iteration", "agents": ["Coding Agent", "backend-developer", "frontend-developer"]},
    6: {"name": "pr-creation", "agents": ["Pull Request Agent", "git-workflow"]},
    7: {"name": "pr-review", "agents": ["Code Review Agent", "code-review-coordinator"]},
    8: {"name": "conflict-resolution", "agents": ["Conflict Resolution Agent", "git-workflow"]},
    9: {"name": "merge", "agents": ["Pull Request Agent", "git-workflow"]},
}


def get_current_branch():
    """Get current git branch."""
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return None


def extract_linear_issue(branch_name):
    """Extract Linear issue ID from branch name."""
    import re
    # Match patterns like ONEK-93, DES-123, etc.
    match = re.search(r'([A-Z]+-\d+)', branch_name)
    return match.group(1) if match else None


def worktree_exists(linear_issue):
    """Check if worktree already exists for a Linear issue."""
    if not linear_issue:
        return False

    workspace_dir = os.path.expanduser(f"~/.claude/git-workspace/{linear_issue.lower()}")
    return os.path.exists(workspace_dir)


def create_worktree(phase, branch, agent_type):
    """Create isolated worktree for agent work."""
    phase_info = PHASE_AGENT_MAP.get(phase)
    if not phase_info:
        print(f"⚠️  Invalid phase: {phase}", file=sys.stderr)
        return False

    phase_name = phase_info["name"]
    agent_role = phase_info["agents"][0]  # Primary agent role

    # Extract Linear issue for directory naming
    linear_issue = extract_linear_issue(branch)
    if not linear_issue:
        print(f"⚠️  No Linear issue found in branch: {branch}", file=sys.stderr)
        return False

    # Create workspace directory at centralized location
    workspace_root = Path(os.path.expanduser("~/.claude/git-workspace"))
    workspace_root.mkdir(parents=True, exist_ok=True)

    worktree_path = workspace_root / linear_issue.lower()

    # Check if worktree already exists
    if worktree_path.exists():
        print(f"ℹ️  Worktree already exists: {worktree_path}", file=sys.stderr)
        return True

    # Create git worktree
    try:
        subprocess.run(
            ["git", "worktree", "add", str(worktree_path), branch],
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✅ Created worktree: {worktree_path}", file=sys.stderr)
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create worktree: {e.stderr}", file=sys.stderr)
        return False

    # Look up PR for this branch
    pull_request = None
    pr_url = None
    try:
        result = subprocess.run(
            ["gh", "pr", "list", "--head", branch, "--json", "number,url", "--limit", "1"],
            capture_output=True, text=True, check=False
        )
        if result.stdout.strip():
            prs = json.loads(result.stdout)
            if prs:
                pull_request = f"#{prs[0]['number']}"
                pr_url = prs[0]['url']
    except Exception:
        pass

    # Create workspace metadata
    metadata = {
        "linearIssue": linear_issue,
        "branch": branch,
        "pullRequest": pull_request,
        "prUrl": pr_url,
        "workspaceDir": str(worktree_path),
        "agentRole": agent_role,
        "agentType": agent_type,
        "phase": phase,
        "phaseName": phase_name,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "lastAccessedAt": datetime.utcnow().isoformat() + "Z",
        "status": "active"
    }

    metadata_path = worktree_path / "WORKSPACE_META.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"📝 Created workspace metadata: {metadata_path}", file=sys.stderr)
    print(f"🔗 Linear Issue: {linear_issue}", file=sys.stderr)
    if pull_request:
        print(f"🔗 Pull Request: {pull_request}", file=sys.stderr)

    return True


def determine_phase_from_agent(agent_type):
    """Determine SDLC phase from agent type."""
    agent_type_lower = agent_type.lower()

    for phase, info in PHASE_AGENT_MAP.items():
        for agent_name in info["agents"]:
            if agent_name.lower() in agent_type_lower:
                return phase

    return None


def main():
    try:
        # Read hook input
        input_data = json.load(sys.stdin)

        # Check if this is a Task tool invocation (agent delegation)
        tool_name = input_data.get("tool_name", "")
        if tool_name != "Task":
            sys.exit(0)  # Not an agent invocation

        # Get agent type
        tool_input = input_data.get("tool_input", {})
        agent_type = tool_input.get("subagent_type", "")

        if not agent_type:
            sys.exit(0)  # No agent type specified

        # Determine phase from agent type
        phase = determine_phase_from_agent(agent_type)
        if not phase:
            print(f"ℹ️  No phase mapping for agent: {agent_type}", file=sys.stderr)
            sys.exit(0)

        # Get current branch
        branch = get_current_branch()
        if not branch:
            print("⚠️  Not on a git branch", file=sys.stderr)
            sys.exit(0)

        # Skip if on main/master/dev
        if branch in ["main", "master", "dev", "develop"]:
            sys.exit(0)

        # Extract Linear issue for workspace naming
        linear_issue = extract_linear_issue(branch)

        # Check if worktree already exists
        if worktree_exists(linear_issue):
            print(f"ℹ️  Using existing worktree for {linear_issue}: {branch}", file=sys.stderr)
            sys.exit(0)

        # Create worktree
        print(f"🚀 Auto-creating worktree for {agent_type} (Phase {phase})", file=sys.stderr)
        success = create_worktree(phase, branch, agent_type)

        if success:
            phase_info = PHASE_AGENT_MAP[phase]
            issue_dir = linear_issue.lower() if linear_issue else branch
            print(f"""
🎯 Worktree Created for Agent Isolation

Linear Issue: {linear_issue or 'N/A'}
Phase: {phase} - {phase_info['name']}
Agent: {agent_type}
Branch: {branch}
Path: ~/.claude/git-workspace/{issue_dir}

The agent will now work in this isolated workspace.
""", file=sys.stderr)

        sys.exit(0)  # Always allow the agent to proceed

    except Exception as e:
        print(f"❌ Error in worktree auto-create hook: {e}", file=sys.stderr)
        sys.exit(0)  # Don't block agent invocation on hook failure


if __name__ == "__main__":
    main()
