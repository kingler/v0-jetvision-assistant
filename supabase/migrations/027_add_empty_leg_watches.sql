-- ============================================================================
-- Migration: 027_add_empty_leg_watches
-- Description: Add empty leg watches and matches tables for monitoring empty leg flights
-- Linear Issues: ONEK-147, ONEK-148
-- ============================================================================

-- ============================================================================
-- TABLE: empty_leg_watches
-- Description: User subscriptions to monitor empty leg flights on specific routes
-- ============================================================================

CREATE TABLE empty_leg_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,

  -- Route criteria
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,

  -- Date range (up to 90 days)
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,

  -- Filter criteria
  passengers INTEGER NOT NULL,
  max_price DECIMAL(12, 2),
  aircraft_categories TEXT[] DEFAULT '{}',

  -- Notification settings
  notification_email TEXT,
  webhook_url TEXT,

  -- Watch status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'cancelled')),

  -- Avinode watch ID (if synced with Avinode API)
  avinode_watch_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_passengers CHECK (passengers > 0 AND passengers <= 100),
  CONSTRAINT valid_price CHECK (max_price IS NULL OR max_price > 0),
  CONSTRAINT valid_date_range CHECK (date_range_end >= date_range_start),
  CONSTRAINT valid_date_range_max CHECK (date_range_end <= date_range_start + INTERVAL '90 days'),
  CONSTRAINT valid_airport_format CHECK (
    departure_airport ~ '^[A-Z0-9]{3,4}$' AND
    arrival_airport ~ '^[A-Z0-9]{3,4}$'
  ),
  CONSTRAINT different_airports CHECK (departure_airport <> arrival_airport)
);

-- Indexes
CREATE INDEX idx_empty_leg_watches_iso_agent
  ON empty_leg_watches(iso_agent_id);
CREATE INDEX idx_empty_leg_watches_status
  ON empty_leg_watches(status)
  WHERE status = 'active';
CREATE INDEX idx_empty_leg_watches_route
  ON empty_leg_watches(departure_airport, arrival_airport);
CREATE INDEX idx_empty_leg_watches_date_range
  ON empty_leg_watches(date_range_start, date_range_end);
CREATE INDEX idx_empty_leg_watches_avinode_id
  ON empty_leg_watches(avinode_watch_id)
  WHERE avinode_watch_id IS NOT NULL;

-- ============================================================================
-- TABLE: empty_leg_matches
-- Description: Empty leg flights that match a user's watch criteria
-- ============================================================================

CREATE TABLE empty_leg_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id UUID NOT NULL REFERENCES empty_leg_watches(id) ON DELETE CASCADE,

  -- Avinode empty leg ID
  empty_leg_id TEXT NOT NULL,

  -- Route details
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TEXT,

  -- Pricing
  price DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  discount_percentage INTEGER,
  regular_price DECIMAL(12, 2),

  -- Aircraft details
  aircraft_type TEXT NOT NULL,
  aircraft_model TEXT,
  aircraft_category TEXT,
  aircraft_capacity INTEGER,
  aircraft_registration TEXT,

  -- Operator details
  operator_id TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  operator_rating DECIMAL(3, 2),

  -- Status
  viewed BOOLEAN DEFAULT false,
  interested BOOLEAN DEFAULT false,
  valid_until TIMESTAMPTZ,

  -- Deep link to Avinode
  deep_link TEXT,

  -- Metadata
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_price CHECK (price > 0),
  CONSTRAINT valid_discount CHECK (
    discount_percentage IS NULL OR
    (discount_percentage >= 0 AND discount_percentage <= 100)
  ),
  CONSTRAINT valid_capacity CHECK (
    aircraft_capacity IS NULL OR aircraft_capacity > 0
  )
);

-- Unique constraint: one match per empty leg per watch
CREATE UNIQUE INDEX idx_empty_leg_matches_unique
  ON empty_leg_matches(watch_id, empty_leg_id);

-- Indexes
CREATE INDEX idx_empty_leg_matches_watch
  ON empty_leg_matches(watch_id);
CREATE INDEX idx_empty_leg_matches_viewed
  ON empty_leg_matches(watch_id, viewed)
  WHERE viewed = false;
CREATE INDEX idx_empty_leg_matches_interested
  ON empty_leg_matches(watch_id, interested)
  WHERE interested = true;
CREATE INDEX idx_empty_leg_matches_departure
  ON empty_leg_matches(departure_date);
CREATE INDEX idx_empty_leg_matches_valid
  ON empty_leg_matches(valid_until)
  WHERE valid_until > NOW();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE empty_leg_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE empty_leg_matches ENABLE ROW LEVEL SECURITY;

-- Policies for empty_leg_watches

CREATE POLICY "Users can view own watches"
  ON empty_leg_watches
  FOR SELECT
  USING (
    iso_agent_id IN (
      SELECT id FROM iso_agents
      WHERE clerk_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own watches"
  ON empty_leg_watches
  FOR INSERT
  WITH CHECK (
    iso_agent_id IN (
      SELECT id FROM iso_agents
      WHERE clerk_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own watches"
  ON empty_leg_watches
  FOR UPDATE
  USING (
    iso_agent_id IN (
      SELECT id FROM iso_agents
      WHERE clerk_user_id = auth.uid()
    )
  )
  WITH CHECK (
    iso_agent_id IN (
      SELECT id FROM iso_agents
      WHERE clerk_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own watches"
  ON empty_leg_watches
  FOR DELETE
  USING (
    iso_agent_id IN (
      SELECT id FROM iso_agents
      WHERE clerk_user_id = auth.uid()
    )
  );

-- Policies for empty_leg_matches

CREATE POLICY "Users can view matches for own watches"
  ON empty_leg_matches
  FOR SELECT
  USING (
    watch_id IN (
      SELECT id FROM empty_leg_watches
      WHERE iso_agent_id IN (
        SELECT id FROM iso_agents
        WHERE clerk_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update matches for own watches"
  ON empty_leg_matches
  FOR UPDATE
  USING (
    watch_id IN (
      SELECT id FROM empty_leg_watches
      WHERE iso_agent_id IN (
        SELECT id FROM iso_agents
        WHERE clerk_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    watch_id IN (
      SELECT id FROM empty_leg_watches
      WHERE iso_agent_id IN (
        SELECT id FROM iso_agents
        WHERE clerk_user_id = auth.uid()
      )
    )
  );

-- System can insert matches (from webhook handler)
CREATE POLICY "System can insert matches"
  ON empty_leg_matches
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update updated_at on modification
CREATE OR REPLACE FUNCTION update_empty_leg_watches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_empty_leg_watches_updated_at
  BEFORE UPDATE ON empty_leg_watches
  FOR EACH ROW
  EXECUTE FUNCTION update_empty_leg_watches_updated_at();

-- Set viewed_at when viewed is set to true
CREATE OR REPLACE FUNCTION set_empty_leg_match_viewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.viewed = true AND OLD.viewed = false THEN
    NEW.viewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_empty_leg_match_viewed
  BEFORE UPDATE ON empty_leg_matches
  FOR EACH ROW
  EXECUTE FUNCTION set_empty_leg_match_viewed_at();

-- Auto-expire watches when date range passes
CREATE OR REPLACE FUNCTION expire_old_watches()
RETURNS void AS $$
BEGIN
  UPDATE empty_leg_watches
  SET status = 'expired'
  WHERE status = 'active'
    AND date_range_end < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get active watches for a route
CREATE OR REPLACE FUNCTION get_active_watches_for_route(
  p_departure TEXT,
  p_arrival TEXT,
  p_date DATE
)
RETURNS TABLE (
  watch_id UUID,
  iso_agent_id UUID,
  passengers INTEGER,
  max_price DECIMAL,
  aircraft_categories TEXT[],
  notification_email TEXT,
  webhook_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id AS watch_id,
    w.iso_agent_id,
    w.passengers,
    w.max_price,
    w.aircraft_categories,
    w.notification_email,
    w.webhook_url
  FROM empty_leg_watches w
  WHERE w.status = 'active'
    AND w.departure_airport = p_departure
    AND w.arrival_airport = p_arrival
    AND p_date BETWEEN w.date_range_start AND w.date_range_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unviewed matches count for a user
CREATE OR REPLACE FUNCTION get_unviewed_matches_count(p_iso_agent_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM empty_leg_matches m
    JOIN empty_leg_watches w ON m.watch_id = w.id
    WHERE w.iso_agent_id = p_iso_agent_id
      AND m.viewed = false
      AND (m.valid_until IS NULL OR m.valid_until > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_watches_for_route(TEXT, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unviewed_matches_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_watches() TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE empty_leg_watches IS 'User subscriptions to monitor empty leg flights on specific routes';
COMMENT ON COLUMN empty_leg_watches.departure_airport IS 'ICAO code for departure airport';
COMMENT ON COLUMN empty_leg_watches.arrival_airport IS 'ICAO code for arrival airport';
COMMENT ON COLUMN empty_leg_watches.date_range_start IS 'Start date of monitoring period';
COMMENT ON COLUMN empty_leg_watches.date_range_end IS 'End date of monitoring period (max 90 days from start)';
COMMENT ON COLUMN empty_leg_watches.max_price IS 'Maximum price threshold for notifications (USD)';
COMMENT ON COLUMN empty_leg_watches.aircraft_categories IS 'Filter by aircraft category (light, midsize, heavy, ultra-long-range)';
COMMENT ON COLUMN empty_leg_watches.avinode_watch_id IS 'Watch ID from Avinode API if synced';

COMMENT ON TABLE empty_leg_matches IS 'Empty leg flights matching user watch criteria';
COMMENT ON COLUMN empty_leg_matches.empty_leg_id IS 'Avinode empty leg flight ID';
COMMENT ON COLUMN empty_leg_matches.discount_percentage IS 'Discount from regular charter price';
COMMENT ON COLUMN empty_leg_matches.viewed IS 'Whether user has viewed this match';
COMMENT ON COLUMN empty_leg_matches.interested IS 'Whether user marked as interested';
COMMENT ON COLUMN empty_leg_matches.deep_link IS 'Direct link to view in Avinode';

-- ============================================================================
-- End of Migration
-- ============================================================================
