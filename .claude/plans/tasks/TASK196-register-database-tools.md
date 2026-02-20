# Task ID: TASK196
# Task Name: Register Database Tools
# Parent User Story: [[US101-connect-supabase-mcp|US101 - Supabase CRM MCP Server]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Register all 14 CRM database tools with the Supabase MCP server including their JSON Schema definitions and handler implementations.

## Acceptance Criteria
- get_client: Fetch client by ID with contact details and preferences
- list_clients: List clients with optional filters (name, company, status) and pagination
- create_client: Create new client record with validation
- update_client: Update client fields by ID
- get_request: Get flight request by ID with associated trip and quote data
- list_requests: List flight requests with filters (status, client_id, date range)
- get_quotes: Get quotes for a request with operator and pricing details
- update_quote_status: Update quote status (pending, accepted, rejected, expired)
- get_operator: Get operator details by ID
- list_preferred_operators: List preferred operators with ratings and availability
- create_proposal: Create a proposal document from selected quotes
- get_proposal: Get proposal by ID with all included quotes
- generate_contract: Generate contract from accepted proposal
- confirm_payment: Record payment confirmation for a contract
- Each tool has complete JSON Schema with required/optional fields

## Implementation Details
- **File(s)**: mcp-servers/supabase/
- **Approach**: Define each tool's schema and handler. Handlers use Supabase client methods (from().select(), from().insert(), from().update()). Include input validation, error mapping, and consistent response formatting across all tools.

## Dependencies
- [[TASK195-supabase-mcp-server|TASK195]] (supabase-mcp-server)
- Database tables: clients, flight_requests, quotes, operators, proposals, contracts, payments
