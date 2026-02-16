# Task ID: TASK028
# Task Name: Implement Workflow Status Component
# Parent User Story: [[US011-view-workflow-status|US011 - See workflow progress during multi-step operations]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the workflow status component that displays the current stage, progress percentage, and completed/pending steps during multi-step flight request operations.

## Acceptance Criteria
- Current workflow stage is displayed with a label and icon
- Progress bar shows completion percentage (0-100%)
- Completed steps are shown with check marks
- Current step is highlighted with an active indicator
- Pending steps are shown in a muted state
- Component updates in real-time as workflow progresses
- Transitions between stages animate smoothly
- All 10 workflow stages are supported

## Implementation Details
- **File(s)**: `components/message-components/workflow-status.tsx`
- **Approach**: Create a `WorkflowStatus` component that receives `stage`, `progress`, and `steps` props. Render a vertical stepper or horizontal progress bar with labeled stages. Use CSS transitions for smooth progress updates. Map stage numbers to labels and icons via the workflow constants. Style completed steps with success tokens, active step with primary tokens, and pending steps with muted tokens. Include an estimated time remaining if available.

## Dependencies
- [[TASK029-map-stages-progress|TASK029]] (stage-to-progress mapping constants)
- [[TASK017-parse-structured-data|TASK017]] (structured data provides workflow status)
