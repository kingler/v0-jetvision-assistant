-- JetVision AI Assistant - ROLLBACK Migration
-- Migration: 008_rollback_to_iso_agents.sql
-- Description: EMERGENCY ROLLBACK - Reverses migrations 004-007 if needed
-- Created: 2025-10-25
-- WARNING: Only run this if migrations 004-007 failed and need to be reversed!

-- ============================================================================
-- IMPORTANT NOTICE
-- ============================================================================

-- THIS IS A ROLLBACK MIGRATION
-- Only run this if you need to revert back to the iso_agents structure
-- This will:
-- 1. Revert user roles from sales_rep back to iso_agent
-- 2. Rename users table back to iso_agents
-- 3. Rename user_id columns back to iso_agent_id
-- 4. Restore original RLS functions and policies

-- ============================================================================
-- STEP 1: REVERT RLS FUNCTIONS
-- ============================================================================

-- Drop new functions
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS is_sales_rep();
DROP FUNCTION IF EXISTS is_customer();
DROP FUNCTION IF EXISTS get_current_user_role();
DROP FUNCTION IF EXISTS owns_resource(UUID);
DROP FUNCTION IF EXISTS is_admin();

-- Restore old functions (pointing to iso_agents table)
CREATE OR REPLACE FUNCTION get_current_iso_agent_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT id
    FROM iso_agents
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION get_current_iso_agent_id() IS
  'Returns the ISO agent ID for the currently authenticated user';

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM iso_agents
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION is_admin() IS
  'Returns true if the current user has admin role';

CREATE OR REPLACE FUNCTION owns_resource(resource_agent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN resource_agent_id = get_current_iso_agent_id() OR is_admin();
END;
$$;

COMMENT ON FUNCTION owns_resource(UUID) IS
  'Returns true if the current user owns the resource or is an admin';

-- ============================================================================
-- STEP 2: REVERT FOREIGN KEY COLUMN NAMES
-- ============================================================================

-- Revert client_profiles
ALTER TABLE client_profiles
  RENAME COLUMN user_id TO iso_agent_id;

ALTER INDEX idx_client_profiles_user_id
  RENAME TO idx_client_profiles_iso_agent_id;

COMMENT ON COLUMN client_profiles.iso_agent_id IS 'Reference to the ISO agent who manages this client';

-- Revert requests
ALTER TABLE requests
  RENAME COLUMN user_id TO iso_agent_id;

ALTER INDEX idx_requests_user_id
  RENAME TO idx_requests_iso_agent_id;

COMMENT ON COLUMN requests.iso_agent_id IS 'Reference to the ISO agent who created this request';

-- ============================================================================
-- STEP 3: REVERT TABLE NAME AND STRUCTURE
-- ============================================================================

-- Remove new columns added in migration 005
ALTER TABLE users
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS timezone,
  DROP COLUMN IF EXISTS preferences,
  DROP COLUMN IF EXISTS last_login_at;

-- Drop new indexes
DROP INDEX IF EXISTS idx_users_last_login_at;
DROP INDEX IF EXISTS idx_users_phone;

-- Rename table back
ALTER TABLE users RENAME TO iso_agents;

-- Rename indexes back
ALTER INDEX idx_users_clerk_user_id RENAME TO idx_iso_agents_clerk_user_id;
ALTER INDEX idx_users_email RENAME TO idx_iso_agents_email;
ALTER INDEX idx_users_role RENAME TO idx_iso_agents_role;

-- Update trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON iso_agents;

CREATE TRIGGER update_iso_agents_updated_at
  BEFORE UPDATE ON iso_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update table comment
COMMENT ON TABLE iso_agents IS 'User profiles for ISO agents and admins, synced from Clerk';

-- ============================================================================
-- STEP 4: REVERT USER ROLES
-- ============================================================================

-- Migrate roles back (sales_rep -> iso_agent)
UPDATE iso_agents
SET role = 'iso_agent'::user_role
WHERE role = 'sales_rep'::user_role;

-- Note: We keep the new enum type with all values for safety
-- Removing enum values is complex and risky, so we leave them

-- Update role comment
COMMENT ON COLUMN iso_agents.role IS 'User role: iso_agent, admin, or operator';

-- ============================================================================
-- STEP 5: REVERT RLS POLICIES
-- ============================================================================

-- Drop policies on iso_agents (formerly users)
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON iso_agents;
DROP POLICY IF EXISTS "Only service role can insert users" ON iso_agents;
DROP POLICY IF EXISTS "Users can update own profile or admin can update any" ON iso_agents;
DROP POLICY IF EXISTS "Only admins can delete users" ON iso_agents;

-- Recreate original policies for iso_agents
CREATE POLICY "Users can view own profile or admin can view all"
  ON iso_agents
  FOR SELECT
  USING (
    clerk_user_id = auth.jwt()->>'sub'
    OR is_admin()
  );

CREATE POLICY "Only service role can insert users"
  ON iso_agents
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Users can update own profile or admin can update any"
  ON iso_agents
  FOR UPDATE
  USING (
    clerk_user_id = auth.jwt()->>'sub'
    OR is_admin()
  )
  WITH CHECK (
    clerk_user_id = auth.jwt()->>'sub'
    OR is_admin()
  );

CREATE POLICY "Only admins can delete users"
  ON iso_agents
  FOR DELETE
  USING (is_admin());

-- Drop policies on client_profiles
DROP POLICY IF EXISTS "Users can view own client profiles" ON client_profiles;
DROP POLICY IF EXISTS "Users can create own client profiles" ON client_profiles;
DROP POLICY IF EXISTS "Users can update own client profiles" ON client_profiles;
DROP POLICY IF EXISTS "Users can delete own client profiles" ON client_profiles;

-- Recreate original policies for client_profiles
CREATE POLICY "Users can view own client profiles"
  ON client_profiles
  FOR SELECT
  USING (owns_resource(iso_agent_id));

CREATE POLICY "Users can create own client profiles"
  ON client_profiles
  FOR INSERT
  WITH CHECK (iso_agent_id = get_current_iso_agent_id());

CREATE POLICY "Users can update own client profiles"
  ON client_profiles
  FOR UPDATE
  USING (owns_resource(iso_agent_id))
  WITH CHECK (iso_agent_id = get_current_iso_agent_id());

CREATE POLICY "Users can delete own client profiles"
  ON client_profiles
  FOR DELETE
  USING (owns_resource(iso_agent_id));

-- Drop policies on requests
DROP POLICY IF EXISTS "Users can view own requests" ON requests;
DROP POLICY IF EXISTS "Users can create own requests" ON requests;
DROP POLICY IF EXISTS "Users can update own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete own requests" ON requests;

-- Recreate original policies for requests
CREATE POLICY "Users can view own requests"
  ON requests
  FOR SELECT
  USING (owns_resource(iso_agent_id));

CREATE POLICY "Users can create own requests"
  ON requests
  FOR INSERT
  WITH CHECK (iso_agent_id = get_current_iso_agent_id());

CREATE POLICY "Users can update own requests"
  ON requests
  FOR UPDATE
  USING (owns_resource(iso_agent_id))
  WITH CHECK (iso_agent_id = get_current_iso_agent_id());

CREATE POLICY "Users can delete own requests"
  ON requests
  FOR DELETE
  USING (owns_resource(iso_agent_id));

-- Drop policies on quotes
DROP POLICY IF EXISTS "Users can view quotes for own requests" ON quotes;
DROP POLICY IF EXISTS "Users can update quotes for own requests" ON quotes;
DROP POLICY IF EXISTS "Users can delete quotes for own requests" ON quotes;

-- Recreate original policies for quotes
CREATE POLICY "Users can view quotes for own requests"
  ON quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.iso_agent_id)
    )
  );

CREATE POLICY "Users can update quotes for own requests"
  ON quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.iso_agent_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.iso_agent_id)
    )
  );

CREATE POLICY "Users can delete quotes for own requests"
  ON quotes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.iso_agent_id)
    )
  );

-- Drop policies on workflow_states
DROP POLICY IF EXISTS "Users can view workflow states for own requests" ON workflow_states;

-- Recreate original policies for workflow_states
CREATE POLICY "Users can view workflow states for own requests"
  ON workflow_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = workflow_states.request_id
      AND owns_resource(requests.iso_agent_id)
    )
  );

-- Drop policies on agent_executions
DROP POLICY IF EXISTS "Users can view execution logs for own requests" ON agent_executions;

-- Recreate original policies for agent_executions
CREATE POLICY "Users can view execution logs for own requests"
  ON agent_executions
  FOR SELECT
  USING (
    request_id IS NULL
    OR EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = agent_executions.request_id
      AND owns_resource(requests.iso_agent_id)
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify rollback was successful
DO $$
DECLARE
  users_table_exists BOOLEAN;
  iso_agents_table_exists BOOLEAN;
  sales_rep_count INTEGER;
BEGIN
  -- Check that users table no longer exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) INTO users_table_exists;

  -- Check that iso_agents table exists again
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'iso_agents'
  ) INTO iso_agents_table_exists;

  IF users_table_exists THEN
    RAISE WARNING 'users table still exists after rollback';
  END IF;

  IF NOT iso_agents_table_exists THEN
    RAISE EXCEPTION 'iso_agents table does not exist after rollback';
  END IF;

  -- Check for any remaining sales_rep roles
  SELECT COUNT(*) INTO sales_rep_count
  FROM iso_agents
  WHERE role = 'sales_rep';

  IF sales_rep_count > 0 THEN
    RAISE WARNING '% records still have sales_rep role', sales_rep_count;
  END IF;

  RAISE NOTICE 'Rollback verification complete';
  RAISE NOTICE 'iso_agents table: EXISTS';
  RAISE NOTICE 'users table: DOES NOT EXIST';
  RAISE NOTICE 'Remaining sales_rep roles: %', sales_rep_count;
END $$;

-- ============================================================================
-- POST-ROLLBACK NOTES
-- ============================================================================

-- After running this rollback migration:
-- 1. You must also revert any code changes in your application
-- 2. Redeploy the application with the old code that uses iso_agents
-- 3. Update Clerk webhook to create records in iso_agents (not users)
-- 4. Test all functionality thoroughly
-- 5. Investigate and fix the original migration issues before re-attempting

RAISE NOTICE '========================================';
RAISE NOTICE 'ROLLBACK MIGRATION COMPLETED';
RAISE NOTICE '========================================';
RAISE NOTICE 'IMPORTANT: You must also:';
RAISE NOTICE '1. Revert application code changes';
RAISE NOTICE '2. Redeploy application';
RAISE NOTICE '3. Test all functionality';
RAISE NOTICE '4. Fix issues before re-attempting migration';
RAISE NOTICE '========================================';
