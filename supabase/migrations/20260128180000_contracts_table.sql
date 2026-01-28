-- ============================================================================
-- Migration: 040_contracts_table.sql
-- Description: Create contracts table for flight booking agreements
-- Date: 2026-01-28
-- ============================================================================

-- Contract status enum
-- Tracks the lifecycle of a contract from creation to completion
CREATE TYPE contract_status AS ENUM (
  'draft',           -- Contract created but not sent to client
  'sent',            -- Contract sent to client, awaiting signature
  'viewed',          -- Client has opened/viewed the contract
  'signed',          -- Client has signed the contract
  'payment_pending', -- Contract signed, awaiting payment
  'paid',            -- Payment has been received
  'completed',       -- Contract fully executed (signed + paid)
  'cancelled',       -- Contract cancelled by either party
  'expired'          -- Quote/contract expired before signing
);

-- Main contracts table
-- Stores flight charter service agreements between Jetvision and clients
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- =========================================================================
  -- Foreign Keys
  -- =========================================================================
  -- Link to the original flight request
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  -- Link to the proposal (if contract was generated from a proposal)
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  -- Link to the specific quote being contracted
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  -- The ISO agent (sales rep) who created the contract
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  -- Link to the client profile (if exists)
  client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL,

  -- =========================================================================
  -- Contract Identification
  -- =========================================================================
  -- Unique contract number (auto-generated: CONTRACT-2026-001)
  contract_number TEXT UNIQUE NOT NULL,
  -- Reference to the original quote number (e.g., "101225" from Avinode)
  reference_quote_number TEXT,

  -- =========================================================================
  -- Document Storage
  -- =========================================================================
  -- Generated PDF filename
  file_name TEXT,
  -- Public URL to access the PDF (Supabase storage)
  file_url TEXT,
  -- Storage path within Supabase bucket
  file_path TEXT,
  -- PDF file size in bytes
  file_size_bytes INTEGER,

  -- =========================================================================
  -- Client Information (Snapshot at Contract Time)
  -- =========================================================================
  -- Client's full name
  client_name TEXT NOT NULL,
  -- Client's email address
  client_email TEXT NOT NULL,
  -- Client's company name (optional)
  client_company TEXT,
  -- Client's phone number (optional)
  client_phone TEXT,

  -- =========================================================================
  -- Flight Details (Snapshot at Contract Time)
  -- =========================================================================
  -- Departure airport ICAO code (e.g., "KTEB")
  departure_airport TEXT NOT NULL,
  -- Arrival airport ICAO code (e.g., "KRDU")
  arrival_airport TEXT NOT NULL,
  -- Departure date
  departure_date DATE NOT NULL,
  -- Departure time (optional)
  departure_time TIME,
  -- Aircraft type/category (e.g., "Turbo prop")
  aircraft_type TEXT NOT NULL,
  -- Aircraft model (e.g., "Pilatus PC 12")
  aircraft_model TEXT,
  -- Aircraft tail/registration number
  tail_number TEXT,
  -- Number of passengers
  passengers INTEGER NOT NULL,

  -- =========================================================================
  -- Pricing (Snapshot at Contract Time)
  -- =========================================================================
  -- Base flight cost
  flight_cost DECIMAL(12,2) NOT NULL,
  -- Federal Excise Tax (typically 7.5% for US domestic)
  federal_excise_tax DECIMAL(12,2) DEFAULT 0,
  -- Domestic segment fee (per passenger per segment)
  domestic_segment_fee DECIMAL(12,2) DEFAULT 0,
  -- Subtotal before any additional fees
  subtotal DECIMAL(12,2) NOT NULL,
  -- Credit card processing fee percentage (default 5%)
  credit_card_fee_percentage DECIMAL(4,2) DEFAULT 5.0,
  -- Total contract amount
  total_amount DECIMAL(12,2) NOT NULL,
  -- Currency code (ISO 4217)
  currency TEXT DEFAULT 'USD',

  -- =========================================================================
  -- Amenities
  -- =========================================================================
  -- JSON object storing amenities (wifi, pets, smoking, galley, lavatory, etc.)
  amenities JSONB DEFAULT '{}',

  -- =========================================================================
  -- Payment Information
  -- =========================================================================
  -- Selected payment method ('wire' or 'credit_card')
  payment_method TEXT CHECK (payment_method IN ('wire', 'credit_card')),

  -- =========================================================================
  -- Status Tracking
  -- =========================================================================
  -- Current contract status
  status contract_status NOT NULL DEFAULT 'draft',
  -- Timestamps for each status transition
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  payment_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,

  -- =========================================================================
  -- Email Tracking
  -- =========================================================================
  -- Email address contract was sent to
  sent_to_email TEXT,
  -- Gmail message ID for tracking
  email_message_id TEXT,

  -- =========================================================================
  -- Signature Tracking
  -- =========================================================================
  -- Client's signature data (base64 encoded image or signature pad data)
  client_signature_data TEXT,
  -- Name as typed/signed by client
  client_signed_name TEXT,
  -- Timestamp when client signed
  client_signed_date TIMESTAMPTZ,
  -- Jetvision representative signature data
  jetvision_signature_data TEXT,
  -- Jetvision representative name
  jetvision_signed_name TEXT,
  -- Timestamp when Jetvision signed
  jetvision_signed_date TIMESTAMPTZ,

  -- =========================================================================
  -- Payment Tracking
  -- =========================================================================
  -- Wire transfer reference or credit card transaction ID
  payment_reference TEXT,
  -- Actual payment amount received
  payment_amount DECIMAL(12,2),
  -- Date payment was received
  payment_date TIMESTAMPTZ,
  -- Last 4 digits of credit card (for reference)
  cc_last_four TEXT,

  -- =========================================================================
  -- Versioning
  -- =========================================================================
  -- Contract version number (starts at 1, increments for amendments)
  version INTEGER DEFAULT 1,
  -- Reference to previous version if this is an amendment
  previous_version_id UUID REFERENCES contracts(id),

  -- =========================================================================
  -- Metadata
  -- =========================================================================
  -- Flexible JSON field for additional data
  metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Fast lookup by request
CREATE INDEX idx_contracts_request_id ON contracts(request_id);

-- Fast lookup by ISO agent
CREATE INDEX idx_contracts_iso_agent_id ON contracts(iso_agent_id);

-- Fast filtering by status
CREATE INDEX idx_contracts_status ON contracts(status);

-- Fast lookup by contract number
CREATE INDEX idx_contracts_contract_number ON contracts(contract_number);

-- Latest contracts first
CREATE INDEX idx_contracts_created_at ON contracts(created_at DESC);

-- ============================================================================
-- Functions
-- ============================================================================

-- Generate sequential contract numbers in format: CONTRACT-YYYY-NNN
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
  contract_num TEXT;
BEGIN
  -- Get current year
  year_str := TO_CHAR(NOW(), 'YYYY');

  -- Get next sequence number for this year
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(contract_number FROM 'CONTRACT-' || year_str || '-(\d+)')
        AS INTEGER
      )
    ),
    0
  ) + 1
  INTO seq_num
  FROM contracts
  WHERE contract_number LIKE 'CONTRACT-' || year_str || '-%';

  -- Format contract number with zero-padded sequence
  contract_num := 'CONTRACT-' || year_str || '-' || LPAD(seq_num::TEXT, 3, '0');

  RETURN contract_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-set contract number on insert
CREATE OR REPLACE FUNCTION trigger_set_contract_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := generate_contract_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-generate contract number on insert
CREATE TRIGGER set_contract_number
  BEFORE INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_contract_number();

-- Auto-update updated_at timestamp
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Policy: ISO agents can only access their own contracts
CREATE POLICY contracts_iso_agent_select ON contracts
  FOR SELECT
  USING (iso_agent_id = auth.uid());

CREATE POLICY contracts_iso_agent_insert ON contracts
  FOR INSERT
  WITH CHECK (iso_agent_id = auth.uid());

CREATE POLICY contracts_iso_agent_update ON contracts
  FOR UPDATE
  USING (iso_agent_id = auth.uid());

CREATE POLICY contracts_iso_agent_delete ON contracts
  FOR DELETE
  USING (iso_agent_id = auth.uid());

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE contracts IS 'Flight charter service agreements between Jetvision and clients';
COMMENT ON COLUMN contracts.contract_number IS 'Unique contract identifier in format CONTRACT-YYYY-NNN';
COMMENT ON COLUMN contracts.status IS 'Contract lifecycle status: draft → sent → viewed → signed → payment_pending → paid → completed';
COMMENT ON COLUMN contracts.amenities IS 'JSON object: {wifi: bool, pets: bool, smoking: bool, galley: bool, lavatory: bool, medical: bool}';
COMMENT ON COLUMN contracts.credit_card_fee_percentage IS 'Fee charged for credit card payments (default 5%)';
