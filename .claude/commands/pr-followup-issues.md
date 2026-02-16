# PR Follow-Up Issues

Analyze a GitHub PR and generate categorized follow-up Linear issues from failing CI checks, review feedback, tech debt, missing tests, and performance concerns.

## Parameters:

- **PR Number** (required): GitHub PR number or full URL
- **`--categories`** (optional): Comma-separated category filter — `ci`, `testing`, `performance`, `tech-debt`, `docs`, `security`
- **`--dry-run`** (optional): Show analysis without creating issues
- Usage: `/pr-followup-issues <pr-number|pr-url> [--categories=ci,testing] [--dry-run]`

## Actions to Execute:

**IMPORTANT:** You MUST invoke the `pr-followup-issues` skill using the Skill tool BEFORE taking any action. The skill contains the full workflow for analyzing PRs, categorizing follow-ups, and creating Linear issues with dependencies.

```
Skill: pr-followup-issues
Args: $ARGUMENTS
```

Follow the skill's instructions exactly. Do not proceed without loading it first.
