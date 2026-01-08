-- Migration: Add conversation_type to chat_sessions
-- Purpose: Support lazy database creation and distinct UI variants for chat sidebar
--
-- Two conversation types:
-- 1. 'flight_request' - Tied to tripID/RFQ (80% of use cases), shows FlightRequestCard
-- 2. 'general' - Pipeline discussions without specific trip (20%), shows GeneralChatCard

-- Add conversation_type column to chat_sessions
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'general'
CHECK (conversation_type IN ('flight_request', 'general'));

-- Add comment for documentation
COMMENT ON COLUMN chat_sessions.conversation_type IS 'UI variant: flight_request (FlightRequestCard) or general (GeneralChatCard)';

-- Create index for filtering by conversation type and status
CREATE INDEX IF NOT EXISTS idx_chat_sessions_conversation_type
ON chat_sessions(conversation_type, status);

-- Update existing sessions that have trip data to be 'flight_request'
UPDATE chat_sessions
SET conversation_type = 'flight_request'
WHERE (avinode_trip_id IS NOT NULL OR avinode_rfp_id IS NOT NULL OR request_id IS NOT NULL)
  AND conversation_type = 'general';

-- Clean up existing blank sessions (0 messages, no trip data)
-- These are orphaned sessions created by eager initialization
DELETE FROM chat_sessions
WHERE message_count = 0
  AND avinode_trip_id IS NULL
  AND avinode_rfp_id IS NULL
  AND request_id IS NULL;

-- Log the cleanup
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % blank chat sessions', deleted_count;
END $$;
