# User Story ID: US026
# Title: Cancel Active Request
# Parent Epic: [[EPIC006-request-lifecycle|EPIC006 - Request Lifecycle Management]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to cancel an active request, so that I can stop an RFP I no longer need.

## Acceptance Criteria

### AC1: Request Status Update
**Given** an active request
**When** I cancel it
**Then** the request status updates to "cancelled"

### AC2: Avinode Trip Cancellation
**Given** the request has an Avinode trip
**When** I cancel
**Then** cancel_trip is also called on Avinode

### AC3: UI Status Reflection
**Given** cancellation succeeds
**When** the UI updates
**Then** the request shows cancelled status

## Tasks
- [[TASK058-cancel-request-api|TASK058 - Implement cancel request flow that updates database status and calls cancel_trip MCP tool on Avinode]]
- [[TASK059-cancel-avinode-trip|TASK059 - Update UI components to reflect cancelled status with appropriate badge and disabled actions]]

## Technical Notes
- Cancellation triggers two operations: updating the request status in Supabase and calling the cancel_trip MCP tool via the Avinode MCP server
- The cancel_trip MCP tool is one of the 8 Avinode MCP tools available to the JetvisionAgent
- A confirmation dialog should be shown before cancellation to prevent accidental cancellation
- Once cancelled, the request's stage badge updates to show "Cancelled" and action buttons (e.g., deep link, send proposal) are disabled
- Cancellation is irreversible -- a cancelled request cannot be reactivated
