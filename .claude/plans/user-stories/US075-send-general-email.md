# User Story ID: US075
# Title: Send General Email
# Parent Epic: [[EPIC018-email-sending|EPIC018 - Email Communication]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to send a general email, so I can communicate with clients beyond proposals.

## Acceptance Criteria

### AC1: Email sends via Gmail MCP
**Given** I ask the AI to send an email
**When** I provide to, subject, and body
**Then** the email sends via Gmail MCP

## Tasks
- [[TASK145-send-email-mcp|TASK145 - Call send_email MCP tool]]

## Technical Notes
- General emails are sent via the `send_email` Gmail MCP tool
- Required parameters: `to` (recipient email), `subject`, and `body` (HTML or plain text)
- The AI agent composes the email content based on conversational instructions
- Email sending requires the human-in-the-loop approval flow (see US078/US079)
