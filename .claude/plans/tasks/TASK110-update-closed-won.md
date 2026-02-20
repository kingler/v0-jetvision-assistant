# Task ID: TASK110
# Task Name: Update Request Status to Closed Won
# Parent User Story: [[US055-close-deal|US055 - Close deal after payment]]
# Status: Done
# Priority: Critical
# Estimate: 2h

## Description
Update the flight request status to "closed_won" after payment is confirmed. This marks the deal as successfully completed in the pipeline, updates the request stage to the final stage, and triggers any post-closure workflows such as archiving and reporting.

## Acceptance Criteria
- Updates request status to "closed_won" in the requests table
- Sets the request stage to the terminal/final stage value
- Updates the closed_at timestamp
- Only transitions from appropriate pre-closure status
- Returns the updated request record
- Triggers auto-archive workflow (TASK111)
- Emits event for real-time UI updates
- Updates any associated pipeline/dashboard metrics

## Implementation Details
- **File(s)**: app/api/requests/ (request update logic)
- **Approach**: Create or extend the request update function to handle the closed_won transition. Validate the current status allows closure. Update status = 'closed_won', stage = final_stage, closed_at = now(). After successful update, trigger the auto-archive workflow and emit a status change event for connected clients.

## Dependencies
- [[TASK108-update-contract-paid|TASK108]] (Update contract paid) - triggers this closure
- [[TASK111-auto-archive-deal|TASK111]] (Auto-archive deal) - triggered after closure
- Requests table must have status, stage, closed_at columns
