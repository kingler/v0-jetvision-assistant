-- JetVision AI Assistant - Schema Consolidation Phase 2
-- Migration: 031_consolidate_schema_migrate_data.sql
-- Description: Migrate data from chat_sessions and conversations to requests,
--              populate messages.request_id and messages.quote_id
-- Created: 2025-01-16
--
-- This migration copies existing data to the new consolidated schema.
-- It is NON-DESTRUCTIVE - original tables are preserved until cleanup phase.

-- ============================================================================
-- STEP 1: Migrate chat_sessions data to requests
-- Copy session tracking fields for requests that have linked chat_sessions
-- ============================================================================

UPDATE requests r
SET
  session_status = COALESCE(cs.status::TEXT, r.session_status, 'active'),
  conversation_type = COALESCE(cs.conversation_type, r.conversation_type, 'flight_request'),
  current_step = COALESCE(cs.current_step, r.current_step),
  workflow_state = COALESCE(cs.workflow_state, r.workflow_state, '{}'::jsonb),
  session_started_at = COALESCE(cs.session_started_at, r.session_started_at, r.created_at),
  session_ended_at = COALESCE(cs.session_ended_at, r.session_ended_at),
  last_activity_at = COALESCE(cs.last_activity_at, r.last_activity_at, r.updated_at)
FROM chat_sessions cs
WHERE cs.request_id = r.id
  AND cs.request_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Migrate conversations data to requests
-- Copy conversation metadata for requests that have linked conversations
-- ============================================================================

UPDATE requests r
SET
  subject = COALESCE(c.subject, r.subject),
  avinode_thread_id = COALESCE(c.avinode_thread_id, r.avinode_thread_id),
  chatkit_thread_id = COALESCE(c.chatkit_thread_id, r.chatkit_thread_id),
  last_message_at = COALESCE(c.last_message_at, r.last_message_at),
  last_message_by = COALESCE(c.last_message_by, r.last_message_by),
  message_count = COALESCE(c.message_count, r.message_count, 0),
  unread_count_iso = COALESCE(c.unread_count_iso, r.unread_count_iso, 0),
  unread_count_operator = COALESCE(c.unread_count_operator, r.unread_count_operator, 0),
  is_priority = COALESCE(c.is_priority, r.is_priority, false),
  is_pinned = COALESCE(c.is_pinned, r.is_pinned, false)
FROM conversations c
WHERE c.request_id = r.id
  AND c.request_id IS NOT NULL;

-- Also update from primary_conversation_id if set
UPDATE requests r
SET
  subject = COALESCE(r.subject, c.subject),
  avinode_thread_id = COALESCE(r.avinode_thread_id, c.avinode_thread_id),
  chatkit_thread_id = COALESCE(r.chatkit_thread_id, c.chatkit_thread_id),
  last_message_at = COALESCE(r.last_message_at, c.last_message_at),
  last_message_by = COALESCE(r.last_message_by, c.last_message_by),
  message_count = COALESCE(NULLIF(r.message_count, 0), c.message_count, 0),
  unread_count_iso = COALESCE(NULLIF(r.unread_count_iso, 0), c.unread_count_iso, 0),
  unread_count_operator = COALESCE(NULLIF(r.unread_count_operator, 0), c.unread_count_operator, 0),
  is_priority = COALESCE(r.is_priority, c.is_priority, false),
  is_pinned = COALESCE(r.is_pinned, c.is_pinned, false)
FROM conversations c
WHERE r.primary_conversation_id = c.id
  AND r.primary_conversation_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Populate messages.request_id from conversations
-- Link messages directly to requests via their conversation's request_id
-- ============================================================================

UPDATE messages m
SET request_id = c.request_id
FROM conversations c
WHERE m.conversation_id = c.id
  AND c.request_id IS NOT NULL
  AND m.request_id IS NULL;

-- ============================================================================
-- STEP 4: Populate messages.quote_id from conversations.quote_id
-- For messages in quote-specific conversations
-- ============================================================================

UPDATE messages m
SET quote_id = c.quote_id
FROM conversations c
WHERE m.conversation_id = c.id
  AND c.quote_id IS NOT NULL
  AND m.quote_id IS NULL;

-- ============================================================================
-- STEP 5: Extract quote_id from operator messages via webhook metadata
-- For operator messages, try to find the quote from avinode_quote_id
-- ============================================================================

-- Try matching via metadata.avinode_quote_id
UPDATE messages m
SET quote_id = q.id
FROM quotes q
WHERE m.sender_type = 'operator'
  AND m.quote_id IS NULL
  AND m.request_id IS NOT NULL
  AND q.request_id = m.request_id
  AND (
    q.avinode_quote_id = (m.metadata->>'avinode_quote_id')::TEXT
    OR q.avinode_quote_id = (m.rich_content->>'quote_id')::TEXT
    OR q.avinode_quote_id = (m.rich_content->>'avinode_quote_id')::TEXT
  );

-- Try matching via avinode_webhook_events for remaining operator messages
UPDATE messages m
SET quote_id = awe.quote_id
FROM avinode_webhook_events awe
WHERE m.sender_type = 'operator'
  AND m.quote_id IS NULL
  AND m.avinode_message_id IS NOT NULL
  AND awe.message_id = m.id
  AND awe.quote_id IS NOT NULL;

-- ============================================================================
-- STEP 6: Handle orphan chat_sessions (general chats without request_id)
-- Create placeholder requests for sessions that have messages but no request
-- ============================================================================

-- Insert placeholder requests for orphan sessions
INSERT INTO requests (
  id,
  iso_agent_id,
  departure_airport,
  arrival_airport,
  departure_date,
  passengers,
  status,
  session_status,
  conversation_type,
  current_step,
  workflow_state,
  session_started_at,
  session_ended_at,
  last_activity_at,
  subject,
  avinode_thread_id,
  chatkit_thread_id,
  message_count,
  metadata,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  cs.iso_agent_id,
  'TBD' as departure_airport,
  'TBD' as arrival_airport,
  NOW() + INTERVAL '90 days' as departure_date,
  1 as passengers,
  'draft' as status,
  cs.status::TEXT as session_status,
  COALESCE(cs.conversation_type, 'general') as conversation_type,
  cs.current_step,
  COALESCE(cs.workflow_state, '{}'::jsonb) as workflow_state,
  cs.session_started_at,
  cs.session_ended_at,
  cs.last_activity_at,
  COALESCE(c.subject, 'General Inquiry') as subject,
  c.avinode_thread_id,
  c.chatkit_thread_id,
  COALESCE(c.message_count, cs.message_count, 0) as message_count,
  jsonb_build_object(
    'migrated_from_chat_session', cs.id,
    'migrated_from_conversation', cs.conversation_id,
    'is_general_conversation', true,
    'migration_date', NOW()
  ) as metadata,
  COALESCE(cs.created_at, NOW()) as created_at,
  NOW() as updated_at
FROM chat_sessions cs
LEFT JOIN conversations c ON cs.conversation_id = c.id
WHERE cs.request_id IS NULL
  AND cs.iso_agent_id IS NOT NULL
  -- Only migrate sessions that have messages
  AND EXISTS (
    SELECT 1 FROM messages m
    WHERE m.conversation_id = cs.conversation_id
  );

-- Update messages for these newly created requests
UPDATE messages m
SET request_id = r.id
FROM conversations c
JOIN requests r ON (r.metadata->>'migrated_from_conversation')::UUID = c.id
WHERE m.conversation_id = c.id
  AND m.request_id IS NULL;

-- ============================================================================
-- STEP 7: Set default values for requests without session data
-- Ensure all requests have valid session fields
-- ============================================================================

UPDATE requests
SET
  session_status = COALESCE(session_status, 'active'),
  conversation_type = COALESCE(conversation_type, 'flight_request'),
  workflow_state = COALESCE(workflow_state, '{}'::jsonb),
  session_started_at = COALESCE(session_started_at, created_at),
  last_activity_at = COALESCE(last_activity_at, updated_at, created_at),
  message_count = COALESCE(message_count, 0),
  unread_count_iso = COALESCE(unread_count_iso, 0),
  unread_count_operator = COALESCE(unread_count_operator, 0),
  is_priority = COALESCE(is_priority, false),
  is_pinned = COALESCE(is_pinned, false)
WHERE session_status IS NULL
   OR conversation_type IS NULL;

-- ============================================================================
-- STEP 8: Recalculate message counts to ensure accuracy
-- ============================================================================

UPDATE requests r
SET message_count = (
  SELECT COUNT(*)
  FROM messages m
  WHERE m.request_id = r.id
    AND m.deleted_at IS NULL
)
WHERE EXISTS (
  SELECT 1 FROM messages m WHERE m.request_id = r.id
);

-- ============================================================================
-- VERIFICATION QUERIES (for manual checking)
-- Run these after migration to verify data integrity
-- ============================================================================

-- Check: All messages should have request_id (except truly orphaned ones)
-- SELECT COUNT(*) as orphan_messages FROM messages
-- WHERE request_id IS NULL AND deleted_at IS NULL;

-- Check: Operator messages should have quote_id where possible
-- SELECT COUNT(*) as operator_msgs_without_quote FROM messages
-- WHERE sender_type = 'operator' AND quote_id IS NULL AND request_id IS NOT NULL;

-- Check: Message counts match actual counts
-- SELECT r.id, r.message_count as stored, COUNT(m.id) as actual
-- FROM requests r
-- LEFT JOIN messages m ON m.request_id = r.id AND m.deleted_at IS NULL
-- GROUP BY r.id
-- HAVING r.message_count != COUNT(m.id);
