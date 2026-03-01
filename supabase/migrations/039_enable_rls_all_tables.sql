-- JetVision AI Assistant - Enable RLS on All Tables
-- Migration: 039_enable_rls_all_tables.sql
-- Target: jetvision-agent-db (fshvzvxqgwgoujtcevyy)
-- Description: Enable Row Level Security on all 27 public tables.
--              Uses Clerk auth: auth.jwt() ->> 'sub' = users.clerk_id
-- Created: 2026-02-24

-- ============================================================================
-- HELPER FUNCTION: Resolve Clerk JWT sub → users.id
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_id_from_jwt()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users WHERE clerk_id = (auth.jwt() ->> 'sub') LIMIT 1;
$$;

-- ============================================================================
-- PHASE 1: Enable RLS on ALL tables
-- ============================================================================

ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE _prisma_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE charter_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 2: Service role bypass (all tables)
-- service_role always has full access regardless of RLS
-- ============================================================================

-- _prisma_migrations: service_role only (internal table)
CREATE POLICY "service_role_prisma_migrations" ON _prisma_migrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PHASE 3: Users table
-- ============================================================================

CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated
  USING (clerk_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "users_update_own" ON users
  FOR UPDATE TO authenticated
  USING (clerk_id = (auth.jwt() ->> 'sub'))
  WITH CHECK (clerk_id = (auth.jwt() ->> 'sub'));

CREATE POLICY "users_service_role" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PHASE 4: User-owned tables (have user_id → users.id)
-- Tables: bookings, conversations, feedback, leads,
--         notification_preferences, workflow_executions, analytics_events
-- ============================================================================

-- bookings
CREATE POLICY "bookings_select_own" ON bookings
  FOR SELECT TO authenticated
  USING (user_id = get_user_id_from_jwt());

CREATE POLICY "bookings_insert_own" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_user_id_from_jwt());

CREATE POLICY "bookings_update_own" ON bookings
  FOR UPDATE TO authenticated
  USING (user_id = get_user_id_from_jwt())
  WITH CHECK (user_id = get_user_id_from_jwt());

CREATE POLICY "bookings_service_role" ON bookings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- conversations
CREATE POLICY "conversations_select_own" ON conversations
  FOR SELECT TO authenticated
  USING (user_id = get_user_id_from_jwt());

CREATE POLICY "conversations_insert_own" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_user_id_from_jwt());

CREATE POLICY "conversations_update_own" ON conversations
  FOR UPDATE TO authenticated
  USING (user_id = get_user_id_from_jwt())
  WITH CHECK (user_id = get_user_id_from_jwt());

CREATE POLICY "conversations_delete_own" ON conversations
  FOR DELETE TO authenticated
  USING (user_id = get_user_id_from_jwt());

CREATE POLICY "conversations_service_role" ON conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- feedback (lowercase)
CREATE POLICY "feedback_select_own" ON feedback
  FOR SELECT TO authenticated
  USING (user_id = get_user_id_from_jwt());

CREATE POLICY "feedback_insert_own" ON feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_user_id_from_jwt());

CREATE POLICY "feedback_service_role" ON feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- leads
CREATE POLICY "leads_select_own" ON leads
  FOR SELECT TO authenticated
  USING (user_id = get_user_id_from_jwt());

CREATE POLICY "leads_insert_own" ON leads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_user_id_from_jwt());

CREATE POLICY "leads_update_own" ON leads
  FOR UPDATE TO authenticated
  USING (user_id = get_user_id_from_jwt())
  WITH CHECK (user_id = get_user_id_from_jwt());

CREATE POLICY "leads_delete_own" ON leads
  FOR DELETE TO authenticated
  USING (user_id = get_user_id_from_jwt());

CREATE POLICY "leads_service_role" ON leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- notification_preferences
CREATE POLICY "notification_preferences_select_own" ON notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = get_user_id_from_jwt());

CREATE POLICY "notification_preferences_insert_own" ON notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_user_id_from_jwt());

CREATE POLICY "notification_preferences_update_own" ON notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id = get_user_id_from_jwt())
  WITH CHECK (user_id = get_user_id_from_jwt());

CREATE POLICY "notification_preferences_service_role" ON notification_preferences
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- workflow_executions
CREATE POLICY "workflow_executions_select_own" ON workflow_executions
  FOR SELECT TO authenticated
  USING (user_id = get_user_id_from_jwt());

CREATE POLICY "workflow_executions_service_role" ON workflow_executions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- analytics_events
CREATE POLICY "analytics_events_select_own" ON analytics_events
  FOR SELECT TO authenticated
  USING (user_id = get_user_id_from_jwt());

CREATE POLICY "analytics_events_insert_auth" ON analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = get_user_id_from_jwt());

CREATE POLICY "analytics_events_service_role" ON analytics_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PHASE 5: Feedback (uppercase, Prisma model - userId is clerk_id text)
-- ============================================================================

CREATE POLICY "Feedback_select_own" ON "Feedback"
  FOR SELECT TO authenticated
  USING ("userId" = (auth.jwt() ->> 'sub'));

CREATE POLICY "Feedback_insert_own" ON "Feedback"
  FOR INSERT TO authenticated
  WITH CHECK ("userId" = (auth.jwt() ->> 'sub'));

CREATE POLICY "Feedback_service_role" ON "Feedback"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PHASE 6: Messages (owned via conversation → user)
-- ============================================================================

CREATE POLICY "messages_select_own" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.user_id = get_user_id_from_jwt()
    )
  );

CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND c.user_id = get_user_id_from_jwt()
    )
  );

CREATE POLICY "messages_service_role" ON messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PHASE 7: Catalog / Reference data (authenticated read, service_role write)
-- ============================================================================

-- aircraft
CREATE POLICY "aircraft_select_auth" ON aircraft
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "aircraft_service_role" ON aircraft
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- operators
CREATE POLICY "operators_select_auth" ON operators
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "operators_service_role" ON operators
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- flight_legs
CREATE POLICY "flight_legs_select_auth" ON flight_legs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "flight_legs_service_role" ON flight_legs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PHASE 8: Booking-related tables (access via booking → user)
-- ============================================================================

-- crew_assignments (via booking → user)
CREATE POLICY "crew_assignments_select_own" ON crew_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = crew_assignments.booking_id
        AND b.user_id = get_user_id_from_jwt()
    )
  );

CREATE POLICY "crew_assignments_service_role" ON crew_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- invoices (via booking → user)
CREATE POLICY "invoices_select_own" ON invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = invoices.booking_id
        AND b.user_id = get_user_id_from_jwt()
    )
  );

CREATE POLICY "invoices_service_role" ON invoices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- transactions (via booking → user)
CREATE POLICY "transactions_select_own" ON transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = transactions.booking_id
        AND b.user_id = get_user_id_from_jwt()
    )
  );

CREATE POLICY "transactions_service_role" ON transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PHASE 9: Reviews (authenticated read, service_role write)
-- ============================================================================

-- aircraft_reviews
CREATE POLICY "aircraft_reviews_select_auth" ON aircraft_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "aircraft_reviews_service_role" ON aircraft_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- operator_reviews
CREATE POLICY "operator_reviews_select_auth" ON operator_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "operator_reviews_service_role" ON operator_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PHASE 10: Charter requests (service_role managed, users can create)
-- ============================================================================

CREATE POLICY "charter_requests_insert_auth" ON charter_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "charter_requests_service_role" ON charter_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PHASE 11: Pricing quotes (service_role managed, authenticated read)
-- ============================================================================

CREATE POLICY "pricing_quotes_select_auth" ON pricing_quotes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pricing_quotes_service_role" ON pricing_quotes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PHASE 12: Analytics / Admin-only tables (service_role only)
-- ============================================================================

-- demand_forecasts
CREATE POLICY "demand_forecasts_service_role" ON demand_forecasts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- embeddings
CREATE POLICY "embeddings_service_role" ON embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- maintenance_records
CREATE POLICY "maintenance_records_service_role" ON maintenance_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- market_analytics
CREATE POLICY "market_analytics_service_role" ON market_analytics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- price_predictions
CREATE POLICY "price_predictions_service_role" ON price_predictions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- real_time_alerts
CREATE POLICY "real_time_alerts_select_auth" ON real_time_alerts
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "real_time_alerts_service_role" ON real_time_alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- DONE
-- ============================================================================
