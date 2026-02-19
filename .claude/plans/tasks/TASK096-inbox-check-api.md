# Task ID: TASK096
# Task Name: Inbox Check for Client Replies API
# Parent User Story: [[US048-check-customer-reply|US048 - Check inbox for client replies to proposals]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Create a POST /api/inbox/check-replies endpoint that checks Gmail for replies from clients to sent proposals. The endpoint searches for emails from the customer's email address that are replies to the original proposal email thread.

## Acceptance Criteria
- POST /api/inbox/check-replies accepts { customer_email, thread_id?, proposal_id }
- Searches Gmail for recent emails from the customer's address
- Filters for replies in the original proposal email thread (if thread_id provided)
- Returns array of reply emails with: subject, body_snippet, received_at, from
- Returns empty array if no replies found
- Handles Gmail API errors gracefully
- Authenticates via Clerk JWT
- Rate-limited to prevent excessive Gmail API calls

## Implementation Details
- **File(s)**: app/api/inbox/check-replies/route.ts
- **Approach**: Create a POST route handler that calls the search_emails MCP tool (TASK097) with the customer's email address as the search query. Optionally filter by thread_id for precision. Parse the results and return formatted reply data. Add rate limiting with a simple in-memory counter or Redis-based limiter.

## Dependencies
- [[TASK097-search-gmail-mcp|TASK097]] (Search Gmail MCP) - underlying search functionality
- Gmail MCP server must be running and authenticated
- Proposal must have been sent with a tracked thread_id
