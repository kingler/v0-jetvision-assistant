# User Story ID: US041
# Title: Preview Proposal Before Sending
# Parent Epic: [[EPIC009-proposal-generation|EPIC009 - Proposal Generation]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to preview a proposal before sending, so that I can verify all details are correct.

## Acceptance Criteria

### AC1: Preview content
**Given** a proposal is generated
**When** the preview renders
**Then** I see flight route, dates, aircraft, pricing (with margin), and customer details

### AC2: Preview action buttons
**Given** the preview has actions
**When** I see buttons
**Then** I can "Send", "Download PDF", or "Edit Margin"

## Tasks
- [[TASK082-proposal-preview-component|TASK082 - Implement proposal preview component]]
- [[TASK083-preview-actions|TASK083 - Wire up preview actions]]

## Technical Notes
- Proposal preview component displays all key proposal data inline before committing to send
- Action buttons include "Send" (triggers email flow), "Download PDF" (downloads generated file), and "Edit Margin" (opens MarginEditModal)
- Preview reflects the latest margin adjustments and any regenerated PDF content
