-- JetVision AI Assistant - Update RLS Functions and Policies for Users Table
-- Migration: 007_update_rls_for_users.sql
-- Description: Update Row Level Security helper functions and policies to use new table/column names
-- Created: 2025-10-25
-- Dependencies: 006_update_foreign_keys.sql

-- ============================================================================
-- DROP OLD HELPER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS get_current_iso_agent_id();
DROP FUNCTION IF EXISTS owns_resource(UUID);
DROP FUNCTION IF EXISTS is_admin();

-- ============================================================================
-- CREATE NEW HELPER FUNCTIONS
-- ============================================================================

-- Function: Get current user's ID from Clerk JWT
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT id
    FROM users
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION get_current_user_id() IS
  'Returns the user ID for the currently authenticated user from Clerk JWT';

-- Function: Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM users
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION is_admin() IS
  'Returns true if the current user has admin role';

-- Function: Check if current user is sales rep
CREATE OR REPLACE FUNCTION is_sales_rep()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role = 'sales_rep'
    FROM users
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION is_sales_rep() IS
  'Returns true if the current user has sales_rep role';

-- Function: Check if current user is customer
CREATE OR REPLACE FUNCTION is_customer()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role = 'customer'
    FROM users
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION is_customer() IS
  'Returns true if the current user has customer role';

-- Function: Get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role
    FROM users
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION get_current_user_role() IS
  'Returns the role of the currently authenticated user';

-- Function: Check if current user owns a resource
CREATE OR REPLACE FUNCTION owns_resource(resource_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Admins can access all resources
  -- Users can only access their own resources
  RETURN resource_user_id = get_current_user_id() OR is_admin();
END;
$$;

COMMENT ON FUNCTION owns_resource(UUID) IS
  'Returns true if the current user owns the resource or is an admin';

-- ============================================================================
-- UPDATE POLICIES FOR users TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON users;
DROP POLICY IF EXISTS "Only service role can insert users" ON users;
DROP POLICY IF EXISTS "Users can update own profile or admin can update any" ON users;
DROP POLICY IF EXISTS "Only admins can delete users" ON users;

-- SELECT: Users can view their own profile, admins can view all
CREATE POLICY "Users can view own profile or admin can view all"
  ON users
  FOR SELECT
  USING (
    clerk_user_id = auth.jwt()->>'sub'
    OR is_admin()
  );

-- INSERT: Only service role can insert (via Clerk webhook)
CREATE POLICY "Only service role can insert users"
  ON users
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Users can update their own profile, admins can update any
CREATE POLICY "Users can update own profile or admin can update any"
  ON users
  FOR UPDATE
  USING (
    clerk_user_id = auth.jwt()->>'sub'
    OR is_admin()
  )
  WITH CHECK (
    clerk_user_id = auth.jwt()->>'sub'
    OR is_admin()
  );

-- DELETE: Only admins can delete users
CREATE POLICY "Only admins can delete users"
  ON users
  FOR DELETE
  USING (is_admin());

-- ============================================================================
-- UPDATE POLICIES FOR client_profiles TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own client profiles" ON client_profiles;
DROP POLICY IF EXISTS "Users can create own client profiles" ON client_profiles;
DROP POLICY IF EXISTS "Users can update own client profiles" ON client_profiles;
DROP POLICY IF EXISTS "Users can delete own client profiles" ON client_profiles;

-- SELECT: Users can only see their own clients
CREATE POLICY "Users can view own client profiles"
  ON client_profiles
  FOR SELECT
  USING (owns_resource(user_id));

-- INSERT: Users can only create clients under their own account
CREATE POLICY "Users can create own client profiles"
  ON client_profiles
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

-- UPDATE: Users can only update their own clients
CREATE POLICY "Users can update own client profiles"
  ON client_profiles
  FOR UPDATE
  USING (owns_resource(user_id))
  WITH CHECK (user_id = get_current_user_id());

-- DELETE: Users can only delete their own clients
CREATE POLICY "Users can delete own client profiles"
  ON client_profiles
  FOR DELETE
  USING (owns_resource(user_id));

-- ============================================================================
-- UPDATE POLICIES FOR requests TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own requests" ON requests;
DROP POLICY IF EXISTS "Users can create own requests" ON requests;
DROP POLICY IF EXISTS "Users can update own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete own requests" ON requests;

-- SELECT: Users can only see their own requests
CREATE POLICY "Users can view own requests"
  ON requests
  FOR SELECT
  USING (owns_resource(user_id));

-- INSERT: Users can only create requests under their own account
CREATE POLICY "Users can create own requests"
  ON requests
  FOR INSERT
  WITH CHECK (user_id = get_current_user_id());

-- UPDATE: Users can only update their own requests
CREATE POLICY "Users can update own requests"
  ON requests
  FOR UPDATE
  USING (owns_resource(user_id))
  WITH CHECK (user_id = get_current_user_id());

-- DELETE: Users can only delete their own requests
CREATE POLICY "Users can delete own requests"
  ON requests
  FOR DELETE
  USING (owns_resource(user_id));

-- ============================================================================
-- UPDATE POLICIES FOR quotes TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view quotes for own requests" ON quotes;
DROP POLICY IF EXISTS "Service role can insert quotes" ON quotes;
DROP POLICY IF EXISTS "Users can update quotes for own requests" ON quotes;
DROP POLICY IF EXISTS "Users can delete quotes for own requests" ON quotes;

-- SELECT: Users can only see quotes for their own requests
CREATE POLICY "Users can view quotes for own requests"
  ON quotes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.user_id)
    )
  );

-- INSERT: Service role only (quotes come from external systems)
CREATE POLICY "Service role can insert quotes"
  ON quotes
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Users can update quotes for their own requests
CREATE POLICY "Users can update quotes for own requests"
  ON quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.user_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.user_id)
    )
  );

-- DELETE: Users can delete quotes for their own requests
CREATE POLICY "Users can delete quotes for own requests"
  ON quotes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = quotes.request_id
      AND owns_resource(requests.user_id)
    )
  );

-- ============================================================================
-- UPDATE POLICIES FOR workflow_states TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view workflow states for own requests" ON workflow_states;
DROP POLICY IF EXISTS "Service role can insert workflow states" ON workflow_states;
DROP POLICY IF EXISTS "Service role can update workflow states" ON workflow_states;
DROP POLICY IF EXISTS "Service role can delete workflow states" ON workflow_states;

-- SELECT: Users can only see workflow states for their own requests
CREATE POLICY "Users can view workflow states for own requests"
  ON workflow_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = workflow_states.request_id
      AND owns_resource(requests.user_id)
    )
  );

-- INSERT: Service role only (managed by agents)
CREATE POLICY "Service role can insert workflow states"
  ON workflow_states
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Service role only (managed by agents)
CREATE POLICY "Service role can update workflow states"
  ON workflow_states
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- DELETE: Service role only
CREATE POLICY "Service role can delete workflow states"
  ON workflow_states
  FOR DELETE
  USING (false);

-- ============================================================================
-- UPDATE POLICIES FOR agent_executions TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view execution logs for own requests" ON agent_executions;
DROP POLICY IF EXISTS "Service role can insert execution logs" ON agent_executions;
DROP POLICY IF EXISTS "Service role can update execution logs" ON agent_executions;
DROP POLICY IF EXISTS "Service role can delete execution logs" ON agent_executions;

-- SELECT: Users can only see execution logs for their own requests
CREATE POLICY "Users can view execution logs for own requests"
  ON agent_executions
  FOR SELECT
  USING (
    request_id IS NULL
    OR EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = agent_executions.request_id
      AND owns_resource(requests.user_id)
    )
  );

-- INSERT: Service role only (managed by agents)
CREATE POLICY "Service role can insert execution logs"
  ON agent_executions
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Service role only (managed by agents)
CREATE POLICY "Service role can update execution logs"
  ON agent_executions
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- DELETE: Service role only
CREATE POLICY "Service role can delete execution logs"
  ON agent_executions
  FOR DELETE
  USING (false);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is still enabled on all tables
DO $$
DECLARE
  tables_without_rls TEXT[];
BEGIN
  SELECT ARRAY_AGG(tablename)
  INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('users', 'client_profiles', 'requests', 'quotes', 'workflow_states', 'agent_executions')
  AND NOT rowsecurity;

  IF ARRAY_LENGTH(tables_without_rls, 1) > 0 THEN
    RAISE EXCEPTION 'RLS not enabled on tables: %', ARRAY_TO_STRING(tables_without_rls, ', ');
  ELSE
    RAISE NOTICE 'RLS enabled on all tables';
  END IF;
END $$;

-- Verify all policies were created
DO $$
DECLARE
  expected_policies INTEGER := 24;  -- Total expected policies
  actual_policies INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO actual_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('users', 'client_profiles', 'requests', 'quotes', 'workflow_states', 'agent_executions');

  IF actual_policies < expected_policies THEN
    RAISE WARNING 'Expected % policies, found %', expected_policies, actual_policies;
  ELSE
    RAISE NOTICE 'All % policies created successfully', actual_policies;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all policies by table
-- SELECT
--   tablename,
--   policyname,
--   permissive,
--   cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('users', 'client_profiles', 'requests', 'quotes', 'workflow_states', 'agent_executions')
-- ORDER BY tablename, cmd, policyname;

-- Test helper functions (requires authenticated context)
-- SELECT
--   get_current_user_id() as user_id,
--   get_current_user_role() as role,
--   is_admin() as is_admin,
--   is_sales_rep() as is_sales_rep,
--   is_customer() as is_customer;
