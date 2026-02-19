# User Story ID: US012
# Title: View Proposal Preview in Chat
# Parent Epic: [[EPIC003-rich-message-components|EPIC003 - Rich Chat UI Components]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to see a proposal preview in chat, so that I can review before sending.

## Acceptance Criteria

### AC1: Proposal preview displays flight details and pricing
**Given** a proposal is generated
**When** the preview renders
**Then** I see flight details, pricing with margin, and customer info

### AC2: Send and download actions
**Given** the preview is interactive
**When** I click "Send" or "Download"
**Then** the corresponding action executes

## Tasks
- [[TASK030-implement-proposal-preview|TASK030 - Implement proposal preview component]]
- [[TASK031-wire-send-download-actions|TASK031 - Wire up send/download actions]]

## Technical Notes
- The proposal preview component renders inline in the chat as a rich card
- Flight details include route, date/time, aircraft type, and operator
- Pricing displays the base price, margin/markup, and final client price
- Customer info shows the client name and contact details from the CRM
- "Send" triggers the email workflow via the Gmail MCP tool
- "Download" generates a PDF version of the proposal for offline sharing
- The proposal data is assembled from trip data, quote data, and client profile data
