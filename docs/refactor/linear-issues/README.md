# Workflow Steps Refactor - Linear Issues

## Epic: Separate Workflow Steps into Independent Message Components

**Epic ID**: ONEK-WFS (Workflow Steps)

**Goal**: Enable the Jetvision AI agent to retrieve and render individual workflow steps independently via the MessageRenderer system.

---

## Issue Summary

| Issue ID | Title | Priority | Estimate | Dependencies |
|----------|-------|----------|----------|--------------|
| ONEK-WFS-001 | Create shared workflow step types | High | 1pt | None |
| ONEK-WFS-002 | Create CreatingTripStep component | High | 2pt | WFS-001 |
| ONEK-WFS-003 | Create AwaitingSelectionStep component | High | 3pt | WFS-001 |
| ONEK-WFS-004 | Create ReceivingQuotesStep component | Medium | 2pt | WFS-001 |
| ONEK-WFS-005 | Create GenerateProposalStep component | Medium | 2pt | WFS-001 |
| ONEK-WFS-006 | Integrate into MessageRenderer | High | 2pt | WFS-001 to WFS-005 |
| ONEK-WFS-007 | Create WorkflowStepsContainer | Low | 2pt | WFS-006 |

**Total Estimate**: 14 points

---

## Dependency Graph

```
ONEK-WFS-001 (Shared Types)
    │
    ├── ONEK-WFS-002 (CreatingTripStep)
    ├── ONEK-WFS-003 (AwaitingSelectionStep) ⭐ Critical
    ├── ONEK-WFS-004 (ReceivingQuotesStep)
    └── ONEK-WFS-005 (GenerateProposalStep)
            │
            └── ONEK-WFS-006 (MessageRenderer Integration)
                    │
                    └── ONEK-WFS-007 (WorkflowStepsContainer)
```

---

## Parallel Execution Strategy

### Sprint 1: Foundation + Components (Can be parallelized)

1. **ONEK-WFS-001** - Must be done first (1pt)
2. After WFS-001 completes, these can run in parallel:
   - **ONEK-WFS-002** (2pt)
   - **ONEK-WFS-003** (3pt) ⭐ Priority
   - **ONEK-WFS-004** (2pt)
   - **ONEK-WFS-005** (2pt)

### Sprint 2: Integration

3. **ONEK-WFS-006** - After all components complete (2pt)
4. **ONEK-WFS-007** - After integration (2pt)

---

## Agent Execution Instructions

Each Linear issue includes:

1. **Git Branch Workspace** - Branch name and worktree command
2. **Key File Paths** - Files to create/modify with action type
3. **Reference Files** - Files to read for context (READ ONLY)
4. **Import Dependencies** - Required imports
5. **TDD Process** - RED, GREEN, REFACTOR phases with code
6. **Acceptance Criteria** - Checklist for completion

### Running an Issue

```bash
# 1. Read the issue markdown file
cat docs/refactor/linear-issues/ONEK-WFS-XXX-*.md

# 2. Create the branch
git checkout -b feat/ONEK-WFS-XXX-component-name

# 3. Follow TDD process:
#    - Write failing tests (RED)
#    - Implement to pass tests (GREEN)
#    - Refactor (REFACTOR)

# 4. Verify
npm run test:unit -- component-name
npm run type-check
npm run lint

# 5. Commit
git add .
git commit -m "feat(workflow-steps): implement ONEK-WFS-XXX component name"
```

---

## Files Created/Modified

### New Files (Create)

```
components/workflow-steps/
├── types.ts                        # ONEK-WFS-001
├── creating-trip-step.tsx          # ONEK-WFS-002
├── awaiting-selection-step.tsx     # ONEK-WFS-003
├── receiving-quotes-step.tsx       # ONEK-WFS-004
├── generate-proposal-step.tsx      # ONEK-WFS-005
├── workflow-steps-container.tsx    # ONEK-WFS-007
└── index.ts                        # ONEK-WFS-006

__tests__/unit/components/workflow-steps/
├── types.test.ts                   # ONEK-WFS-001
├── creating-trip-step.test.tsx     # ONEK-WFS-002
├── awaiting-selection-step.test.tsx # ONEK-WFS-003
├── receiving-quotes-step.test.tsx  # ONEK-WFS-004
├── generate-proposal-step.test.tsx # ONEK-WFS-005
└── workflow-steps-container.test.tsx # ONEK-WFS-007

__tests__/integration/message-renderer/
└── workflow-steps.test.tsx         # ONEK-WFS-006
```

### Modified Files

```
components/message-components/types.ts          # ONEK-WFS-006
components/message-components/message-renderer.tsx # ONEK-WFS-006
```

---

## Quick Import to Linear

Copy each issue's **Issue Details** section directly into Linear:

- **Title**: Copy as Linear issue title
- **Priority**: Set in Linear
- **Labels**: Add as Linear labels
- **Estimate**: Set as story points
- **Description**: Copy full markdown content

Use the dependency graph above to set Linear issue relationships.

---

## Related Documentation

- [Refactor Overview](../WORKFLOW-STEPS-REFACTOR.md)
- [Original WorkflowVisualization](../../../components/workflow-visualization.tsx)
- [MessageRenderer Types](../../../components/message-components/types.ts)
- [CLAUDE.md Agent Guidelines](../../../CLAUDE.md)
