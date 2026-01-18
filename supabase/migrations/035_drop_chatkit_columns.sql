-- ============================================================================
-- Drop ChatKit Columns (Final Cleanup)
-- ============================================================================
-- Description: Removes chatkit_thread_id and chatkit_message_id columns
--              from requests and messages tables. ChatKit is no longer used.
-- Created: 2026-01-18
-- ============================================================================

-- Drop chatkit_thread_id from requests
ALTER TABLE requests DROP COLUMN IF EXISTS chatkit_thread_id;

-- Drop chatkit_message_id from messages
ALTER TABLE messages DROP COLUMN IF EXISTS chatkit_message_id;

-- Drop any indexes on these columns
DROP INDEX IF EXISTS idx_requests_chatkit_thread;
DROP INDEX IF EXISTS idx_messages_chatkit_message;
