# Linear Issue: Integrate Workflow Steps into MessageRenderer

## Issue Details

**Title**: Add workflow step components to MessageRenderer discriminated union

**Project**: Jetvision Assistant

**Team**: Engineering

**Priority**: High

**Labels**: `refactor`, `typescript`, `integration`, `agent-executable`

**Estimate**: 2 points

---

## Description

Integrate the 4 new workflow step components into the MessageRenderer system by adding their types to the discriminated union and implementing the switch cases. This enables the Jetvision AI agent to return individual workflow steps for rendering.

## Agent Execution Context

### Git Branch Workspace

```bash
git checkout -b feat/ONEK-WFS-006-message-renderer-integration

# Or use worktree
git worktree add .context/workspaces/phase-3-implementation/feat/ONEK-WFS-006-message-renderer-integration -b feat/ONEK-WFS-006-message-renderer-integration
```

### Key File Paths

| File | Action | Purpose |
|------|--------|---------|
| `components/message-components/types.ts` | MODIFY | Add 4 new type interfaces |
| `components/message-components/message-renderer.tsx` | MODIFY | Add 4 new switch cases |
| `__tests__/integration/message-renderer/workflow-steps.test.tsx` | CREATE | Integration tests |

### Reference Files (READ ONLY)

- `components/workflow-steps/types.ts` - WorkflowStepStatus type
- `components/workflow-steps/creating-trip-step.tsx` - Component to import
- `components/workflow-steps/awaiting-selection-step.tsx` - Component to import
- `components/workflow-steps/receiving-quotes-step.tsx` - Component to import
- `components/workflow-steps/generate-proposal-step.tsx` - Component to import

---

## TDD Process

### Phase 1: RED - Write Failing Tests

Create `__tests__/integration/message-renderer/workflow-steps.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageRenderer } from '@/components/message-components/message-renderer';
import type { MessageComponent } from '@/components/message-components/types';

describe('MessageRenderer - Workflow Steps Integration', () => {
  describe('workflow_step_creating_trip', () => {
    it('should render CreatingTripStep component', () => {
      const component: MessageComponent = {
        type: 'workflow_step_creating_trip',
        status: 'in-progress',
        tripId: 'trp123',
      };
      render(<MessageRenderer component={component} />);
      expect(screen.getByText('Creating Trip')).toBeInTheDocument();
    });

    it('should render with all props', () => {
      const component: MessageComponent = {
        type: 'workflow_step_creating_trip',
        status: 'completed',
        tripId: 'trp123',
        operatorsQueried: 15,
        aircraftFound: 8,
        isExpanded: true,
      };
      render(<MessageRenderer component={component} />);
      expect(screen.getByText(/Queried 15 operators/)).toBeInTheDocument();
    });
  });

  describe('workflow_step_awaiting_selection', () => {
    it('should render AwaitingSelectionStep component', () => {
      const component: MessageComponent = {
        type: 'workflow_step_awaiting_selection',
        status: 'in-progress',
        deepLink: 'https://web.avinode.com/trip/trp123',
      };
      render(<MessageRenderer component={component} />);
      expect(screen.getByText('Awaiting Selection')).toBeInTheDocument();
    });

    it('should call onAction when deep link clicked', () => {
      const mockAction = vi.fn();
      const component: MessageComponent = {
        type: 'workflow_step_awaiting_selection',
        status: 'in-progress',
        deepLink: 'https://web.avinode.com/trip/trp123',
        isExpanded: true,
      };
      render(<MessageRenderer component={component} onAction={mockAction} />);

      // Mock window.open
      vi.stubGlobal('open', vi.fn());
      fireEvent.click(screen.getByText('Go to Avinode Marketplace'));
      expect(mockAction).toHaveBeenCalledWith('deep_link_click', expect.any(Object));
    });
  });

  describe('workflow_step_receiving_quotes', () => {
    it('should render ReceivingQuotesStep component', () => {
      const component: MessageComponent = {
        type: 'workflow_step_receiving_quotes',
        status: 'completed',
        quotesReceived: 5,
      };
      render(<MessageRenderer component={component} />);
      expect(screen.getByText('Receiving Quotes')).toBeInTheDocument();
    });
  });

  describe('workflow_step_generate_proposal', () => {
    it('should render GenerateProposalStep component', () => {
      const component: MessageComponent = {
        type: 'workflow_step_generate_proposal',
        status: 'completed',
        proposalGenerated: true,
        proposalId: 'prop-123',
      };
      render(<MessageRenderer component={component} />);
      expect(screen.getByText('Generate Proposal')).toBeInTheDocument();
    });

    it('should call onAction when view proposal clicked', () => {
      const mockAction = vi.fn();
      const component: MessageComponent = {
        type: 'workflow_step_generate_proposal',
        status: 'completed',
        proposalGenerated: true,
        proposalId: 'prop-123',
        isExpanded: true,
      };
      render(<MessageRenderer component={component} onAction={mockAction} />);
      fireEvent.click(screen.getByText('View Proposal'));
      expect(mockAction).toHaveBeenCalledWith('view_proposal', { proposalId: 'prop-123' });
    });
  });

  describe('Type exhaustiveness', () => {
    it('should handle all workflow step types without exhaustive check error', () => {
      // This test ensures TypeScript's exhaustive checking works
      const types = [
        'workflow_step_creating_trip',
        'workflow_step_awaiting_selection',
        'workflow_step_receiving_quotes',
        'workflow_step_generate_proposal',
      ] as const;

      types.forEach((type) => {
        const component = { type, status: 'pending' } as MessageComponent;
        expect(() => render(<MessageRenderer component={component} />)).not.toThrow();
      });
    });
  });
});
```

Run tests (should fail):
```bash
npm run test:integration -- workflow-steps
```

### Phase 2: GREEN - Implement Changes

#### Step 1: Update `types.ts`

Add imports and new interfaces:

```typescript
// Add import at top
import type { WorkflowStepStatus } from '@/components/workflow-steps/types';

// Add after existing interfaces (around line 308)

/**
 * Workflow Step: Creating Trip
 */
export interface WorkflowStepCreatingTripComponent extends BaseMessageComponent {
  type: 'workflow_step_creating_trip';
  status: WorkflowStepStatus;
  tripId?: string;
  operatorsQueried?: number;
  aircraftFound?: number;
  isExpanded?: boolean;
}

/**
 * Workflow Step: Awaiting Selection (with deep link)
 */
export interface WorkflowStepAwaitingSelectionComponent extends BaseMessageComponent {
  type: 'workflow_step_awaiting_selection';
  status: WorkflowStepStatus;
  tripId?: string;
  deepLink?: string;
  rfqId?: string;
  quotesReceived?: number;
  isExpanded?: boolean;
  onDeepLinkClick?: () => void;
}

/**
 * Workflow Step: Receiving Quotes
 */
export interface WorkflowStepReceivingQuotesComponent extends BaseMessageComponent {
  type: 'workflow_step_receiving_quotes';
  status: WorkflowStepStatus;
  quotesReceived?: number;
  quotesAnalyzed?: number;
  quotes?: Array<{ operatorName: string; price: number; currency: string }>;
  isExpanded?: boolean;
}

/**
 * Workflow Step: Generate Proposal
 */
export interface WorkflowStepGenerateProposalComponent extends BaseMessageComponent {
  type: 'workflow_step_generate_proposal';
  status: WorkflowStepStatus;
  proposalGenerated?: boolean;
  proposalId?: string;
  marginApplied?: boolean;
  isExpanded?: boolean;
  onViewProposal?: (proposalId: string) => void;
}

// Update the union type (around line 439)
export type MessageComponent =
  | TextComponent
  | QuoteCardComponent
  // ... existing types ...
  | InlineDashboardComponent
  // Add new types
  | WorkflowStepCreatingTripComponent
  | WorkflowStepAwaitingSelectionComponent
  | WorkflowStepReceivingQuotesComponent
  | WorkflowStepGenerateProposalComponent;
```

#### Step 2: Update `message-renderer.tsx`

Add imports and switch cases:

```typescript
// Add imports at top
import {
  CreatingTripStep,
  AwaitingSelectionStep,
  ReceivingQuotesStep,
  GenerateProposalStep,
} from '@/components/workflow-steps';

// Add switch cases before the default case (around line 258)

    case 'workflow_step_creating_trip':
      return (
        <CreatingTripStep
          status={component.status}
          tripId={component.tripId}
          operatorsQueried={component.operatorsQueried}
          aircraftFound={component.aircraftFound}
          isExpanded={component.isExpanded}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'workflow_step_awaiting_selection':
      return (
        <AwaitingSelectionStep
          status={component.status}
          tripId={component.tripId}
          deepLink={component.deepLink}
          rfqId={component.rfqId}
          quotesReceived={component.quotesReceived}
          isExpanded={component.isExpanded}
          onDeepLinkClick={component.onDeepLinkClick || (() => handleAction('deep_link_click', {}))}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'workflow_step_receiving_quotes':
      return (
        <ReceivingQuotesStep
          status={component.status}
          quotesReceived={component.quotesReceived}
          quotesAnalyzed={component.quotesAnalyzed}
          quotes={component.quotes}
          isExpanded={component.isExpanded}
          className={`${className || ''} ${component.className || ''}`}
        />
      );

    case 'workflow_step_generate_proposal':
      return (
        <GenerateProposalStep
          status={component.status}
          proposalGenerated={component.proposalGenerated}
          proposalId={component.proposalId}
          marginApplied={component.marginApplied}
          isExpanded={component.isExpanded}
          onViewProposal={
            component.onViewProposal ||
            ((proposalId) => handleAction('view_proposal', { proposalId }))
          }
          className={`${className || ''} ${component.className || ''}`}
        />
      );
```

Run tests (should pass):
```bash
npm run test:integration -- workflow-steps
```

### Phase 3: REFACTOR

1. Run type check: `npm run type-check`
2. Ensure exhaustive check passes
3. Run full test suite: `npm test`

---

## Acceptance Criteria

- [ ] 4 new interfaces added to `types.ts`
- [ ] MessageComponent union type includes all 4 new types
- [ ] 4 new switch cases in `message-renderer.tsx`
- [ ] Imports added for workflow step components
- [ ] onAction callbacks properly wired for deep_link_click and view_proposal
- [ ] TypeScript exhaustive check passes
- [ ] Integration tests pass
- [ ] No type errors: `npm run type-check`

---

## Dependencies

**Blocked by**:
- ONEK-WFS-001 (Shared Types)
- ONEK-WFS-002 (CreatingTripStep)
- ONEK-WFS-003 (AwaitingSelectionStep)
- ONEK-WFS-004 (ReceivingQuotesStep)
- ONEK-WFS-005 (GenerateProposalStep)

**Blocks**: ONEK-WFS-007 (WorkflowStepsContainer)
