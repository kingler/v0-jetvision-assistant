# Create Linear Issues with Hierarchy

Create structured Linear issues with proper parent-child hierarchy: Feature Request or Bug Fix > Epic > User Story > Design/Development Tasks. All user stories include Given-When-Then acceptance criteria.

## Parameters:

- **Plan Document** (optional): Path to a planning document to seed issue content (e.g., `.claude/plans/2026-02-12-chat-session-load.md`)
- **`--type`** (optional): Top-level issue type — `feature` (default) or `bug`
- **`--epic-only`** (optional): Create only an epic under an existing feature/bug
- **`--story-only`** (optional): Create only a user story under an existing epic
- Usage: `/create-linear-issue [plan-path] [--type=feature|bug] [--epic-only ONEK-XXX] [--story-only ONEK-XXX]`

## Actions to Execute:

**IMPORTANT:** You MUST invoke the `create-linear-issue` skill using the Skill tool BEFORE taking any action. The skill contains the full workflow for creating hierarchical Linear issues with Given-When-Then acceptance criteria.

```
Skill: create-linear-issue
Args: $ARGUMENTS
```

Follow the skill's instructions exactly. Do not proceed without loading it first.
