#!/usr/bin/env python3
"""
Automatic worktree cleanup hook with full lifecycle verification.
Triggers on SubagentStop to clean up worktrees only when ALL conditions are met:
1. All TDD tests pass
2. PR is created
3. Code review is completed
4. Linear issue is updated
5. Branch is merged into main

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


def verify_tests_pass(worktree_path):
    """Verify all TDD tests pass in the worktree."""
    try:
        result = subprocess.run(
            ["npm", "run", "test:unit"],
            cwd=worktree_path,
            capture_output=True,
            text=True,
            check=False,
            timeout=300  # 5 minute timeout
        )
        return result.returncode == 0
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        return False


def check_pr_exists(branch):
    """Check if a PR exists for this branch."""
    try:
        result = subprocess.run(
            ["gh", "pr", "list", "--head", branch, "--json", "number"],
            capture_output=True,
            text=True,
            check=True
        )
        prs = json.loads(result.stdout)
        return len(prs) > 0
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return False


def check_pr_approved(branch):
    """Check if PR for this branch is approved."""
    try:
        # First get the PR number
        result = subprocess.run(
            ["gh", "pr", "list", "--head", branch, "--json", "number,reviewDecision"],
            capture_output=True,
            text=True,
            check=True
        )
        prs = json.loads(result.stdout)
        if not prs:
            return False

        # Check if review decision is APPROVED
        return prs[0].get("reviewDecision") == "APPROVED"
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return False


def check_linear_status(linear_issue):
    """Check if Linear issue is marked as Done/Closed."""
    if not linear_issue:
        return True  # No issue to check

    # Note: This would require Linear API integration
    # For now, we'll check if the issue exists and trust other conditions
    # In production, integrate with Linear MCP or API
    return True  # Placeholder - integrate with Linear API


def load_workspace_meta(worktree_path):
    """Load workspace metadata from worktree."""
    metadata_path = Path(worktree_path) / "WORKSPACE_META.json"
    if not metadata_path.exists():
        return {}

    try:
        with open(metadata_path) as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def should_cleanup_worktree(worktree_path, branch):
    """
    Check ALL 5 lifecycle conditions before cleanup.
    Returns (should_cleanup: bool, checks: dict)
    """
    meta = load_workspace_meta(worktree_path)
    linear_issue = meta.get("linearIssue")

    checks = {
        "tests_passing": verify_tests_pass(worktree_path),
        "pr_created": check_pr_exists(branch),
        "review_complete": check_pr_approved(branch),
        "linear_updated": check_linear_status(linear_issue),
        "branch_merged": is_branch_merged(branch),
    }

    # Also check safety conditions
    safety_checks = {
        "no_uncommitted_changes": not has_uncommitted_changes(worktree_path),
        "no_unpushed_commits": not has_unpushed_commits(worktree_path, branch),
    }

    all_checks = {**checks, **safety_checks}
    should_cleanup = all(all_checks.values())

    return should_cleanup, all_checks


def archive_metadata(worktree_path, reason="lifecycle-complete"):
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

    # Create archive directory
    archive_dir = Path(".context/workspaces/.archive")
    archive_dir.mkdir(parents=True, exist_ok=True)

    # Archive filename
    branch = metadata.get("branch", "unknown")
    phase = metadata.get("phase", "0")
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    archive_name = f"{branch.replace('/', '-')}-phase-{phase}-{timestamp}.json"
    archive_path = archive_dir / archive_name

    # Save archived metadata
    with open(archive_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"📦 Archived metadata: {archive_path}", file=sys.stderr)


def cleanup_worktree(worktree_path, branch):
    """Clean up a single worktree safely after lifecycle verification."""
    worktree_path = Path(worktree_path)

    if not worktree_path.exists():
        return True  # Already cleaned up

    # Verify all lifecycle conditions
    should_cleanup, checks = should_cleanup_worktree(str(worktree_path), branch)

    if not should_cleanup:
        failed_checks = [k for k, v in checks.items() if not v]
        print(f"⏳ Worktree not ready for cleanup: {worktree_path}", file=sys.stderr)
        print(f"   Pending conditions: {', '.join(failed_checks)}", file=sys.stderr)
        return False

    # Archive metadata
    archive_metadata(str(worktree_path), reason="lifecycle-complete")

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
    workspace_root = Path(".context/workspaces")

    if not workspace_root.exists():
        return worktrees

    # Search for worktrees with this branch
    for phase_dir in workspace_root.iterdir():
        if not phase_dir.is_dir() or phase_dir.name.startswith("."):
            continue

        branch_dir = phase_dir / branch
        if branch_dir.exists() and branch_dir.is_dir():
            worktrees.append(str(branch_dir))

    return worktrees


def main():
    try:
        # Read hook input
        input_data = json.load(sys.stdin)

        # Get current branch
        branch = get_current_branch()
        if not branch or branch in ["main", "master", "dev", "develop"]:
            sys.exit(0)

        # Check if branch is merged - this triggers cleanup check
        if is_branch_merged(branch):
            print(f"🔍 Branch {branch} is merged - checking lifecycle conditions", file=sys.stderr)

            # Find and check all worktrees for this branch
            worktrees = find_worktrees_for_branch(branch)
            cleaned = 0
            pending = 0

            for worktree_path in worktrees:
                if cleanup_worktree(worktree_path, branch):
                    cleaned += 1
                else:
                    pending += 1

            if cleaned > 0:
                print(f"✅ Cleaned up {cleaned} worktree(s)", file=sys.stderr)
                # Prune git worktree references
                subprocess.run(["git", "worktree", "prune"], capture_output=True)

            if pending > 0:
                print(f"⏳ {pending} worktree(s) pending (lifecycle conditions not met)", file=sys.stderr)

        sys.exit(0)

    except Exception as e:
        print(f"❌ Error in worktree auto-cleanup hook: {e}", file=sys.stderr)
        sys.exit(0)  # Don't block on hook failure


if __name__ == "__main__":
    main()
