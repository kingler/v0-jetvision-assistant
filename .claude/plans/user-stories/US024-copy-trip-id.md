# User Story ID: US024
# Title: Copy Trip ID
# Parent Epic: [[EPIC005-trip-creation-deep-links|EPIC005 - Avinode Deep Link Integration]]
# Status: Implemented
# Priority: Low
# Story Points: 1

## User Story
As an ISO agent, I want to copy the trip ID, so that I can reference it elsewhere.

## Acceptance Criteria

### AC1: Copy to Clipboard with Confirmation
**Given** a trip card shows
**When** I click the copy button
**Then** the trip ID copies to clipboard with confirmation toast

## Tasks
- [[TASK055-copy-trip-id-clipboard|TASK055 - Implement copy-to-clipboard button on trip ID with toast notification confirmation]]

## Technical Notes
- The copy button uses the browser Clipboard API (navigator.clipboard.writeText)
- A toast notification confirms the copy action with a brief "Trip ID copied" message
- The trip ID format follows Avinode's convention (e.g., "trp456789")
- Fallback for browsers that don't support Clipboard API uses the legacy document.execCommand('copy') method
- The copy button is positioned inline with the trip ID text in the TripSummaryCard component
