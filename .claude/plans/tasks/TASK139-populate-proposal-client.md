# Task ID: TASK139
# Task Name: Populate Proposal with Client
# Parent User Story: [[US071-select-client-for-proposal|US071 - Link Client to Proposal]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Set the proposal recipient from the selected client profile. After the user selects a client in the CustomerSelectionDialog, the proposal service should be populated with the client's details (name, email, company) for use in the generated proposal document and email.

## Acceptance Criteria
- Selected client's data is set as the proposal recipient
- Proposal includes client company_name, contact_name, and email
- Client ID is associated with the proposal record in the database
- Proposal PDF includes correct client information in the header/address
- Email draft is pre-populated with the client's email address
- Changing the client updates all dependent proposal fields

## Implementation Details
- **File(s)**: lib/services/proposal-service.ts
- **Approach**: Add a `setProposalClient` method to the proposal service that accepts a client profile object. Store the client reference (client_id) on the proposal record. Populate the proposal template variables with client data (company, contact name, email). Ensure the email preparation step uses the client's email as the default recipient.

## Dependencies
- [[TASK138-open-customer-dialog|TASK138]] (customer dialog provides the selected client)
- Proposal generation pipeline (TASK077-TASK079)
