-- JetVision AI Assistant - LLM Configuration
-- Migration: 022_llm_config.sql
-- Description: LLM provider configuration with encrypted API key storage
-- Created: 2025-01-XX

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
  
  -- Constraints
  CONSTRAINT single_default CHECK (
    -- Only one default config per provider
    (is_default = false) OR (
      is_default = true AND NOT EXISTS (
        SELECT 1 FROM llm_config
        WHERE provider = llm_config.provider
        AND is_default = true
        AND id != llm_config.id
      )
    )
  )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_llm_config_provider ON llm_config(provider);
CREATE INDEX IF NOT EXISTS idx_llm_config_is_active ON llm_config(is_active);
CREATE INDEX IF NOT EXISTS idx_llm_config_is_default ON llm_config(is_default);
CREATE INDEX IF NOT EXISTS idx_llm_config_created_by ON llm_config(created_by);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE llm_config ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
  clerk_user_id TEXT;
BEGIN
  -- Get Clerk user ID from JWT
  clerk_user_id := (auth.jwt() ->> 'sub');
  
  IF clerk_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user role from users table
  SELECT role::TEXT INTO current_user_role
  FROM users
  WHERE clerk_user_id = is_admin_user.clerk_user_id
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

