-- Migration: 037_iso_agent_onboarding.sql
-- Purpose: Add onboarding infrastructure for ISO agent registration
-- Tables affected: iso_agents (ALTER), onboarding_contracts (CREATE), contract_tokens (CREATE)

-- =============================================================================
-- 1. ONBOARDING STATUS ENUM
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE onboarding_status AS ENUM (
    'pending',           -- Just signed up, no onboarding data yet
    'profile_complete',  -- Personal info submitted
    'contract_sent',     -- PDF generated and emailed
    'contract_signed',   -- Digital signature captured
    'completed'          -- Fully onboarded
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. ALTER iso_agents TABLE — add onboarding fields
-- =============================================================================

ALTER TABLE iso_agents
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_status onboarding_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) DEFAULT 10.00;

-- Grandfather existing active agents as 'completed'
UPDATE iso_agents
SET onboarding_status = 'completed'
WHERE is_active = true
  AND onboarding_status = 'pending';

-- Index for onboarding status queries
CREATE INDEX IF NOT EXISTS idx_iso_agents_onboarding_status
  ON iso_agents(onboarding_status);

-- =============================================================================
-- 3. ONBOARDING CONTRACTS TABLE (separate from flight contracts)
-- =============================================================================

CREATE TABLE IF NOT EXISTS onboarding_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  pdf_storage_path TEXT NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, signed
  signed_at TIMESTAMPTZ,
  signature_data TEXT,                      -- Digital signature capture
  signed_name TEXT,                         -- Typed name for signature
  signed_ip_address TEXT,                   -- IP for audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_contracts_agent
  ON onboarding_contracts(agent_id);

-- =============================================================================
-- 4. CONTRACT REVIEW TOKENS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS contract_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES onboarding_contracts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,              -- crypto.randomBytes(32).toString('hex')
  email TEXT NOT NULL,                     -- Bound to specific email (anti-phishing)
  expires_at TIMESTAMPTZ NOT NULL,         -- 72 hours from creation
  used_at TIMESTAMPTZ,                     -- NULL until used (single-use)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_tokens_token
  ON contract_tokens(token);
CREATE INDEX IF NOT EXISTS idx_contract_tokens_expires
  ON contract_tokens(expires_at);

-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE onboarding_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_tokens ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (API routes use supabaseAdmin)
CREATE POLICY "service_role_all_onboarding_contracts"
  ON onboarding_contracts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_contract_tokens"
  ON contract_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own onboarding contracts
CREATE POLICY "agents_read_own_onboarding_contracts"
  ON onboarding_contracts
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM iso_agents
      WHERE clerk_user_id = auth.uid()::text
    )
  );

-- Authenticated users can read their own contract tokens
CREATE POLICY "agents_read_own_contract_tokens"
  ON contract_tokens
  FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM iso_agents
      WHERE clerk_user_id = auth.uid()::text
    )
  );
