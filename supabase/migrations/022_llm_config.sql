-- JetVision AI Assistant - LLM Configuration
-- Migration: 022_llm_config.sql
-- Description: LLM provider configuration with encrypted API key storage
-- Created: 2025-12-23

-- ============================================================================
-- TABLE: llm_config
-- Description: Stores LLM provider configuration with encrypted API keys
-- Access: Admin-only via RLS policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS llm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider identification
  provider TEXT NOT NULL DEFAULT 'openai',
  CHECK (provider IN ('openai', 'anthropic', 'google', 'azure')),
  
  -- Provider-specific settings
  provider_name TEXT NOT NULL DEFAULT 'OpenAI',
  
  -- API Key (encrypted, stored as TEXT to accommodate encrypted format)
  -- Format: "encrypted:{iv}:{authTag}:{encryptedData}"
  api_key_encrypted TEXT NOT NULL,
  
  -- Model configuration
  default_model TEXT NOT NULL DEFAULT 'gpt-4',
  available_models TEXT[] DEFAULT ARRAY['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']::TEXT[],
  
  -- Model parameters
  default_temperature DECIMAL(3, 2) DEFAULT 0.7,
  CHECK (default_temperature >= 0 AND default_temperature <= 2),
  
  default_max_tokens INTEGER DEFAULT 8192,
  CHECK (default_max_tokens > 0 AND default_max_tokens <= 256000),
  
  default_top_p DECIMAL(3, 2) DEFAULT 1.0,
  CHECK (default_top_p >= 0 AND default_top_p <= 1),
  
  default_frequency_penalty DECIMAL(3, 2) DEFAULT 0.0,
  CHECK (default_frequency_penalty >= -2 AND default_frequency_penalty <= 2),
  
  default_presence_penalty DECIMAL(3, 2) DEFAULT 0.0,
  CHECK (default_presence_penalty >= -2 AND default_presence_penalty <= 2),
  
  -- Organization ID (optional, for OpenAI)
  organization_id TEXT,
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Configuration metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_by TEXT, -- Clerk user ID of admin who created this config
  updated_by TEXT, -- Clerk user ID of admin who last updated this config
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Note: Single default per provider is enforced via trigger (see below)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_llm_config_provider ON llm_config(provider);
CREATE INDEX IF NOT EXISTS idx_llm_config_is_active ON llm_config(is_active);
CREATE INDEX IF NOT EXISTS idx_llm_config_is_default ON llm_config(is_default);
CREATE INDEX IF NOT EXISTS idx_llm_config_created_by ON llm_config(created_by);

-- Unique partial index to enforce single default per provider at the database level
-- This provides DB-level prevention as a backup to the trigger-based approach
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_config_provider_default 
  ON llm_config(provider) 
  WHERE is_default = true;

-- ============================================================================
-- SINGLE DEFAULT ENFORCEMENT (Trigger-based approach with advisory locks)
-- ============================================================================
-- PostgreSQL doesn't allow subqueries in CHECK constraints, so we use a trigger
-- to enforce that only one config per provider can be marked as default.
-- 
-- Deadlock Prevention:
-- Uses pg_advisory_xact_lock with a stable hash of the provider to serialize
-- concurrent updates for the same provider. This prevents deadlocks when two
-- transactions concurrently set different configs as default for the same provider.
-- The lock is automatically released when the transaction commits or rolls back.

CREATE OR REPLACE FUNCTION enforce_single_default_llm_config()
RETURNS TRIGGER AS $$
DECLARE
  -- Generate a stable hash of the provider for advisory lock key
  -- Using hashtext() which provides a stable integer hash
  -- We use a namespace prefix (12345) to avoid conflicts with other advisory locks
  lock_key BIGINT;
BEGIN
  -- When setting a config as default, unset any existing default for same provider
  IF NEW.is_default = true THEN
    -- Generate stable hash of provider for advisory lock key
    -- Using hashtext() which returns a stable integer hash value
    -- Prefix with namespace to avoid conflicts (12345 is arbitrary but consistent)
    lock_key := 12345::BIGINT + ABS(hashtext(NEW.provider));
    
    -- Acquire transactional advisory lock for this provider
    -- This serializes all updates for the same provider, preventing deadlocks
    -- The lock is automatically released when the transaction commits/rolls back
    PERFORM pg_advisory_xact_lock(lock_key);
    
    -- Now safely update other configs for this provider
    -- The lock ensures only one transaction can do this at a time per provider
    UPDATE llm_config
    SET is_default = false
    WHERE provider = NEW.provider
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_default_llm_config_trigger
  BEFORE INSERT OR UPDATE ON llm_config
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_llm_config();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE llm_config ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
-- Security: Sets explicit search_path to prevent search_path injection attacks
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  clerk_user_id TEXT;
BEGIN
  -- Set safe search_path to prevent search_path injection
  -- Only allow resolution from pg_catalog (built-ins) and public schema
  SET LOCAL search_path = pg_catalog, public;
  
  -- Get Clerk user ID from JWT (auth schema is Supabase-managed)
  clerk_user_id := (auth.jwt() ->> 'sub');
  
  IF clerk_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user role from iso_agents table (explicitly qualified with public schema)
  SELECT role::TEXT INTO current_user_role
  FROM public.iso_agents
  WHERE public.iso_agents.clerk_user_id = clerk_user_id
  LIMIT 1;
  
  RETURN current_user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin-only SELECT policy
CREATE POLICY "Admins can view LLM configuration"
  ON llm_config FOR SELECT
  USING (is_admin_user());

-- Admin-only INSERT policy
CREATE POLICY "Admins can create LLM configuration"
  ON llm_config FOR INSERT
  WITH CHECK (is_admin_user());

-- Admin-only UPDATE policy
CREATE POLICY "Admins can update LLM configuration"
  ON llm_config FOR UPDATE
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Admin-only DELETE policy
CREATE POLICY "Admins can delete LLM configuration"
  ON llm_config FOR DELETE
  USING (is_admin_user());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_llm_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER llm_config_updated_at
  BEFORE UPDATE ON llm_config
  FOR EACH ROW
  EXECUTE FUNCTION update_llm_config_updated_at();

-- ============================================================================
-- INITIAL DEFAULT CONFIGURATION
-- ============================================================================

-- Note: This will be populated via API with encrypted key
-- The default configuration is set via application logic

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE llm_config IS 'LLM provider configuration with encrypted API keys (admin-only access)';
COMMENT ON COLUMN llm_config.api_key_encrypted IS 'Encrypted API key in format: "encrypted:{iv}:{authTag}:{encryptedData}"';
COMMENT ON COLUMN llm_config.is_default IS 'Indicates if this is the default LLM configuration for the system';
COMMENT ON COLUMN llm_config.created_by IS 'Clerk user ID of admin who created this configuration';
COMMENT ON COLUMN llm_config.updated_by IS 'Clerk user ID of admin who last updated this configuration';

