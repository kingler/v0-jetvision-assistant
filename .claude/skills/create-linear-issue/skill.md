---
name: create-linear-issue
description: Use when creating structured Linear issues with hierarchy (Feature/Bug > Epic > User Story > Tasks) and Given-When-Then acceptance criteria. Triggered when planning work breakdown, creating feature requests, filing structured bugs, or decomposing a planning document into Linear issues.
---

# Create Linear Issue Skill

Create hierarchical Linear issues from a planning document or interactive input: Feature Request/Bug Fix > Epic > User Story > Design/Dev Tasks. All user stories include Given-When-Then acceptance criteria. Optionally generates UAT instructions.

## When to Use

- **Starting a new feature** that needs to be broken down into trackable issues
- **Filing a structured bug report** that requires multiple fixes across epics
- **Converting a plan document** (from `docs/plans/` or `.claude/plans/`) into Linear issues
- **Creating user stories** with formal acceptance criteria in Gherkin format
- **Sprint planning** — decomposing features into epics, stories, and tasks
- **After brainstorming** — the plan document from brainstorming becomes the input

## When NOT to Use

- **Single simple issue** — just create it directly with Linear MCP `create_issue`
- **Bug triage on existing issues** — use `/linear-fix-issue` instead
- **Updating existing issues** — use Linear MCP `update_issue` directly
- **Generating UAT only** — use `/uat_instructions` instead

## Core Workflow

```
docs/plans/YYYY-MM-DD-feature.md    (plan document, optional input)
        |
        v
/create-linear-issue [plan-path]    (THIS SKILL — creates hierarchy)
        |
        v
Linear: Feature > Epics > Stories > Tasks    (structured issues)
        |
        v
/uat_instructions ONEK-XXX          (auto-triggered for user stories)
        |
        v
/work-on-issue ONEK-XXX             (start implementation)
```

## Prerequisites

1. **Linear MCP** configured in `.mcp.json`
2. **Team**: One Kaleidoscope (hardcoded default)
3. **Labels exist**: `Feature`, `Bug`, `Agent:UX-Designer`, `Agent:Coder` (verified at runtime)

## Command Usage

### From a Plan Document

```bash
/create-linear-issue .claude/plans/2026-02-12-chat-session-load.md
```

### Interactive Mode

```bash
/create-linear-issue
/create-linear-issue --type=bug
```

### Add Epic to Existing Feature

```bash
/create-linear-issue --epic-only ONEK-100
```

### Add Story to Existing Epic

```bash
/create-linear-issue --story-only ONEK-101
```

## Issue Hierarchy

```
Feature Request / Bug Fix          (top level — 1 per feature/bug)
├── Epic                           (mid level — 1-to-many per feature)
│   ├── User Story                 (low level — 1-to-many per epic)
│   │   ├── Design Task            (leaf — 0-to-many per story)
│   │   └── Development Task       (leaf — 1-to-many per story)
│   └── User Story
│       └── Development Task
└── Epic
    └── User Story
        ├── Design Task
        └── Development Task
```

## Acceptance Criteria Format (Required for All User Stories)

Every user story MUST include at least 2 acceptance criteria in Given-When-Then (Gherkin) format:

```markdown
### AC-1: {Primary Scenario Name}

**Given** {precondition or initial state — be specific about data and context}
**When** {single user action or system event}
**Then** {observable, verifiable result}

### AC-2: {Edge Case or Error Scenario}

**Given** {precondition for boundary/error condition}
**When** {action that tests the edge case}
**Then** {expected error handling or fallback behavior}
```

### Quality Rules for Acceptance Criteria

| Good | Bad |
|------|-----|
| "Given a round-trip with 2 legs and 3 operator quotes, when viewing the proposal summary, then both outbound and return legs display with correct dates and prices" | "Proposals work for round trips" |
| "Given a session token that expired 5 minutes ago, when the user sends a chat message, then the token refreshes silently and the message sends successfully" | "Auth should work" |
| "Given no internet connection, when the user clicks Send Proposal, then an error toast appears with 'Network unavailable' and the draft is preserved" | "Handle offline" |

## UAT Integration

After creating user stories, the skill automatically offers to generate UAT instructions using the `/uat_instructions` workflow:

1. Each user story's acceptance criteria maps directly to UAT test scenarios
2. Given-When-Then criteria become the basis for numbered test steps
3. UAT documents are saved to `docs/uat/UAT-ONEK-{STORY_ID}-{slug}.md`
4. Optional Linear comment posting addressed to @AB and @Kham

## Troubleshooting

### Plan Document Parsing Fails
If the plan document has an unexpected format, the skill falls back to interactive mode and displays what it could extract from the document.

### Too Many Issues Created
Linear API has rate limits. If creating more than 20 issues, the skill batches requests with a 1-second delay between batches and displays progress.

### Acceptance Criteria Auto-Generation Seems Wrong
The skill always shows generated AC for user confirmation before creating the issue. If the AC doesn't match the intent, the user can edit before proceeding.

### Hierarchy Validation Fails
If parent-child linking fails (e.g., wrong team, archived parent), the skill reports which issues were created successfully and which failed, with the error reason.

## Linear MCP Tools Used

| Tool | Purpose |
|------|---------|
| `create_issue` | Create issues at all hierarchy levels (with parentId linking) |
| `get_issue` | Fetch parent issue details for --epic-only / --story-only modes |
| `update_issue` | Update descriptions with hierarchy links if needed |
| `list_issue_labels` | Verify required labels exist before creating issues |
| `create_comment` | Post UAT instructions to user story issues |

## References

- [create-linear-issue.md](/.claude/commands/create-linear-issue.md) — The slash command this skill powers
- [uat_instructions.md](/.claude/commands/uat_instructions.md) — UAT generation command (auto-triggered)
- [work-on-issue.md](/.claude/commands/work-on-issue.md) — Implementation command (suggested next step)
- [linear-fix-issue.md](/.claude/commands/linear-fix-issue.md) — Bug triage command (complementary)
- [Linear MCP](https://mcp.linear.app) — Linear MCP server documentation
