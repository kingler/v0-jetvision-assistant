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
  '11111111-1111-1111-1111-111111111111',
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
  '22222222-2222-2222-2222-222222222222',
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
  '33333333-3333-3333-3333-333333333333',
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
    '01111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
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
    '02222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
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
    '03333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
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
    '04444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
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
    '11111111-1111-1111-1111-111111111111',
    'analyzing',
    'draft',
    'agent-orchestrator-001',
    '{"analysis_result": "Valid RFP, proceeding to client data fetch"}'::jsonb,
    1250,
    NOW() - INTERVAL '48 hours'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'fetching_client_data',
    'analyzing',
    'agent-client-data-001',
    '{"client_found": true, "preferences_loaded": true}'::jsonb,
    2100,
    NOW() - INTERVAL '47 hours 58 minutes'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'searching_flights',
    'fetching_client_data',
    'agent-flight-search-001',
    '{"avinode_rfp_created": true, "operators_contacted": 15}'::jsonb,
    5400,
    NOW() - INTERVAL '47 hours 56 minutes'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'awaiting_quotes',
    'searching_flights',
    'agent-flight-search-001',
    '{"quotes_expected": 15, "quotes_received": 3}'::jsonb,
    86400000,
    NOW() - INTERVAL '47 hours 50 minutes'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'analyzing_proposals',
    'awaiting_quotes',
    'agent-proposal-analysis-001',
    '{"quotes_analyzed": 3, "best_quote_id": "q1111111-1111-1111-1111-111111111111"}'::jsonb,
    8900,
    NOW() - INTERVAL '23 hours 50 minutes'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
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
    '22222222-2222-2222-2222-222222222222',
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
    '01111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
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
    '02222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
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
    '03333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
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
    '04444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
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
    '05555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
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
