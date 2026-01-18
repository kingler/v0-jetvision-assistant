# Linear Issue: Create AwaitingSelectionStep Component

## Issue Details

**Title**: Create AwaitingSelectionStep component with Avinode deep link

**Project**: Jetvision Assistant

**Team**: Engineering

**Priority**: High

**Labels**: `refactor`, `react`, `component`, `avinode`, `agent-executable`

**Estimate**: 3 points

---

## Description

Create the `AwaitingSelectionStep` component that displays the "Awaiting Selection" workflow step. This is the most critical step as it includes the deep link button to open Avinode marketplace where the user selects operators and sends RFPs.

## Agent Execution Context

### Git Branch Workspace

```bash
# Create feature branch
git checkout -b feat/ONEK-WFS-003-awaiting-selection-step

# Or use worktree for isolation
git worktree add .context/workspaces/phase-2-test-creation/feat/ONEK-WFS-003-awaiting-selection-step -b feat/ONEK-WFS-003-awaiting-selection-step
```

### Key File Paths

| File | Action | Purpose |
|------|--------|---------|
| `components/workflow-steps/awaiting-selection-step.tsx` | CREATE | Step component |
| `__tests__/unit/components/workflow-steps/awaiting-selection-step.test.tsx` | CREATE | Unit tests |

### Reference Files (READ ONLY)

- `components/workflow-steps/types.ts` - Props interface
- `components/workflow-visualization.tsx` - Lines 100-108 for step 3 definition
- `components/workflow-visualization.tsx` - Lines 361-386 for deep link button logic
- `lib/utils/avinode-url.ts` - `validateAndFixAvinodeUrl` function
- `components/avinode/deep-link-prompt.tsx` - Deep link UI pattern

### Import Dependencies

```typescript
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateAndFixAvinodeUrl } from '@/lib/utils/avinode-url';
import type { AwaitingSelectionStepProps } from './types';
```

---

## TDD Process

### Phase 1: RED - Write Failing Tests

Create `__tests__/unit/components/workflow-steps/awaiting-selection-step.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AwaitingSelectionStep } from '@/components/workflow-steps/awaiting-selection-step';

// Mock window.open
const mockOpen = vi.fn();
vi.stubGlobal('open', mockOpen);

describe('AwaitingSelectionStep', () => {
  beforeEach(() => {
    mockOpen.mockClear();
  });

  describe('Status rendering', () => {
    it('should render pending state', () => {
      render(<AwaitingSelectionStep status="pending" />);
      expect(screen.getByText('Awaiting Selection')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render in-progress state with action required styling', () => {
      render(<AwaitingSelectionStep status="in-progress" />);
      expect(screen.getByText('In progress')).toBeInTheDocument();
    });

    it('should render completed state', () => {
      render(<AwaitingSelectionStep status="completed" quotesReceived={5} />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('Deep link button', () => {
    it('should show deep link button when in-progress and deepLink provided', () => {
      render(
        <AwaitingSelectionStep
          status="in-progress"
          deepLink="https://web.avinode.com/trip/trp123"
          isExpanded={true}
        />
      );
      expect(screen.getByText('Go to Avinode Marketplace')).toBeInTheDocument();
    });

    it('should NOT show deep link button when status is pending', () => {
      render(
        <AwaitingSelectionStep
          status="pending"
          deepLink="https://web.avinode.com/trip/trp123"
        />
      );
      expect(screen.queryByText('Go to Avinode Marketplace')).not.toBeInTheDocument();
    });

    it('should NOT show deep link button when status is completed', () => {
      render(
        <AwaitingSelectionStep
          status="completed"
          deepLink="https://web.avinode.com/trip/trp123"
        />
      );
      expect(screen.queryByText('Go to Avinode Marketplace')).not.toBeInTheDocument();
    });

    it('should open validated URL in new tab when clicked', () => {
      render(
        <AwaitingSelectionStep
          status="in-progress"
          deepLink="https://web.avinode.com/trip/trp123"
          isExpanded={true}
        />
      );
      fireEvent.click(screen.getByText('Go to Avinode Marketplace'));
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('avinode.com'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should call onDeepLinkClick callback when clicked', () => {
      const mockCallback = vi.fn();
      render(
        <AwaitingSelectionStep
          status="in-progress"
          deepLink="https://web.avinode.com/trip/trp123"
          onDeepLinkClick={mockCallback}
          isExpanded={true}
        />
      );
      fireEvent.click(screen.getByText('Go to Avinode Marketplace'));
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should NOT render button for invalid deep link URL', () => {
      render(
        <AwaitingSelectionStep
          status="in-progress"
          deepLink="invalid-url"
          isExpanded={true}
        />
      );
      expect(screen.queryByText('Go to Avinode Marketplace')).not.toBeInTheDocument();
    });

    it('should validate and fix API URLs to web URLs', () => {
      render(
        <AwaitingSelectionStep
          status="in-progress"
          deepLink="https://sandbox.avinode.com/api/trips/trp123"
          isExpanded={true}
        />
      );
      fireEvent.click(screen.getByText('Go to Avinode Marketplace'));
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('web.avinode.com'),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('Details display', () => {
    it('should show waiting message when in-progress', () => {
      render(<AwaitingSelectionStep status="in-progress" isExpanded={true} />);
      expect(screen.getByText(/Waiting for flight selection/)).toBeInTheDocument();
    });

    it('should show RFQ ID when provided', () => {
      render(
        <AwaitingSelectionStep
          status="completed"
          rfqId="rfq-123456"
          isExpanded={true}
        />
      );
      expect(screen.getByText(/RFP ID: rfq-123456/)).toBeInTheDocument();
    });

    it('should show quotes received count', () => {
      render(
        <AwaitingSelectionStep
          status="completed"
          quotesReceived={5}
          isExpanded={true}
        />
      );
      expect(screen.getByText(/Received 5 quotes/)).toBeInTheDocument();
    });
  });

  describe('Embedded mode', () => {
    it('should show deep link button in embedded mode when in-progress', () => {
      render(
        <AwaitingSelectionStep
          status="in-progress"
          deepLink="https://web.avinode.com/trip/trp123"
          embedded={true}
        />
      );
      expect(screen.getByText('Go to Avinode Marketplace')).toBeInTheDocument();
    });
  });
});
```

Run tests (should fail):
```bash
npm run test:unit -- awaiting-selection-step
```

### Phase 2: GREEN - Implement Component

Create `components/workflow-steps/awaiting-selection-step.tsx`:

```typescript
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateAndFixAvinodeUrl } from '@/lib/utils/avinode-url';
import type { AwaitingSelectionStepProps } from './types';

export function AwaitingSelectionStep({
  status,
  tripId,
  deepLink,
  rfqId,
  quotesReceived,
  isExpanded = false,
  onToggleExpand,
  onDeepLinkClick,
  embedded = false,
  className,
}: AwaitingSelectionStepProps) {
  // Validate deep link URL
  const validatedDeepLink = deepLink ? validateAndFixAvinodeUrl(deepLink) : null;

  const handleDeepLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent step toggle
    if (validatedDeepLink) {
      window.open(validatedDeepLink, '_blank', 'noopener,noreferrer');
      onDeepLinkClick?.();
    }
  };

  // Implementation continues...
}
```

Run tests (should pass):
```bash
npm run test:unit -- awaiting-selection-step
```

### Phase 3: REFACTOR

1. Ensure deep link validation edge cases are handled
2. Add loading state for deep link button
3. Add accessibility attributes
4. Run lint: `npm run lint`

---

## Component Specifications

### Visual Design

**Card Mode with Deep Link Button**:
```
┌─────────────────────────────────────────────────┐
│ [Clock Icon] Step 2: Awaiting Selection [Badge] │
│ Waiting for flight selection in Avinode         │
├─────────────────────────────────────────────────┤
│ • Waiting for flight selection in Avinode       │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ [External Link] Go to Avinode Marketplace   │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Deep Link Button Rules

| Condition | Show Button? |
|-----------|--------------|
| status=in-progress AND deepLink valid | YES |
| status=pending | NO |
| status=completed | NO |
| status=failed | NO |
| deepLink invalid/missing | NO |

### URL Validation Requirements

The `validateAndFixAvinodeUrl` function must:
1. Accept `https://web.avinode.com/...` URLs
2. Convert API URLs (`sandbox.avinode.com/api/...`) to web URLs
3. Reject invalid/malformed URLs
4. Return `null` for invalid URLs (don't render button)

---

## Acceptance Criteria

- [ ] Component renders in all 4 status states
- [ ] Deep link button ONLY shows when status=in-progress AND valid deepLink
- [ ] Button opens validated URL in new tab with security attributes
- [ ] onDeepLinkClick callback fires when button clicked
- [ ] Invalid URLs are rejected (button not shown)
- [ ] API URLs are converted to web URLs
- [ ] RFQ ID and quotes received display correctly when expanded
- [ ] Embedded mode works with deep link button
- [ ] Unit tests pass with >80% coverage
- [ ] No lint errors

---

## Dependencies

**Blocked by**: ONEK-WFS-001 (Shared Types)

**Blocks**: ONEK-WFS-006 (MessageRenderer Integration)

---

## Security Considerations

1. Always use `validateAndFixAvinodeUrl` before opening URLs
2. Use `noopener,noreferrer` on window.open
3. Never trust raw deepLink prop - always validate
4. Log invalid URLs for debugging (but don't expose to user)
