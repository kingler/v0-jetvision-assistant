# User Story ID: US071
# Title: Select Client for Proposal
# Parent Epic: [[EPIC016-client-profiles|EPIC016 - Client Management (CRM)]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to select a client when creating a proposal, so the proposal is addressed correctly.

## Acceptance Criteria

### AC1: Customer selection dialog with search
**Given** I'm generating a proposal
**When** the customer selection dialog opens
**Then** I can search and select from existing clients

### AC2: Client details populate proposal
**Given** I select a client
**When** confirmed
**Then** their details populate the proposal recipient fields

## Tasks
- [[TASK138-open-customer-dialog|TASK138 - Open customer selection dialog]]
- [[TASK139-populate-proposal-client|TASK139 - Populate proposal with client data]]

## Technical Notes
- The customer selection dialog is triggered during the proposal generation workflow
- Dialog includes a search input that filters clients using the `list_clients` MCP tool
- Upon selection, client `company_name`, `contact_name`, and `email` populate the proposal
- The selected client ID is linked to the proposal record for tracking
