# Analyze Codebase Readiness

You are tasked with analyzing the software project to determine its current status, readiness for deployment, and any remaining development work. This includes a **full Linear board review, cleanup, and synchronization** to ensure the project tracker reflects reality.

## Phase 1: Codebase Analysis

1. **Map the project structure**:
   - Execute: `find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" | sort`
   - Analyze directory organization and note changes since the last analysis
   - Compare with the structure documented in `.context/project_structure.md`

2. **Review project materials** (if available):
   - Business requirements: `docs/business_requirements_document.md`
   - Product requirements: `docs/product_requirements_document.md`
   - Design specifications: `docs/design_specifications.md`
   - Architecture docs: `docs/architecture/MULTI_AGENT_SYSTEM.md`
   - Previous status report: `.context/overall_project_status.md`

3. **Analyze codebase completeness**:
   - For each feature or component, estimate its percentage of completion
   - Identify missing or incomplete features
   - Note any code smells, security issues, or refactoring opportunities

4. **Run tests** (if environment permits):
   - Execute `npm run test:unit` and capture results
   - Execute `npm run lint` and capture results
   - Note coverage gaps and failing tests

## Phase 2: Linear Board Review & Cleanup

**IMPORTANT:** Invoke the `linear-cleanup` skill to perform a full multi-phase cleanup of the Linear board.

```
Skill: linear-cleanup
Args: One Kaleidoscope --scope=all
```

This executes the following sub-phases:

### 2a. Deduplication
- Identify duplicate issues across the ONEK project
- Flag or merge duplicates, preserving the most complete version

### 2b. Status Validation
- Cross-reference Linear issue statuses against actual codebase/test state
- Issues marked "Done" should have merged PRs and passing tests
- Issues marked "In Progress" should have active branches
- Flag mismatches for correction

### 2c. Codebase Synchronization
- Map implemented features (merged branches, existing code) to Linear issues
- Identify work completed in the codebase that has no corresponding Linear issue
- Identify Linear issues with no corresponding codebase work

### 2d. Backlog Triage
- Review and prioritize the backlog
- Identify stale issues (no activity >30 days)
- Flag issues that are blocked and document blockers

### 2e. UAT Readiness
- For issues ready for UAT, verify acceptance criteria exist
- Post UAT-ready comments with user stories and acceptance criteria

## Phase 3: Linear Summary Generation

For each major completed or in-progress epic/feature, generate a development summary:

```
Skill: linear-update-summary
Args: <issue-id>
```

Apply this to:
- Recently completed issues (last 2 sprints)
- Key in-progress issues that need status visibility
- Any issues flagged during cleanup that need context updates

## Phase 4: Consolidated Report

Synthesize findings from Phases 1-3 into a comprehensive status update.

### Output Files

Create or update the following files in `.context/`:

1. **`overall_project_status.md`** - Master status document including:
   - Executive summary with overall completion percentage
   - Readiness snapshot (production readiness, strengths, blockers)
   - **Linear Board Health** section:
     - Total issues: open / in-progress / done / backlog
     - Duplicates found and resolved
     - Status mismatches corrected
     - Stale issues flagged
     - Sync gaps (code without issues, issues without code)
   - Test status summary
   - Key risks and blockers
   - Analysis date and next review date

2. **`feature_checklist.md`** - Feature completion percentages, mapped to Linear epics where possible

3. **`identified_issues.md`** - Bugs, code smells, security concerns, and Linear sync issues

4. **`recommendations.md`** - Prioritized next steps informed by both codebase analysis and Linear board state

5. **`deployment_readiness.md`** - Go/no-go assessment with checklist

6. **`project_structure.md`** - Updated directory tree with highlights of changes since last analysis

### `overall_project_status.md` Template

The master status file should follow this structure:

```markdown
# Overall Project Status - Jetvision AI Assistant

**Analysis Date**: YYYY-MM-DD
**Next Review**: YYYY-MM-DD (2 weeks out)
**Project**: Jetvision AI Assistant
**Stack**: Next.js 14, TypeScript, Supabase, Clerk, MCP Servers, BullMQ
**Linear Team**: One Kaleidoscope (ONEK)

## Executive Summary

**Overall Completion**: X% (estimated)

[1-2 paragraph summary of project state]

## Readiness Snapshot

- **Production Readiness**: [Ready / Partial / Not Ready]
- **Key Strengths**: [bullet list]
- **Primary Blockers**: [bullet list]

## Linear Board Health

| Metric | Count |
|--------|-------|
| Total Issues | X |
| Done | X |
| In Progress | X |
| Backlog | X |
| Duplicates Resolved | X |
| Status Mismatches Fixed | X |
| Stale Issues (>30 days) | X |
| Code Without Issues | X |
| Issues Without Code | X |

### Key Findings from Linear Cleanup
- [Finding 1]
- [Finding 2]
- [Finding 3]

### Sprint Progress
- **Current Sprint**: [name/dates]
- **Velocity**: [X points completed]
- **Burndown**: [on track / behind / ahead]

## Feature Status

| Feature | Completion | Linear Epic | Status |
|---------|-----------|-------------|--------|
| [Feature 1] | X% | ONEK-XXX | [status] |
| [Feature 2] | X% | ONEK-XXX | [status] |

## Test Status

- **Unit Tests**: X passing / X failing
- **Integration Tests**: X passing / X failing
- **Coverage**: X% (threshold: 75%)

## Key Risks & Blockers

1. [Risk/Blocker 1]
2. [Risk/Blocker 2]

## Recommendations

1. [Priority 1 action]
2. [Priority 2 action]
3. [Priority 3 action]
```

## Execution Notes

- Present findings clearly and concisely — no internal reasoning in the output
- If Linear API access fails, document the failure and proceed with codebase-only analysis
- If tests cannot be run (environment limitations), note this and estimate based on code review
- Always compare against the previous status report to highlight what changed
