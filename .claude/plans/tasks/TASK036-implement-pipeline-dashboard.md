# Task ID: TASK036
# Task Name: Implement Pipeline Dashboard Component
# Parent User Story: [[US015-view-pipeline-dashboard|US015 - View sales pipeline and hot opportunities]]
# Status: Done
# Priority: Medium
# Estimate: 3h

## Description
Implement the pipeline dashboard component that displays a visual overview of the sales pipeline with deal stages, counts per stage, and total values.

## Acceptance Criteria
- Pipeline view shows all deal stages as columns or a Kanban-style board
- Each stage displays the count of deals and total value
- Stages are color-coded by progression (early = blue, mid = yellow, closed = green)
- Deal counts update in real-time from the data source
- Clicking a stage shows the deals in that stage (expandable or drill-down)
- Summary bar shows total pipeline value and deal count
- Component handles empty stages gracefully
- Responsive layout collapses to a list view on mobile

## Implementation Details
- **File(s)**: `components/message-components/pipeline-dashboard.tsx`
- **Approach**: Create a `PipelineDashboard` component that receives a `stages` array with `{ name, count, value, deals }` for each stage. Render as a horizontal pipeline with cards for each stage. Each card shows the stage name, deal count badge, and formatted total value. Use design system color progressions for stage colors. Include a summary row at the top with aggregate metrics. On mobile, render as a vertical stack. Use CSS grid for the horizontal layout.

## Dependencies
- None (standalone data visualization component)
