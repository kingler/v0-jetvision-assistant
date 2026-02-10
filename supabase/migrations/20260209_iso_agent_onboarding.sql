-- =============================================================================
-- Migration: ISO Agent Onboarding Infrastructure
-- Description: Adds onboarding status tracking, employment contract storage,
--              and cryptographic token-based contract review.
-- Depends on: 036_iso_agents_commission_tracking.sql
-- =============================================================================

-- Onboarding status enum
-- State machine: pending -> contract_sent -> contract_signed -> completed
CREATE TYPE onboarding_status AS ENUM (
  'pending',           -- Just signed up, no onboarding data yet
  'contract_sent',     -- Profile submitted, contract PDF generated and emailed
  'contract_signed',   -- Digital signature captured
  'completed'          -- Fully onboarded, app access granted
);

-- Add onboarding columns to iso_agents
ALTER TABLE iso_agents
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS onboarding_status onboarding_status DEFAULT 'pending';

-- Keep full_name in sync when first/last change
CREATE OR REPLACE FUNCTION compute_full_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
    NEW.full_name := TRIM(NEW.first_name || ' ' || NEW.last_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_full_name
  BEFORE INSERT OR UPDATE OF first_name, last_name
  ON iso_agents
  FOR EACH ROW
  EXECUTE FUNCTION compute_full_name();

-- Grandfather existing active agents as completed
UPDATE iso_agents
SET onboarding_status = 'completed'
WHERE is_active = true AND onboarding_status = 'pending';

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_iso_agents_onboarding_status
  ON iso_agents(onboarding_status);

-- =============================================================================
-- Onboarding Contracts (separate from flight charter contracts)
-- =============================================================================

CREATE TABLE onboarding_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  pdf_storage_path TEXT NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
  signed_at TIMESTAMPTZ,
  signed_name TEXT,
  signed_ip TEXT,
  signed_user_agent TEXT,
  acknowledgment_terms BOOLEAN DEFAULT false,
  acknowledgment_disclosures BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_contracts_agent
  ON onboarding_contracts(agent_id);

-- RLS: agents can read their own contract, only service role can insert/update
ALTER TABLE onboarding_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own contracts"
  ON onboarding_contracts FOR SELECT
  USING (agent_id IN (
    SELECT id FROM iso_agents WHERE clerk_user_id = auth.uid()::TEXT
  ));

CREATE POLICY "Service role manages contracts"
  ON onboarding_contracts FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- Contract Review Tokens
-- =============================================================================

CREATE TABLE contract_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES onboarding_contracts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,       -- crypto.randomBytes(32).toString('hex')
  email TEXT NOT NULL,              -- Bound to agent email (anti-phishing)
  expires_at TIMESTAMPTZ NOT NULL,  -- 72 hours from creation
  used_at TIMESTAMPTZ,             -- NULL until used (single-use)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_tokens_token ON contract_tokens(token);
CREATE INDEX idx_contract_tokens_expires ON contract_tokens(expires_at);

-- RLS: only service role interacts with tokens
ALTER TABLE contract_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages tokens"
  ON contract_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE onboarding_contracts IS 'Employment commission contracts for ISO agent onboarding. Separate from flight charter contracts.';
COMMENT ON TABLE contract_tokens IS 'Cryptographic tokens for secure contract review links sent via email.';
COMMENT ON COLUMN contract_tokens.token IS '256-bit hex token: crypto.randomBytes(32).toString(''hex'')';
COMMENT ON COLUMN contract_tokens.email IS 'Must match the agent email — prevents token forwarding/phishing.';
