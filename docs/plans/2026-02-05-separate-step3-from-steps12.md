# Plan: Separate Step 3 Card from Steps 1-2 in FlightSearchProgress

## Summary

Add a `renderMode` prop to `FlightSearchProgress` to control which steps render, then render the component twice in `chat-interface.tsx` — once for Steps 1-2 (always visible after trip creation), once for Steps 3-4 (visible only after RFQs are submitted/loaded).

## Files to Modify

1. **`components/avinode/flight-search-progress.tsx`** — Add `renderMode` prop, conditional step rendering, dynamic stepper
2. **`components/chat-interface.tsx`** — Render two FlightSearchProgress instances, extract shared `currentStep` computation, add `shouldShowSteps34` condition

## Changes

### 1. `flight-search-progress.tsx`

**A. Add `renderMode` prop to `FlightSearchProgressProps` interface (~line 88):**
```typescript
/** Which steps to render: 'steps-1-2', 'steps-3-4', or 'all' (default) */
renderMode?: 'steps-1-2' | 'steps-3-4' | 'all';
```

**B. Destructure `renderMode = 'all'` in component (~line 363)**

**C. Add `stepsToRender` memoization and guard variables:**
```typescript
const showSteps12 = renderMode === 'all' || renderMode === 'steps-1-2';
const showSteps34 = renderMode === 'all' || renderMode === 'steps-3-4';

const stepsToRender = useMemo(() => {
  if (renderMode === 'steps-1-2') {
    return [{ number: 1, label: STEP_LABELS[0] }, { number: 2, label: STEP_LABELS[1] }];
  }
  if (renderMode === 'steps-3-4') {
    return [{ number: 3, label: STEP_LABELS[2] }, { number: 4, label: STEP_LABELS[3] }];
  }
  return STEP_LABELS.map((label, i) => ({ number: i + 1, label }));
}, [renderMode]);
```

**D. Replace hardcoded 4-step stepper with dynamic `stepsToRender` map (~lines 509-533)**

**E. Add guards to step content blocks:**
- Step 1 (line 540): `showSteps12 && currentStep >= 1 && isTripCreated`
- Step 2 (line 660): `showSteps12 && currentStep >= 2 && isTripCreated && (deepLink || tripId)`
- Step 3 (line 727): `showSteps34 && currentStep >= 3 && isTripCreated`
- Step 4 (line 958): `showSteps34 && currentStep >= 4 && selectedRfqFlightIds.length > 0`

### 2. `chat-interface.tsx`

**A. Extract `computedCurrentStep` into a `useMemo` (before render return):**
Currently inline at lines 2231-2256. Extract to avoid duplication between two instances.

**B. Add `shouldShowSteps34` condition (~line 2011):**
```typescript
const shouldShowSteps34 = shouldInsertProgressAtEnd &&
  (tripIdSubmitted || activeChat.tripIdSubmitted ||
   rfqFlights.length > 0 ||
   !!activeChat.rfqsLastFetchedAt);
```

**C. Add `renderMode="steps-1-2"` to existing FlightSearchProgress instance (line 2230)**

**D. Add second FlightSearchProgress instance RIGHT AFTER Steps 1-2 (before messagesAfterProgress):**

Rendering order:
```
messagesBeforeProgress
Steps 1-2 FlightSearchProgress
Steps 3-4 FlightSearchProgress (conditional: shouldShowSteps34)
messagesAfterProgress
proposalConfirmations
```

## Condition for "RFQs Submitted"

`tripIdSubmitted || rfqFlights.length > 0 || !!activeChat.rfqsLastFetchedAt`

This covers:
- User clicked "View RFQs" button (`tripIdSubmitted`)
- Quotes received from operators (`rfqFlights.length > 0`)
- Auto-load has run (`rfqsLastFetchedAt`)

## Verification

1. With a fresh trip (no RFQs): Only Steps 1-2 cards should be visible
2. After clicking "View RFQs" or auto-load: Steps 3-4 cards appear below Steps 1-2
3. Steps 1-2 and 3-4 are visually separate cards but adjacent in the flow
4. Proposal confirmations still render after Step 3/4
5. Existing sessions with RFQ data should render both card groups on load
6. `renderMode` defaults to `'all'` for backward compatibility
7. Run: `npx vitest run __tests__/unit/components/avinode` (if tests exist)
8. Run: `npm run build` to verify no TypeScript errors
