# Linear Issue: Create GenerateProposalStep Component

## Issue Details

**Title**: Create GenerateProposalStep component for proposal generation display

**Project**: Jetvision Assistant

**Team**: Engineering

**Priority**: Medium

**Labels**: `refactor`, `react`, `component`, `agent-executable`

**Estimate**: 2 points

---

## Description

Create the `GenerateProposalStep` component that displays the "Generate Proposal" workflow step. This is the final step showing when the system generates a Jetvision-branded proposal.

## Agent Execution Context

### Git Branch Workspace

```bash
git checkout -b feat/ONEK-WFS-005-generate-proposal-step

# Or use worktree
git worktree add .context/workspaces/phase-2-test-creation/feat/ONEK-WFS-005-generate-proposal-step -b feat/ONEK-WFS-005-generate-proposal-step
```

### Key File Paths

| File | Action | Purpose |
|------|--------|---------|
| `components/workflow-steps/generate-proposal-step.tsx` | CREATE | Step component |
| `__tests__/unit/components/workflow-steps/generate-proposal-step.test.tsx` | CREATE | Unit tests |

### Reference Files (READ ONLY)

- `components/workflow-steps/types.ts` - Props interface
- `components/workflow-visualization.tsx` - Lines 118-127 for step 5 definition
- `components/workflow-visualization.tsx` - Lines 266-277 for proposal details
- `components/message-components/proposal-preview.tsx` - Proposal display pattern

### Import Dependencies

```typescript
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Loader2, FileText, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerateProposalStepProps } from './types';
```

---

## TDD Process

### Phase 1: RED - Write Failing Tests

Create `__tests__/unit/components/workflow-steps/generate-proposal-step.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenerateProposalStep } from '@/components/workflow-steps/generate-proposal-step';

describe('GenerateProposalStep', () => {
  describe('Status rendering', () => {
    it('should render pending state', () => {
      render(<GenerateProposalStep status="pending" />);
      expect(screen.getByText('Generate Proposal')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render in-progress state with generating message', () => {
      render(<GenerateProposalStep status="in-progress" isExpanded={true} />);
      expect(screen.getByText(/Generating proposal/)).toBeInTheDocument();
    });

    it('should render completed state with success message', () => {
      render(
        <GenerateProposalStep
          status="completed"
          proposalGenerated={true}
          isExpanded={true}
        />
      );
      expect(screen.getByText(/Created Jetvision branded quote/)).toBeInTheDocument();
    });

    it('should render failed state', () => {
      render(<GenerateProposalStep status="failed" />);
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('Proposal details', () => {
    it('should show margin applied when marginApplied=true', () => {
      render(
        <GenerateProposalStep
          status="completed"
          proposalGenerated={true}
          marginApplied={true}
          isExpanded={true}
        />
      );
      expect(screen.getByText(/Applied margin settings/)).toBeInTheDocument();
    });

    it('should show proposal ID when provided', () => {
      render(
        <GenerateProposalStep
          status="completed"
          proposalId="prop-12345"
          isExpanded={true}
        />
      );
      expect(screen.getByText(/prop-12345/)).toBeInTheDocument();
    });

    it('should NOT show "Proposal ready for client" when not generated', () => {
      render(
        <GenerateProposalStep
          status="in-progress"
          proposalGenerated={false}
          isExpanded={true}
        />
      );
      expect(screen.queryByText(/Proposal ready for client/)).not.toBeInTheDocument();
    });
  });

  describe('View Proposal button', () => {
    it('should show View Proposal button when completed and proposalId provided', () => {
      render(
        <GenerateProposalStep
          status="completed"
          proposalGenerated={true}
          proposalId="prop-12345"
          isExpanded={true}
        />
      );
      expect(screen.getByText('View Proposal')).toBeInTheDocument();
    });

    it('should NOT show button when status is in-progress', () => {
      render(
        <GenerateProposalStep
          status="in-progress"
          proposalId="prop-12345"
          isExpanded={true}
        />
      );
      expect(screen.queryByText('View Proposal')).not.toBeInTheDocument();
    });

    it('should NOT show button when no proposalId', () => {
      render(
        <GenerateProposalStep
          status="completed"
          proposalGenerated={true}
          isExpanded={true}
        />
      );
      expect(screen.queryByText('View Proposal')).not.toBeInTheDocument();
    });

    it('should call onViewProposal with proposalId when clicked', () => {
      const mockView = vi.fn();
      render(
        <GenerateProposalStep
          status="completed"
          proposalGenerated={true}
          proposalId="prop-12345"
          onViewProposal={mockView}
          isExpanded={true}
        />
      );
      fireEvent.click(screen.getByText('View Proposal'));
      expect(mockView).toHaveBeenCalledWith('prop-12345');
    });
  });

  describe('Expand/collapse', () => {
    it('should call onToggleExpand when clicked', () => {
      const mockToggle = vi.fn();
      render(
        <GenerateProposalStep status="completed" onToggleExpand={mockToggle} />
      );
      fireEvent.click(screen.getByRole('button'));
      expect(mockToggle).toHaveBeenCalled();
    });
  });

  describe('Embedded mode', () => {
    it('should render compact version', () => {
      render(<GenerateProposalStep status="in-progress" embedded={true} />);
      expect(screen.getByText('Step 4: Generate Proposal')).toBeInTheDocument();
    });
  });
});
```

### Phase 2: GREEN - Implement Component

Implement the component to pass all tests.

### Phase 3: REFACTOR

1. Add success animation when proposalGenerated=true
2. Add download button option
3. Ensure accessibility

---

## Component Specifications

### Visual Design

**Completed with View Button**:
```
┌─────────────────────────────────────────────────┐
│ [FileText] Step 4: Generate Proposal   [Badge]  │
│ Creating Jetvision branded quote                │
├─────────────────────────────────────────────────┤
│ • Applied margin settings                       │
│ • Created Jetvision branded quote               │
│ • Proposal ready for client                     │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Eye] View Proposal                         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### View Proposal Button Rules

| Condition | Show Button? |
|-----------|--------------|
| status=completed AND proposalId exists | YES |
| status=in-progress | NO |
| status=completed AND no proposalId | NO |

### Details Content by Status

| Status | Details |
|--------|---------|
| pending | (none) |
| in-progress | "Generating proposal..." |
| completed | "Applied margin settings" (if marginApplied), "Created Jetvision branded quote", "Proposal ready for client" |
| failed | "Failed to generate proposal" |

---

## Acceptance Criteria

- [ ] Component renders in all 4 status states
- [ ] Margin applied message shows when marginApplied=true
- [ ] Proposal ID displays when provided
- [ ] View Proposal button shows when completed + proposalId
- [ ] onViewProposal callback fires with correct ID
- [ ] Embedded mode renders compact version
- [ ] Unit tests pass with >80% coverage

---

## Dependencies

**Blocked by**: ONEK-WFS-001 (Shared Types)

**Blocks**: ONEK-WFS-006 (MessageRenderer Integration)
