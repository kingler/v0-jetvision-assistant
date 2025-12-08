-- JetVision AI Assistant - Messages
-- Migration: 013_messages.sql
-- Description: Persistent message storage for 3-party chat system
-- Created: 2025-12-08

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Message sender type
CREATE TYPE message_sender_type AS ENUM (
  'iso_agent',      -- Message from ISO sales agent
  'ai_assistant',   -- Message from JetVision AI
  'operator',       -- Message from flight operator
  'system'          -- System-generated notification
);

-- Message content type
CREATE TYPE message_content_type AS ENUM (
  'text',                   -- Plain text or markdown
  'quote_shared',           -- Sharing a quote with participants
  'quote_updated',          -- Quote has been updated
  'quote_accepted',         -- Quote was accepted
  'quote_rejected',         -- Quote was rejected
  'quote_expired',          -- Quote has expired
  'rfp_created',            -- New RFP was created
  'rfp_updated',            -- RFP details were updated
  'proposal_shared',        -- PDF proposal shared
  'document_attached',      -- File attachment
  'booking_confirmed',      -- Booking confirmation
  'payment_requested',      -- Payment request
  'system_notification',    -- System alert or notification
  'workflow_update',        -- Agent workflow status update
  'typing_indicator'        -- Typing indicator (ephemeral)
);

-- Message delivery status
CREATE TYPE message_status AS ENUM (
  'sending',        -- Message is being sent
  'sent',           -- Message sent to server
  'delivered',      -- Message delivered to recipient(s)
  'read',           -- Message read by at least one recipient
  'failed'          -- Message failed to send
);

-- ============================================================================
-- TABLE: messages
-- Description: Individual messages within conversations
-- ============================================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation reference
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Sender information
  sender_type message_sender_type NOT NULL,
  sender_iso_agent_id UUID REFERENCES iso_agents(id) ON DELETE SET NULL,
  sender_operator_id UUID REFERENCES operator_profiles(id) ON DELETE SET NULL,
  sender_name TEXT,  -- Cached display name for performance

  -- Message content
  content_type message_content_type NOT NULL DEFAULT 'text',
  content TEXT,                        -- Text content (supports markdown)
  rich_content JSONB,                  -- Structured content for rich messages

  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,  -- Array of attachment objects

  -- Message threading
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  thread_root_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reply_count INTEGER DEFAULT 0,

  -- Delivery status
  status message_status NOT NULL DEFAULT 'sending',

  -- External references for syncing
  avinode_message_id TEXT,             -- Avinode message ID
  chatkit_message_id TEXT,             -- ChatKit message ID

  -- Read receipts (stored as JSONB for flexibility)
  read_by JSONB DEFAULT '[]'::jsonb,   -- [{user_id, user_type, read_at}]

  -- Reactions (optional feature for future)
  reactions JSONB DEFAULT '{}'::jsonb, -- {emoji: [{user_id, created_at}]}

  -- Edit history
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  original_content TEXT,               -- Store original if edited

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,              -- Soft delete

  -- Constraints
  CONSTRAINT valid_sender CHECK (
    (sender_type = 'iso_agent' AND sender_iso_agent_id IS NOT NULL) OR
    (sender_type = 'operator' AND sender_operator_id IS NOT NULL) OR
    (sender_type IN ('ai_assistant', 'system'))
  ),
  CONSTRAINT valid_reply_count CHECK (reply_count >= 0),
  CONSTRAINT has_content CHECK (
    content IS NOT NULL OR
    rich_content IS NOT NULL OR
    attachments != '[]'::jsonb
  )
);

-- Indexes for common queries
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_iso ON messages(sender_iso_agent_id) WHERE sender_iso_agent_id IS NOT NULL;
CREATE INDEX idx_messages_sender_operator ON messages(sender_operator_id) WHERE sender_operator_id IS NOT NULL;
CREATE INDEX idx_messages_content_type ON messages(content_type);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX idx_messages_thread_root ON messages(thread_root_id) WHERE thread_root_id IS NOT NULL;
CREATE INDEX idx_messages_avinode_id ON messages(avinode_message_id) WHERE avinode_message_id IS NOT NULL;
CREATE INDEX idx_messages_chatkit_id ON messages(chatkit_message_id) WHERE chatkit_message_id IS NOT NULL;
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

-- Full text search on message content
CREATE INDEX idx_messages_content_fts ON messages USING gin(to_tsvector('english', COALESCE(content, '')));

-- Comments
COMMENT ON TABLE messages IS 'Individual messages in multi-party conversations';
COMMENT ON COLUMN messages.sender_type IS 'Type of sender: iso_agent, ai_assistant, operator, or system';
COMMENT ON COLUMN messages.sender_iso_agent_id IS 'Reference to ISO agent if sender is an ISO agent';
COMMENT ON COLUMN messages.sender_operator_id IS 'Reference to operator if sender is a flight operator';
COMMENT ON COLUMN messages.sender_name IS 'Cached sender display name for performance';
COMMENT ON COLUMN messages.content_type IS 'Type of message content (text, quote_shared, etc.)';
COMMENT ON COLUMN messages.content IS 'Text content of the message (supports markdown)';
COMMENT ON COLUMN messages.rich_content IS 'Structured JSON content for rich message types';
COMMENT ON COLUMN messages.attachments IS 'Array of attachment objects: [{id, name, type, size, url}]';
COMMENT ON COLUMN messages.parent_message_id IS 'Reference to parent message if this is a reply';
COMMENT ON COLUMN messages.thread_root_id IS 'Reference to thread root for nested conversations';
COMMENT ON COLUMN messages.avinode_message_id IS 'Avinode message ID for sync';
COMMENT ON COLUMN messages.chatkit_message_id IS 'OpenAI ChatKit message ID for AI messages';
COMMENT ON COLUMN messages.read_by IS 'Array of read receipts: [{user_id, user_type, read_at}]';
COMMENT ON COLUMN messages.deleted_at IS 'Soft delete timestamp (null if not deleted)';

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Update conversation stats on new message
-- ============================================================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation with new message info
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_by = COALESCE(NEW.sender_iso_agent_id, NEW.sender_operator_id),
    message_count = message_count + 1,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  -- Increment unread counts for other participants
  IF NEW.sender_type = 'iso_agent' OR NEW.sender_type = 'ai_assistant' THEN
    -- Message from ISO side - increment operator unread
    UPDATE conversations
    SET unread_count_operator = unread_count_operator + 1
    WHERE id = NEW.conversation_id;
  ELSIF NEW.sender_type = 'operator' THEN
    -- Message from operator - increment ISO unread
    UPDATE conversations
    SET unread_count_iso = unread_count_iso + 1
    WHERE id = NEW.conversation_id;
  END IF;

  -- Update unread counts for individual participants
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND is_active = true
    AND (
      (NEW.sender_iso_agent_id IS NOT NULL AND iso_agent_id != NEW.sender_iso_agent_id) OR
      (NEW.sender_operator_id IS NOT NULL AND operator_profile_id != NEW.sender_operator_id) OR
      (NEW.sender_type IN ('ai_assistant', 'system'))
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================================
-- FUNCTION: Update reply count on parent message
-- ============================================================================

CREATE OR REPLACE FUNCTION update_parent_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_message_id IS NOT NULL THEN
    UPDATE messages
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_message_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_reply_count
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.parent_message_id IS NOT NULL)
  EXECUTE FUNCTION update_parent_reply_count();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON messages TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT SELECT ON messages TO anon;
