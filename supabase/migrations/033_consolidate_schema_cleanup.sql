-- JetVision AI Assistant - Schema Consolidation Phase 4 (CLEANUP)
-- Migration: 033_consolidate_schema_cleanup.sql
-- Description: Drop deprecated tables and columns after data migration verification
-- Created: 2025-01-16
--
-- WARNING: This migration is DESTRUCTIVE and should only be run after:
--   1. Migration 030 (add columns) has been applied
--   2. Migration 031 (migrate data) has been applied
--   3. Migration 032 (triggers) has been applied
--   4. Application code has been updated to use new schema
--   5. Data integrity has been verified
--
-- VERIFICATION CHECKLIST before running this migration:
--   [ ] All messages have request_id populated
--   [ ] Operator messages have quote_id where applicable
--   [ ] Message counts match actual counts
--   [ ] Application is reading/writing to new columns
--   [ ] No errors in production for 24+ hours

-- ============================================================================
-- STEP 1: Drop foreign key constraints referencing deprecated tables
-- ============================================================================

-- Messages: Drop conversation_id FK
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- Quotes: Drop conversation_id FK
ALTER TABLE quotes
  DROP CONSTRAINT IF EXISTS quotes_conversation_id_fkey;

-- Avinode webhook events: Drop conversation_id FK
ALTER TABLE avinode_webhook_events
  DROP CONSTRAINT IF EXISTS avinode_webhook_events_conversation_id_fkey;

-- Requests: Drop primary_conversation_id FK
ALTER TABLE requests
  DROP CONSTRAINT IF EXISTS requests_primary_conversation_id_fkey;

-- Chat sessions: Drop all FKs (the table will be dropped anyway)
ALTER TABLE chat_sessions
  DROP CONSTRAINT IF EXISTS chat_sessions_conversation_id_fkey,
  DROP CONSTRAINT IF EXISTS chat_sessions_request_id_fkey,
  DROP CONSTRAINT IF EXISTS chat_sessions_iso_agent_id_fkey,
  DROP CONSTRAINT IF EXISTS chat_sessions_primary_quote_id_fkey,
  DROP CONSTRAINT IF EXISTS chat_sessions_proposal_id_fkey;

-- Conversation participants: Drop all FKs
ALTER TABLE conversation_participants
  DROP CONSTRAINT IF EXISTS conversation_participants_conversation_id_fkey,
  DROP CONSTRAINT IF EXISTS conversation_participants_iso_agent_id_fkey,
  DROP CONSTRAINT IF EXISTS conversation_participants_operator_profile_id_fkey,
  DROP CONSTRAINT IF EXISTS conversation_participants_last_read_message_id_fkey;

-- ============================================================================
-- STEP 2: Drop deprecated columns from messages table
-- ============================================================================

ALTER TABLE messages
  DROP COLUMN IF EXISTS conversation_id;

-- ============================================================================
-- STEP 3: Drop deprecated columns from requests table
-- ============================================================================

ALTER TABLE requests
  DROP COLUMN IF EXISTS primary_conversation_id;

-- ============================================================================
-- STEP 4: Drop deprecated columns from quotes table
-- ============================================================================

ALTER TABLE quotes
  DROP COLUMN IF EXISTS conversation_id;

-- ============================================================================
-- STEP 5: Drop deprecated columns from avinode_webhook_events table
-- ============================================================================

ALTER TABLE avinode_webhook_events
  DROP COLUMN IF EXISTS conversation_id;

-- ============================================================================
-- STEP 6: Drop conversation_participants table
-- ============================================================================

DROP TABLE IF EXISTS conversation_participants CASCADE;

-- ============================================================================
-- STEP 7: Drop conversations table
-- ============================================================================

DROP TABLE IF EXISTS conversations CASCADE;

-- ============================================================================
-- STEP 8: Drop chat_sessions table
-- ============================================================================

DROP TABLE IF EXISTS chat_sessions CASCADE;

-- ============================================================================
-- STEP 9: Drop deprecated enums
-- ============================================================================

DROP TYPE IF EXISTS conversation_type CASCADE;
DROP TYPE IF EXISTS conversation_status CASCADE;
DROP TYPE IF EXISTS chat_session_status CASCADE;
DROP TYPE IF EXISTS participant_role CASCADE;

-- ============================================================================
-- STEP 10: Drop deprecated functions and triggers
-- ============================================================================

-- Old conversation-based functions
DROP FUNCTION IF EXISTS get_or_create_request_conversation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS update_chat_session_activity(UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_chat_session(UUID) CASCADE;
DROP FUNCTION IF EXISTS archive_old_chat_sessions() CASCADE;

-- Old triggers (may have already been dropped with tables)
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS set_chat_sessions_updated_at ON chat_sessions;

-- ============================================================================
-- STEP 11: Update RLS policies (if any reference dropped tables)
-- ============================================================================

-- Note: RLS policies on dropped tables are automatically removed
-- But we should ensure messages table RLS works with request_id

-- Drop old policies that may reference conversation_id
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;

-- Create new policies for request-based access
CREATE POLICY "Users can view messages in their requests"
  ON messages
  FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM requests WHERE iso_agent_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = messages.quote_id
      AND q.operator_profile_id IN (
        SELECT id FROM operator_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert messages in their requests"
  ON messages
  FOR INSERT
  WITH CHECK (
    request_id IN (
      SELECT id FROM requests WHERE iso_agent_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = messages.quote_id
      AND q.operator_profile_id IN (
        SELECT id FROM operator_profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================================================
-- STEP 12: Clean up orphaned indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_messages_conversation_id;
DROP INDEX IF EXISTS idx_conversations_request_id;
DROP INDEX IF EXISTS idx_conversations_quote_id;
DROP INDEX IF EXISTS idx_conversations_status;
DROP INDEX IF EXISTS idx_conversations_type;
DROP INDEX IF EXISTS idx_conversations_last_message_at;
DROP INDEX IF EXISTS idx_conversations_avinode_thread;
DROP INDEX IF EXISTS idx_conversations_chatkit_thread;
DROP INDEX IF EXISTS idx_conversations_active;
DROP INDEX IF EXISTS idx_conversations_priority;
DROP INDEX IF EXISTS idx_chat_sessions_conversation_status;
DROP INDEX IF EXISTS idx_chat_sessions_request_id;
DROP INDEX IF EXISTS idx_chat_sessions_iso_agent;
DROP INDEX IF EXISTS idx_chat_sessions_avinode_trip;
DROP INDEX IF EXISTS idx_chat_sessions_avinode_rfp;
DROP INDEX IF EXISTS idx_chat_sessions_active_activity;
DROP INDEX IF EXISTS idx_chat_sessions_status_updated;
DROP INDEX IF EXISTS idx_chat_sessions_conversation_type;
DROP INDEX IF EXISTS idx_participants_conversation;
DROP INDEX IF EXISTS idx_participants_iso_agent;
DROP INDEX IF EXISTS idx_participants_operator;
DROP INDEX IF EXISTS idx_participants_role;
DROP INDEX IF EXISTS idx_participants_active;
DROP INDEX IF EXISTS idx_participants_unread;
DROP INDEX IF EXISTS idx_participants_unique_iso;
DROP INDEX IF EXISTS idx_participants_unique_operator;
DROP INDEX IF EXISTS idx_participants_unique_ai;

-- ============================================================================
-- VERIFICATION QUERIES (run these manually before committing)
-- ============================================================================

-- SELECT 'Messages without request_id' as check_name, COUNT(*) as count
-- FROM messages WHERE request_id IS NULL AND deleted_at IS NULL;

-- SELECT 'Operator messages without quote_id' as check_name, COUNT(*) as count
-- FROM messages WHERE sender_type = 'operator' AND quote_id IS NULL AND request_id IS NOT NULL;

-- SELECT 'Tables remaining' as check_name, tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('conversations', 'chat_sessions', 'conversation_participants');
-- Should return 0 rows
