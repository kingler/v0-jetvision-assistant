# User Story ID: US061
# Title: Process Operator Message Webhook
# Parent Epic: [[EPIC014-webhook-processing|EPIC014 - Avinode Webhook Processing]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As the system, I want to process TripChatSeller webhooks, so that operator messages appear in chat.

## Acceptance Criteria

### AC1: Message is stored and operator profile updated
**Given** a TripChatSeller event arrives
**When** processed
**Then** the message is stored and operator profile is created/updated

### AC2: Message appears in operator thread
**Given** the message is stored
**When** persisted
**Then** it appears in the operator message thread

## Tasks
- [[TASK121-process-chat-webhook|TASK121 - Process chat webhook]]
- [[TASK122-create-update-operator|TASK122 - Create/update operator profile]]

## Technical Notes
- TripChatSeller events contain operator company name, message content, and timestamp
- Operator profiles are upserted using `avinode_operator_id` as the unique key
- Messages are stored with sender type, content, and linked to the operator and trip
- The webhook handler extracts operator metadata to keep profiles current
