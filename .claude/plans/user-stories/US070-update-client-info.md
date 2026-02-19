# User Story ID: US070
# Title: Update Client Info
# Parent Epic: [[EPIC016-client-profiles|EPIC016 - Client Management (CRM)]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to update client information, so records stay current.

## Acceptance Criteria

### AC1: Changes persist to database
**Given** a client exists
**When** I update fields
**Then** the changes persist to the database

## Tasks
- [[TASK137-update-client-mcp|TASK137 - Call update_client MCP tool]]

## Technical Notes
- Updates are performed via the `update_client` Supabase MCP tool
- Any editable field (company_name, contact_name, email, phone, notes) can be updated
- The agent can process natural language update requests (e.g., "update Acme's email to new@acme.com")
- Supabase RLS ensures only the owning agent can modify client records
