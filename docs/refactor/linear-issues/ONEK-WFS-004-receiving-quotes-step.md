# Linear Issue: Create ReceivingQuotesStep Component

## Issue Details

**Title**: Create ReceivingQuotesStep component for quote processing display

**Project**: Jetvision Assistant

**Team**: Engineering

**Priority**: Medium

**Labels**: `refactor`, `react`, `component`, `agent-executable`

**Estimate**: 2 points

---

## Description

Create the `ReceivingQuotesStep` component that displays the "Receiving Quotes" workflow step. This component shows when the system is receiving and processing operator quotes via webhook.

## Agent Execution Context

### Git Branch Workspace

```bash
git checkout -b feat/ONEK-WFS-004-receiving-quotes-step

# Or use worktree
git worktree add .context/workspaces/phase-2-test-creation/feat/ONEK-WFS-004-receiving-quotes-step -b feat/ONEK-WFS-004-receiving-quotes-step
```

### Key File Paths

| File | Action | Purpose |
|------|--------|---------|
| `components/workflow-steps/receiving-quotes-step.tsx` | CREATE | Step component |
| `__tests__/unit/components/workflow-steps/receiving-quotes-step.test.tsx` | CREATE | Unit tests |

### Reference Files (READ ONLY)

- `components/workflow-steps/types.ts` - Props interface (QuoteSummary type)
- `components/workflow-visualization.tsx` - Lines 109-117 for step 4 definition
- `components/workflow-visualization.tsx` - Lines 253-264 for quote details logic
- `components/quotes/quote-card.tsx` - Quote display pattern

### Import Dependencies

```typescript
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Loader2, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReceivingQuotesStepProps } from './types';
```

---

## TDD Process

### Phase 1: RED - Write Failing Tests

Create `__tests__/unit/components/workflow-steps/receiving-quotes-step.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReceivingQuotesStep } from '@/components/workflow-steps/receiving-quotes-step';

describe('ReceivingQuotesStep', () => {
  describe('Status rendering', () => {
    it('should render pending state', () => {
      render(<ReceivingQuotesStep status="pending" />);
      expect(screen.getByText('Receiving Quotes')).toBeInTheDocument();
    });

    it('should render in-progress state with processing message', () => {
      render(<ReceivingQuotesStep status="in-progress" isExpanded={true} />);
      expect(screen.getByText(/Processing operator quotes/)).toBeInTheDocument();
    });

    it('should render completed state with quote count', () => {
      render(
        <ReceivingQuotesStep
          status="completed"
          quotesReceived={5}
          isExpanded={true}
        />
      );
      expect(screen.getByText(/Received 5 quotes/)).toBeInTheDocument();
    });
  });

  describe('Quote details', () => {
    it('should display quotes analyzed count', () => {
      render(
        <ReceivingQuotesStep
          status="completed"
          quotesReceived={5}
          quotesAnalyzed={5}
          isExpanded={true}
        />
      );
      expect(screen.getByText(/Analyzed 5 quotes/)).toBeInTheDocument();
    });

    it('should display quote summary list when quotes provided', () => {
      const quotes = [
        { operatorName: 'Jet Corp', price: 25000, currency: 'USD' },
        { operatorName: 'Sky Aviation', price: 28000, currency: 'USD' },
      ];
      render(
        <ReceivingQuotesStep
          status="completed"
          quotes={quotes}
          isExpanded={true}
        />
      );
      expect(screen.getByText('Jet Corp')).toBeInTheDocument();
      expect(screen.getByText('Sky Aviation')).toBeInTheDocument();
      expect(screen.getByText(/\$25,000/)).toBeInTheDocument();
    });

    it('should show top 3 quotes only when more provided', () => {
      const quotes = [
        { operatorName: 'Op1', price: 20000, currency: 'USD' },
        { operatorName: 'Op2', price: 22000, currency: 'USD' },
        { operatorName: 'Op3', price: 24000, currency: 'USD' },
        { operatorName: 'Op4', price: 26000, currency: 'USD' },
        { operatorName: 'Op5', price: 28000, currency: 'USD' },
      ];
      render(
        <ReceivingQuotesStep
          status="completed"
          quotes={quotes}
          isExpanded={true}
        />
      );
      expect(screen.getByText('Op1')).toBeInTheDocument();
      expect(screen.getByText('Op3')).toBeInTheDocument();
      expect(screen.queryByText('Op4')).not.toBeInTheDocument();
      expect(screen.getByText(/\+ 2 more/)).toBeInTheDocument();
    });
  });

  describe('Expand/collapse', () => {
    it('should call onToggleExpand when clicked', () => {
      const mockToggle = vi.fn();
      render(
        <ReceivingQuotesStep status="completed" onToggleExpand={mockToggle} />
      );
      fireEvent.click(screen.getByRole('button'));
      expect(mockToggle).toHaveBeenCalled();
    });
  });

  describe('Embedded mode', () => {
    it('should render compact version', () => {
      render(<ReceivingQuotesStep status="in-progress" embedded={true} />);
      expect(screen.getByText('Step 3: Receiving Quotes')).toBeInTheDocument();
    });
  });
});
```

### Phase 2: GREEN - Implement Component

Implement the component to pass all tests.

### Phase 3: REFACTOR

1. Format currency values properly (use Intl.NumberFormat)
2. Add aircraft type to quote display if available
3. Ensure accessibility

---

## Component Specifications

### Visual Design

**Expanded with Quote List**:
```
┌─────────────────────────────────────────────────┐
│ [Calculator] Step 3: Receiving Quotes   [Badge] │
│ Processing operator quotes via webhook          │
├─────────────────────────────────────────────────┤
│ • Received 5 quotes                             │
│ • Analyzed 5 quotes                             │
│                                                 │
│ Top Quotes:                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ Jet Corp            $25,000 USD             │ │
│ │ Sky Aviation        $28,000 USD             │ │
│ │ Elite Jets          $30,000 USD             │ │
│ └─────────────────────────────────────────────┘ │
│ + 2 more quotes                                 │
└─────────────────────────────────────────────────┘
```

### Quote Display Rules

- Show max 3 quotes in expanded view
- Format price with currency symbol and thousands separator
- Show "+ X more" if more quotes exist
- Include aircraft type if provided in QuoteSummary

---

## Acceptance Criteria

- [ ] Component renders in all 4 status states
- [ ] Quotes received count displays correctly
- [ ] Quotes analyzed count displays correctly
- [ ] Quote summary list shows top 3 quotes
- [ ] Currency formatting is correct (USD, EUR, GBP)
- [ ] "+ X more" shown when >3 quotes
- [ ] Embedded mode renders compact version
- [ ] Unit tests pass with >80% coverage

---

## Dependencies

**Blocked by**: ONEK-WFS-001 (Shared Types)

**Blocks**: ONEK-WFS-006 (MessageRenderer Integration)
