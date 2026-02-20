# Task ID: TASK222
# Task Name: Connection Status Component
# Parent User Story: [[US118-handle-connection-status|US118 - Display real-time connection status indicator]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Build a visual connection status indicator component that displays the current state of the SSE/webhook connection to the Avinode backend. The indicator uses a green/yellow/red color scheme: green for connected, yellow for reconnecting, and red for disconnected.

## Acceptance Criteria
- Component renders a colored dot (green, yellow, red) based on connection state
- Tooltip or label text describes the current status (e.g., "Connected", "Reconnecting...", "Disconnected")
- Status updates reactively when connection state changes
- Component is compact enough for sidebar or header placement
- Accessible with proper ARIA attributes for screen readers
- Unit tests verify correct rendering for each connection state

## Implementation Details
- **File(s)**: `components/avinode/avinode-connection-status.tsx`
- **Approach**: Create a React component that accepts a connection status prop (or reads from a context/hook). Use design system tokens for the green/yellow/red colors. Add a pulsing animation for the reconnecting state using Framer Motion or CSS keyframes.

## Dependencies
- [[TASK223-auto-reconnect|TASK223]] (auto-reconnect) for reconnecting state transitions
- Design system tokens from `lib/design-system/index.ts`
