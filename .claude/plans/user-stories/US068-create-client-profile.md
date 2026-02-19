# User Story ID: US068
# Title: Create Client Profile
# Parent Epic: [[EPIC016-client-profiles|EPIC016 - Client Management (CRM)]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to create a client profile, so I can track customer information.

## Acceptance Criteria

### AC1: Profile saves with required fields
**Given** I need a new client
**When** I create one via chat or dialog
**Then** a profile is saved with company_name, contact_name, and email

### AC2: Profile links to agent
**Given** the profile is created
**When** it persists
**Then** it's linked to my iso_agent_id

## Tasks
- [[TASK133-create-client-mcp|TASK133 - Call create_client MCP tool]]
- [[TASK134-save-client-profile|TASK134 - Save client profile]]

## Technical Notes
- Client profiles are created via the `create_client` Supabase MCP tool
- Required fields: `company_name`, `contact_name`, `email`
- The `iso_agent_id` is automatically populated from the authenticated session context
- Supabase RLS policies ensure agents can only access their own client profiles
