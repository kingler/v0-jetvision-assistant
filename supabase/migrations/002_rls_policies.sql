-- Jetvision AI Assistant - Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Description: Multi-tenant data isolation with RLS policies
-- Created: 2025-10-21

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get current user's ISO agent ID from Clerk user ID
CREATE OR REPLACE FUNCTION get_current_iso_agent_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id
    FROM iso_agents
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM iso_agents
    WHERE clerk_user_id = auth.jwt()->>'sub'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if current user owns the resource
CREATE OR REPLACE FUNCTION owns_resource(resource_agent_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN resource_agent_id = get_current_iso_agent_id() OR is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE iso_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: iso_agents
-- Policy: Users can view their own profile and admins can view all
-- ============================================================================

-- SELECT: Users can view their own profile, admins can view all
CREATE POLICY "Users can view own profile or admin can view all"
  ON iso_agents
  FOR SELECT
  USING (
    clerk_user_id = auth.jwt()->>'sub'
    OR is_admin()
  );

-- INSERT: Only service role can insert (via Clerk webhook)
CREATE POLICY "Only service role can insert users"
  ON iso_agents
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Users can update their own profile, admins can update any
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

-- DELETE: Only admins can delete
CREATE POLICY "Only admins can delete users"
  ON iso_agents
  FOR DELETE
  USING (is_admin());

-- ============================================================================
-- TABLE: client_profiles
-- Policy: Users can only access their own clients
-- ============================================================================

-- SELECT: Users can only see their own clients
CREATE POLICY "Users can view own client profiles"
  ON client_profiles
  FOR SELECT
  USING (owns_resource(iso_agent_id));

-- INSERT: Users can only create clients under their own account
CREATE POLICY "Users can create own client profiles"
  ON client_profiles
  FOR INSERT
  WITH CHECK (iso_agent_id = get_current_iso_agent_id());

-- UPDATE: Users can only update their own clients
CREATE POLICY "Users can update own client profiles"
  ON client_profiles
  FOR UPDATE
  USING (owns_resource(iso_agent_id))
  WITH CHECK (iso_agent_id = get_current_iso_agent_id());

-- DELETE: Users can only delete their own clients
CREATE POLICY "Users can delete own client profiles"
  ON client_profiles
  FOR DELETE
  USING (owns_resource(iso_agent_id));

-- ============================================================================
-- TABLE: requests
-- Policy: Users can only access their own requests
-- ============================================================================

-- SELECT: Users can only see their own requests
CREATE POLICY "Users can view own requests"
  ON requests
  FOR SELECT
  USING (owns_resource(iso_agent_id));

-- INSERT: Users can only create requests under their own account
CREATE POLICY "Users can create own requests"
  ON requests
  FOR INSERT
  WITH CHECK (iso_agent_id = get_current_iso_agent_id());

-- UPDATE: Users can only update their own requests
CREATE POLICY "Users can update own requests"
  ON requests
  FOR UPDATE
  USING (owns_resource(iso_agent_id))
  WITH CHECK (iso_agent_id = get_current_iso_agent_id());

-- DELETE: Users can only delete their own requests
CREATE POLICY "Users can delete own requests"
  ON requests
  FOR DELETE
  USING (owns_resource(iso_agent_id));

-- ============================================================================
-- TABLE: quotes
-- Policy: Users can only access quotes for their own requests
-- ============================================================================

-- SELECT: Users can only see quotes for their own requests
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

-- INSERT: Service role only (quotes come from external systems)
CREATE POLICY "Service role can insert quotes"
  ON quotes
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Service role can update quotes, users can update analysis fields
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

-- DELETE: Users can delete quotes for their own requests
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

-- ============================================================================
-- TABLE: workflow_states
-- Policy: Users can only access workflow states for their own requests
-- ============================================================================

-- SELECT: Users can only see workflow states for their own requests
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
-- TABLE: agent_executions
-- Policy: Users can only access execution logs for their own requests
-- ============================================================================

-- SELECT: Users can only see execution logs for their own requests
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
-- SERVICE ROLE BYPASS
-- ============================================================================

-- Service role bypasses all RLS policies
-- This is configured at the Supabase project level
-- No additional policies needed - service_role has bypassrls privilege

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_current_iso_agent_id() IS
  'Returns the ISO agent ID for the currently authenticated user';

COMMENT ON FUNCTION is_admin() IS
  'Returns true if the current user has admin role';

COMMENT ON FUNCTION owns_resource(UUID) IS
  'Returns true if the current user owns the resource or is an admin';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Verify RLS is enabled on all tables
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('iso_agents', 'client_profiles', 'requests', 'quotes', 'workflow_states', 'agent_executions');

-- List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
