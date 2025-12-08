-- JetVision AI Assistant - Avinode Webhook Events
-- Migration: 014_avinode_webhook_events.sql
-- Description: Store and process Avinode webhook events
-- Created: 2025-12-08

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Avinode webhook event types
CREATE TYPE avinode_event_type AS ENUM (
  -- RFQ events
  'rfq_received',       -- New RFQ received from buyer
  'rfq_updated',        -- RFQ details updated
  'rfq_cancelled',      -- RFQ cancelled by buyer

  -- Quote events
  'quote_received',     -- Quote received from operator (when acting as buyer)
  'quote_updated',      -- Quote details updated
  'quote_accepted',     -- Quote was accepted
  'quote_rejected',     -- Quote was rejected
  'quote_expired',      -- Quote has expired

  -- Message events
  'message_received',   -- Chat message from other party

  -- Booking events
  'booking_confirmed',  -- Booking was confirmed
  'booking_cancelled',  -- Booking was cancelled
  'booking_updated',    -- Booking details changed

  -- Trip events
  'trip_created',       -- New trip created in Avinode
  'trip_updated',       -- Trip details updated
  'trip_cancelled'      -- Trip was cancelled
);

-- Webhook processing status
CREATE TYPE webhook_processing_status AS ENUM (
  'pending',            -- Waiting to be processed
  'processing',         -- Currently being processed
  'completed',          -- Successfully processed
  'failed',             -- Processing failed (will retry)
  'skipped',            -- Skipped (e.g., duplicate event)
  'dead_letter'         -- Failed after max retries
);

-- ============================================================================
-- TABLE: avinode_webhook_events
-- Description: Stores Avinode webhook events for processing and auditing
-- ============================================================================

CREATE TABLE avinode_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identification
  event_type avinode_event_type NOT NULL,
  avinode_event_id TEXT UNIQUE NOT NULL,         -- Avinode's unique event ID
  avinode_timestamp TIMESTAMPTZ,                  -- When Avinode generated the event

  -- Related entities (populated during processing)
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  operator_profile_id UUID REFERENCES operator_profiles(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  -- Avinode references
  avinode_rfp_id TEXT,
  avinode_quote_id TEXT,
  avinode_trip_id TEXT,
  avinode_thread_id TEXT,

  -- Payload
  raw_payload JSONB NOT NULL,                    -- Original webhook payload
  parsed_data JSONB,                             -- Parsed/normalized data

  -- Processing status
  processing_status webhook_processing_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,

  -- Error handling
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  max_retries INTEGER DEFAULT 5,

  -- Webhook verification
  signature_verified BOOLEAN DEFAULT false,
  webhook_secret_version TEXT,

  -- Metadata
  source_ip TEXT,
  user_agent TEXT,
  headers JSONB DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0),
  CONSTRAINT valid_max_retries CHECK (max_retries >= 0)
);

-- Indexes for processing queue
CREATE INDEX idx_webhook_events_pending ON avinode_webhook_events(processing_status, received_at)
  WHERE processing_status = 'pending';
CREATE INDEX idx_webhook_events_failed_retry ON avinode_webhook_events(processing_status, next_retry_at)
  WHERE processing_status = 'failed' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_events_type ON avinode_webhook_events(event_type);
CREATE INDEX idx_webhook_events_avinode_event ON avinode_webhook_events(avinode_event_id);
CREATE INDEX idx_webhook_events_received ON avinode_webhook_events(received_at DESC);

-- Indexes for related entities
CREATE INDEX idx_webhook_events_request ON avinode_webhook_events(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_webhook_events_quote ON avinode_webhook_events(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX idx_webhook_events_conversation ON avinode_webhook_events(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_webhook_events_operator ON avinode_webhook_events(operator_profile_id) WHERE operator_profile_id IS NOT NULL;

-- Indexes for Avinode references
CREATE INDEX idx_webhook_events_avinode_rfp ON avinode_webhook_events(avinode_rfp_id) WHERE avinode_rfp_id IS NOT NULL;
CREATE INDEX idx_webhook_events_avinode_quote ON avinode_webhook_events(avinode_quote_id) WHERE avinode_quote_id IS NOT NULL;
CREATE INDEX idx_webhook_events_avinode_trip ON avinode_webhook_events(avinode_trip_id) WHERE avinode_trip_id IS NOT NULL;

-- Comments
COMMENT ON TABLE avinode_webhook_events IS 'Avinode webhook events for processing and audit trail';
COMMENT ON COLUMN avinode_webhook_events.avinode_event_id IS 'Unique event ID from Avinode (for deduplication)';
COMMENT ON COLUMN avinode_webhook_events.avinode_timestamp IS 'Timestamp when Avinode generated the event';
COMMENT ON COLUMN avinode_webhook_events.raw_payload IS 'Original webhook payload as received';
COMMENT ON COLUMN avinode_webhook_events.parsed_data IS 'Normalized data after processing';
COMMENT ON COLUMN avinode_webhook_events.processing_status IS 'Current status of event processing';
COMMENT ON COLUMN avinode_webhook_events.processing_duration_ms IS 'How long processing took in milliseconds';
COMMENT ON COLUMN avinode_webhook_events.retry_count IS 'Number of processing attempts';
COMMENT ON COLUMN avinode_webhook_events.next_retry_at IS 'When to retry if processing failed';
COMMENT ON COLUMN avinode_webhook_events.signature_verified IS 'Whether webhook signature was verified';
COMMENT ON COLUMN avinode_webhook_events.received_at IS 'When JetVision received the webhook';

-- ============================================================================
-- FUNCTION: Calculate next retry time with exponential backoff
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_webhook_retry_time(retry_count INTEGER)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- Exponential backoff: 1min, 2min, 4min, 8min, 16min
  RETURN NOW() + (POWER(2, LEAST(retry_count, 4)) || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: Mark webhook event as processing
-- ============================================================================

CREATE OR REPLACE FUNCTION claim_webhook_event(event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  claimed BOOLEAN;
BEGIN
  UPDATE avinode_webhook_events
  SET
    processing_status = 'processing',
    processed_at = NOW()
  WHERE id = event_id
    AND processing_status IN ('pending', 'failed')
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  RETURNING TRUE INTO claimed;

  RETURN COALESCE(claimed, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Mark webhook event as completed
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_webhook_event(
  event_id UUID,
  p_request_id UUID DEFAULT NULL,
  p_quote_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_message_id UUID DEFAULT NULL,
  p_parsed_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  start_time TIMESTAMPTZ;
BEGIN
  SELECT processed_at INTO start_time
  FROM avinode_webhook_events
  WHERE id = event_id;

  UPDATE avinode_webhook_events
  SET
    processing_status = 'completed',
    processing_duration_ms = EXTRACT(MILLISECONDS FROM (NOW() - start_time))::INTEGER,
    request_id = COALESCE(p_request_id, request_id),
    quote_id = COALESCE(p_quote_id, quote_id),
    conversation_id = COALESCE(p_conversation_id, conversation_id),
    message_id = COALESCE(p_message_id, message_id),
    parsed_data = COALESCE(p_parsed_data, parsed_data)
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Mark webhook event as failed
-- ============================================================================

CREATE OR REPLACE FUNCTION fail_webhook_event(
  event_id UUID,
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  current_retry_count INTEGER;
  current_max_retries INTEGER;
BEGIN
  SELECT retry_count, max_retries INTO current_retry_count, current_max_retries
  FROM avinode_webhook_events
  WHERE id = event_id;

  IF current_retry_count >= current_max_retries THEN
    -- Move to dead letter queue
    UPDATE avinode_webhook_events
    SET
      processing_status = 'dead_letter',
      error_message = p_error_message,
      error_stack = p_error_stack
    WHERE id = event_id;
  ELSE
    -- Schedule retry with exponential backoff
    UPDATE avinode_webhook_events
    SET
      processing_status = 'failed',
      error_message = p_error_message,
      error_stack = p_error_stack,
      retry_count = retry_count + 1,
      next_retry_at = calculate_webhook_retry_time(retry_count + 1)
    WHERE id = event_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Pending webhook events for processing
-- ============================================================================

CREATE VIEW pending_webhook_events AS
SELECT *
FROM avinode_webhook_events
WHERE processing_status = 'pending'
   OR (processing_status = 'failed' AND next_retry_at <= NOW())
ORDER BY received_at ASC;

COMMENT ON VIEW pending_webhook_events IS 'Webhook events ready for processing';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON avinode_webhook_events TO postgres, service_role;
GRANT SELECT ON avinode_webhook_events TO authenticated;
-- anon should not have access to webhook events
GRANT SELECT ON pending_webhook_events TO postgres, service_role;
