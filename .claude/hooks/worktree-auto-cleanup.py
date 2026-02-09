#!/usr/bin/env python3
"""
Automatic worktree cleanup hook.
Triggers on SubagentStop to clean up completed phase worktrees.

Hook Event: SubagentStop (agent task completion)
"""
import json
import sys
import subprocess
import os
from datetime import datetime
from pathlib import Path


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


def is_branch_merged(branch):
    """Check if branch is merged to main."""
    try:
        result = subprocess.run(
            ["git", "branch", "--merged", "main"],
            capture_output=True,
            text=True,
            check=True
        )
        return branch in result.stdout
    except subprocess.CalledProcessError:
        return False


def has_uncommitted_changes(worktree_path):
    """Check if worktree has uncommitted changes."""
    try:
        result = subprocess.run(
            ["git", "-C", worktree_path, "status", "--porcelain"],
            capture_output=True,
            text=True,
            check=True
        )
        return bool(result.stdout.strip())
    except subprocess.CalledProcessError:
        return True  # Assume has changes if can't check


def has_unpushed_commits(worktree_path, branch):
    """Check if worktree has unpushed commits."""
    try:
        result = subprocess.run(
            ["git", "-C", worktree_path, "log", f"origin/{branch}..HEAD", "--oneline"],
            capture_output=True,
            text=True,
            check=False  # Don't fail if no remote
        )
        return bool(result.stdout.strip())
    except subprocess.CalledProcessError:
        return False


def archive_metadata(worktree_path, reason="agent-completed"):
    """Archive workspace metadata before cleanup."""
    metadata_path = Path(worktree_path) / "WORKSPACE_META.json"
    if not metadata_path.exists():
        return

    # Read existing metadata
    with open(metadata_path) as f:
        metadata = json.load(f)

    # Update metadata
    metadata["status"] = "archived"
    metadata["archivedAt"] = datetime.utcnow().isoformat() + "Z"
    metadata["reason"] = reason

    # Create archive directory at centralized workspace location
    archive_dir = Path(os.path.expanduser("~/.claude/git-workspace/.archive"))
    archive_dir.mkdir(parents=True, exist_ok=True)

    # Archive filename using Linear issue ID
    linear_issue = metadata.get("linearIssue", "unknown")
    branch = metadata.get("branch", "unknown")
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    archive_name = f"{linear_issue.lower()}-{branch.replace('/', '-')}-{timestamp}.json"
    archive_path = archive_dir / archive_name

    # Save archived metadata
    with open(archive_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"📦 Archived metadata: {archive_path}", file=sys.stderr)


def cleanup_worktree(worktree_path, branch):
    """Clean up a single worktree safely."""
    worktree_path = Path(worktree_path)

    if not worktree_path.exists():
        return True  # Already cleaned up

    # Safety checks
    if has_uncommitted_changes(str(worktree_path)):
        print(f"⚠️  Skipping cleanup: Uncommitted changes in {worktree_path}", file=sys.stderr)
        return False

    if has_unpushed_commits(str(worktree_path), branch):
        print(f"⚠️  Skipping cleanup: Unpushed commits in {worktree_path}", file=sys.stderr)
        return False

    # Archive metadata
    archive_metadata(str(worktree_path), reason="agent-completed")

    # Remove worktree
    try:
        subprocess.run(
            ["git", "worktree", "remove", str(worktree_path)],
            check=True,
            capture_output=True,
            text=True
        )
        print(f"🗑️  Removed worktree: {worktree_path}", file=sys.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to remove worktree: {e.stderr}", file=sys.stderr)
        return False


def find_worktrees_for_branch(branch):
    """Find all worktrees for a given branch."""
    worktrees = []
    workspace_root = Path(os.path.expanduser("~/.claude/git-workspace"))

    if not workspace_root.exists():
        return worktrees

    # Search for worktrees matching this branch
    for workspace_dir in workspace_root.iterdir():
        if not workspace_dir.is_dir() or workspace_dir.name.startswith("."):
            continue

        # Check WORKSPACE_META.json for branch match
        meta_path = workspace_dir / "WORKSPACE_META.json"
        if meta_path.exists():
            try:
                with open(meta_path) as f:
                    meta = json.load(f)
                if meta.get("branch") == branch:
                    worktrees.append(str(workspace_dir))
            except (json.JSONDecodeError, IOError):
                pass

    return worktrees


def should_cleanup_phase(phase, agent_result):
    """Determine if phase worktree should be cleaned up based on agent result."""
    # Phases that auto-cleanup after agent completion
    AUTO_CLEANUP_PHASES = [2, 4, 7]  # test-creation, code-review, pr-review

    # Check if phase should auto-cleanup
    if phase not in AUTO_CLEANUP_PHASES:
        return False

    # Check agent result status
    if not agent_result or not agent_result.get("success"):
        return False

    return True


def main():
    try:
        # Read hook input
        input_data = json.load(sys.stdin)

        # Get agent result
        agent_result = input_data.get("agent_result", {})
        agent_type = input_data.get("agent_type", "")

        # Get current branch
        branch = get_current_branch()
        if not branch or branch in ["main", "master", "dev", "develop"]:
            sys.exit(0)

        # Check if branch is merged
        if is_branch_merged(branch):
            print(f"🎉 Branch {branch} is merged - cleaning up all worktrees", file=sys.stderr)

            # Find and cleanup all worktrees for this branch
            worktrees = find_worktrees_for_branch(branch)
            cleaned = 0
            skipped = 0

            for worktree_path in worktrees:
                if cleanup_worktree(worktree_path, branch):
                    cleaned += 1
                else:
                    skipped += 1

            if cleaned > 0:
                print(f"✅ Cleaned up {cleaned} worktree(s)", file=sys.stderr)
                if skipped > 0:
                    print(f"⚠️  Skipped {skipped} worktree(s) (uncommitted/unpushed work)", file=sys.stderr)

                # Prune git worktree references
                subprocess.run(["git", "worktree", "prune"], capture_output=True)

        # Check if specific phase should be cleaned up
        # (This would require phase detection from agent_type)

        sys.exit(0)

    except Exception as e:
        print(f"❌ Error in worktree auto-cleanup hook: {e}", file=sys.stderr)
        sys.exit(0)  # Don't block on hook failure


if __name__ == "__main__":
    main()
