# Workflow Steps Component Refactor

## Overview

Refactor the monolithic `WorkflowVisualization` component into independent, props-driven message components that the Jetvision AI agent can retrieve and render via the `MessageRenderer` discriminated union system.

**Goal**: Enable the AI agent to render individual workflow steps independently, improving flexibility and composability.

## Current State

### Monolithic Components

| Component | Location | Lines | Purpose |
|-----------|----------|-------|---------|
| `WorkflowVisualization` | `components/workflow-visualization.tsx` | 527 | Full 5-step workflow display |
| `RFPFlowCard` | `components/rfq-flow-card.tsx` | 245 | RFP information gathering progress |

### Problems

1. **Tightly coupled**: All 5 workflow steps are hardcoded together
2. **Limited agent control**: Agent cannot render individual steps
3. **Duplication**: Similar step rendering logic repeated
4. **Inflexible**: Can't mix/match steps or show partial workflows

## Target Architecture

### New Component Structure

```
components/workflow-steps/
├── types.ts                        # Shared types
├── creating-trip-step.tsx          # Step 1: Creating Trip
├── awaiting-selection-step.tsx     # Step 2: Awaiting Selection (deep link)
├── receiving-quotes-step.tsx       # Step 3: Receiving Quotes
├── generate-proposal-step.tsx      # Step 4: Generate Proposal
├── workflow-steps-container.tsx    # Composite (backwards compat)
└── index.ts                        # Barrel exports
```

### MessageRenderer Integration

New discriminated union types to add:

```typescript
type MessageComponent =
  | ... // existing types
  | WorkflowStepCreatingTripComponent
  | WorkflowStepAwaitingSelectionComponent
  | WorkflowStepReceivingQuotesComponent
  | WorkflowStepGenerateProposalComponent;
```

## Implementation Details

### Step 1: Creating Trip

**File**: `components/workflow-steps/creating-trip-step.tsx`

**Props**:
```typescript
interface CreatingTripStepProps {
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  tripId?: string;
  operatorsQueried?: number;
  aircraftFound?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  embedded?: boolean;
  className?: string;
}
```

**Details Display** (when expanded):
- "Creating trip container in Avinode..." (in-progress)
- "Trip container created" (completed)
- "Queried X operators" (if operatorsQueried provided)
- "Found X potential aircraft" (if aircraftFound provided)

### Step 2: Awaiting Selection

**File**: `components/workflow-steps/awaiting-selection-step.tsx`

**Props**:
```typescript
interface AwaitingSelectionStepProps {
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  tripId?: string;
  deepLink?: string;
  rfqId?: string;
  quotesReceived?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onDeepLinkClick?: () => void;
  embedded?: boolean;
  className?: string;
}
```

**Key Feature**: "Go to Avinode Marketplace" button with validated deep link

**Details Display**:
- "Waiting for flight selection in Avinode" (in-progress)
- Deep link button (when status is in-progress and deepLink provided)
- "RFP ID: X" (if rfqId provided)
- "Received X quotes" (if quotesReceived provided)

### Step 3: Receiving Quotes

**File**: `components/workflow-steps/receiving-quotes-step.tsx`

**Props**:
```typescript
interface ReceivingQuotesStepProps {
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  quotesReceived?: number;
  quotesAnalyzed?: number;
  quotes?: Array<{ operatorName: string; price: number; currency: string }>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  embedded?: boolean;
  className?: string;
}
```

**Details Display**:
- "Processing operator quotes via webhook" (in-progress)
- "Received X quotes" (completed)
- "Analyzed X quotes" (if quotesAnalyzed provided)
- Quote summary list (if quotes array provided)

### Step 4: Generate Proposal

**File**: `components/workflow-steps/generate-proposal-step.tsx`

**Props**:
```typescript
interface GenerateProposalStepProps {
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  proposalGenerated?: boolean;
  proposalId?: string;
  marginApplied?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onViewProposal?: (proposalId: string) => void;
  embedded?: boolean;
  className?: string;
}
```

**Details Display**:
- "Generating proposal..." (in-progress)
- "Applied margin settings" (if marginApplied)
- "Created Jetvision branded quote" (completed)
- "View Proposal" button (if proposalId provided)

## Files to Modify

### `components/message-components/types.ts`

Add 4 new interfaces and include in union:

```typescript
// Import WorkflowStepStatus type
import type { WorkflowStepStatus } from '@/components/workflow-steps/types';

export interface WorkflowStepCreatingTripComponent extends BaseMessageComponent {
  type: 'workflow_step_creating_trip';
  status: WorkflowStepStatus;
  tripId?: string;
  operatorsQueried?: number;
  aircraftFound?: number;
  isExpanded?: boolean;
}

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

export interface WorkflowStepReceivingQuotesComponent extends BaseMessageComponent {
  type: 'workflow_step_receiving_quotes';
  status: WorkflowStepStatus;
  quotesReceived?: number;
  quotesAnalyzed?: number;
  quotes?: Array<{ operatorName: string; price: number; currency: string }>;
  isExpanded?: boolean;
}

export interface WorkflowStepGenerateProposalComponent extends BaseMessageComponent {
  type: 'workflow_step_generate_proposal';
  status: WorkflowStepStatus;
  proposalGenerated?: boolean;
  proposalId?: string;
  marginApplied?: boolean;
  isExpanded?: boolean;
  onViewProposal?: (proposalId: string) => void;
}
```

### `components/message-components/message-renderer.tsx`

Add 4 new switch cases:

```typescript
case 'workflow_step_creating_trip':
  return <CreatingTripStep {...component} />;

case 'workflow_step_awaiting_selection':
  return (
    <AwaitingSelectionStep
      {...component}
      onDeepLinkClick={component.onDeepLinkClick || (() => handleAction('deep_link_click', {}))}
    />
  );

case 'workflow_step_receiving_quotes':
  return <ReceivingQuotesStep {...component} />;

case 'workflow_step_generate_proposal':
  return (
    <GenerateProposalStep
      {...component}
      onViewProposal={component.onViewProposal || ((id) => handleAction('view_proposal', { proposalId: id }))}
    />
  );
```

## Key Dependencies

### Imports Required

```typescript
// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Icons
import { CheckCircle, Clock, Loader2, Search, FileText, Calculator, ExternalLink } from 'lucide-react';

// Utilities
import { cn } from '@/lib/utils';
import { validateAndFixAvinodeUrl } from '@/lib/utils/avinode-url';
```

### Existing Patterns to Follow

Reference these existing components for consistency:
- `components/workflow-visualization.tsx` - Original step rendering logic
- `components/rfq-flow-card.tsx` - Step indicator pattern
- `components/message-components/workflow-status.tsx` - Status badge pattern
- `components/avinode/trip-summary-card.tsx` - Card layout pattern

## Agent Usage Examples

### Single Step Rendering

```typescript
// Agent returns just the awaiting selection step
const response = {
  type: 'workflow_step_awaiting_selection',
  status: 'in-progress',
  tripId: 'trp123456',
  deepLink: 'https://web.avinode.com/trip/trp123456',
  isExpanded: true
};
```

### Multiple Independent Steps

```typescript
// Agent returns multiple steps for display
const components = [
  {
    type: 'workflow_step_creating_trip',
    status: 'completed',
    tripId: 'trp123456',
    operatorsQueried: 15,
    aircraftFound: 8
  },
  {
    type: 'workflow_step_awaiting_selection',
    status: 'in-progress',
    tripId: 'trp123456',
    deepLink: 'https://web.avinode.com/trip/trp123456'
  }
];
```

## Testing Requirements

### Unit Tests

Location: `__tests__/unit/components/workflow-steps/`

Each component needs tests for:
1. Renders correctly in each status state (pending, in-progress, completed, failed)
2. Displays correct details when expanded
3. Handles callbacks correctly (onToggleExpand, onDeepLinkClick, etc.)
4. Renders in embedded mode
5. Applies custom className

### Integration Tests

Location: `__tests__/integration/message-renderer/`

1. MessageRenderer routes to correct component for each type
2. Action callbacks are properly wired through handleAction
3. Type exhaustiveness check passes

## Verification Checklist

- [ ] All 4 step components render in all states
- [ ] Deep link validation works in AwaitingSelectionStep
- [ ] MessageRenderer correctly routes all new types
- [ ] TypeScript type checking passes
- [ ] Unit tests pass with >75% coverage
- [ ] No regressions in existing workflow functionality
- [ ] Storybook stories added for each component

## Related Files

| File | Purpose |
|------|---------|
| `components/workflow-visualization.tsx` | Original monolithic component |
| `components/rfq-flow-card.tsx` | RFP flow progress (reference) |
| `components/message-components/types.ts` | Message type definitions |
| `components/message-components/message-renderer.tsx` | Component routing |
| `lib/utils/avinode-url.ts` | Deep link URL validation |
| `lib/types/quotes.ts` | Shared Avinode types |
