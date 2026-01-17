-- JetVision AI Assistant - Schema Consolidation Phase 3
-- Migration: 032_consolidate_schema_triggers.sql
-- Description: Add triggers and functions for maintaining request stats
--              when messages are inserted/deleted
-- Created: 2025-01-16

-- ============================================================================
-- FUNCTION: update_request_on_message_insert
-- Updates request stats when a new message is inserted
-- ============================================================================

CREATE OR REPLACE FUNCTION update_request_on_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if message has a request_id
  IF NEW.request_id IS NOT NULL THEN
    -- Update request with new message info
    UPDATE requests
    SET
      last_message_at = NEW.created_at,
      last_message_by = COALESCE(NEW.sender_iso_agent_id, NEW.sender_operator_id),
      message_count = message_count + 1,
      last_activity_at = NOW(),
      updated_at = NOW(),
      -- Increment appropriate unread count
      unread_count_operator = CASE
        WHEN NEW.sender_type IN ('iso_agent', 'ai_assistant') THEN unread_count_operator + 1
        ELSE unread_count_operator
      END,
      unread_count_iso = CASE
        WHEN NEW.sender_type = 'operator' THEN unread_count_iso + 1
        ELSE unread_count_iso
      END
    WHERE id = NEW.request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: update_request_on_message_delete
-- Updates request stats when a message is soft-deleted
-- ============================================================================

CREATE OR REPLACE FUNCTION update_request_on_message_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if message has a request_id and is being soft-deleted
  IF NEW.request_id IS NOT NULL AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE requests
    SET
      message_count = GREATEST(message_count - 1, 0),
      updated_at = NOW()
    WHERE id = NEW.request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: trigger_update_request_on_message_insert
-- Fires after inserting a new message
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_request_on_message_insert ON messages;
CREATE TRIGGER trigger_update_request_on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_request_on_message_insert();

-- ============================================================================
-- TRIGGER: trigger_update_request_on_message_delete
-- Fires when a message is soft-deleted (deleted_at changes from NULL)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_request_on_message_delete ON messages;
CREATE TRIGGER trigger_update_request_on_message_delete
  AFTER UPDATE OF deleted_at ON messages
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION update_request_on_message_delete();

-- ============================================================================
-- FUNCTION: mark_request_messages_read
-- Marks all messages as read for a given request and user type
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_request_messages_read(
  p_request_id UUID,
  p_reader_type TEXT,  -- 'iso' or 'operator'
  p_reader_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Reset unread count for the reader type
  IF p_reader_type = 'iso' THEN
    UPDATE requests
    SET unread_count_iso = 0
    WHERE id = p_request_id;
  ELSIF p_reader_type = 'operator' THEN
    UPDATE requests
    SET unread_count_operator = 0
    WHERE id = p_request_id;
  END IF;

  -- Update message read_by array (if not already read by this user)
  UPDATE messages
  SET read_by = COALESCE(read_by, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'user_id', p_reader_id,
      'user_type', p_reader_type,
      'read_at', NOW()
    )
  )
  WHERE request_id = p_request_id
    AND deleted_at IS NULL
    AND NOT (COALESCE(read_by, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('user_id', p_reader_id)));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_request_messages_by_quote
-- Returns messages grouped by quote_id for operator threading
-- ============================================================================

CREATE OR REPLACE FUNCTION get_request_messages_by_quote(p_request_id UUID)
RETURNS TABLE (
  quote_id UUID,
  operator_name TEXT,
  message_count BIGINT,
  last_message_at TIMESTAMPTZ,
  has_unread BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.quote_id,
    COALESCE(q.operator_name, 'General') as operator_name,
    COUNT(*) as message_count,
    MAX(m.created_at) as last_message_at,
    EXISTS (
      SELECT 1 FROM messages m2
      WHERE m2.request_id = p_request_id
        AND m2.quote_id IS NOT DISTINCT FROM m.quote_id
        AND m2.sender_type = 'operator'
        AND m2.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(m2.read_by, '[]'::jsonb)) as r
          WHERE (r->>'user_type')::TEXT = 'iso'
        )
    ) as has_unread
  FROM messages m
  LEFT JOIN quotes q ON m.quote_id = q.id
  WHERE m.request_id = p_request_id
    AND m.deleted_at IS NULL
  GROUP BY m.quote_id, q.operator_name
  ORDER BY last_message_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_request_operator_threads
-- Returns operator thread summary for a request
-- ============================================================================

CREATE OR REPLACE FUNCTION get_request_operator_threads(p_request_id UUID)
RETURNS TABLE (
  quote_id UUID,
  operator_id TEXT,
  operator_name TEXT,
  aircraft_type TEXT,
  total_price DECIMAL,
  currency TEXT,
  message_count BIGINT,
  last_message_at TIMESTAMPTZ,
  last_message_content TEXT,
  has_unread BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id as quote_id,
    q.operator_id,
    q.operator_name,
    q.aircraft_type,
    q.total_price,
    COALESCE(q.metadata->>'currency', 'USD')::TEXT as currency,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at,
    (
      SELECT content FROM messages m2
      WHERE m2.quote_id = q.id
        AND m2.deleted_at IS NULL
      ORDER BY m2.created_at DESC
      LIMIT 1
    ) as last_message_content,
    EXISTS (
      SELECT 1 FROM messages m2
      WHERE m2.quote_id = q.id
        AND m2.sender_type = 'operator'
        AND m2.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(m2.read_by, '[]'::jsonb)) as r
          WHERE (r->>'user_type')::TEXT = 'iso'
        )
    ) as has_unread
  FROM quotes q
  LEFT JOIN messages m ON m.quote_id = q.id AND m.deleted_at IS NULL
  WHERE q.request_id = p_request_id
  GROUP BY q.id, q.operator_id, q.operator_name, q.aircraft_type, q.total_price, q.metadata
  ORDER BY last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: update_request_activity
-- Updates last_activity_at for a request (called from application code)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_request_activity(p_request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE requests
  SET
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: complete_request_session
-- Marks a request session as completed
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_request_session(p_request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE requests
  SET
    session_status = 'completed',
    session_ended_at = NOW(),
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: archive_old_request_sessions
-- Archives sessions older than specified days
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_old_request_sessions(p_days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE requests
  SET
    session_status = 'archived',
    updated_at = NOW()
  WHERE session_status IN ('completed', 'paused')
    AND last_activity_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION update_request_on_message_insert() IS 'Trigger function to update request stats when a message is inserted';
COMMENT ON FUNCTION update_request_on_message_delete() IS 'Trigger function to update request stats when a message is soft-deleted';
COMMENT ON FUNCTION mark_request_messages_read(UUID, TEXT, UUID) IS 'Mark all messages in a request as read for a user';
COMMENT ON FUNCTION get_request_messages_by_quote(UUID) IS 'Get messages grouped by quote_id for operator threading';
COMMENT ON FUNCTION get_request_operator_threads(UUID) IS 'Get operator thread summaries for a request';
COMMENT ON FUNCTION update_request_activity(UUID) IS 'Update last_activity_at timestamp for a request';
COMMENT ON FUNCTION complete_request_session(UUID) IS 'Mark a request session as completed';
COMMENT ON FUNCTION archive_old_request_sessions(INTEGER) IS 'Archive request sessions older than N days';
