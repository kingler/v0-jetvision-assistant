-- JetVision AI Assistant - ISO Agent Commission Tracking
-- Migration: 036_iso_agents_commission_tracking.sql
-- Description: Replace margin_type/margin_value with commission tracking fields
-- Created: 2025-01-25
--
-- Business Context:
--   Jetvision takes a 30% margin on each flight booking. ISO Agents (sales reps)
--   earn a commission on that margin. This migration updates the schema to:
--   - Track individual agent commission percentage (default 10% of Jetvision's margin)
--   - Track total commission earned per agent for reporting
--
-- Changes:
--   - ADD: commission_percentage DECIMAL(5,2) DEFAULT 10.00
--   - ADD: total_commission_earned DECIMAL(12,2) DEFAULT 0.00
--   - REMOVE: margin_type column (obsolete)
--   - REMOVE: margin_value column (obsolete)
--   - REMOVE: margin_type enum type (no longer needed)

-- ============================================================================
-- STEP 1: Add new commission tracking columns
-- ============================================================================

-- Commission percentage (0-100, default 10% of Jetvision's 30% margin)
ALTER TABLE iso_agents
  ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5, 2) DEFAULT 10.00;

-- Total commission earned (running total for reporting)
ALTER TABLE iso_agents
  ADD COLUMN IF NOT EXISTS total_commission_earned DECIMAL(12, 2) DEFAULT 0.00;

-- Add constraints for the new columns
ALTER TABLE iso_agents
  ADD CONSTRAINT valid_commission_percentage
    CHECK (commission_percentage >= 0 AND commission_percentage <= 100);

ALTER TABLE iso_agents
  ADD CONSTRAINT valid_total_commission_earned
    CHECK (total_commission_earned >= 0);

-- ============================================================================
-- STEP 2: Migrate existing data (if any margin_value exists, convert to commission)
-- Note: Old margin_value was direct percentage, new is commission on Jetvision's margin
-- ============================================================================

-- Set commission_percentage from margin_value where applicable
-- Only for 'percentage' margin_type (fixed margins don't convert cleanly)
UPDATE iso_agents
SET commission_percentage = COALESCE(margin_value, 10.00)
WHERE margin_type = 'percentage' AND margin_value IS NOT NULL AND margin_value > 0;

-- ============================================================================
-- STEP 3: Remove obsolete margin columns and constraint
-- ============================================================================

-- First drop the constraint that references margin_value
ALTER TABLE iso_agents DROP CONSTRAINT IF EXISTS valid_margin_value;

-- Drop the margin columns
ALTER TABLE iso_agents DROP COLUMN IF EXISTS margin_value;
ALTER TABLE iso_agents DROP COLUMN IF EXISTS margin_type;

-- ============================================================================
-- STEP 4: Drop the margin_type enum (no longer used anywhere)
-- ============================================================================

DROP TYPE IF EXISTS margin_type;

-- ============================================================================
-- STEP 5: Add indexes for commission tracking queries
-- ============================================================================

-- Index for finding top earners or filtering by commission rate
CREATE INDEX IF NOT EXISTS idx_iso_agents_commission_percentage
  ON iso_agents(commission_percentage);

CREATE INDEX IF NOT EXISTS idx_iso_agents_total_commission
  ON iso_agents(total_commission_earned DESC)
  WHERE is_active = true;

-- ============================================================================
-- STEP 6: Update comments
-- ============================================================================

COMMENT ON COLUMN iso_agents.commission_percentage IS 'Commission rate (0-100%) that the agent earns on Jetvision''s 30% booking margin. Default 10%.';
COMMENT ON COLUMN iso_agents.total_commission_earned IS 'Running total of commission earned by this agent. Updated when bookings are completed.';

-- ============================================================================
-- STEP 7: Create function to calculate agent commission
-- ============================================================================

-- Function to calculate commission for a given flight price
CREATE OR REPLACE FUNCTION calculate_agent_commission(
  flight_price DECIMAL(12, 2),
  agent_commission_pct DECIMAL(5, 2) DEFAULT 10.00
)
RETURNS DECIMAL(12, 2)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  jetvision_margin_pct CONSTANT DECIMAL(5, 2) := 30.00;
  jetvision_margin DECIMAL(12, 2);
  agent_commission DECIMAL(12, 2);
BEGIN
  -- Jetvision's margin is 30% of flight price
  jetvision_margin := flight_price * (jetvision_margin_pct / 100);

  -- Agent's commission is their percentage of Jetvision's margin
  agent_commission := jetvision_margin * (agent_commission_pct / 100);

  RETURN ROUND(agent_commission, 2);
END;
$$;

COMMENT ON FUNCTION calculate_agent_commission IS 'Calculates agent commission based on flight price. Agent earns commission_percentage% of Jetvision''s 30% margin.';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION calculate_agent_commission TO postgres, service_role, authenticated;
