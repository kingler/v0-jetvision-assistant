-- JetVision AI Assistant - Modify Existing Tables
-- Migration: 015_modify_existing_tables.sql
-- Description: Add Avinode and conversation references to existing tables
-- Created: 2025-12-08

-- ============================================================================
-- MODIFY TABLE: quotes
-- Add operator profile relationship and conversation link
-- ============================================================================

-- Add operator profile reference (replaces TEXT operator_id)
ALTER TABLE quotes
  ADD COLUMN operator_profile_id UUID REFERENCES operator_profiles(id) ON DELETE SET NULL;

-- Add Avinode quote ID for syncing
ALTER TABLE quotes
  ADD COLUMN avinode_quote_id TEXT;

-- Add conversation link for quote discussions
ALTER TABLE quotes
  ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- Add operator message/notes from quote
ALTER TABLE quotes
  ADD COLUMN operator_message TEXT;

-- Add timestamps for quote lifecycle
ALTER TABLE quotes
  ADD COLUMN received_at TIMESTAMPTZ,
  ADD COLUMN responded_at TIMESTAMPTZ,
  ADD COLUMN expired_at TIMESTAMPTZ;

-- Add pricing validity
ALTER TABLE quotes
  ADD COLUMN price_locked_until TIMESTAMPTZ;

-- Create indexes for new columns
CREATE INDEX idx_quotes_operator_profile ON quotes(operator_profile_id) WHERE operator_profile_id IS NOT NULL;
CREATE INDEX idx_quotes_avinode_quote ON quotes(avinode_quote_id) WHERE avinode_quote_id IS NOT NULL;
CREATE INDEX idx_quotes_conversation ON quotes(conversation_id) WHERE conversation_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN quotes.operator_profile_id IS 'Reference to operator_profiles table for proper relationships';
COMMENT ON COLUMN quotes.avinode_quote_id IS 'Avinode quote ID for synchronization';
COMMENT ON COLUMN quotes.conversation_id IS 'Link to conversation thread for this quote';
COMMENT ON COLUMN quotes.operator_message IS 'Message from operator accompanying the quote';
COMMENT ON COLUMN quotes.received_at IS 'When quote was received from operator';
COMMENT ON COLUMN quotes.responded_at IS 'When ISO agent responded to quote';
COMMENT ON COLUMN quotes.expired_at IS 'When quote actually expired';
COMMENT ON COLUMN quotes.price_locked_until IS 'Quote price is guaranteed until this time';

-- ============================================================================
-- MODIFY TABLE: requests
-- Add Avinode trip/RFP references and primary conversation
-- ============================================================================

-- Add Avinode RFP ID
ALTER TABLE requests
  ADD COLUMN avinode_rfp_id TEXT;

-- Add Avinode trip ID (for searches)
ALTER TABLE requests
  ADD COLUMN avinode_trip_id TEXT;

-- Add Avinode deep link URL
ALTER TABLE requests
  ADD COLUMN avinode_deep_link TEXT;

-- Add primary conversation for this request
ALTER TABLE requests
  ADD COLUMN primary_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- Add operator tracking
ALTER TABLE requests
  ADD COLUMN operators_contacted INTEGER DEFAULT 0,
  ADD COLUMN quotes_expected INTEGER DEFAULT 0,
  ADD COLUMN quotes_received INTEGER DEFAULT 0;

-- Add Avinode session tracking
ALTER TABLE requests
  ADD COLUMN avinode_session_started_at TIMESTAMPTZ,
  ADD COLUMN avinode_session_ended_at TIMESTAMPTZ;

-- Create indexes for new columns
CREATE INDEX idx_requests_avinode_rfp ON requests(avinode_rfp_id) WHERE avinode_rfp_id IS NOT NULL;
CREATE INDEX idx_requests_avinode_trip ON requests(avinode_trip_id) WHERE avinode_trip_id IS NOT NULL;
CREATE INDEX idx_requests_primary_conversation ON requests(primary_conversation_id) WHERE primary_conversation_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN requests.avinode_rfp_id IS 'Avinode RFP ID when RFQ is created';
COMMENT ON COLUMN requests.avinode_trip_id IS 'Avinode trip ID for search tracking';
COMMENT ON COLUMN requests.avinode_deep_link IS 'Deep link URL to open Avinode marketplace';
COMMENT ON COLUMN requests.primary_conversation_id IS 'Main conversation thread for this request';
COMMENT ON COLUMN requests.operators_contacted IS 'Number of operators RFQ was sent to';
COMMENT ON COLUMN requests.quotes_expected IS 'Expected number of quotes (operators contacted)';
COMMENT ON COLUMN requests.quotes_received IS 'Actual number of quotes received';
COMMENT ON COLUMN requests.avinode_session_started_at IS 'When user opened Avinode for this request';
COMMENT ON COLUMN requests.avinode_session_ended_at IS 'When user returned from Avinode';

-- ============================================================================
-- MODIFY TABLE: iso_agents
-- Add notification preferences for chat
-- ============================================================================

-- Add notification preferences
ALTER TABLE iso_agents
  ADD COLUMN notification_preferences JSONB DEFAULT '{
    "email_new_quote": true,
    "email_message": true,
    "push_new_quote": true,
    "push_message": true,
    "desktop_notifications": true
  }'::jsonb;

-- Add presence tracking
ALTER TABLE iso_agents
  ADD COLUMN last_seen_at TIMESTAMPTZ,
  ADD COLUMN online_status TEXT DEFAULT 'offline' CHECK (online_status IN ('online', 'away', 'busy', 'offline'));

-- Create index for online users
CREATE INDEX idx_iso_agents_online ON iso_agents(online_status, last_seen_at DESC)
  WHERE online_status != 'offline' AND is_active = true;

-- Comments
COMMENT ON COLUMN iso_agents.notification_preferences IS 'User preferences for notifications';
COMMENT ON COLUMN iso_agents.last_seen_at IS 'Last activity timestamp for presence';
COMMENT ON COLUMN iso_agents.online_status IS 'Current online status for chat presence';

-- ============================================================================
-- ADD: Conversation reference to conversation_participants
-- (Updates foreign key constraint now that messages table exists)
-- ============================================================================

-- Add foreign key for last_read_message_id now that messages table exists
ALTER TABLE conversation_participants
  ADD CONSTRAINT fk_last_read_message
  FOREIGN KEY (last_read_message_id)
  REFERENCES messages(id)
  ON DELETE SET NULL;

-- ============================================================================
-- EXTEND: request_status enum with Avinode states
-- Note: PostgreSQL doesn't allow direct ALTER TYPE ADD VALUE in transaction
-- So we need to do this outside transaction or use a workaround
-- ============================================================================

-- Add new request statuses for Avinode workflow
-- (This may need to be run separately if in a transaction)
DO $$
BEGIN
  -- Check if 'trip_created' already exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'trip_created' AND enumtypid = 'request_status'::regtype) THEN
    ALTER TYPE request_status ADD VALUE 'trip_created' AFTER 'fetching_client_data';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'awaiting_user_action' AND enumtypid = 'request_status'::regtype) THEN
    ALTER TYPE request_status ADD VALUE 'awaiting_user_action' AFTER 'trip_created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'avinode_session_active' AND enumtypid = 'request_status'::regtype) THEN
    ALTER TYPE request_status ADD VALUE 'avinode_session_active' AFTER 'awaiting_user_action';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'monitoring_for_quotes' AND enumtypid = 'request_status'::regtype) THEN
    ALTER TYPE request_status ADD VALUE 'monitoring_for_quotes' AFTER 'avinode_session_active';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Ignore if already exists
END $$;

-- ============================================================================
-- FUNCTION: Get conversation for a request (creates if needed)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_request_conversation(
  p_request_id UUID,
  p_iso_agent_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Check if request already has a primary conversation
  SELECT primary_conversation_id INTO v_conversation_id
  FROM requests
  WHERE id = p_request_id;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (request_id, type, status, subject)
  SELECT
    p_request_id,
    'rfp_negotiation',
    'active',
    'RFP: ' || departure_airport || ' to ' || arrival_airport
  FROM requests
  WHERE id = p_request_id
  RETURNING id INTO v_conversation_id;

  -- Update request with primary conversation
  UPDATE requests
  SET primary_conversation_id = v_conversation_id
  WHERE id = p_request_id;

  -- Add ISO agent as participant
  INSERT INTO conversation_participants (conversation_id, iso_agent_id, role, can_reply, can_invite)
  VALUES (v_conversation_id, p_iso_agent_id, 'iso_agent', true, true);

  -- Add AI assistant as participant
  INSERT INTO conversation_participants (conversation_id, role, can_reply)
  VALUES (v_conversation_id, 'ai_assistant', true);

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_create_request_conversation IS 'Gets or creates the primary conversation for a request';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_or_create_request_conversation TO authenticated, service_role;
