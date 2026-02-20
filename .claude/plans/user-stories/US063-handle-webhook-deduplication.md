# User Story ID: US063
# Title: Handle Webhook Deduplication
# Parent Epic: [[EPIC014-webhook-processing|EPIC014 - Avinode Webhook Processing]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As the system, I want to deduplicate webhook events, so that duplicate quotes/messages don't appear.

## Acceptance Criteria

### AC1: Duplicate webhooks update existing records
**Given** a duplicate webhook fires
**When** processed
**Then** the existing record is updated rather than duplicated

### AC2: Messages with same ID are merged
**Given** avinode_message_id exists
**When** dedup checks
**Then** messages with same ID are merged

## Tasks
- [[TASK124-deduplication-logic|TASK124 - Implement deduplication logic]]

## Technical Notes
- Deduplication is based on `avinode_message_id` for messages and quote href for quotes
- The webhook handler checks for existing records before inserting
- If a duplicate is detected, the existing record is updated with any new data (upsert pattern)
- This prevents duplicate quote cards and message entries in the UI
