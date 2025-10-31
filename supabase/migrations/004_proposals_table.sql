-- JetVision AI Assistant - Proposals Table
-- Migration: 004_proposals_table.sql
-- Description: Add proposals table for storing generated PDF proposals
-- Created: 2025-10-24

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Proposal status
CREATE TYPE proposal_status AS ENUM (
  'draft',
  'generated',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired'
);

-- ============================================================================
-- TABLE: proposals
-- Description: Generated PDF proposals linked to requests, quotes, and sales reps
-- ============================================================================

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL,

  -- Document metadata
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT, -- Storage path: proposals/{request_id}/{filename}
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',

  -- Proposal details
  proposal_number TEXT UNIQUE NOT NULL, -- e.g., "PROP-2025-001"
  title TEXT NOT NULL,
  description TEXT,
  total_amount DECIMAL(12, 2),
  margin_applied DECIMAL(12, 2),
  final_amount DECIMAL(12, 2),

  -- Status tracking
  status proposal_status NOT NULL DEFAULT 'draft',
  generated_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,

  -- Email tracking
  sent_to_email TEXT,
  sent_to_name TEXT,
  email_subject TEXT,
  email_body TEXT,
  email_message_id TEXT, -- For tracking email delivery

  -- Analytics
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  last_downloaded_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  CONSTRAINT valid_total_amount CHECK (total_amount IS NULL OR total_amount > 0),
  CONSTRAINT valid_margin CHECK (margin_applied IS NULL OR margin_applied >= 0),
  CONSTRAINT valid_final_amount CHECK (final_amount IS NULL OR final_amount > 0),
  CONSTRAINT valid_view_count CHECK (view_count >= 0),
  CONSTRAINT valid_download_count CHECK (download_count >= 0),
  CONSTRAINT valid_email CHECK (sent_to_email IS NULL OR sent_to_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_proposals_request_id ON proposals(request_id);
CREATE INDEX idx_proposals_iso_agent_id ON proposals(iso_agent_id);
CREATE INDEX idx_proposals_quote_id ON proposals(quote_id);
CREATE INDEX idx_proposals_client_profile_id ON proposals(client_profile_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX idx_proposals_sent_at ON proposals(sent_at DESC);
CREATE INDEX idx_proposals_proposal_number ON proposals(proposal_number);
CREATE UNIQUE INDEX idx_proposals_unique_number ON proposals(proposal_number);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE proposals IS 'Generated PDF proposals with links to requests, quotes, and sales reps';
COMMENT ON COLUMN proposals.proposal_number IS 'Unique proposal identifier (e.g., PROP-2025-001)';
COMMENT ON COLUMN proposals.file_url IS 'Public or signed URL to the PDF file';
COMMENT ON COLUMN proposals.file_path IS 'Storage path for the file (e.g., proposals/{request_id}/{filename})';
COMMENT ON COLUMN proposals.margin_applied IS 'Margin amount added by the ISO agent';
COMMENT ON COLUMN proposals.final_amount IS 'Total amount including margin (sent to client)';
COMMENT ON COLUMN proposals.metadata IS 'Additional proposal data (template used, generation params, etc.)';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Auto-increment proposal number
CREATE OR REPLACE FUNCTION generate_proposal_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  seq INTEGER;
  proposal_num TEXT;
BEGIN
  year := TO_CHAR(NOW(), 'YYYY');

  -- Get the highest sequence number for this year
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(proposal_number FROM 'PROP-' || year || '-(\d+)')
        AS INTEGER
      )
    ), 0
  ) + 1 INTO seq
  FROM proposals
  WHERE proposal_number LIKE 'PROP-' || year || '-%';

  -- Format: PROP-2025-001
  proposal_num := 'PROP-' || year || '-' || LPAD(seq::TEXT, 3, '0');

  RETURN proposal_num;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment view count
CREATE OR REPLACE FUNCTION increment_proposal_view()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'viewed' AND OLD.status != 'viewed' THEN
    NEW.view_count := OLD.view_count + 1;
    NEW.last_viewed_at := NOW();

    IF NEW.viewed_at IS NULL THEN
      NEW.viewed_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment view count on status change
CREATE TRIGGER increment_proposal_view_trigger
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION increment_proposal_view();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own proposals or admins can view all
CREATE POLICY "Users can view own proposals"
  ON proposals
  FOR SELECT
  USING (
    iso_agent_id = get_current_iso_agent_id()
    OR is_admin()
  );

-- INSERT: Users can create proposals for their own requests
CREATE POLICY "Users can create own proposals"
  ON proposals
  FOR INSERT
  WITH CHECK (
    iso_agent_id = get_current_iso_agent_id()
    AND EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = proposals.request_id
      AND requests.iso_agent_id = get_current_iso_agent_id()
    )
  );

-- UPDATE: Users can update their own proposals or admins can update any
CREATE POLICY "Users can update own proposals"
  ON proposals
  FOR UPDATE
  USING (
    iso_agent_id = get_current_iso_agent_id()
    OR is_admin()
  )
  WITH CHECK (
    iso_agent_id = get_current_iso_agent_id()
    OR is_admin()
  );

-- DELETE: Only admins can delete proposals (for data integrity)
CREATE POLICY "Only admins can delete proposals"
  ON proposals
  FOR DELETE
  USING (is_admin());

-- Service role bypass (for agent operations)
-- Service role has bypassrls privilege configured at project level

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON proposals TO authenticated;
GRANT ALL ON proposals TO service_role;

-- Grant usage on the generate function
GRANT EXECUTE ON FUNCTION generate_proposal_number() TO authenticated, service_role;

-- ============================================================================
-- SAMPLE DATA (Optional - comment out for production)
-- ============================================================================

-- Example proposal for completed request
INSERT INTO proposals (
  id,
  request_id,
  iso_agent_id,
  quote_id,
  client_profile_id,
  file_name,
  file_url,
  file_path,
  file_size_bytes,
  proposal_number,
  title,
  description,
  total_amount,
  margin_applied,
  final_amount,
  status,
  generated_at,
  sent_at,
  viewed_at,
  sent_to_email,
  sent_to_name,
  email_subject,
  email_body,
  view_count,
  metadata
) VALUES (
  'p1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  '01111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'PROP-2025-001-Acme-KTEB-KLAX.pdf',
  'https://sbzaevawnjlrsjsuevli.supabase.co/storage/v1/object/public/proposals/11111111-1111-1111-1111-111111111111/PROP-2025-001.pdf',
  'proposals/11111111-1111-1111-1111-111111111111/PROP-2025-001.pdf',
  524288,
  'PROP-2025-001',
  'Flight Proposal: KTEB to KLAX',
  'Private charter flight proposal for Acme Corporation',
  112000.00,
  16800.00,
  128800.00,
  'sent',
  NOW() - INTERVAL '24 hours',
  NOW() - INTERVAL '23 hours',
  NOW() - INTERVAL '22 hours',
  'bob.johnson@acmecorp.com',
  'Bob Johnson',
  'Flight Proposal: KTEB to KLAX - Gulfstream G650',
  'Dear Bob,\n\nPlease find attached your flight proposal for the requested route.\n\nBest regards,\nJohn Doe',
  3,
  '{
    "template_used": "standard_proposal_v1",
    "generated_by_agent": "agent-communication-001",
    "pdf_generator": "puppeteer",
    "generation_time_ms": 2340
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table exists
DO $$
DECLARE
  table_exists BOOLEAN;
  row_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'proposals'
  ) INTO table_exists;

  IF table_exists THEN
    SELECT COUNT(*) INTO row_count FROM proposals;
    RAISE NOTICE 'Table "proposals" created successfully with % rows', row_count;
  ELSE
    RAISE EXCEPTION 'Failed to create table "proposals"';
  END IF;
END $$;
