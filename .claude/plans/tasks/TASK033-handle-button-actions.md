# Task ID: TASK033
# Task Name: Handle Button Action Routing
# Parent User Story: [[US013-interact-with-action-buttons|US013 - Interact with contextual action buttons]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Route button clicks to appropriate handlers based on the action type. Different action types trigger different behaviors (send message, open modal, navigate, call API).

## Acceptance Criteria
- Action types are mapped to handler functions via a registry
- "send_message" action type sends a predefined message to the chat
- "open_modal" action type opens the specified modal component
- "navigate" action type navigates to a specified route or URL
- "api_call" action type triggers a fetch to the specified endpoint
- Unknown action types are logged as warnings without crashing
- Action results are communicated back to the parent component

## Implementation Details
- **File(s)**: `components/message-components/action-buttons.tsx`
- **Approach**: Create an `ACTION_HANDLERS` registry mapping action types to handler functions. Each handler receives the action definition and optional context. For "send_message", call the `onSend` callback from the chat context. For "open_modal", use a modal state manager or context. For "navigate", use Next.js `router.push`. For "api_call", use fetch with the specified endpoint and method. Wrap all handlers in try-catch for error resilience. Return action results via a Promise.

## Dependencies
- [[TASK032-implement-action-buttons|TASK032]] (action buttons component triggers the handlers)
