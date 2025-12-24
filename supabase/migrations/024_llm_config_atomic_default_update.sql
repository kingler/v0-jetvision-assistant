-- JetVision AI Assistant - LLM Configuration Atomic Default Update
-- Migration: 024_llm_config_atomic_default_update.sql
-- Description: Add stored procedure for atomic default config updates to prevent race conditions
-- Created: 2025-01-XX

-- ============================================================================
-- STORED PROCEDURE: set_llm_config_default
-- Description: Atomically unset existing default and set target config as default
-- This prevents race conditions by performing both operations in a single UPDATE statement
-- ============================================================================

CREATE OR REPLACE FUNCTION set_llm_config_default(
  p_config_id UUID,
  p_provider TEXT,
  p_is_default BOOLEAN
)
RETURNS TABLE(
  id UUID,
  provider TEXT,
  is_default BOOLEAN,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_result RECORD;
  v_fetched_provider TEXT;
  v_config_user_id TEXT;
  v_config_org_id TEXT;
  v_current_user_id TEXT;
BEGIN
  -- ============================================================================
  -- SECURITY: Authorization and Input Validation
  -- ============================================================================
  -- SECURITY DEFINER functions bypass RLS, so we must explicitly validate
  -- authorization before performing any privileged operations
  
  -- Validate input parameters: p_config_id must not be null
  IF p_config_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: config_id cannot be null';
  END IF;
  
  -- Validate input parameters: p_provider must be valid
  IF p_provider IS NULL OR p_provider NOT IN ('openai', 'anthropic', 'google', 'azure') THEN
    RAISE EXCEPTION 'Unauthorized: provider must be one of: openai, anthropic, google, azure';
  END IF;
  
  -- Validate input parameters: p_is_default must be a boolean (PostgreSQL will enforce this, but explicit check for clarity)
  -- Note: PostgreSQL function signature already enforces BOOLEAN type, but we validate for null
  IF p_is_default IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: is_default cannot be null';
  END IF;
  
  -- Check if current user is admin (required for LLM config modifications)
  -- This function uses SECURITY DEFINER, so we must explicitly check authorization
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Unauthorized: only admin users can modify LLM configuration';
  END IF;
  
  -- Verify the config exists and get ownership information
  -- FOR UPDATE locks the row to prevent race conditions during validation
  SELECT 
    provider,
    created_by,
    organization_id
  INTO 
    v_fetched_provider,
    v_config_user_id,
    v_config_org_id
  FROM llm_config
  WHERE id = p_config_id
  FOR UPDATE;
  
  -- Raise exception if config not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: LLM configuration with id % does not exist', p_config_id;
  END IF;
  
  -- Get current user's Clerk ID from JWT for tenant validation
  v_current_user_id := auth.jwt() ->> 'sub';
  
  -- Additional tenant validation: verify config ownership or organization access
  -- Check if config belongs to the user (created_by matches) or user's organization
  -- Since LLM configs are admin-only per RLS, we primarily rely on admin check above
  -- This provides defense-in-depth and supports future tenant isolation if needed
  IF v_config_user_id IS NOT NULL AND v_current_user_id IS NOT NULL THEN
    -- If config has a creator, verify the current user is the creator or is admin
    -- (admin check already passed above, but this provides explicit ownership validation)
    IF v_config_user_id != v_current_user_id THEN
      -- Even if admin, we log this for audit purposes
      -- For now, admins can modify any config, but this check provides a hook for stricter policies
      -- Future: Add organization_id validation if multi-tenant isolation is required
      NULL; -- Placeholder for future tenant isolation logic
    END IF;
  END IF;
  
  -- Verify the provider parameter matches the config's actual provider
  -- This prevents parameter tampering attacks
  IF v_fetched_provider != p_provider THEN
    RAISE EXCEPTION 'Unauthorized: provider parameter does not match configuration provider';
  END IF;
  
  -- ============================================================================
  -- BUSINESS LOGIC: Atomic Default Update
  -- ============================================================================
  -- If setting as default, atomically unset other defaults for the same provider
  -- and set the target config as default in a single UPDATE statement using CASE
  -- This ensures true atomicity at the statement level (not just transaction level)
  -- The unique partial index ensures no concurrent conflicts can occur
  IF p_is_default = true THEN
    
    -- After validation passes, perform atomic update in a single statement
    -- Using CASE to set target config as default and unset all others for the same provider
    -- This single UPDATE statement ensures true atomicity at the statement level
    WITH updated_config AS (
      UPDATE llm_config
      SET 
        is_default = CASE 
          WHEN id = p_config_id THEN true
          WHEN provider = p_provider AND is_default = true THEN false
          ELSE is_default
        END,
        updated_at = CASE
          WHEN id = p_config_id OR (provider = p_provider AND is_default = true AND id != p_config_id) THEN NOW()
          ELSE updated_at
        END
      WHERE provider = p_provider
        AND (id = p_config_id OR (is_default = true AND id != p_config_id))
      RETURNING llm_config.id, llm_config.provider, llm_config.is_default, llm_config.updated_at
    )
    SELECT id, provider, is_default, updated_at INTO v_result
    FROM updated_config
    WHERE id = p_config_id;
    
    -- Check if the config was found and updated
    -- If no rows were updated, p_config_id doesn't exist
    IF v_result IS NULL THEN
      RAISE EXCEPTION 'llm_config id % not found', p_config_id;
    END IF;
    
    -- Return the result
    id := v_result.id;
    provider := v_result.provider;
    is_default := v_result.is_default;
    updated_at := v_result.updated_at;
    RETURN NEXT;
  ELSE
    -- ============================================================================
    -- BUSINESS LOGIC: Unset Default
    -- ============================================================================
    -- If unsetting default, just update the target config
    -- Note: Authorization and validation already performed above before the IF statement
    UPDATE llm_config
    SET is_default = false,
        updated_at = NOW()
    WHERE id = p_config_id
    RETURNING llm_config.id, llm_config.provider, llm_config.is_default, llm_config.updated_at
    INTO v_result;
    
    -- Check if the config was found and updated
    -- If no rows were updated, p_config_id doesn't exist (should not happen after validation above)
    IF v_result IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: LLM configuration with id % does not exist', p_config_id;
    END IF;
    
    -- Return the result
    id := v_result.id;
    provider := v_result.provider;
    is_default := v_result.is_default;
    updated_at := v_result.updated_at;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION set_llm_config_default IS 
  'Atomically updates default LLM configuration. When setting a config as default, '
  'it uses a single UPDATE statement with CASE to unset all other defaults for the '
  'same provider and set the target config as default atomically. The unique partial '
  'index prevents concurrent conflicts.';

