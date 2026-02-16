# User Story ID: US040
# Title: Adjust Proposal Margin
# Parent Epic: [[EPIC009-proposal-generation|EPIC009 - Proposal Generation]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to adjust the margin on a proposal, so that I can control my markup/discount.

## Acceptance Criteria

### AC1: Margin edit modal
**Given** a proposal exists
**When** I open the MarginEditModal
**Then** I can set a markup percentage or fixed amount

### AC2: Recalculation on save
**Given** I set a margin
**When** I save
**Then** the proposal's final_amount recalculates and the PDF regenerates

## Tasks
- [[TASK080-margin-edit-modal|TASK080 - Implement margin edit modal]]
- [[TASK081-recalculate-pricing|TASK081 - Recalculate pricing with margin]]

## Technical Notes
- MarginEditModal supports both percentage-based markup and fixed dollar amount adjustments
- Saving margin triggers a recalculation of final_amount on the proposal record
- PDF regenerates automatically after margin adjustment to reflect updated pricing
- Margin values are persisted on the proposal record for audit trail
