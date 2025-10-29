-- JetVision AI Assistant - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Core tables for multi-tenant RFP management system
-- Created: 2025-10-21

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Request workflow status
CREATE TYPE request_status AS ENUM (
  'draft',
  'pending',
  'analyzing',
  'fetching_client_data',
  'searching_flights',
  'awaiting_quotes',
  'analyzing_proposals',
  'generating_email',
  'sending_proposal',
  'completed',
  'failed',
  'cancelled'
);

-- Quote status
CREATE TYPE quote_status AS ENUM (
  'pending',
  'received',
  'analyzed',
  'accepted',
  'rejected',
  'expired'
);

-- User role types
CREATE TYPE user_role AS ENUM (
  'iso_agent',
  'admin',
  'operator'
);

-- Margin calculation type
CREATE TYPE margin_type AS ENUM (
  'percentage',
  'fixed'
);

-- Agent execution status
CREATE TYPE execution_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'timeout'
);

-- Agent types
CREATE TYPE agent_type AS ENUM (
  'orchestrator',
  'client_data',
  'flight_search',
  'proposal_analysis',
  'communication',
  'error_monitor'
);

-- ============================================================================
-- TABLE: iso_agents
-- Description: User profiles synced from Clerk authentication
-- ============================================================================

CREATE TABLE iso_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'iso_agent',
  margin_type margin_type DEFAULT 'percentage',
  margin_value DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_margin_value CHECK (margin_value >= 0)
);

-- Indexes
CREATE INDEX idx_iso_agents_clerk_user_id ON iso_agents(clerk_user_id);
CREATE INDEX idx_iso_agents_email ON iso_agents(email);
CREATE INDEX idx_iso_agents_role ON iso_agents(role);

-- Comments
COMMENT ON TABLE iso_agents IS 'User profiles for ISO agents and admins, synced from Clerk';
COMMENT ON COLUMN iso_agents.clerk_user_id IS 'Unique identifier from Clerk authentication service';
COMMENT ON COLUMN iso_agents.margin_type IS 'How margin is calculated: percentage or fixed amount';
COMMENT ON COLUMN iso_agents.margin_value IS 'Margin value to apply to quotes';

-- ============================================================================
-- TABLE: client_profiles
-- Description: Client information managed by ISO agents
-- ============================================================================

CREATE TABLE client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_client_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_client_profiles_iso_agent_id ON client_profiles(iso_agent_id);
CREATE INDEX idx_client_profiles_email ON client_profiles(email);
CREATE INDEX idx_client_profiles_company_name ON client_profiles(company_name);

-- Comments
COMMENT ON TABLE client_profiles IS 'Client information and preferences for charter bookings';
COMMENT ON COLUMN client_profiles.preferences IS 'JSONB field for flexible client preferences (aircraft type, amenities, etc.)';

-- ============================================================================
-- TABLE: requests
-- Description: Flight RFP requests submitted by ISO agents
-- ============================================================================

CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL,

  -- Flight details
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ,
  passengers INTEGER NOT NULL,

  -- Requirements
  aircraft_type TEXT,
  budget DECIMAL(12, 2),
  special_requirements TEXT,

  -- Status tracking
  status request_status NOT NULL DEFAULT 'draft',

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_passengers CHECK (passengers > 0 AND passengers <= 100),
  CONSTRAINT valid_budget CHECK (budget IS NULL OR budget > 0),
  CONSTRAINT valid_dates CHECK (
    departure_date > NOW() AND
    (return_date IS NULL OR return_date > departure_date)
  )
);

-- Indexes
CREATE INDEX idx_requests_iso_agent_id ON requests(iso_agent_id);
CREATE INDEX idx_requests_client_profile_id ON requests(client_profile_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_departure_date ON requests(departure_date);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);

-- Comments
COMMENT ON TABLE requests IS 'Flight RFP requests with routing and passenger requirements';
COMMENT ON COLUMN requests.metadata IS 'Additional request data (Avinode RFP ID, external references, etc.)';

-- ============================================================================
-- TABLE: quotes
-- Description: Operator quotes/proposals for flight requests
-- ============================================================================

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  operator_id TEXT NOT NULL,
  operator_name TEXT NOT NULL,

  -- Pricing breakdown
  base_price DECIMAL(12, 2) NOT NULL,
  fuel_surcharge DECIMAL(12, 2) DEFAULT 0.00,
  taxes DECIMAL(12, 2) DEFAULT 0.00,
  fees DECIMAL(12, 2) DEFAULT 0.00,
  total_price DECIMAL(12, 2) NOT NULL,

  -- Aircraft details
  aircraft_type TEXT NOT NULL,
  aircraft_tail_number TEXT,
  aircraft_details JSONB DEFAULT '{}'::jsonb,

  -- Availability
  availability_confirmed BOOLEAN DEFAULT false,
  valid_until TIMESTAMPTZ,

  -- Analysis results
  score DECIMAL(5, 2),
  ranking INTEGER,
  analysis_notes TEXT,

  -- Status
  status quote_status NOT NULL DEFAULT 'pending',

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_base_price CHECK (base_price > 0),
  CONSTRAINT valid_total_price CHECK (total_price > 0),
  CONSTRAINT valid_score CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  CONSTRAINT valid_ranking CHECK (ranking IS NULL OR ranking > 0)
);

-- Indexes
CREATE INDEX idx_quotes_request_id ON quotes(request_id);
CREATE INDEX idx_quotes_operator_id ON quotes(operator_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_score ON quotes(score DESC NULLS LAST);
CREATE INDEX idx_quotes_ranking ON quotes(ranking ASC NULLS LAST);

-- Comments
COMMENT ON TABLE quotes IS 'Operator quotes with pricing, aircraft, and analysis data';
COMMENT ON COLUMN quotes.score IS 'AI-generated score (0-100) based on price, aircraft, and availability';
COMMENT ON COLUMN quotes.ranking IS 'Relative ranking among all quotes for the request';
COMMENT ON COLUMN quotes.metadata IS 'Additional quote data (Avinode quote ID, external references, etc.)';

-- ============================================================================
-- TABLE: workflow_states
-- Description: Request workflow state tracking for agent coordination
-- ============================================================================

CREATE TABLE workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  current_state request_status NOT NULL,
  previous_state request_status,
  agent_id TEXT,

  -- State metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timing
  state_entered_at TIMESTAMPTZ DEFAULT NOW(),
  state_duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0)
);

-- Indexes
CREATE INDEX idx_workflow_states_request_id ON workflow_states(request_id);
CREATE INDEX idx_workflow_states_current_state ON workflow_states(current_state);
CREATE INDEX idx_workflow_states_agent_id ON workflow_states(agent_id);
CREATE INDEX idx_workflow_states_created_at ON workflow_states(created_at DESC);

-- Comments
COMMENT ON TABLE workflow_states IS 'Workflow state machine transitions for request processing';
COMMENT ON COLUMN workflow_states.metadata IS 'State-specific data (timings, intermediate results, etc.)';
COMMENT ON COLUMN workflow_states.state_duration_ms IS 'Time spent in previous state (milliseconds)';

-- ============================================================================
-- TABLE: agent_executions
-- Description: Agent execution logs for monitoring and debugging
-- ============================================================================

CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  agent_type agent_type NOT NULL,
  agent_id TEXT NOT NULL,

  -- Execution details
  input_data JSONB,
  output_data JSONB,
  execution_time_ms INTEGER,
  status execution_status NOT NULL DEFAULT 'pending',

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_execution_time CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0)
);

-- Indexes
CREATE INDEX idx_agent_executions_request_id ON agent_executions(request_id);
CREATE INDEX idx_agent_executions_agent_type ON agent_executions(agent_type);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);
CREATE INDEX idx_agent_executions_started_at ON agent_executions(started_at DESC);

-- Comments
COMMENT ON TABLE agent_executions IS 'Execution logs for all agent activities';
COMMENT ON COLUMN agent_executions.input_data IS 'Agent input parameters and context';
COMMENT ON COLUMN agent_executions.output_data IS 'Agent execution results';
COMMENT ON COLUMN agent_executions.execution_time_ms IS 'Total execution time in milliseconds';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Triggers: Auto-update updated_at on all tables
CREATE TRIGGER update_iso_agents_updated_at
  BEFORE UPDATE ON iso_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at
  BEFORE UPDATE ON client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create a system user for service operations
INSERT INTO iso_agents (
  clerk_user_id,
  email,
  full_name,
  role,
  is_active
) VALUES (
  'system',
  'system@jetvision.ai',
  'System User',
  'admin',
  true
) ON CONFLICT (clerk_user_id) DO NOTHING;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant access to tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
-- JetVision AI Assistant - Row Level Security Policies
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
-- JetVision AI Assistant - Seed Data
-- Migration: 003_seed_data.sql
-- Description: Development and testing seed data
-- Created: 2025-10-21
-- WARNING: This file should only be run in development environments

-- ============================================================================
-- SEED ISO AGENTS (Test Users)
-- ============================================================================

-- Test ISO Agent 1
INSERT INTO iso_agents (
  id,
  clerk_user_id,
  email,
  full_name,
  role,
  margin_type,
  margin_value,
  is_active,
  metadata
) VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'user_test_agent_1',
  'agent1@jetvision.ai',
  'John Doe',
  'iso_agent',
  'percentage',
  15.00,
  true,
  '{"company": "JetVision West", "territory": "US-West", "preferred_operators": ["NetJets", "VistaJet"]}'::jsonb
) ON CONFLICT (clerk_user_id) DO NOTHING;

-- Test ISO Agent 2
INSERT INTO iso_agents (
  id,
  clerk_user_id,
  email,
  full_name,
  role,
  margin_type,
  margin_value,
  is_active,
  metadata
) VALUES (
  'a2222222-2222-2222-2222-222222222222',
  'user_test_agent_2',
  'agent2@jetvision.ai',
  'Jane Smith',
  'iso_agent',
  'fixed',
  5000.00,
  true,
  '{"company": "JetVision East", "territory": "US-East", "preferred_operators": ["FlexJet", "Wheels Up"]}'::jsonb
) ON CONFLICT (clerk_user_id) DO NOTHING;

-- Test Admin User
INSERT INTO iso_agents (
  id,
  clerk_user_id,
  email,
  full_name,
  role,
  margin_type,
  margin_value,
  is_active,
  metadata
) VALUES (
  'a3333333-3333-3333-3333-333333333333',
  'user_test_admin',
  'admin@jetvision.ai',
  'Admin User',
  'admin',
  'percentage',
  0.00,
  true,
  '{"company": "JetVision HQ", "access_level": "full"}'::jsonb
) ON CONFLICT (clerk_user_id) DO NOTHING;

-- ============================================================================
-- SEED CLIENT PROFILES
-- ============================================================================

-- Client 1 for Agent 1
INSERT INTO client_profiles (
  id,
  iso_agent_id,
  company_name,
  contact_name,
  email,
  phone,
  preferences,
  notes,
  is_active
) VALUES (
  'c1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'Acme Corporation',
  'Bob Johnson',
  'bob.johnson@acmecorp.com',
  '+1-555-0101',
  '{
    "preferred_aircraft": ["Gulfstream G650", "Bombardier Global 7500"],
    "dietary_restrictions": ["vegetarian", "gluten-free"],
    "preferred_amenities": ["wifi", "full_galley"],
    "budget_range": {"min": 50000, "max": 150000}
  }'::jsonb,
  'VIP client, prefers morning departures',
  true
) ON CONFLICT (id) DO NOTHING;

-- Client 2 for Agent 1
INSERT INTO client_profiles (
  id,
  iso_agent_id,
  company_name,
  contact_name,
  email,
  phone,
  preferences,
  notes,
  is_active
) VALUES (
  'c2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  'TechStart Inc',
  'Alice Williams',
  'alice@techstart.io',
  '+1-555-0102',
  '{
    "preferred_aircraft": ["Citation X", "Embraer Phenom 300"],
    "preferred_amenities": ["wifi", "conference_capability"],
    "budget_range": {"min": 20000, "max": 50000}
  }'::jsonb,
  'Frequent flyer, flexible on timing',
  true
) ON CONFLICT (id) DO NOTHING;

-- Client 3 for Agent 2
INSERT INTO client_profiles (
  id,
  iso_agent_id,
  company_name,
  contact_name,
  email,
  phone,
  preferences,
  notes,
  is_active
) VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'a2222222-2222-2222-2222-222222222222',
  'Global Ventures LLC',
  'Charlie Davis',
  'charlie@globalventures.com',
  '+1-555-0103',
  '{
    "preferred_aircraft": ["Gulfstream G550", "Falcon 7X"],
    "dietary_restrictions": ["kosher"],
    "preferred_amenities": ["full_galley", "bedroom", "shower"],
    "budget_range": {"min": 100000, "max": 300000}
  }'::jsonb,
  'Ultra-high net worth client, requires luxury amenities',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED REQUESTS
-- ============================================================================

-- Request 1: Completed workflow
INSERT INTO requests (
  id,
  iso_agent_id,
  client_profile_id,
  departure_airport,
  arrival_airport,
  departure_date,
  return_date,
  passengers,
  aircraft_type,
  budget,
  special_requirements,
  status,
  metadata
) VALUES (
  'r1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'KTEB',
  'KLAX',
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '33 days',
  8,
  'Gulfstream G650',
  120000.00,
  'Need wifi, full catering, ground transportation at destination',
  'completed',
  '{"avinode_rfp_id": "RFP-12345", "preferred_departure_time": "09:00"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Request 2: In progress (awaiting quotes)
INSERT INTO requests (
  id,
  iso_agent_id,
  client_profile_id,
  departure_airport,
  arrival_airport,
  departure_date,
  return_date,
  passengers,
  aircraft_type,
  budget,
  special_requirements,
  status,
  metadata
) VALUES (
  'r2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  'c2222222-2222-2222-2222-222222222222',
  'KBOS',
  'KMIA',
  NOW() + INTERVAL '15 days',
  NULL,
  4,
  'Citation X',
  35000.00,
  'One-way trip, business meeting',
  'awaiting_quotes',
  '{"avinode_rfp_id": "RFP-12346", "preferred_departure_time": "07:00"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Request 3: Draft
INSERT INTO requests (
  id,
  iso_agent_id,
  client_profile_id,
  departure_airport,
  arrival_airport,
  departure_date,
  return_date,
  passengers,
  aircraft_type,
  budget,
  special_requirements,
  status,
  metadata
) VALUES (
  'r3333333-3333-3333-3333-333333333333',
  'a2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'KJFK',
  'EGLL',
  NOW() + INTERVAL '45 days',
  NOW() + INTERVAL '52 days',
  12,
  'Gulfstream G550',
  250000.00,
  'International flight, full catering, VIP service',
  'draft',
  '{"preferred_departure_time": "18:00", "requires_customs_assistance": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED QUOTES
-- ============================================================================

-- Quotes for Request 1 (3 operators)
INSERT INTO quotes (
  id,
  request_id,
  operator_id,
  operator_name,
  base_price,
  fuel_surcharge,
  taxes,
  fees,
  total_price,
  aircraft_type,
  aircraft_tail_number,
  aircraft_details,
  availability_confirmed,
  valid_until,
  score,
  ranking,
  analysis_notes,
  status,
  metadata
) VALUES
  -- Quote 1: Best option
  (
    'q1111111-1111-1111-1111-111111111111',
    'r1111111-1111-1111-1111-111111111111',
    'OP-001',
    'NetJets',
    95000.00,
    8500.00,
    6200.00,
    2300.00,
    112000.00,
    'Gulfstream G650',
    'N650NJ',
    '{
      "year": 2020,
      "range_nm": 7000,
      "max_passengers": 14,
      "amenities": ["wifi", "full_galley", "shower", "bedroom"],
      "crew": 2,
      "flight_attendant": true
    }'::jsonb,
    true,
    NOW() + INTERVAL '7 days',
    95.50,
    1,
    'Excellent aircraft condition, proven operator, slightly under budget',
    'accepted',
    '{"avinode_quote_id": "Q-98765", "response_time_hours": 2}'::jsonb
  ),

  -- Quote 2: Second best
  (
    'q2222222-2222-2222-2222-222222222222',
    'r1111111-1111-1111-1111-111111111111',
    'OP-002',
    'VistaJet',
    105000.00,
    9500.00,
    6800.00,
    2700.00,
    124000.00,
    'Gulfstream G650ER',
    'N650VJ',
    '{
      "year": 2021,
      "range_nm": 7500,
      "max_passengers": 13,
      "amenities": ["wifi", "full_galley", "shower", "bedroom", "entertainment_system"],
      "crew": 2,
      "flight_attendant": true
    }'::jsonb,
    true,
    NOW() + INTERVAL '5 days',
    88.20,
    2,
    'Newer aircraft with extended range, slightly over budget',
    'received',
    '{"avinode_quote_id": "Q-98766", "response_time_hours": 4}'::jsonb
  ),

  -- Quote 3: Budget option
  (
    'q3333333-3333-3333-3333-333333333333',
    'r1111111-1111-1111-1111-111111111111',
    'OP-003',
    'FlexJet',
    88000.00,
    7800.00,
    5900.00,
    2100.00,
    103800.00,
    'Gulfstream G550',
    'N550FJ',
    '{
      "year": 2018,
      "range_nm": 6750,
      "max_passengers": 12,
      "amenities": ["wifi", "full_galley"],
      "crew": 2,
      "flight_attendant": true
    }'::jsonb,
    true,
    NOW() + INTERVAL '3 days',
    82.75,
    3,
    'Good value, older aircraft model, meets requirements',
    'received',
    '{"avinode_quote_id": "Q-98767", "response_time_hours": 6}'::jsonb
  );

-- Quotes for Request 2 (2 operators, still coming in)
INSERT INTO quotes (
  id,
  request_id,
  operator_id,
  operator_name,
  base_price,
  fuel_surcharge,
  taxes,
  fees,
  total_price,
  aircraft_type,
  aircraft_tail_number,
  aircraft_details,
  availability_confirmed,
  valid_until,
  score,
  ranking,
  status,
  metadata
) VALUES
  (
    'q4444444-4444-4444-4444-444444444444',
    'r2222222-2222-2222-2222-222222222222',
    'OP-004',
    'Wheels Up',
    28000.00,
    2500.00,
    1800.00,
    700.00,
    33000.00,
    'Citation X',
    'N750WU',
    '{
      "year": 2019,
      "range_nm": 3200,
      "max_passengers": 8,
      "amenities": ["wifi"],
      "crew": 2,
      "flight_attendant": false
    }'::jsonb,
    true,
    NOW() + INTERVAL '4 days',
    NULL,
    NULL,
    'received',
    '{"avinode_quote_id": "Q-98768", "response_time_hours": 3}'::jsonb
  );

-- ============================================================================
-- SEED WORKFLOW STATES
-- ============================================================================

-- Workflow states for Request 1 (completed workflow)
INSERT INTO workflow_states (
  request_id,
  current_state,
  previous_state,
  agent_id,
  metadata,
  state_duration_ms,
  state_entered_at
) VALUES
  (
    'r1111111-1111-1111-1111-111111111111',
    'analyzing',
    'created',
    'agent-orchestrator-001',
    '{"analysis_result": "Valid RFP, proceeding to client data fetch"}'::jsonb,
    1250,
    NOW() - INTERVAL '48 hours'
  ),
  (
    'r1111111-1111-1111-1111-111111111111',
    'fetching_client_data',
    'analyzing',
    'agent-client-data-001',
    '{"client_found": true, "preferences_loaded": true}'::jsonb,
    2100,
    NOW() - INTERVAL '47 hours 58 minutes'
  ),
  (
    'r1111111-1111-1111-1111-111111111111',
    'searching_flights',
    'fetching_client_data',
    'agent-flight-search-001',
    '{"avinode_rfp_created": true, "operators_contacted": 15}'::jsonb,
    5400,
    NOW() - INTERVAL '47 hours 56 minutes'
  ),
  (
    'r1111111-1111-1111-1111-111111111111',
    'awaiting_quotes',
    'searching_flights',
    'agent-flight-search-001',
    '{"quotes_expected": 15, "quotes_received": 3}'::jsonb,
    86400000,
    NOW() - INTERVAL '47 hours 50 minutes'
  ),
  (
    'r1111111-1111-1111-1111-111111111111',
    'analyzing_proposals',
    'awaiting_quotes',
    'agent-proposal-analysis-001',
    '{"quotes_analyzed": 3, "best_quote_id": "q1111111-1111-1111-1111-111111111111"}'::jsonb,
    8900,
    NOW() - INTERVAL '23 hours 50 minutes'
  ),
  (
    'r1111111-1111-1111-1111-111111111111',
    'completed',
    'sending_proposal',
    'agent-communication-001',
    '{"email_sent": true, "pdf_generated": true}'::jsonb,
    3200,
    NOW() - INTERVAL '23 hours 30 minutes'
  );

-- Workflow states for Request 2 (in progress)
INSERT INTO workflow_states (
  request_id,
  current_state,
  previous_state,
  agent_id,
  metadata,
  state_duration_ms,
  state_entered_at
) VALUES
  (
    'r2222222-2222-2222-2222-222222222222',
    'awaiting_quotes',
    'searching_flights',
    'agent-flight-search-001',
    '{"avinode_rfp_id": "RFP-12346", "operators_contacted": 12}'::jsonb,
    NULL,
    NOW() - INTERVAL '6 hours'
  );

-- ============================================================================
-- SEED AGENT EXECUTIONS
-- ============================================================================

-- Executions for Request 1
INSERT INTO agent_executions (
  id,
  request_id,
  agent_type,
  agent_id,
  input_data,
  output_data,
  execution_time_ms,
  status,
  metadata,
  started_at,
  completed_at
) VALUES
  (
    'e1111111-1111-1111-1111-111111111111',
    'r1111111-1111-1111-1111-111111111111',
    'orchestrator',
    'agent-orchestrator-001',
    '{"request_id": "r1111111-1111-1111-1111-111111111111", "action": "analyze_rfp"}'::jsonb,
    '{"valid": true, "next_step": "fetch_client_data", "confidence": 0.95}'::jsonb,
    1250,
    'completed',
    '{"model": "gpt-4-turbo-preview", "temperature": 0.7}'::jsonb,
    NOW() - INTERVAL '48 hours',
    NOW() - INTERVAL '48 hours' + INTERVAL '1.25 seconds'
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'r1111111-1111-1111-1111-111111111111',
    'client_data',
    'agent-client-data-001',
    '{"client_profile_id": "c1111111-1111-1111-1111-111111111111"}'::jsonb,
    '{"preferences": {"preferred_aircraft": ["Gulfstream G650"]}, "budget_range": {"min": 50000, "max": 150000}}'::jsonb,
    2100,
    'completed',
    '{"data_source": "google_sheets_mcp"}'::jsonb,
    NOW() - INTERVAL '47 hours 58 minutes',
    NOW() - INTERVAL '47 hours 58 minutes' + INTERVAL '2.1 seconds'
  ),
  (
    'e3333333-3333-3333-3333-333333333333',
    'r1111111-1111-1111-1111-111111111111',
    'flight_search',
    'agent-flight-search-001',
    '{"route": "KTEB-KLAX", "date": "2025-11-20", "passengers": 8}'::jsonb,
    '{"avinode_rfp_id": "RFP-12345", "operators_contacted": 15}'::jsonb,
    5400,
    'completed',
    '{"mcp_server": "avinode"}'::jsonb,
    NOW() - INTERVAL '47 hours 56 minutes',
    NOW() - INTERVAL '47 hours 56 minutes' + INTERVAL '5.4 seconds'
  ),
  (
    'e4444444-4444-4444-4444-444444444444',
    'r1111111-1111-1111-1111-111111111111',
    'proposal_analysis',
    'agent-proposal-analysis-001',
    '{"request_id": "r1111111-1111-1111-1111-111111111111", "quotes_count": 3}'::jsonb,
    '{"best_quote": "q1111111-1111-1111-1111-111111111111", "scores": [95.5, 88.2, 82.75]}'::jsonb,
    8900,
    'completed',
    '{"analysis_criteria": ["price", "aircraft_quality", "operator_reputation"]}'::jsonb,
    NOW() - INTERVAL '23 hours 50 minutes',
    NOW() - INTERVAL '23 hours 50 minutes' + INTERVAL '8.9 seconds'
  ),
  (
    'e5555555-5555-5555-5555-555555555555',
    'r1111111-1111-1111-1111-111111111111',
    'communication',
    'agent-communication-001',
    '{"request_id": "r1111111-1111-1111-1111-111111111111", "best_quote_id": "q1111111-1111-1111-1111-111111111111"}'::jsonb,
    '{"email_sent": true, "recipient": "bob.johnson@acmecorp.com", "pdf_url": "https://storage.example.com/proposals/r1111.pdf"}'::jsonb,
    3200,
    'completed',
    '{"mcp_server": "gmail", "template": "standard_proposal"}'::jsonb,
    NOW() - INTERVAL '23 hours 30 minutes',
    NOW() - INTERVAL '23 hours 30 minutes' + INTERVAL '3.2 seconds'
  );

-- ============================================================================
-- SEED DATA SUMMARY
-- ============================================================================

-- Verify seed data counts
DO $$
DECLARE
  agent_count INTEGER;
  client_count INTEGER;
  request_count INTEGER;
  quote_count INTEGER;
  workflow_count INTEGER;
  execution_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO agent_count FROM iso_agents;
  SELECT COUNT(*) INTO client_count FROM client_profiles;
  SELECT COUNT(*) INTO request_count FROM requests;
  SELECT COUNT(*) INTO quote_count FROM quotes;
  SELECT COUNT(*) INTO workflow_count FROM workflow_states;
  SELECT COUNT(*) INTO execution_count FROM agent_executions;

  RAISE NOTICE 'Seed data loaded successfully:';
  RAISE NOTICE '  - ISO Agents: %', agent_count;
  RAISE NOTICE '  - Client Profiles: %', client_count;
  RAISE NOTICE '  - Requests: %', request_count;
  RAISE NOTICE '  - Quotes: %', quote_count;
  RAISE NOTICE '  - Workflow States: %', workflow_count;
  RAISE NOTICE '  - Agent Executions: %', execution_count;
END $$;
