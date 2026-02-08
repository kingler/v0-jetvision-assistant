---
name: uat-instructions
description: Use when UAT test instructions are needed for Linear issues — after development is complete, before sprint review, or when onboarding testers. Triggered by need for Given-When-Then acceptance criteria, step-by-step test plans, or structured QA handoff documents.
---

# UAT Instructions Skill

Generate comprehensive UAT instructions from Linear issues with Given-When-Then acceptance criteria, numbered test steps, and optional Linear posting. Output saved to `docs/uat/`.

## When to Use

- **After development is complete** on a Linear issue and you need a formal test plan
- **Before sprint review** to prepare structured acceptance criteria for stakeholders
- **When onboarding testers** who need step-by-step instructions to verify a feature
- **Batch mode for sprint prep** — generate UAT docs for all in-progress issues at once
- **When a user asks** for "acceptance criteria", "test plan", "UAT instructions", or "QA handoff"

## When NOT to Use

- **Active development** — the feature isn't done yet; finish coding first
- **Need a dev summary** — use `/linear-update-summary` for documenting what was built
- **Need to find bugs** — use `/e2e-test-issue` for automated browser verification
- **Single simple check** — if it's one checkbox, just add it to the issue description manually

## Core Workflow

```
/linear-fix-issue ONEK-XXX       (triage + fix bugs)
        |
        v
/e2e-test-issue ONEK-XXX         (automated browser verification)
        |
        v
/uat_instructions ONEK-XXX       (generate UAT plan)    <-- THIS SKILL
        |
        v
Execute UAT (manual testing by @AB, @Kham)
        |
        v
/linear-update-summary ONEK-XXX  (document results for handoff)
```

## Prerequisites

1. **Linear MCP** configured in `.claude/config.json` (under `mcp.servers.linear`)
2. **Issue exists** in Linear with a title and ideally a description
3. **Development work done** — commits exist referencing the issue ID
4. **`gh` CLI** authenticated (for PR detection, optional)

## Command Usage

### Single Issue

```bash
/uat_instructions ONEK-206
```

### Batch Mode (All In-Progress)

```bash
/uat_instructions --all
```

## What the Command Does

### 1. Retrieves Issue Context

Fetches issue title, description, status, assignee, labels, priority, and relations from Linear. Checks for existing UAT posts to avoid duplicates.

### 2. Gathers Implementation Context

Searches git history for commits referencing the issue ID, finds related plan documents in `docs/plans/`, identifies affected source files and existing test files.

### 3. Extracts or Generates Acceptance Criteria

Uses a three-tier strategy:
- **Tier 1**: Parses existing AC from the issue description (checkboxes, "should"/"must" statements, AC sections)
- **Tier 2**: Synthesizes Given-When-Then criteria from the title, description, and commit history
- **Tier 3**: Always adds at least one regression criterion

Minimum: 3 criteria per issue (1 primary + 1 edge case + 1 regression).

### 4. Produces UAT Document

Generates a structured markdown document with: header metadata, overview, GWT acceptance criteria, numbered test steps (mapped 1:1 to criteria), environment notes, and sign-off table.

### 5. Saves and Optionally Posts

Saves to `docs/uat/UAT-{ISSUE-ID}-{slug}.md`. Offers four posting options: (1) Linear comment, (2) append to description, (3) both, (4) file only.

## UAT Document Structure

| Section | Purpose |
|---------|---------|
| **Header** | Issue ID, title, date, branch, status, priority |
| **Overview** | 2-3 sentence summary of what's under test |
| **Acceptance Criteria** | Given-When-Then scenarios with scenario names |
| **Test Steps** | Numbered instructions mapped 1:1 to AC, with Expected annotations |
| **Test Data & Environment** | URLs, test data, setup steps, env vars |
| **Sign-Off Table** | @AB and @Kham with pass/fail/date columns |

## Given-When-Then Format

Each acceptance criterion follows this structure:

```markdown
### AC-1: User Adjusts Margin Slider

**Given** a trip with at least one operator quote and the proposal dialog is open
**When** the user moves the margin slider to 15%
**Then** all displayed prices update in real-time to reflect the 15% markup
```

**Rules**:
- **Given**: Describes the precondition or starting state. Be specific about what data must exist.
- **When**: Describes the user action or system trigger. One action per criterion.
- **Then**: Describes the observable result. Must be verifiable by a tester.

**Minimum per issue**: 1 primary scenario + 1 edge case or secondary scenario + 1 regression scenario.

## Best Practices

### Write Specific Criteria

| Good | Bad |
|------|-----|
| "Given a round-trip with 2 legs, when viewing the proposal, then both outbound and return legs appear with correct dates" | "Proposals work for round trips" |
| "Given an expired Clerk session, when the user makes an API call, then the token refreshes automatically and the request succeeds" | "Auth works correctly" |

### Include Environment Context

Test steps should specify exact UI elements, navigation paths, and expected text so a non-developer can follow them.

### Map Tests 1:1 to Criteria

Every acceptance criterion has exactly one corresponding test. Every test references its AC number. This makes it clear which criteria passed and which failed.

### Use Batch Mode for Sprint Prep

Before sprint review, run `/uat_instructions --all` to generate UAT docs for every in-progress issue. Review the summary table and distribute to testers.

### Don't Overwrite — Append

When posting to Linear descriptions, the command appends a new section. It never overwrites existing content. Comments are preferred over description edits.

## Troubleshooting

### Linear MCP Not Available

The command saves the UAT document locally to `docs/uat/` and outputs it to the console. You can copy the content into Linear manually.

### Issue Has No Description

The command warns that context is limited and generates basic criteria from the title and any commit messages. The output includes a "Needs Review" flag.

### Duplicate UAT Post Detected

If a previous UAT comment exists on the issue, the command warns and asks whether to: (1) post an updated version, (2) skip this issue, or (3) overwrite.

### Too Many Issues in Batch Mode

If `--all` returns more than 15 issues, the command displays the list and asks the user to select specific issues or confirm processing all.

## Linear MCP Tools Used

| Tool | Purpose |
|------|---------|
| `get_issue` | Fetch issue details, description, relations |
| `list_issues` | Batch mode — find all in-progress issues |
| `list_comments` | Check for existing UAT posts (duplicate detection) |
| `create_comment` | Post condensed UAT instructions to issue |
| `update_issue` | Append AC checkboxes to issue description |

## References

- [uat_instructions.md](/.claude/commands/uat_instructions.md) — The slash command this skill powers
- [linear-update-summary.md](/.claude/commands/linear-update-summary.md) — Dev summary command (complementary)
- [e2e-test-issue.md](/.claude/commands/e2e-test-issue.md) — Automated browser testing command
- [linear-fix-issue.md](/.claude/commands/linear-fix-issue.md) — Bug triage and fix command
- [docs/uat/README.md](/docs/uat/README.md) — UAT output directory documentation
- [Linear MCP](https://mcp.linear.app) — Linear MCP server documentation
