# Epic ID: EPIC013
# Epic Name: Avinode Deep Link Workflow
# Parent Feature: [[F006-avinode-marketplace-integration|F006 - Avinode Integration]]
# Status: Implemented
# Priority: Critical

## Description
Implements the deep link workflow that bridges Jetvision and the Avinode marketplace, enabling a human-in-the-loop process for flight operations. When the AI assistant creates a trip via MCP, the system generates a deep link URL that the ISO agent clicks to open the Avinode Web UI, where they manually select operators and send RFPs. Upon returning, the trip context is preserved so the assistant can continue the workflow seamlessly.

## Goals
- Provide a seamless human-in-the-loop workflow bridging Jetvision and the Avinode marketplace
- Generate and display deep link URLs immediately after trip creation
- Preserve trip context when the user returns from the Avinode marketplace
- Minimize friction in the transition between AI-assisted and manual workflow steps

## User Stories
- [[US057-open-avinode-via-deep-link|US057 - Open Avinode via deep link: ISO agent clicks a deep link button to open the Avinode marketplace for a specific trip]]
- [[US058-return-from-avinode-with-context|US058 - Return from Avinode with trip context: After completing manual actions in Avinode, the user returns to Jetvision with full trip context intact]]
- [[US059-view-deep-link-prompt|US059 - View deep link prompt: The assistant displays a clear, actionable prompt instructing the user to open Avinode and what actions to perform]]

## Acceptance Criteria Summary
- Trip creation via MCP returns a valid deep link URL and trip ID
- Deep link button renders immediately after trip creation in the chat interface
- Deep link opens the correct Avinode trip page in a new browser tab
- Trip context (trip_id, avinode_rfp_id, route details) persists in the database during the manual step
- Workflow state transitions to PENDING_ACTION while awaiting user return
- The assistant resumes the workflow when webhook events indicate operator responses

## Technical Scope
- `components/avinode/avinode-deep-links.tsx` - Clickable deep link button component
- `components/avinode/deep-link-prompt.tsx` - Instructional prompt displayed by the assistant
- `create_trip` MCP tool integration (returns trip_id + deep_link)
- Supabase `requests` table fields: avinode_trip_id, avinode_deep_link, avinode_rfp_id
- Workflow state machine transition to PENDING_ACTION state
- SSE endpoint for real-time status updates when user returns
