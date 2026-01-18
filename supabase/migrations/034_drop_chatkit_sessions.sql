-- ============================================================================
-- Drop ChatKit Sessions Table (Final Cleanup)
-- ============================================================================
-- Description: Removes the chatkit_sessions table and related objects.
--              ChatKit is no longer used - chat is handled via messages table.
-- Created: 2026-01-18
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS set_chatkit_sessions_updated_at ON chatkit_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS update_chatkit_sessions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_chatkit_sessions() CASCADE;

-- Drop indexes (will be dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS idx_chatkit_sessions_user_status;
DROP INDEX IF EXISTS idx_chatkit_sessions_token;
DROP INDEX IF EXISTS idx_chatkit_sessions_device;
DROP INDEX IF EXISTS idx_chatkit_sessions_expires_at;

-- Drop table (this will also drop RLS policies)
DROP TABLE IF EXISTS chatkit_sessions CASCADE;

-- Drop the session_status enum if it exists and is not used elsewhere
DO $$
BEGIN
  -- Check if session_status is used by any other table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE udt_name = 'session_status'
    AND table_name != 'chatkit_sessions'
  ) THEN
    DROP TYPE IF EXISTS session_status CASCADE;
  END IF;
END $$;
