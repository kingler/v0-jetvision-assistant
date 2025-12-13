-- JetVision AI Assistant - Conversation State
-- Migration: 010_conversation_state.sql
-- Description: Conversation state persistence for RFP flow tracking
-- Created: 2025-12-13

-- ============================================================================
-- TABLE: conversation_state
-- Description: Stores conversation state for progressive disclosure RFP flow
-- ============================================================================

CREATE TABLE conversation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Thread identification (OpenAI ChatKit thread ID)
  thread_id TEXT NOT NULL UNIQUE,

  -- User who owns this conversation state
  user_id TEXT NOT NULL,

  -- Current step in RFP flow
  current_step TEXT NOT NULL,
  CHECK (current_step IN ('route', 'date', 'passengers', 'aircraft', 'budget')),

  -- RFP data collected so far
  data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Field completion tracking
  completed_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  missing_fields TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Step navigation history
  history TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Full conversation history with timestamps
  conversation_history JSONB DEFAULT '[]'::jsonb,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_thread_id CHECK (thread_id != ''),
  CONSTRAINT valid_user_id CHECK (user_id != '')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup by thread_id
CREATE UNIQUE INDEX idx_conversation_state_thread_id ON conversation_state(thread_id);

-- Lookup all states for a user
CREATE INDEX idx_conversation_state_user_id ON conversation_state(user_id);

-- Cleanup queries (find old states)
CREATE INDEX idx_conversation_state_updated_at ON conversation_state(updated_at);

-- Composite index for user + updated_at (common query pattern)
CREATE INDEX idx_conversation_state_user_updated ON conversation_state(user_id, updated_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE conversation_state IS 'Persistent storage for RFP conversation flow state';
COMMENT ON COLUMN conversation_state.thread_id IS 'OpenAI ChatKit thread ID for conversation continuity';
COMMENT ON COLUMN conversation_state.user_id IS 'Clerk user ID who owns this conversation';
COMMENT ON COLUMN conversation_state.current_step IS 'Current step in progressive disclosure flow: route, date, passengers, aircraft, budget';
COMMENT ON COLUMN conversation_state.data IS 'RFP data collected so far (departure, arrival, dates, passengers, etc.)';
COMMENT ON COLUMN conversation_state.completed_fields IS 'Array of field names that have been successfully collected';
COMMENT ON COLUMN conversation_state.missing_fields IS 'Array of required field names still needed';
COMMENT ON COLUMN conversation_state.history IS 'Array of step names in the order they were visited';
COMMENT ON COLUMN conversation_state.conversation_history IS 'Full conversation messages with role, content, and timestamp';
COMMENT ON COLUMN conversation_state.metadata IS 'Additional metadata for extensibility';

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE TRIGGER update_conversation_state_updated_at
  BEFORE UPDATE ON conversation_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own conversation states
CREATE POLICY conversation_state_user_access ON conversation_state
  FOR ALL
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Policy: Service role has full access (for backend agents)
CREATE POLICY conversation_state_service_access ON conversation_state
  FOR ALL
  USING (current_setting('role') = 'service_role');

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON conversation_state TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_state TO authenticated;
