# Post Development Summary to Linear Issue

Post a structured development summary comment to a Linear issue, auto-gathering git context, file changes, and conversation highlights for UAT review.

## Parameters:

- **Linear Issue ID** (required): The Linear issue identifier (e.g., `ONEK-178`)
- Usage: `/linear-update-summary <linear-issue-id>`

## Actions to Execute:

**IMPORTANT:** You MUST invoke the `linear-update-summary` skill using the Skill tool BEFORE taking any action. The skill contains the full workflow for gathering git context, composing the development summary, and posting to Linear.

```
Skill: linear-update-summary
Args: $ARGUMENTS
```

Follow the skill's instructions exactly. Do not proceed without loading it first.
