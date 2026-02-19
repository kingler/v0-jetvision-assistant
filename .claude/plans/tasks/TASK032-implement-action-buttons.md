# Task ID: TASK032
# Task Name: Implement Action Buttons Component
# Parent User Story: [[US013-interact-with-action-buttons|US013 - Interact with contextual action buttons]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement a reusable action buttons component that renders button groups from message data. Buttons provide contextual actions relevant to the current message or workflow state.

## Acceptance Criteria
- Renders a group of buttons from an array of action definitions
- Each button has a label, optional icon, and action type
- Buttons support primary, secondary, and destructive variants
- Button group layout is horizontal with proper spacing
- Buttons can be individually disabled based on state
- Responsive layout wraps buttons on small screens
- Keyboard navigation is supported between buttons

## Implementation Details
- **File(s)**: `components/message-components/action-buttons.tsx`
- **Approach**: Create an `ActionButtons` component that receives an `actions` array where each action has `{ id, label, icon?, variant, disabled?, handler }`. Render using the design system `Button` component with the specified variant. Layout in a `flex-wrap` container with consistent gap spacing. Each button receives an `onClick` handler that calls the parent `onAction(actionId)` callback. Support icon-only buttons for compact layouts.

## Dependencies
- None (reusable UI component)
