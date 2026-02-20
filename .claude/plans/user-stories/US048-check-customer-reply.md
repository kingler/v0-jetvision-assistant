# User Story ID: US048
# Title: Check Customer Reply to Proposal
# Parent Epic: [[EPIC010-proposal-delivery|EPIC010 - Proposal Delivery]]
# Status: Implemented
# Priority: Medium
# Story Points: 3

## User Story
As an ISO agent, I want to check if my customer replied to the proposal email, so that I can follow up.

## Acceptance Criteria

### AC1: Gmail inbox search
**Given** a proposal was sent
**When** I ask "Did they reply?"
**Then** the agent searches Gmail inbox for replies

### AC2: Reply content display
**Given** a reply exists
**When** search returns
**Then** the agent displays the email content summary

## Tasks
- [[TASK096-inbox-check-api|TASK096 - Implement inbox check API]]
- [[TASK097-search-gmail-mcp|TASK097 - Search emails via Gmail MCP]]

## Technical Notes
- The agent uses Gmail MCP tools to search the inbox for replies matching the proposal email thread
- Search is scoped by recipient email and subject line to find relevant replies
- Reply content is summarized by the AI agent for quick review
- If no reply is found, the agent can suggest follow-up actions
