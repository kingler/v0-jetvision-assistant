# Epic ID: EPIC011
# Epic Name: Contract Generation
# Parent Feature: [[F005-contract-payment|F005 - Contract & Deal Closure]]
# Status: Implemented
# Priority: Critical

## Description
Charter flight contract generation and lifecycle management from accepted proposals through to signing. This epic covers contract document creation with flight terms and conditions, contract delivery to customers, signing status tracking, and the contract detail view displaying all relevant terms, parties, and flight information.

## Goals
- Generate contract documents from accepted proposals with complete flight terms
- Deliver contracts to customers via email for review and signing
- Track contract status through the signing lifecycle (draft, sent, viewed, signed)
- Display contract details with all parties, terms, flight information, and pricing

## User Stories
- [[US049-generate-contract|US049 - Generate contract from proposal]]
- [[US050-send-contract-to-customer|US050 - Send contract to customer]]
- [[US051-track-contract-signing|US051 - Track contract signing]]
- [[US052-view-contract-details|US052 - View contract details]]

## Acceptance Criteria Summary
- Contract generation populates all fields from the accepted proposal (route, dates, aircraft, pricing)
- Contract includes standard charter terms and conditions
- Send action delivers the contract to the customer email with appropriate instructions
- Contract status updates reflect the signing lifecycle stages
- Contract detail view shows both parties, flight details, pricing, terms, and current status
- Sent confirmation card displays delivery timestamp and recipient information
- Contract signing triggers a status update and notification in the chat

## Technical Scope
- app/api/contract/generate/ - Contract document generation endpoint
- app/api/contract/send/ - Contract delivery via email endpoint
- app/api/contract/[id]/sign/ - Contract signing status update endpoint
- components/contract/contract-sent-confirmation.tsx - Delivery confirmation card
- Supabase contracts table - Contract metadata and status tracking
- lib/services/ - Contract generation business logic
