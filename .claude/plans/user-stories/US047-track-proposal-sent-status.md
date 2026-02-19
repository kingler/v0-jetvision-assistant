# User Story ID: US047
# Title: Track Proposal Sent Status
# Parent Epic: [[EPIC010-proposal-delivery|EPIC010 - Proposal Delivery]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to track whether a proposal was sent, so that I know where things stand.

## Acceptance Criteria

### AC1: Stage badge update
**Given** a proposal was sent
**When** I view the request
**Then** the stage badge shows "Proposal Sent" (stage 8)

### AC2: Sidebar status reflection
**Given** the sidebar updates
**When** the status changes
**Then** the flight request card reflects the new status

## Tasks
- [[TASK094-update-stage-on-send|TASK094 - Update stage badge on send]]
- [[TASK095-persist-sent-status|TASK095 - Persist status to database]]

## Technical Notes
- FlightRequestStageBadge component maps stage 8 to "Proposal Sent" label and appropriate color
- Sidebar flight request card updates reactively when the proposal status changes
- Status persistence ensures the stage is correctly reflected across page reloads
- Stage transitions are validated to prevent invalid state changes
