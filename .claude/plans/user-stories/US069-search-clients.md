# User Story ID: US069
# Title: Search Clients
# Parent Epic: [[EPIC016-client-profiles|EPIC016 - Client Management (CRM)]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As an ISO agent, I want to search clients by name or email, so I can find the right customer quickly.

## Acceptance Criteria

### AC1: Search returns matching results
**Given** clients exist
**When** I search by name or email
**Then** matching results display

### AC2: Results show key client info
**Given** search results
**When** they render
**Then** I see company, contact name, and email

## Tasks
- [[TASK135-search-clients-mcp-list|TASK135 - Call list_clients with search]]
- [[TASK136-display-search-results|TASK136 - Display search results]]

## Technical Notes
- Search is performed via the `list_clients` Supabase MCP tool with filter parameters
- Search matches against `company_name`, `contact_name`, and `email` fields
- Results are scoped to the authenticated agent's `iso_agent_id` via RLS
- The AI agent can invoke search conversationally (e.g., "find client Acme Corp")
