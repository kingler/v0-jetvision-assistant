-- JetVision AI Assistant - Schema Consolidation Phase 1
-- Migration: 030_consolidate_schema_add_columns.sql
-- Description: Add session and conversation fields to requests table,
--              add request_id and quote_id to messages table
-- Created: 2025-01-16
--
-- This is part of a schema consolidation to merge:
--   chat_sessions + conversations → requests
--   messages.conversation_id → messages.request_id + messages.quote_id
--
-- Benefits:
--   - Simpler data model (2 tables instead of 4)
--   - Easier deletion cascade (request → messages)
--   - Operator message threading via quote_id

-- ============================================================================
-- MODIFY TABLE: requests
-- Add session tracking fields (from chat_sessions)
-- ============================================================================

-- Session status (replaces chat_session_status enum)
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'active'
    CHECK (session_status IN ('active', 'paused', 'completed', 'archived'));

-- Conversation type (flight_request or general)
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'flight_request'
    CHECK (conversation_type IN ('flight_request', 'general'));

-- Workflow tracking
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS current_step TEXT;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS workflow_state JSONB DEFAULT '{}'::jsonb;

-- Session timestamps
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS session_ended_at TIMESTAMPTZ;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- MODIFY TABLE: requests
-- Add conversation metadata fields (from conversations)
-- ============================================================================

-- Conversation subject
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS subject TEXT;

-- External thread IDs for syncing
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS avinode_thread_id TEXT;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS chatkit_thread_id TEXT;

-- Message tracking
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS last_message_by UUID;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Unread tracking
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS unread_count_iso INTEGER DEFAULT 0;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS unread_count_operator INTEGER DEFAULT 0;

-- Priority and pinned flags
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;

ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- ============================================================================
-- CREATE INDEXES: requests (new columns)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_requests_session_status
  ON requests(session_status);

CREATE INDEX IF NOT EXISTS idx_requests_conversation_type
  ON requests(conversation_type);

CREATE INDEX IF NOT EXISTS idx_requests_last_activity
  ON requests(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_last_message
  ON requests(last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_requests_avinode_thread
  ON requests(avinode_thread_id)
  WHERE avinode_thread_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requests_chatkit_thread
  ON requests(chatkit_thread_id)
  WHERE chatkit_thread_id IS NOT NULL;

-- Composite index for active sessions by user
CREATE INDEX IF NOT EXISTS idx_requests_active_sessions
  ON requests(iso_agent_id, session_status, last_activity_at DESC)
  WHERE session_status IN ('active', 'paused');

-- ============================================================================
-- MODIFY TABLE: messages
-- Add request_id and quote_id for direct linking and operator threading
-- ============================================================================

-- Direct link to request (replaces conversation_id)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES requests(id) ON DELETE CASCADE;

-- Quote ID for operator message threading
-- NULL for general/AI messages, set for operator-specific threads
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

-- ============================================================================
-- CREATE INDEXES: messages (new columns)
-- ============================================================================

-- Primary index for querying messages by request
CREATE INDEX IF NOT EXISTS idx_messages_request_id
  ON messages(request_id, created_at DESC)
  WHERE request_id IS NOT NULL;

-- Index for operator message threading by quote
CREATE INDEX IF NOT EXISTS idx_messages_quote_id
  ON messages(quote_id, created_at DESC)
  WHERE quote_id IS NOT NULL;

-- Composite index for querying messages by request and quote (operator threads)
CREATE INDEX IF NOT EXISTS idx_messages_request_quote
  ON messages(request_id, quote_id, created_at DESC)
  WHERE request_id IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- requests table comments
COMMENT ON COLUMN requests.session_status IS 'Chat session status: active, paused, completed, archived';
COMMENT ON COLUMN requests.conversation_type IS 'Type of conversation: flight_request or general';
COMMENT ON COLUMN requests.current_step IS 'Current workflow step: understanding_request, searching_aircraft, etc.';
COMMENT ON COLUMN requests.workflow_state IS 'Full workflow state as JSONB (agent context, history)';
COMMENT ON COLUMN requests.session_started_at IS 'When the chat session started';
COMMENT ON COLUMN requests.session_ended_at IS 'When the chat session ended';
COMMENT ON COLUMN requests.last_activity_at IS 'Last user or agent activity timestamp';
COMMENT ON COLUMN requests.subject IS 'Conversation subject line';
COMMENT ON COLUMN requests.avinode_thread_id IS 'Avinode message thread ID for sync';
COMMENT ON COLUMN requests.chatkit_thread_id IS 'OpenAI ChatKit thread ID';
COMMENT ON COLUMN requests.last_message_at IS 'Timestamp of last message in conversation';
COMMENT ON COLUMN requests.last_message_by IS 'User ID of who sent the last message';
COMMENT ON COLUMN requests.message_count IS 'Total number of messages in this request';
COMMENT ON COLUMN requests.unread_count_iso IS 'Number of unread messages for ISO agent';
COMMENT ON COLUMN requests.unread_count_operator IS 'Number of unread messages for operators';
COMMENT ON COLUMN requests.is_priority IS 'Whether this request is marked as priority';
COMMENT ON COLUMN requests.is_pinned IS 'Whether this request is pinned to top';

-- messages table comments
COMMENT ON COLUMN messages.request_id IS 'Direct reference to the request this message belongs to';
COMMENT ON COLUMN messages.quote_id IS 'Reference to quote for operator message threading (NULL for general messages)';

-- ============================================================================
-- CONSTRAINTS
-- ============================================================================

-- Ensure message counts are non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_message_counts'
  ) THEN
    ALTER TABLE requests
      ADD CONSTRAINT valid_message_counts
        CHECK (message_count >= 0 AND unread_count_iso >= 0 AND unread_count_operator >= 0);
  END IF;
END $$;
