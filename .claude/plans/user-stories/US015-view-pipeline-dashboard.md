# User Story ID: US015
# Title: View Pipeline Dashboard in Chat
# Parent Epic: [[EPIC003-rich-message-components|EPIC003 - Rich Chat UI Components]]
# Status: Implemented
# Priority: Medium
# Story Points: 3

## User Story
As an ISO agent, I want to see a pipeline dashboard in chat, so that I can track all my deals at a glance.

## Acceptance Criteria

### AC1: Dashboard shows deal stages
**Given** a dashboard message
**When** it renders
**Then** I see deal stages with counts and values

### AC2: Hot opportunities highlighted
**Given** hot opportunities exist
**When** the dashboard shows
**Then** highlighted deals appear with quick actions

## Tasks
- [[TASK036-implement-pipeline-dashboard|TASK036 - Implement pipeline dashboard component]]
- [[TASK037-implement-hot-opportunities|TASK037 - Implement hot opportunities component]]

## Technical Notes
- The pipeline dashboard renders as an inline rich component in the chat
- Deal stages are displayed as columns or cards showing stage name, deal count, and total value
- Stages follow the flight request workflow: New, Searching, Quoted, Proposed, Booked, Completed
- Hot opportunities are deals flagged as high-priority based on value, urgency, or client tier
- Quick actions on hot opportunities include: view details, send proposal, follow up
- Data is sourced from the Supabase CRM tables via the database MCP tools
- The component uses the design system's color tokens for stage-based color coding
- Values are formatted with currency symbols and appropriate number formatting
