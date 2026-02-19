# Linear Issue Cleanup and Synchronization

Automated Linear board hygiene: deduplicate issues, validate statuses against test results, synchronize with codebase state, triage the backlog, and post UAT-ready comments with user stories and acceptance criteria.

## Parameters:

- **Team** (optional): Linear team name (e.g., `One Kaleidoscope`, `DesignThru AI`). Defaults to all teams.
- **Scope** (optional): `--scope=all|duplicates|status|sync|backlog`. Defaults to `all`.
- Usage: `/linear-cleanup [team] [--scope=<phase>]`

## Actions to Execute:

**IMPORTANT:** You MUST invoke the `linear-cleanup` skill using the Skill tool BEFORE taking any action. The skill contains the full multi-phase cleanup workflow (deduplication, status validation, sync, backlog triage, UAT comments).

```
Skill: linear-cleanup
Args: $ARGUMENTS
```

Follow the skill's instructions exactly. Do not proceed without loading it first.
