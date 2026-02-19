# User Story ID: US044
# Title: Select Customer for Proposal
# Parent Epic: [[EPIC010-proposal-delivery|EPIC010 - Proposal Delivery]]
# Status: Implemented
# Priority: Critical
# Story Points: 3

## User Story
As an ISO agent, I want to select a customer when sending a proposal, so that it's addressed to the right person.

## Acceptance Criteria

### AC1: Customer search dialog
**Given** I'm sending a proposal
**When** the CustomerSelectionDialog opens
**Then** I can search clients by name or email

### AC2: Customer selection confirmation
**Given** I select a customer
**When** I confirm
**Then** the customer's name and email are used for the proposal email

### AC3: Inline client creation
**Given** no matching customer
**When** I search
**Then** I can create a new client profile inline

## Tasks
- [[TASK087-customer-selection-dialog|TASK087 - Implement customer selection dialog]]
- [[TASK088-search-clients-mcp|TASK088 - Search clients via MCP]]
- [[TASK089-create-client-inline|TASK089 - Create client inline]]

## Technical Notes
- CustomerSelectionDialog provides search-as-you-type functionality against the CRM client database
- Client search is performed via the Supabase MCP tools (database agent tools)
- Inline client creation allows adding a new client without leaving the proposal flow
- Selected customer data (name, email) is attached to the proposal send context
