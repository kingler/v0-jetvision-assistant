# User Story ID: US059
# Title: View Deep Link Prompt
# Parent Epic: [[EPIC013-deep-link-workflow|EPIC013 - Avinode Deep Link Integration]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to see a clear prompt to open Avinode, so I know what action to take next.

## Acceptance Criteria

### AC1: Deep link prompt explains next step
**Given** a trip is created
**When** the deep link prompt renders
**Then** it explains the next step clearly

## Tasks
- [[TASK117-deep-link-prompt|TASK117 - Implement deep link prompt component]]

## Technical Notes
- The `AvinodeActionRequired` component in `components/avinode/` displays the prompt banner
- Prompt text instructs the agent to open Avinode, review available operators, and send the RFP
- The prompt includes the trip summary (route, date, passengers) for quick reference
- Workflow state transitions to `PENDING_ACTION` when the prompt is displayed
