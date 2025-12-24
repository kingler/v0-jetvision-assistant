-- JetVision AI Assistant - LLM Configuration Unique Default Index
-- Migration: 023_llm_config_unique_default_index.sql
-- Description: Add unique partial index to prevent race conditions when setting default configs
-- Created: 2025-12-23

-- ============================================================================
-- UNIQUE PARTIAL INDEX
-- Description: Ensures only one default config per provider at the database level
-- This prevents race conditions where two concurrent requests could both become default
-- ============================================================================

-- Create unique partial index on (provider) where is_default = true
-- This guarantees atomicity at the database level, preventing duplicate defaults
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_config_unique_default_per_provider
  ON llm_config(provider)
  WHERE is_default = true;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_llm_config_unique_default_per_provider IS 
  'Ensures only one default LLM configuration per provider. Prevents race conditions when multiple requests try to set default simultaneously.';

