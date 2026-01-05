-- ============================================================================
-- Drop ChatKit Sessions Table Migration
-- ============================================================================
-- Description: Drops the chatkit_sessions table as ChatKit is no longer used
--              in the project. Chat sessions are now tracked in chat_sessions
--              table instead.
-- Created: 2025-01-XX
-- Author: Auto (AI Assistant)
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS set_chatkit_sessions_updated_at ON chatkit_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS update_chatkit_sessions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_chatkit_sessions() CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS idx_chatkit_sessions_user_status;
DROP INDEX IF EXISTS idx_chatkit_sessions_token;
DROP INDEX IF EXISTS idx_chatkit_sessions_device;
DROP INDEX IF EXISTS idx_chatkit_sessions_expires_at;

-- Drop table (this will also drop RLS policies)
DROP TABLE IF EXISTS chatkit_sessions CASCADE;

-- Note: We keep the session_status enum in case it's used elsewhere
-- If you're sure it's not used, you can drop it with:
-- DROP TYPE IF EXISTS session_status CASCADE;

COMMENT ON SCHEMA public IS
  'ChatKit sessions table has been removed. Use chat_sessions table instead for tracking chat conversation sessions tied to trip requests, RFQs, and proposals.';
