# User Story ID: US077
# Title: Send Quote Summary Email
# Parent Epic: [[EPIC018-email-sending|EPIC018 - Email Communication]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story

As an ISO agent, I want to send a quote summary email, so my client can see all quotes at once.

## Acceptance Criteria

### AC1: Email includes all selected quotes with pricing

**Given** quotes exist for a request
**When** I send a summary
**Then** the email includes all selected quotes with pricing

## Tasks

- [[TASK148-send-quote-email|TASK148 - Call send_quote_email MCP tool]]

## Technical Notes

- The quote summary email aggregates multiple quotes for a single flight request
- Each quote entry includes operator name, aircraft type, pricing, and availability
- The `send_quote_email` MCP tool formats and sends the summary via Gmail
- Quotes are sourced from the stored webhook events linked to the request's trip_id
