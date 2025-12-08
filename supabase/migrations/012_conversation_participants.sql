-- JetVision AI Assistant - Conversation Participants
-- Migration: 012_conversation_participants.sql
-- Description: Junction table tracking participants in each conversation
-- Created: 2025-12-08

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Participant role in conversation
CREATE TYPE participant_role AS ENUM (
  'iso_agent',      -- ISO sales agent (human)
  'ai_assistant',   -- JetVision AI agent
  'operator',       -- Flight operator representative
  'admin',          -- System administrator
  'observer'        -- Read-only access (e.g., supervisor)
);

-- ============================================================================
-- TABLE: conversation_participants
-- Description: Tracks who is part of each conversation with their role
-- ============================================================================

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to conversation
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Participant reference (one of these should be set based on role)
  iso_agent_id UUID REFERENCES iso_agents(id) ON DELETE CASCADE,
  operator_profile_id UUID REFERENCES operator_profiles(id) ON DELETE CASCADE,

  -- Role and permissions
  role participant_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  can_reply BOOLEAN DEFAULT true,
  can_invite BOOLEAN DEFAULT false,

  -- Read tracking
  last_read_at TIMESTAMPTZ,
  last_read_message_id UUID,          -- Will reference messages table after it's created
  unread_count INTEGER DEFAULT 0,

  -- Notification preferences (per-conversation override)
  notifications_enabled BOOLEAN DEFAULT true,
  muted_until TIMESTAMPTZ,            -- Temporary mute

  -- Typing indicator (for real-time)
  is_typing BOOLEAN DEFAULT false,
  typing_started_at TIMESTAMPTZ,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Constraints: Ensure exactly one participant reference is set based on role
  CONSTRAINT valid_participant_reference CHECK (
    (role = 'iso_agent' AND iso_agent_id IS NOT NULL AND operator_profile_id IS NULL) OR
    (role = 'operator' AND operator_profile_id IS NOT NULL AND iso_agent_id IS NULL) OR
    (role IN ('ai_assistant', 'admin') AND iso_agent_id IS NULL AND operator_profile_id IS NULL) OR
    (role = 'observer' AND (iso_agent_id IS NOT NULL OR operator_profile_id IS NOT NULL))
  ),
  CONSTRAINT valid_unread_count CHECK (unread_count >= 0)
);

-- Indexes
CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_iso_agent ON conversation_participants(iso_agent_id) WHERE iso_agent_id IS NOT NULL;
CREATE INDEX idx_participants_operator ON conversation_participants(operator_profile_id) WHERE operator_profile_id IS NOT NULL;
CREATE INDEX idx_participants_role ON conversation_participants(role);
CREATE INDEX idx_participants_active ON conversation_participants(conversation_id, is_active) WHERE is_active = true;
CREATE INDEX idx_participants_unread ON conversation_participants(iso_agent_id, unread_count) WHERE unread_count > 0;

-- Unique constraint: Each participant can only be in a conversation once per role
CREATE UNIQUE INDEX idx_participants_unique_iso ON conversation_participants(conversation_id, iso_agent_id)
  WHERE iso_agent_id IS NOT NULL AND is_active = true;
CREATE UNIQUE INDEX idx_participants_unique_operator ON conversation_participants(conversation_id, operator_profile_id)
  WHERE operator_profile_id IS NOT NULL AND is_active = true;
CREATE UNIQUE INDEX idx_participants_unique_ai ON conversation_participants(conversation_id, role)
  WHERE role = 'ai_assistant' AND is_active = true;

-- Comments
COMMENT ON TABLE conversation_participants IS 'Junction table linking participants to conversations with role and permissions';
COMMENT ON COLUMN conversation_participants.iso_agent_id IS 'Reference to ISO agent if participant is an ISO agent';
COMMENT ON COLUMN conversation_participants.operator_profile_id IS 'Reference to operator if participant is a flight operator';
COMMENT ON COLUMN conversation_participants.role IS 'Role of the participant in this conversation';
COMMENT ON COLUMN conversation_participants.can_reply IS 'Whether participant can send messages';
COMMENT ON COLUMN conversation_participants.can_invite IS 'Whether participant can invite others to conversation';
COMMENT ON COLUMN conversation_participants.last_read_message_id IS 'ID of last message read by this participant';
COMMENT ON COLUMN conversation_participants.unread_count IS 'Number of unread messages for this participant';
COMMENT ON COLUMN conversation_participants.muted_until IS 'If set, notifications are muted until this timestamp';
COMMENT ON COLUMN conversation_participants.is_typing IS 'Real-time typing indicator flag';
COMMENT ON COLUMN conversation_participants.left_at IS 'When participant left the conversation (null if still active)';

-- ============================================================================
-- FUNCTION: Update conversation message count when participant reads
-- ============================================================================

CREATE OR REPLACE FUNCTION update_participant_read_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When last_read_at is updated, recalculate unread_count
  IF NEW.last_read_at IS DISTINCT FROM OLD.last_read_at THEN
    NEW.unread_count := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_participant_read_status
  BEFORE UPDATE OF last_read_at ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_read_status();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON conversation_participants TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO authenticated;
GRANT SELECT ON conversation_participants TO anon;
