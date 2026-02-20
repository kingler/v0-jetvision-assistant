# Epic ID: EPIC017
# Epic Name: Operator Management
# Parent Feature: [[F007-crm-client-management|F007 - CRM & Data Management]]
# Status: Implemented
# Priority: Medium

## Description
Manages aircraft operator profiles and preferred operator relationships within the CRM system. Operator records are automatically created from Avinode webhook data when new operators submit quotes, and ISO agents can maintain a preferred operator list for frequently used or trusted partners. This enables faster decision-making during the quote evaluation process.

## Goals
- Track operator information sourced from Avinode quote and message interactions
- Maintain a preferred operator list for each ISO agent to prioritize trusted partners
- Auto-create operator profiles from webhook events to reduce manual data entry
- Provide operator lookup capabilities for the AI assistant during quote analysis

## User Stories
- [[US072-view-operator-profile|US072 - View operator profile: ISO agent views an operator's profile including company name, contact details, fleet information, and historical performance]]
- [[US073-list-preferred-operators|US073 - List preferred operators: ISO agent views their curated list of preferred operators, sorted by usage frequency or rating]]
- [[US074-auto-create-operator-from-webhook|US074 - Auto-create operator from webhook: System automatically creates or updates an operator profile when a new operator submits a quote via Avinode webhook]]

## Acceptance Criteria Summary
- Operator profiles display all available information from Avinode including company and contact details
- Preferred operator list is filterable and sortable by the ISO agent
- New operators from webhook events are automatically added to the operator database
- Duplicate operator detection prevents creating multiple records for the same Avinode operator
- Operator profiles are linked to their historical quotes and message interactions
- Supabase RLS ensures operators are scoped appropriately per ISO agent or organization

## Technical Scope
- Supabase MCP tools: get_operator, list_preferred_operators
- `operator_profiles` Supabase table with auto-creation triggers
- Webhook event handler for operator profile extraction from TripRequestSellerResponse
- Operator deduplication logic based on Avinode operator ID
- Preferred operator relationship management (many-to-many between ISO agents and operators)
