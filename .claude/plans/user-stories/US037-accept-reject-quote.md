# User Story ID: US037
# Title: Accept or Reject Quote
# Parent Epic: [[EPIC008-quote-comparison-selection|EPIC008 - Proposal Generation]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to accept or reject quotes, so that I can manage which operators I work with.

## Acceptance Criteria

### AC1: Status Update Persistence
**Given** a quote is received
**When** I update its status
**Then** the database reflects accepted/declined

### AC2: UI Status Reflection
**Given** status changes
**When** the UI updates
**Then** the badge and card reflect the new status

## Tasks
- [[TASK075-update-quote-status|TASK075 - Implement accept/reject quote actions that update database status and refresh UI badge and card state]]

## Technical Notes
- Accept and reject actions are available as buttons on each quote card
- Accepting a quote updates the quote status to "accepted" in the database
- Rejecting a quote updates the quote status to "declined" in the database
- Status changes trigger real-time UI updates: the quote status badge changes color and label, and action buttons are replaced with the current status indicator
- Accepting a quote is distinct from selecting it for proposal -- acceptance indicates operator relationship management, while selection drives the proposal workflow
- A confirmation dialog is shown before rejection to prevent accidental declines
- Status changes are logged in the activity history for audit purposes
