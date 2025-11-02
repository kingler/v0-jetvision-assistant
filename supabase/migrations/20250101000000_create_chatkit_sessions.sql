-- ============================================================================
-- ChatKit Sessions Table Migration
-- ============================================================================
-- Description: Creates the chatkit_sessions table for managing ChatKit session
--              tokens and device mappings for authenticated users
-- Created: 2025-01-01
-- Author: Tank (Backend Developer)
-- ============================================================================

-- Create session status enum
CREATE TYPE session_status AS ENUM ('active', 'expired', 'revoked');

-- Create chatkit_sessions table
CREATE TABLE IF NOT EXISTS chatkit_sessions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to users table (using Clerk user ID)
  clerk_user_id TEXT NOT NULL,

  -- ChatKit device ID (unique identifier for the device)
  device_id TEXT NOT NULL,

  -- ChatKit workflow ID
  workflow_id TEXT NOT NULL,

  -- Session token (UUID)
  session_token TEXT NOT NULL UNIQUE,

  -- Session status
  status session_status NOT NULL DEFAULT 'active',

  -- Session expiration timestamp
  expires_at TIMESTAMPTZ NOT NULL,

  -- Optional metadata (JSON)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Last activity timestamp
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding active sessions by user
CREATE INDEX idx_chatkit_sessions_user_status
  ON chatkit_sessions(clerk_user_id, status);

-- Index for finding sessions by token (for validation)
CREATE INDEX idx_chatkit_sessions_token
  ON chatkit_sessions(session_token);

-- Index for finding sessions by device
CREATE INDEX idx_chatkit_sessions_device
  ON chatkit_sessions(device_id);

-- Index for cleaning up expired sessions
CREATE INDEX idx_chatkit_sessions_expires_at
  ON chatkit_sessions(expires_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE chatkit_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own sessions
CREATE POLICY "Users can read own sessions"
  ON chatkit_sessions
  FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON chatkit_sessions
  FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON chatkit_sessions
  FOR UPDATE
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Policy: Service role can do anything (for API routes)
CREATE POLICY "Service role full access"
  ON chatkit_sessions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_chatkit_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_chatkit_sessions_updated_at
  BEFORE UPDATE ON chatkit_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chatkit_sessions_updated_at();

-- ============================================================================
-- CLEANUP FUNCTION (Optional - for automated cleanup of expired sessions)
-- ============================================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_chatkit_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Update status to 'expired' for sessions past their expiration
  WITH updated AS (
    UPDATE chatkit_sessions
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM updated;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE chatkit_sessions IS
  'Stores ChatKit session data for authenticated users';

COMMENT ON COLUMN chatkit_sessions.clerk_user_id IS
  'Clerk user ID from the users table';

COMMENT ON COLUMN chatkit_sessions.device_id IS
  'Unique identifier for the ChatKit device';

COMMENT ON COLUMN chatkit_sessions.workflow_id IS
  'ChatKit workflow ID for this session';

COMMENT ON COLUMN chatkit_sessions.session_token IS
  'Unique session token (UUID) for authentication';

COMMENT ON COLUMN chatkit_sessions.status IS
  'Session status: active, expired, or revoked';

COMMENT ON COLUMN chatkit_sessions.expires_at IS
  'Timestamp when the session expires';

COMMENT ON COLUMN chatkit_sessions.metadata IS
  'Optional metadata stored as JSON';

COMMENT ON COLUMN chatkit_sessions.last_activity_at IS
  'Timestamp of last session activity';
