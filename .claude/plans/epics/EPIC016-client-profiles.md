# Epic ID: EPIC016
# Epic Name: Client Profile Management
# Parent Feature: [[F007-crm-client-management|F007 - CRM & Data Management]]
# Status: Implemented
# Priority: High

## Description
Provides full CRUD operations for client profiles used throughout the proposal and communication workflows. ISO agents can create, search, update, and select client records that are stored in Supabase. Client profiles include contact information, preferences, and history, enabling personalized proposals and efficient repeat business handling.

## Goals
- Maintain a comprehensive client database accessible to ISO agents and the AI assistant
- Enable quick client lookup by name, email, or other identifiers for proposal generation
- Support client selection during proposal workflows to auto-populate contact details
- Keep client information current through easy update operations

## User Stories
- [[US068-create-client-profile|US068 - Create client profile: ISO agent creates a new client record with name, email, phone, company, and preferences]]
- [[US069-search-clients|US069 - Search clients by name or email: ISO agent or AI assistant searches the client database to find existing client records]]
- [[US070-update-client-info|US070 - Update client information: ISO agent updates an existing client's contact details, preferences, or notes]]
- [[US071-select-client-for-proposal|US071 - Select client for proposal: During proposal generation, ISO agent selects a client from the database to auto-fill recipient details]]

## Acceptance Criteria Summary
- New client profiles are created with all required fields validated
- Client search returns results matching partial name or email within 500ms
- Client updates are persisted immediately and reflected in subsequent lookups
- Client selection dialog integrates with the proposal workflow and populates recipient fields
- Duplicate client detection warns the user when creating a client with an existing email
- Client data is accessible via both the UI dialog and the AI assistant through MCP tools

## Technical Scope
- Supabase MCP tools: get_client, list_clients, create_client, update_client
- `components/customer-selection-dialog.tsx` - Client search and selection UI component
- Supabase `clients` table with RLS policies
- Client profile validation (email format, required fields)
- Integration with proposal generation workflow for auto-population
