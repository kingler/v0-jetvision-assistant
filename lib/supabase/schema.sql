-- =============================================
-- Jetvision AI Assistant - Database Schema
-- Created: 2025-11-01
-- Version: 1.0
-- Task: TASK-002
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLE: users
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'iso_agent' CHECK (role IN ('iso_agent', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast Clerk user lookup
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- RLS Policies for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (clerk_user_id = auth.uid()::text);

-- =============================================
-- TABLE: clients
-- =============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  is_returning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for clients
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- RLS Policies for clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own clients"
  ON clients FOR ALL
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
  ));

-- =============================================
-- TABLE: flight_requests
-- =============================================
CREATE TABLE IF NOT EXISTS flight_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  passengers INTEGER NOT NULL CHECK (passengers > 0 AND passengers <= 19),
  departure_date DATE NOT NULL,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'analyzing', 'searching', 'quotes_received',
    'proposal_ready', 'sent', 'accepted', 'completed', 'cancelled'
  )),
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 6,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for flight_requests
CREATE INDEX IF NOT EXISTS idx_flight_requests_user_id ON flight_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_requests_status ON flight_requests(status);
CREATE INDEX IF NOT EXISTS idx_flight_requests_created_at ON flight_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flight_requests_client_id ON flight_requests(client_id);

-- RLS Policies for flight_requests
ALTER TABLE flight_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own flight requests"
  ON flight_requests FOR ALL
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
  ));

-- =============================================
-- TABLE: quotes
-- =============================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES flight_requests(id) ON DELETE CASCADE,
  operator_name TEXT NOT NULL,
  aircraft_type TEXT NOT NULL,
  base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
  response_time INTEGER, -- in minutes
  specifications JSONB DEFAULT '{}'::jsonb, -- capacity, range, speed, category
  rating NUMERIC(3, 2) CHECK (rating >= 0 AND rating <= 5),
  score NUMERIC(5, 2), -- calculated score for ranking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_request_id ON quotes(request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_score ON quotes(score DESC);

-- RLS Policies for quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotes for own requests"
  ON quotes FOR SELECT
  USING (request_id IN (
    SELECT id FROM flight_requests WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  ));

CREATE POLICY "System can insert quotes"
  ON quotes FOR INSERT
  WITH CHECK (request_id IN (
    SELECT id FROM flight_requests WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  ));

-- =============================================
-- TABLE: proposals
-- =============================================
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES flight_requests(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  markup_type TEXT NOT NULL CHECK (markup_type IN ('fixed', 'percentage')),
  markup_value NUMERIC(10, 2) NOT NULL CHECK (markup_value >= 0),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for proposals
CREATE INDEX IF NOT EXISTS idx_proposals_request_id ON proposals(request_id);
CREATE INDEX IF NOT EXISTS idx_proposals_quote_id ON proposals(quote_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- RLS Policies for proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage proposals for own requests"
  ON proposals FOR ALL
  USING (request_id IN (
    SELECT id FROM flight_requests WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  ));

-- =============================================
-- TABLE: communications
-- =============================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES flight_requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for communications
CREATE INDEX IF NOT EXISTS idx_communications_request_id ON communications(request_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON communications(created_at DESC);

-- RLS Policies for communications
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view communications for own requests"
  ON communications FOR SELECT
  USING (request_id IN (
    SELECT id FROM flight_requests WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  ));

CREATE POLICY "System can insert communications"
  ON communications FOR INSERT
  WITH CHECK (request_id IN (
    SELECT id FROM flight_requests WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  ));

-- =============================================
-- TABLE: workflow_history
-- =============================================
CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES flight_requests(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  triggered_by TEXT NOT NULL, -- agent name
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for workflow_history
CREATE INDEX IF NOT EXISTS idx_workflow_history_request_id ON workflow_history(request_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_created_at ON workflow_history(created_at DESC);

-- RLS Policies for workflow_history
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow history for own requests"
  ON workflow_history FOR SELECT
  USING (request_id IN (
    SELECT id FROM flight_requests WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  ));

CREATE POLICY "System can insert workflow history"
  ON workflow_history FOR INSERT
  WITH CHECK (request_id IN (
    SELECT id FROM flight_requests WHERE user_id IN (
      SELECT id FROM users WHERE clerk_user_id = auth.uid()::text
    )
  ));

-- =============================================
-- FUNCTIONS: Updated timestamp trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flight_requests_updated_at
  BEFORE UPDATE ON flight_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- DEPLOYMENT INSTRUCTIONS
-- =============================================
-- To deploy this schema:
--
-- Option 1: Supabase Dashboard (Recommended for first deployment)
-- 1. Open Supabase dashboard at https://app.supabase.com
-- 2. Navigate to SQL Editor
-- 3. Copy/paste this entire file
-- 4. Click "Run"
--
-- Option 2: Supabase CLI
-- supabase db push
--
-- After deployment:
-- 1. Generate TypeScript types: npx supabase gen types typescript --project-id <your-project-ref> > lib/types/database.ts
-- 2. Verify all tables created: Check Database > Tables in Supabase dashboard
-- 3. Verify RLS enabled: Check Authentication > Policies in Supabase dashboard
-- 4. Run tests: npm run test:integration -- database
