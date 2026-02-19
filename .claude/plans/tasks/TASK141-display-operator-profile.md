# Task ID: TASK141
# Task Name: Display Operator Profile in Chat
# Parent User Story: [[US072-view-operator-profile|US072 - View Operator Profile]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Render operator profile details in the chat interface when the agent retrieves operator information. The display should present the operator's company name, contact information, fleet details, and any relevant metadata in a structured card format.

## Acceptance Criteria
- Operator details are displayed in a structured card within the chat
- Card shows company name, contact name, email, phone
- Card shows avinode_operator_id if available
- Card shows preferred operator status if applicable
- Card is styled consistently with other data cards in the chat
- Card includes an action to view full profile or message the operator
- Handles missing/optional fields gracefully

## Implementation Details
- **File(s)**: Agent response rendering (tool UI registry)
- **Approach**: Register a UI renderer for the get_operator tool result in the tool-ui-registry. When the agent returns operator data, the renderer creates a card component with structured fields. Use the existing card component patterns from the design system. Include action buttons for "Send Message" and "View History" if applicable.

## Dependencies
- [[TASK140-get-operator-mcp|TASK140]] (get_operator MCP tool provides the data)
- Tool UI registry (lib/mcp-ui/tool-ui-registry.ts)
