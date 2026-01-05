-- ============================================================================
-- Chat Sessions Table Migration
-- ============================================================================
-- Description: Creates the chat_sessions table for tracking chat conversation
--              sessions tied to trip requests, RFQs, and proposals
-- Created: 2025-01-XX
-- Author: Auto (AI Assistant)
-- ============================================================================

-- Create session status enum
CREATE TYPE chat_session_status AS ENUM ('active', 'paused', 'completed', 'archived');

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to conversations table (chat conversation thread)
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Foreign key to requests table (trip request)
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,

  -- ISO agent who owns/started this session
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,

  -- Session status
  status chat_session_status NOT NULL DEFAULT 'active',

  -- Trip/RFQ identifiers from Avinode
  avinode_trip_id TEXT,           -- Avinode trip ID for tracking flight searches
  avinode_rfp_id TEXT,            -- Avinode RFP ID when RFQ is created
  avinode_rfq_id TEXT,            -- Avinode RFQ ID (if tracking individual RFQs)
  
  -- Related entities
  primary_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,  -- Primary quote being discussed
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,    -- Generated proposal (if any)

  -- Session metadata
  session_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Workflow tracking
  current_step TEXT,              -- Current step in workflow (e.g., 'understanding_request', 'searching_aircraft', 'analyzing_options', 'requesting_quotes', 'proposal_ready')
  workflow_state JSONB DEFAULT '{}'::jsonb,  -- Full workflow state (preserves chat context)
  
  -- Statistics
  message_count INTEGER DEFAULT 0,
  quotes_received_count INTEGER DEFAULT 0,
  quotes_expected_count INTEGER DEFAULT 0,
  operators_contacted_count INTEGER DEFAULT 0,
  
  -- Optional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_message_count CHECK (message_count >= 0),
  CONSTRAINT valid_quotes_counts CHECK (
    quotes_received_count >= 0 AND 
    quotes_expected_count >= 0 AND 
    operators_contacted_count >= 0
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding active sessions by conversation
CREATE INDEX idx_chat_sessions_conversation_status
  ON chat_sessions(conversation_id, status);

-- Index for finding sessions by request (trip request)
CREATE INDEX idx_chat_sessions_request_id
  ON chat_sessions(request_id) WHERE request_id IS NOT NULL;

-- Index for finding sessions by ISO agent
CREATE INDEX idx_chat_sessions_iso_agent
  ON chat_sessions(iso_agent_id, status);

-- Index for finding sessions by Avinode trip ID
CREATE INDEX idx_chat_sessions_avinode_trip
  ON chat_sessions(avinode_trip_id) WHERE avinode_trip_id IS NOT NULL;

-- Index for finding sessions by Avinode RFP ID
CREATE INDEX idx_chat_sessions_avinode_rfp
  ON chat_sessions(avinode_rfp_id) WHERE avinode_rfp_id IS NOT NULL;

-- Index for finding active sessions ordered by activity
CREATE INDEX idx_chat_sessions_active_activity
  ON chat_sessions(status, last_activity_at DESC) WHERE status = 'active';

-- Index for cleanup queries (completed/archived sessions)
CREATE INDEX idx_chat_sessions_status_updated
  ON chat_sessions(status, updated_at) WHERE status IN ('completed', 'archived');

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions (via iso_agent_id)
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions
  FOR SELECT
  USING (
    iso_agent_id IN (
      SELECT id FROM iso_agents 
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own chat sessions"
  ON chat_sessions
  FOR INSERT
  WITH CHECK (
    iso_agent_id IN (
      SELECT id FROM iso_agents 
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions
  FOR UPDATE
  USING (
    iso_agent_id IN (
      SELECT id FROM iso_agents 
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Policy: Service role can do anything (for API routes)
CREATE POLICY "Service role full access chat sessions"
  ON chat_sessions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_sessions_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update last activity timestamp for a session
CREATE OR REPLACE FUNCTION update_chat_session_activity(session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_sessions
  SET last_activity_at = NOW()
  WHERE id = session_id
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a session
CREATE OR REPLACE FUNCTION complete_chat_session(session_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_sessions
  SET status = 'completed',
      session_ended_at = NOW(),
      last_activity_at = NOW(),
      updated_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old completed sessions (older than 90 days)
CREATE OR REPLACE FUNCTION archive_old_chat_sessions()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE chat_sessions
  SET status = 'archived',
      updated_at = NOW()
  WHERE status = 'completed'
    AND session_ended_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE chat_sessions IS
  'Tracks chat conversation sessions tied to trip requests, RFQs, and proposals';

COMMENT ON COLUMN chat_sessions.conversation_id IS
  'Foreign key to conversations table (chat conversation thread)';

COMMENT ON COLUMN chat_sessions.request_id IS
  'Foreign key to requests table (trip request)';

COMMENT ON COLUMN chat_sessions.avinode_trip_id IS
  'Avinode trip ID for tracking flight searches';

COMMENT ON COLUMN chat_sessions.avinode_rfp_id IS
  'Avinode RFP ID when RFQ is created';

COMMENT ON COLUMN chat_sessions.avinode_rfq_id IS
  'Avinode RFQ ID (if tracking individual RFQs)';

COMMENT ON COLUMN chat_sessions.primary_quote_id IS
  'Primary quote being discussed in this session';

COMMENT ON COLUMN chat_sessions.proposal_id IS
  'Generated proposal ID (if proposal has been created)';

COMMENT ON COLUMN chat_sessions.status IS
  'Session status: active, paused, completed, or archived';

COMMENT ON COLUMN chat_sessions.current_step IS
  'Current step in workflow (understanding_request, searching_aircraft, analyzing_options, requesting_quotes, proposal_ready)';

COMMENT ON COLUMN chat_sessions.workflow_state IS
  'Full workflow state preserving chat context (JSONB)';

COMMENT ON COLUMN chat_sessions.message_count IS
  'Number of messages exchanged in this session';

COMMENT ON COLUMN chat_sessions.quotes_received_count IS
  'Number of quotes received for this trip request';

COMMENT ON COLUMN chat_sessions.quotes_expected_count IS
  'Expected number of quotes (operators contacted)';

COMMENT ON FUNCTION update_chat_session_activity(UUID) IS
  'Updates the last_activity_at timestamp for an active session';

COMMENT ON FUNCTION complete_chat_session(UUID) IS
  'Marks a session as completed and sets session_ended_at timestamp';

COMMENT ON FUNCTION archive_old_chat_sessions() IS
  'Archives old completed sessions older than 90 days';
