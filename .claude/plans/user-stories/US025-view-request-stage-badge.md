# User Story ID: US025
# Title: View Request Stage Badge
# Parent Epic: [[EPIC006-request-lifecycle|EPIC006 - Request Lifecycle Management]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to see a stage badge on my requests, so that I know the current workflow status.

## Acceptance Criteria

### AC1: Correct Stage Display
**Given** a request exists
**When** the badge renders
**Then** it shows the correct stage (1-10) with label and color

### AC2: Full Stage Mapping
**Given** stages map as: 1=Request Created, 2=Trip Created, 3=RFQ Created, 4=Awaiting Quotes, 5=Quotes Received, 6=Quote Selected, 7=Proposal Generated, 8=Proposal Sent, 9=Contract Generated, 10=Payment Pending
**When** any stage is active
**Then** the correct badge displays

## Tasks
- [[TASK056-implement-stage-badge|TASK056 - Build FlightRequestStageBadge component with stage-to-label and stage-to-color mappings for stages 1-10]]
- [[TASK057-stage-color-mapping|TASK057 - Integrate FlightRequestStageBadge into request cards, headers, and detail views]]

## Technical Notes
- The FlightRequestStageBadge component is used across multiple views: DynamicChatHeader, FlightRequestCard, TripSummaryCard, and request detail views
- Stage-to-color mappings use design system tokens for consistent theming
- Fallback mappings for stages 6-10 were added in fix ONEK-275 to ensure all stages render correctly
- The badge displays both the stage number and human-readable label (e.g., "Stage 4: Awaiting Quotes")
- Color coding helps users quickly identify request status: early stages use blue tones, active stages use amber/orange, completion stages use green
