# Linear Issue: Create Shared Workflow Step Types

## Issue Details

**Title**: Create shared workflow step types for independent step components

**Project**: Jetvision Assistant

**Team**: Engineering

**Priority**: High

**Labels**: `refactor`, `typescript`, `agent-executable`

**Estimate**: 1 point

---

## Description

Create the shared TypeScript types for the workflow step components refactor. This establishes the foundation for the 4 independent step components that will be used by the Jetvision AI agent.

## Agent Execution Context

### Git Branch Workspace

```bash
# Create feature branch
git checkout -b feat/ONEK-WFS-001-workflow-step-types

# Or use worktree for isolation
git worktree add .context/workspaces/phase-2-test-creation/feat/ONEK-WFS-001-workflow-step-types -b feat/ONEK-WFS-001-workflow-step-types
```

### Key File Paths

| File | Action | Purpose |
|------|--------|---------|
| `components/workflow-steps/types.ts` | CREATE | Shared type definitions |
| `__tests__/unit/components/workflow-steps/types.test.ts` | CREATE | Type tests |

### Reference Files (READ ONLY)

- `components/workflow-visualization.tsx` - Extract status types from lines 25-34
- `components/message-components/types.ts` - Follow BaseMessageComponent pattern
- `lib/types/quotes.ts` - Reference for shared types pattern

---

## TDD Process

### Phase 1: RED - Write Failing Tests

Create `__tests__/unit/components/workflow-steps/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type {
  WorkflowStepStatus,
  BaseWorkflowStepProps,
  CreatingTripStepProps,
  AwaitingSelectionStepProps,
  ReceivingQuotesStepProps,
  GenerateProposalStepProps,
  QuoteSummary,
} from '@/components/workflow-steps/types';

describe('WorkflowStepStatus', () => {
  it('should accept valid status values', () => {
    const statuses: WorkflowStepStatus[] = ['pending', 'in-progress', 'completed', 'failed'];
    expect(statuses).toHaveLength(4);
  });
});

describe('BaseWorkflowStepProps', () => {
  it('should have required status property', () => {
    const props: BaseWorkflowStepProps = { status: 'pending' };
    expect(props.status).toBe('pending');
  });

  it('should have optional isExpanded property', () => {
    const props: BaseWorkflowStepProps = { status: 'completed', isExpanded: true };
    expect(props.isExpanded).toBe(true);
  });
});

describe('CreatingTripStepProps', () => {
  it('should extend BaseWorkflowStepProps with trip-specific fields', () => {
    const props: CreatingTripStepProps = {
      status: 'completed',
      tripId: 'trp123',
      operatorsQueried: 15,
      aircraftFound: 8,
    };
    expect(props.tripId).toBe('trp123');
  });
});

describe('AwaitingSelectionStepProps', () => {
  it('should include deepLink and onDeepLinkClick', () => {
    const mockClick = vi.fn();
    const props: AwaitingSelectionStepProps = {
      status: 'in-progress',
      deepLink: 'https://web.avinode.com/trip/trp123',
      onDeepLinkClick: mockClick,
    };
    expect(props.deepLink).toContain('avinode.com');
  });
});

describe('QuoteSummary', () => {
  it('should have required quote fields', () => {
    const quote: QuoteSummary = {
      operatorName: 'Jet Corp',
      price: 25000,
      currency: 'USD',
    };
    expect(quote.operatorName).toBe('Jet Corp');
  });
});
```

Run tests (should fail):
```bash
npm run test:unit -- components/workflow-steps/types
```

### Phase 2: GREEN - Implement Types

Create `components/workflow-steps/types.ts` with all type definitions.

Run tests (should pass):
```bash
npm run test:unit -- components/workflow-steps/types
```

### Phase 3: REFACTOR - Clean Up

1. Add JSDoc comments to all exported types
2. Ensure consistent naming conventions
3. Run type check: `npm run type-check`

---

## Implementation Requirements

### Type Definitions to Create

```typescript
// 1. Status type
export type WorkflowStepStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

// 2. Base props interface
export interface BaseWorkflowStepProps {
  status: WorkflowStepStatus;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  embedded?: boolean;
  className?: string;
}

// 3. Step-specific props (4 total)
export interface CreatingTripStepProps extends BaseWorkflowStepProps { ... }
export interface AwaitingSelectionStepProps extends BaseWorkflowStepProps { ... }
export interface ReceivingQuotesStepProps extends BaseWorkflowStepProps { ... }
export interface GenerateProposalStepProps extends BaseWorkflowStepProps { ... }

// 4. Quote summary helper type
export interface QuoteSummary { ... }
```

---

## Acceptance Criteria

- [ ] `WorkflowStepStatus` type created with 4 valid values
- [ ] `BaseWorkflowStepProps` interface with status, isExpanded, onToggleExpand, embedded, className
- [ ] 4 step-specific prop interfaces extending base
- [ ] `QuoteSummary` interface for quote display
- [ ] All types exported from `types.ts`
- [ ] Unit tests pass
- [ ] Type check passes (`npm run type-check`)
- [ ] JSDoc comments on all exported types

---

## Dependencies

**Blocked by**: None (this is the first issue)

**Blocks**:
- ONEK-WFS-002 (CreatingTripStep)
- ONEK-WFS-003 (AwaitingSelectionStep)
- ONEK-WFS-004 (ReceivingQuotesStep)
- ONEK-WFS-005 (GenerateProposalStep)
