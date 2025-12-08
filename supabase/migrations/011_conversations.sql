-- JetVision AI Assistant - Conversations
-- Migration: 011_conversations.sql
-- Description: Multi-party conversation grouping for 3-party chat system
-- Created: 2025-12-08

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Conversation type
CREATE TYPE conversation_type AS ENUM (
  'rfp_negotiation',      -- RFP-related discussion with operators
  'quote_discussion',     -- Discussing specific quote details
  'general_inquiry',      -- General questions and information
  'booking_confirmation', -- Booking finalization communications
  'support'               -- Support requests
);

-- Conversation status
CREATE TYPE conversation_status AS ENUM (
  'active',               -- Ongoing conversation
  'awaiting_response',    -- Waiting for reply from participant
  'resolved',             -- Issue/topic resolved
  'archived'              -- No longer active, kept for records
);

-- ============================================================================
-- TABLE: conversations
-- Description: Groups messages into multi-party conversation threads
-- ============================================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships to existing entities
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- Conversation metadata
  type conversation_type NOT NULL DEFAULT 'rfp_negotiation',
  status conversation_status NOT NULL DEFAULT 'active',
  subject TEXT,

  -- External references for syncing
  avinode_thread_id TEXT,            -- Avinode message thread ID for sync
  chatkit_thread_id TEXT,            -- OpenAI ChatKit thread ID if applicable

  -- Activity tracking
  last_message_at TIMESTAMPTZ,
  last_message_by UUID,              -- References the user who sent last message
  message_count INTEGER DEFAULT 0,

  -- Unread tracking per party type
  unread_count_iso INTEGER DEFAULT 0,       -- Unread by ISO agents
  unread_count_operator INTEGER DEFAULT 0,  -- Unread by operators

  -- Priority and flags
  is_priority BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_message_count CHECK (message_count >= 0),
  CONSTRAINT valid_unread_counts CHECK (unread_count_iso >= 0 AND unread_count_operator >= 0)
);

-- Indexes
CREATE INDEX idx_conversations_request_id ON conversations(request_id);
CREATE INDEX idx_conversations_quote_id ON conversations(quote_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_avinode_thread ON conversations(avinode_thread_id) WHERE avinode_thread_id IS NOT NULL;
CREATE INDEX idx_conversations_chatkit_thread ON conversations(chatkit_thread_id) WHERE chatkit_thread_id IS NOT NULL;
CREATE INDEX idx_conversations_active ON conversations(status, last_message_at DESC) WHERE status = 'active';
CREATE INDEX idx_conversations_priority ON conversations(is_priority, last_message_at DESC) WHERE is_priority = true;

-- Comments
COMMENT ON TABLE conversations IS 'Multi-party conversation threads grouping messages between ISO agents, AI, and operators';
COMMENT ON COLUMN conversations.request_id IS 'Link to flight request if conversation is about a specific RFP';
COMMENT ON COLUMN conversations.quote_id IS 'Link to specific quote if discussion is quote-specific';
COMMENT ON COLUMN conversations.avinode_thread_id IS 'Avinode message thread ID for synchronizing messages';
COMMENT ON COLUMN conversations.chatkit_thread_id IS 'OpenAI ChatKit thread ID for AI conversation history';
COMMENT ON COLUMN conversations.last_message_by IS 'UUID of the last user to send a message';
COMMENT ON COLUMN conversations.unread_count_iso IS 'Number of messages unread by ISO agents';
COMMENT ON COLUMN conversations.unread_count_operator IS 'Number of messages unread by operators';
COMMENT ON COLUMN conversations.is_priority IS 'Flag for urgent/priority conversations';
COMMENT ON COLUMN conversations.is_pinned IS 'Whether conversation is pinned to top of list';

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON conversations TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT SELECT ON conversations TO anon;
