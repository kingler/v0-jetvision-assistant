-- JetVision AI Assistant - Extend Quotes for Webhook Processing
-- Migration: 020_extend_quotes_for_webhooks.sql
-- Description: Add columns needed for Avinode webhook quote storage
-- Created: 2025-12-13
-- Related: ONEK-130 RFP Chat Flow Pipeline

-- ============================================================================
-- EXTEND TABLE: quotes
-- Add columns for storing Avinode webhook data
-- ============================================================================

-- Add operator contact information (JSON for flexibility)
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS operator_contact JSONB DEFAULT '{}'::jsonb;

-- Add aircraft details
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS aircraft_type TEXT,
  ADD COLUMN IF NOT EXISTS aircraft_tail_number TEXT,
  ADD COLUMN IF NOT EXISTS aircraft_details JSONB DEFAULT '{}'::jsonb;

-- Add schedule information
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}'::jsonb;

-- Add availability details (for partial availability scenarios)
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb;

-- Add decline reason (for declined quotes)
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Add raw webhook storage for audit trail
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS raw_webhook_payload JSONB,
  ADD COLUMN IF NOT EXISTS raw_message_details JSONB;

-- Rename operator_message to message_content for consistency (if exists)
-- Note: Using DO block for safe column rename
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'operator_message'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'message_content'
  ) THEN
    ALTER TABLE quotes RENAME COLUMN operator_message TO message_content;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'message_content'
  ) THEN
    ALTER TABLE quotes ADD COLUMN message_content TEXT;
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for aircraft type searches
CREATE INDEX IF NOT EXISTS idx_quotes_aircraft_type
  ON quotes(aircraft_type)
  WHERE aircraft_type IS NOT NULL;

-- Index for JSONB operator_contact email search
CREATE INDEX IF NOT EXISTS idx_quotes_operator_contact_gin
  ON quotes
  USING GIN (operator_contact jsonb_path_ops);

-- Index for webhook payload search
CREATE INDEX IF NOT EXISTS idx_quotes_webhook_payload_gin
  ON quotes
  USING GIN (raw_webhook_payload jsonb_path_ops)
  WHERE raw_webhook_payload IS NOT NULL;

-- ============================================================================
-- ADD UNIQUE CONSTRAINT
-- Required for upsert on conflict handling
-- ============================================================================

-- Add unique constraint on avinode_quote_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotes_avinode_quote_id_key'
  ) THEN
    ALTER TABLE quotes
    ADD CONSTRAINT quotes_avinode_quote_id_key
    UNIQUE (avinode_quote_id);
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN quotes.operator_contact IS 'Operator contact info JSON: {email, phone, company}';
COMMENT ON COLUMN quotes.aircraft_type IS 'Aircraft category (e.g., Heavy Jet, Midsize Jet)';
COMMENT ON COLUMN quotes.aircraft_tail_number IS 'Aircraft registration/tail number';
COMMENT ON COLUMN quotes.aircraft_details IS 'Full aircraft specs JSON: {model, capacity, amenities, yearOfManufacture}';
COMMENT ON COLUMN quotes.schedule IS 'Flight schedule JSON: {departureTime, arrivalTime, flightDuration}';
COMMENT ON COLUMN quotes.availability IS 'Availability details JSON: {outbound, return, notes}';
COMMENT ON COLUMN quotes.decline_reason IS 'Reason provided when operator declines RFQ';
COMMENT ON COLUMN quotes.raw_webhook_payload IS 'Original Avinode webhook payload for audit';
COMMENT ON COLUMN quotes.raw_message_details IS 'Full message details fetched from Avinode API';
COMMENT ON COLUMN quotes.message_content IS 'Message/notes from operator with the quote';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Service role needs full access for webhook processing
GRANT ALL ON quotes TO service_role;

-- Authenticated users can view their own quotes (RLS handles row-level access)
GRANT SELECT ON quotes TO authenticated;
