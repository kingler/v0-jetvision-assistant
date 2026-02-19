# Task ID: TASK029
# Task Name: Map Workflow Stages to Progress
# Parent User Story: [[US011-view-workflow-status|US011 - See workflow progress during multi-step operations]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Define the mapping from 10 workflow stages to progress percentages, labels, descriptions, and icons. This constants file drives the workflow status component display.

## Acceptance Criteria
- All 10 stages are mapped with unique labels and progress percentages
- Progress percentages increase monotonically from 0% to 100%
- Each stage has a human-readable label and description
- Each stage has an associated icon identifier
- Mapping is exported as a typed constant for use across the app
- Fallback values are provided for unknown stage numbers

## Implementation Details
- **File(s)**: `lib/chat/constants/workflow.ts`
- **Approach**: Define a `WORKFLOW_STAGES` constant array/map with entries for stages 1-10. Each entry includes: `stage` (number), `label` (string), `description` (string), `progress` (number 0-100), `icon` (string). Example stages: 1-"Request Received" (10%), 2-"Analyzing Request" (20%), 3-"Searching Flights" (30%), 4-"Creating Trip" (40%), 5-"Awaiting Quotes" (50%), 6-"Quotes Received" (60%), 7-"Analyzing Proposals" (70%), 8-"Generating Proposal" (80%), 9-"Sending Proposal" (90%), 10-"Completed" (100%). Export helper functions `getStageLabel(stage)`, `getStageProgress(stage)`.

## Dependencies
- None (constants file with no runtime dependencies)
