# Linear Issue: Create WorkflowStepsContainer for Backwards Compatibility

## Issue Details

**Title**: Create WorkflowStepsContainer composite component

**Project**: Jetvision Assistant

**Team**: Engineering

**Priority**: Low

**Labels**: `refactor`, `react`, `backwards-compat`, `agent-executable`

**Estimate**: 2 points

---

## Description

Create the `WorkflowStepsContainer` composite component that renders all 4 workflow steps together, providing backwards compatibility with the original `WorkflowVisualization` component. This allows existing code to continue working while enabling the agent to use individual steps.

## Agent Execution Context

### Git Branch Workspace

```bash
git checkout -b feat/ONEK-WFS-007-workflow-steps-container

# Or use worktree
git worktree add .context/workspaces/phase-3-implementation/feat/ONEK-WFS-007-workflow-steps-container -b feat/ONEK-WFS-007-workflow-steps-container
```

### Key File Paths

| File | Action | Purpose |
|------|--------|---------|
| `components/workflow-steps/workflow-steps-container.tsx` | CREATE | Container component |
| `components/workflow-steps/index.ts` | MODIFY | Add export |
| `__tests__/unit/components/workflow-steps/workflow-steps-container.test.tsx` | CREATE | Unit tests |

### Reference Files (READ ONLY)

- `components/workflow-visualization.tsx` - Original component to replicate behavior
- `components/workflow-steps/creating-trip-step.tsx` - Child component
- `components/workflow-steps/awaiting-selection-step.tsx` - Child component
- `components/workflow-steps/receiving-quotes-step.tsx` - Child component
- `components/workflow-steps/generate-proposal-step.tsx` - Child component

---

## TDD Process

### Phase 1: RED - Write Failing Tests

Create `__tests__/unit/components/workflow-steps/workflow-steps-container.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowStepsContainer } from '@/components/workflow-steps/workflow-steps-container';

describe('WorkflowStepsContainer', () => {
  describe('Rendering all steps', () => {
    it('should render all 4 workflow steps', () => {
      render(<WorkflowStepsContainer currentStep={1} />);
      expect(screen.getByText('Creating Trip')).toBeInTheDocument();
      expect(screen.getByText('Awaiting Selection')).toBeInTheDocument();
      expect(screen.getByText('Receiving Quotes')).toBeInTheDocument();
      expect(screen.getByText('Generate Proposal')).toBeInTheDocument();
    });
  });

  describe('Status computation from currentStep', () => {
    it('should mark steps before currentStep as completed', () => {
      render(<WorkflowStepsContainer currentStep={3} />);
      // Steps 1 and 2 should be completed
      expect(screen.getAllByText('Completed')).toHaveLength(2);
      // Step 3 should be in-progress
      expect(screen.getByText('In progress')).toBeInTheDocument();
    });

    it('should mark currentStep as in-progress', () => {
      render(<WorkflowStepsContainer currentStep={2} />);
      // Only step 2 should be in-progress
      const inProgressBadges = screen.getAllByText('In progress');
      expect(inProgressBadges).toHaveLength(1);
    });

    it('should mark steps after currentStep as pending', () => {
      render(<WorkflowStepsContainer currentStep={1} />);
      // Steps 2, 3, 4 should be pending
      expect(screen.getAllByText('Pending')).toHaveLength(3);
    });
  });

  describe('Status computation from status prop', () => {
    it('should use status prop to determine step statuses', () => {
      render(<WorkflowStepsContainer status="requesting_quotes" />);
      // Steps 1-2 completed, step 3 in-progress
      expect(screen.getAllByText('Completed')).toHaveLength(2);
      expect(screen.getByText('In progress')).toBeInTheDocument();
    });

    it('should mark all steps completed for proposal_ready', () => {
      render(<WorkflowStepsContainer status="proposal_ready" />);
      expect(screen.getAllByText('Completed')).toHaveLength(4);
    });
  });

  describe('Workflow data forwarding', () => {
    it('should pass step1 data to CreatingTripStep', () => {
      render(
        <WorkflowStepsContainer
          currentStep={2}
          workflowData={{
            step1: { operatorsQueried: 15, aircraftFound: 8 },
          }}
        />
      );
      // Expand step 1 to see details
      fireEvent.click(screen.getByText('Creating Trip'));
      expect(screen.getByText(/Queried 15 operators/)).toBeInTheDocument();
    });

    it('should pass deepLink to AwaitingSelectionStep', () => {
      render(
        <WorkflowStepsContainer
          currentStep={2}
          deepLink="https://web.avinode.com/trip/trp123"
        />
      );
      fireEvent.click(screen.getByText('Awaiting Selection'));
      expect(screen.getByText('Go to Avinode Marketplace')).toBeInTheDocument();
    });
  });

  describe('Progress bar', () => {
    it('should show correct progress percentage', () => {
      render(<WorkflowStepsContainer currentStep={2} />);
      // 1 of 4 steps completed = 25%
      expect(screen.getByText('1 of 4 steps completed')).toBeInTheDocument();
    });

    it('should show 100% when all steps completed', () => {
      render(<WorkflowStepsContainer status="proposal_ready" />);
      expect(screen.getByText('4 of 4 steps completed')).toBeInTheDocument();
    });
  });

  describe('Embedded mode', () => {
    it('should render compact version when embedded=true', () => {
      render(<WorkflowStepsContainer currentStep={1} embedded={true} />);
      expect(screen.getByText('Step 1: Creating Trip')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should forward onDeepLinkClick callback', () => {
      const mockCallback = vi.fn();
      vi.stubGlobal('open', vi.fn());

      render(
        <WorkflowStepsContainer
          currentStep={2}
          deepLink="https://web.avinode.com/trip/trp123"
          onDeepLinkClick={mockCallback}
        />
      );

      fireEvent.click(screen.getByText('Awaiting Selection'));
      fireEvent.click(screen.getByText('Go to Avinode Marketplace'));
      expect(mockCallback).toHaveBeenCalled();
    });
  });
});
```

### Phase 2: GREEN - Implement Component

Create `components/workflow-steps/workflow-steps-container.tsx`:

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CreatingTripStep } from './creating-trip-step';
import { AwaitingSelectionStep } from './awaiting-selection-step';
import { ReceivingQuotesStep } from './receiving-quotes-step';
import { GenerateProposalStep } from './generate-proposal-step';
import type { WorkflowStepStatus } from './types';

interface WorkflowStepData {
  operatorsQueried?: number;
  aircraftFound?: number;
  quotesReceived?: number;
  quotesAnalyzed?: number;
  proposalGenerated?: boolean;
  avinodeRfpId?: string;
  avinodeQuotes?: any[];
}

interface WorkflowStepsContainerProps {
  currentStep?: number;
  status?: string;
  workflowData?: {
    step1?: WorkflowStepData;
    step2?: WorkflowStepData;
    step3?: WorkflowStepData;
    step4?: WorkflowStepData;
  };
  tripId?: string;
  deepLink?: string;
  onDeepLinkClick?: () => void;
  embedded?: boolean;
  className?: string;
}

export function WorkflowStepsContainer({
  currentStep = 1,
  status = 'understanding_request',
  workflowData,
  tripId,
  deepLink,
  onDeepLinkClick,
  embedded = false,
  className,
}: WorkflowStepsContainerProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  // Compute step statuses based on status prop or currentStep
  const computeStepStatus = (stepNumber: number): WorkflowStepStatus => {
    // ... same logic as original WorkflowVisualization
  };

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  // ... implementation
}
```

### Phase 3: REFACTOR

1. Extract status computation logic to shared utility
2. Ensure API compatibility with original WorkflowVisualization
3. Add deprecation notice suggesting use of individual components

---

## Component Specifications

### Props Interface

```typescript
interface WorkflowStepsContainerProps {
  /** Current step number (1-4) */
  currentStep?: number;
  /** Workflow status string */
  status?: string;
  /** Data for each workflow step */
  workflowData?: {
    step1?: WorkflowStepData;
    step2?: WorkflowStepData;
    step3?: WorkflowStepData;
    step4?: WorkflowStepData;
  };
  /** Avinode Trip ID */
  tripId?: string;
  /** Deep link URL for Avinode */
  deepLink?: string;
  /** Callback when deep link is clicked */
  onDeepLinkClick?: () => void;
  /** Render in compact mode */
  embedded?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

### Status to Step Mapping

| Status | Step 1 | Step 2 | Step 3 | Step 4 |
|--------|--------|--------|--------|--------|
| understanding_request | in-progress | pending | pending | pending |
| searching_aircraft | completed | in-progress | pending | pending |
| requesting_quotes | completed | completed | in-progress | pending |
| analyzing_options | completed | completed | completed | in-progress |
| proposal_ready | completed | completed | completed | completed |

### Visual Layout

```
┌─────────────────────────────────────────────────┐
│            Workflow Progress                     │
│   Track the progress of your flight request      │
├─────────────────────────────────────────────────┤
│ [CreatingTripStep]                              │
│ [AwaitingSelectionStep]                         │
│ [ReceivingQuotesStep]                           │
│ [GenerateProposalStep]                          │
├─────────────────────────────────────────────────┤
│ Progress Summary                                │
│ 2 of 4 steps completed                          │
│ [████████░░░░░░░░] 50%                          │
└─────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

- [ ] Renders all 4 step components
- [ ] Correctly computes step statuses from status or currentStep
- [ ] Forwards workflowData to appropriate steps
- [ ] Passes tripId and deepLink to AwaitingSelectionStep
- [ ] Progress bar shows correct completion percentage
- [ ] Expand/collapse works for each step
- [ ] Embedded mode renders compact version
- [ ] Backwards compatible with WorkflowVisualization props
- [ ] Unit tests pass with >80% coverage

---

## Dependencies

**Blocked by**:
- ONEK-WFS-002 (CreatingTripStep)
- ONEK-WFS-003 (AwaitingSelectionStep)
- ONEK-WFS-004 (ReceivingQuotesStep)
- ONEK-WFS-005 (GenerateProposalStep)
- ONEK-WFS-006 (MessageRenderer Integration)

**Blocks**: None (final issue in sequence)

---

## Migration Notes

The `WorkflowStepsContainer` provides a drop-in replacement for `WorkflowVisualization`. To migrate:

```typescript
// Before
import { WorkflowVisualization } from '@/components/workflow-visualization';
<WorkflowVisualization currentStep={2} deepLink={link} />

// After
import { WorkflowStepsContainer } from '@/components/workflow-steps';
<WorkflowStepsContainer currentStep={2} deepLink={link} />
```

For new code, prefer using individual step components via MessageRenderer for maximum flexibility.
