# Generate UAT Instructions for Linear Issue

Generate comprehensive UAT (User Acceptance Testing) instructions from a Linear issue, producing Given-When-Then acceptance criteria, numbered test steps, and a structured QA handoff document. Optionally post results to Linear.

## Parameters:

- **Linear Issue ID** (optional): The Linear issue identifier (e.g., `ONEK-178`)
- **`--all`** (optional): Process all in-progress issues for the team
- Usage: `/uat_instructions <linear-issue-id>` or `/uat_instructions --all`

## Actions to Execute:

**IMPORTANT:** You MUST invoke the `uat-instructions` skill using the Skill tool BEFORE taking any action. The skill contains the full workflow for gathering context, generating Given-When-Then acceptance criteria, creating UAT documents, and posting to Linear.

```
Skill: uat-instructions
Args: $ARGUMENTS
```

Follow the skill's instructions exactly. Do not proceed without loading it first.
