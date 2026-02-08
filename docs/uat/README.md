# UAT Instructions

This directory contains generated UAT (User Acceptance Testing) instruction documents for Linear issues.

## Naming Convention

```
UAT-{ISSUE-ID}-{slug}.md
```

- **ISSUE-ID**: Linear issue identifier (e.g., `ONEK-206`)
- **slug**: Lowercase, hyphenated summary from the issue title (max 50 characters)

Examples:
- `UAT-ONEK-206-tool-ui-registry.md`
- `UAT-ONEK-178-proposal-to-contract-workflow.md`
- `UAT-ONEK-184-working-memory-cross-turn.md`

## Generation

Documents are generated via the `/uat_instructions` Claude Code slash command:

```bash
# Single issue
/uat_instructions ONEK-206

# All in-progress issues
/uat_instructions --all
```

## Document Structure

Each UAT document contains:

| Section | Purpose |
|---------|---------|
| **Header** | Issue ID, title, date, branch, author |
| **Overview** | Brief description of the feature or fix under test |
| **Acceptance Criteria** | Given-When-Then scenarios derived from the issue |
| **Test Steps** | Numbered step-by-step instructions mapped 1:1 to acceptance criteria |
| **Test Data & Environment** | Required setup, test accounts, environment notes |
| **Sign-Off Table** | Tester names (@AB, @Kham) with pass/fail/date columns |

## Workflow Integration

```
Development Complete
        |
        v
/uat_instructions ONEK-XXX    <-- Generate UAT plan
        |
        v
Execute UAT (manual testing)
        |
        v
/linear-update-summary ONEK-XXX  <-- Document results
```

## Related Commands

- `/uat_instructions` - Generate UAT instructions (this directory)
- `/e2e-test-issue` - Automated browser-based verification
- `/linear-update-summary` - Post development summary with UAT checklist
- `/linear-fix-issue` - Triage and fix bugs found during UAT
