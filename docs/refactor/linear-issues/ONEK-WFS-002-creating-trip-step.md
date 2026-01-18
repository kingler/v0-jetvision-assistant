# Linear Issue: Create CreatingTripStep Component

## Issue Details

**Title**: Create CreatingTripStep independent message component

**Project**: Jetvision Assistant

**Team**: Engineering

**Priority**: High

**Labels**: `refactor`, `react`, `component`, `agent-executable`

**Estimate**: 2 points

---

## Description

Create the `CreatingTripStep` component that displays the "Creating Trip" workflow step. This component shows when the system is creating a trip container in Avinode marketplace.

## Agent Execution Context

### Git Branch Workspace

```bash
# Create feature branch
git checkout -b feat/ONEK-WFS-002-creating-trip-step

# Or use worktree for isolation
git worktree add .context/workspaces/phase-2-test-creation/feat/ONEK-WFS-002-creating-trip-step -b feat/ONEK-WFS-002-creating-trip-step
```

### Key File Paths

| File | Action | Purpose |
|------|--------|---------|
| `components/workflow-steps/creating-trip-step.tsx` | CREATE | Step component |
| `__tests__/unit/components/workflow-steps/creating-trip-step.test.tsx` | CREATE | Unit tests |

### Reference Files (READ ONLY)

- `components/workflow-steps/types.ts` - Props interface (ONEK-WFS-001)
- `components/workflow-visualization.tsx` - Lines 91-99 for step 2 rendering
- `components/workflow-visualization.tsx` - Lines 129-138 for getStatusIcon
- `components/workflow-visualization.tsx` - Lines 140-181 for getStatusBadge
- `components/message-components/workflow-status.tsx` - Status display pattern

### Import Dependencies

```typescript
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreatingTripStepProps } from './types';
```

---

## TDD Process

### Phase 1: RED - Write Failing Tests

Create `__tests__/unit/components/workflow-steps/creating-trip-step.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreatingTripStep } from '@/components/workflow-steps/creating-trip-step';

describe('CreatingTripStep', () => {
  describe('Status rendering', () => {
    it('should render pending state with clock icon', () => {
      render(<CreatingTripStep status="pending" />);
      expect(screen.getByText('Creating Trip')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render in-progress state with spinner', () => {
      render(<CreatingTripStep status="in-progress" />);
      expect(screen.getByText('In progress')).toBeInTheDocument();
    });

    it('should render completed state with check icon', () => {
      render(<CreatingTripStep status="completed" tripId="trp123" />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should render failed state with error styling', () => {
      render(<CreatingTripStep status="failed" />);
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('Details display', () => {
    it('should show trip details when expanded and completed', () => {
      render(
        <CreatingTripStep
          status="completed"
          tripId="trp123456"
          operatorsQueried={15}
          aircraftFound={8}
          isExpanded={true}
        />
      );
      expect(screen.getByText(/Queried 15 operators/)).toBeInTheDocument();
      expect(screen.getByText(/Found 8 potential aircraft/)).toBeInTheDocument();
    });

    it('should show in-progress message when expanded and in-progress', () => {
      render(<CreatingTripStep status="in-progress" isExpanded={true} />);
      expect(screen.getByText(/Creating trip container/)).toBeInTheDocument();
    });

    it('should not show details when collapsed', () => {
      render(
        <CreatingTripStep
          status="completed"
          operatorsQueried={15}
          isExpanded={false}
        />
      );
      expect(screen.queryByText(/Queried 15 operators/)).not.toBeInTheDocument();
    });
  });

  describe('Expand/collapse', () => {
    it('should call onToggleExpand when clicked', () => {
      const mockToggle = vi.fn();
      render(
        <CreatingTripStep
          status="completed"
          onToggleExpand={mockToggle}
        />
      );
      fireEvent.click(screen.getByRole('button'));
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Embedded mode', () => {
    it('should render compact version when embedded=true', () => {
      render(<CreatingTripStep status="in-progress" embedded={true} />);
      expect(screen.getByText('Step 1: Creating Trip')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <CreatingTripStep status="pending" className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
```

Run tests (should fail):
```bash
npm run test:unit -- creating-trip-step
```

### Phase 2: GREEN - Implement Component

Create `components/workflow-steps/creating-trip-step.tsx`:

```typescript
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreatingTripStepProps } from './types';

export function CreatingTripStep({
  status,
  tripId,
  operatorsQueried,
  aircraftFound,
  isExpanded = false,
  onToggleExpand,
  embedded = false,
  className,
}: CreatingTripStepProps) {
  // Implementation details...
}
```

Run tests (should pass):
```bash
npm run test:unit -- creating-trip-step
```

### Phase 3: REFACTOR

1. Extract status icon logic to shared utility (if not already done)
2. Extract status badge logic to shared utility
3. Ensure accessibility (ARIA labels, keyboard navigation)
4. Run lint: `npm run lint`

---

## Component Specifications

### Visual Design

**Card Mode** (embedded=false):
```
┌─────────────────────────────────────────────────┐
│ [Search Icon] Step 1: Creating Trip     [Badge] │
│ Creating trip container in Avinode marketplace  │
├─────────────────────────────────────────────────┤
│ (Expanded Details - if isExpanded)              │
│ • Creating trip container in Avinode...         │
│ OR                                              │
│ • Queried 15 operators                          │
│ • Found 8 potential aircraft                    │
└─────────────────────────────────────────────────┘
```

**Embedded Mode** (embedded=true):
```
[Icon] Step 1: Creating Trip  [+/-]
       └── Details (if expanded)
```

### Status Icons

| Status | Icon | Color |
|--------|------|-------|
| pending | Clock | gray-400 |
| in-progress | Loader2 (spinning) | primary |
| completed | CheckCircle | green-500 |
| failed | AlertCircle | red-500 |

### Details Content by Status

| Status | Details |
|--------|---------|
| pending | (none) |
| in-progress | "Creating trip container in Avinode..." |
| completed | "Trip container created", "Queried X operators", "Found X aircraft" |
| failed | "Failed to create trip" |

---

## Acceptance Criteria

- [ ] Component renders in all 4 status states
- [ ] Correct icons and colors for each status
- [ ] Details expand/collapse works
- [ ] Props (tripId, operatorsQueried, aircraftFound) display correctly
- [ ] Embedded mode renders compact version
- [ ] Keyboard accessible (Enter/Space to toggle)
- [ ] ARIA labels for screen readers
- [ ] Unit tests pass with >80% coverage
- [ ] No lint errors

---

## Dependencies

**Blocked by**: ONEK-WFS-001 (Shared Types)

**Blocks**: ONEK-WFS-006 (MessageRenderer Integration)
