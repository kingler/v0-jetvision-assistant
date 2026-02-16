# User Story ID: US074
# Title: Auto-Create Operator from Webhook
# Parent Epic: [[EPIC017-operator-management|EPIC017 - Operator Management]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As the system, I want to auto-create operator profiles from webhooks, so operator data is always available.

## Acceptance Criteria

### AC1: Operator profile created from webhook data
**Given** a new operator sends a quote/message
**When** the webhook processes
**Then** an operator_profile is created with avinode_operator_id and company_name

## Tasks
- [[TASK143-extract-operator-webhook|TASK143 - Extract operator data from webhook]]
- [[TASK144-upsert-operator-profile|TASK144 - Upsert operator profile]]

## Technical Notes
- Webhook payloads for `TripRequestSellerResponse` and `TripChatSeller` contain operator metadata
- The webhook handler extracts `avinode_operator_id` and `company_name` from the event payload
- An upsert operation creates a new profile or updates the existing one if the operator ID already exists
- This ensures operator profiles are available for viewing before any manual data entry
