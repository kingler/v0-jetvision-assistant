# Task ID: TASK094
# Task Name: Update Request Stage to Proposal Sent
# Parent User Story: [[US047-track-proposal-sent-status|US047 - Track request stage progression]]
# Status: Done
# Priority: High
# Estimate: 1h

## Description
When a proposal is successfully sent to the client, update the flight request's stage to 8 (Proposal Sent). This keeps the request pipeline in sync with actual workflow progress and enables accurate tracking in the UI stage indicators.

## Acceptance Criteria
- Updates the request's stage field to 8 (Proposal Sent)
- Updates the request's updated_at timestamp
- Only advances if current stage is less than 8 (no regression)
- Returns the updated request record
- Works with the existing stage progression system
- Triggers real-time UI update via SSE or Supabase realtime

## Implementation Details
- **File(s)**: app/api/requests/ (request update logic)
- **Approach**: Call the existing request update function or API endpoint to set stage = 8. Add a guard to prevent stage regression (only advance forward). This is called by the proposal service (TASK093) after marking the proposal as sent. Use the existing flight request stage mapping from the FlightRequestStageBadge component.

## Dependencies
- [[TASK093-update-proposal-status|TASK093]] (Update proposal status) - triggers this stage update
- Requests table must have a stage column
- Stage mapping must include stage 8 = "Proposal Sent"
