# User Story ID: US081
# Title: Check Inbox for Replies
# Parent Epic: [[EPIC019-email-approval-workflow|EPIC019 - Email Approval Workflow]]
# Status: Implemented
# Priority: Medium
# Story Points: 3

## User Story
As an ISO agent, I want to check my inbox for customer replies, so I know if they responded.

## Acceptance Criteria

### AC1: Agent searches Gmail for matching emails
**Given** a proposal was sent
**When** I ask about replies
**Then** the agent searches Gmail for matching emails

### AC2: Reply summary displays key info
**Given** replies exist
**When** results return
**Then** I see email subject, sender, and content preview

## Tasks
- [[TASK155-search-emails-mcp|TASK155 - Call search_emails MCP]]
- [[TASK156-display-reply-summary|TASK156 - Display reply summary]]

## Technical Notes
- Email search is performed via the `search_emails` Gmail MCP tool with query filters
- Search queries are constructed from the proposal recipient email and subject line
- Results are displayed as a summary list with subject, sender, date, and a truncated content preview
- The AI agent can be asked conversationally (e.g., "did John from Acme reply to the proposal?")
