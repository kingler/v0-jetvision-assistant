# User Story ID: US011
# Title: View Workflow Status in Chat
# Parent Epic: [[EPIC003-rich-message-components|EPIC003 - Rich Chat UI Components]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to see workflow status indicators in chat, so that I know what stage my request is at.

## Acceptance Criteria

### AC1: Workflow status display
**Given** a workflow update message
**When** it renders
**Then** I see the current stage name, progress percentage, and step details

### AC2: Step status color coding
**Given** steps have statuses
**When** they render
**Then** each shows pending/in_progress/completed/failed with color coding

## Tasks
- [[TASK028-implement-workflow-status|TASK028 - Implement workflow status component]]
- [[TASK029-map-stages-progress|TASK029 - Map stages to progress]]

## Technical Notes
- Workflow status is extracted from the SSEParseResult's `workflowStatus` field
- The workflow status component shows a progress bar with the current stage highlighted
- Stage statuses use design system color tokens: pending (neutral), in_progress (blue), completed (green), failed (red)
- The workflow follows the state machine pattern defined in `agents/coordination/state-machine.ts`
- Progress percentage is calculated based on the current stage position in the 11-state workflow
- Step details show individual tasks within each stage with their completion status
