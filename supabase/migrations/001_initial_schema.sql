-- Jetvision AI Assistant - Initial Database Schema
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
