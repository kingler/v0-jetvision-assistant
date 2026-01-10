-- ============================================================================
-- Migration: 026_add_trip_segments
-- Description: Add trip_segments table to support multi-city and round-trip flights
-- Linear Issues: ONEK-145, ONEK-146, ONEK-150
-- ============================================================================

-- ============================================================================
-- TABLE: trip_segments
-- Description: Individual flight legs for multi-segment trips
-- Supports: Round-trip (2 segments), Multi-city (3+ segments), Single-leg (1 segment)
-- ============================================================================

CREATE TABLE trip_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,

  -- Segment ordering (0-indexed)
  segment_order INTEGER NOT NULL,

  -- Flight details
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TEXT, -- HH:MM format, optional

  -- Passenger count (can vary per segment)
  passengers INTEGER NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_segment_order CHECK (segment_order >= 0),
  CONSTRAINT valid_passengers CHECK (passengers > 0 AND passengers <= 100),
  CONSTRAINT valid_airports CHECK (departure_airport <> arrival_airport),
  CONSTRAINT valid_airport_format CHECK (
    departure_airport ~ '^[A-Z0-9]{3,4}$' AND
    arrival_airport ~ '^[A-Z0-9]{3,4}$'
  ),
  CONSTRAINT valid_time_format CHECK (
    departure_time IS NULL OR
    departure_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  )
);

-- Unique constraint: only one segment per order per request
CREATE UNIQUE INDEX idx_trip_segments_request_order
  ON trip_segments(request_id, segment_order);

-- Index for efficient lookups
CREATE INDEX idx_trip_segments_request_id
  ON trip_segments(request_id);

-- Index for date-based queries
CREATE INDEX idx_trip_segments_departure_date
  ON trip_segments(departure_date);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE trip_segments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own trip segments
CREATE POLICY "Users can view own trip segments"
  ON trip_segments
  FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM requests
      WHERE iso_agent_id IN (
        SELECT id FROM iso_agents
        WHERE clerk_user_id = auth.uid()
      )
    )
  );

-- Policy: Users can insert segments for their own requests
CREATE POLICY "Users can insert own trip segments"
  ON trip_segments
  FOR INSERT
  WITH CHECK (
    request_id IN (
      SELECT id FROM requests
      WHERE iso_agent_id IN (
        SELECT id FROM iso_agents
        WHERE clerk_user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own trip segments
CREATE POLICY "Users can update own trip segments"
  ON trip_segments
  FOR UPDATE
  USING (
    request_id IN (
      SELECT id FROM requests
      WHERE iso_agent_id IN (
        SELECT id FROM iso_agents
        WHERE clerk_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    request_id IN (
      SELECT id FROM requests
      WHERE iso_agent_id IN (
        SELECT id FROM iso_agents
        WHERE clerk_user_id = auth.uid()
      )
    )
  );

-- Policy: Users can delete their own trip segments
CREATE POLICY "Users can delete own trip segments"
  ON trip_segments
  FOR DELETE
  USING (
    request_id IN (
      SELECT id FROM requests
      WHERE iso_agent_id IN (
        SELECT id FROM iso_agents
        WHERE clerk_user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Trigger: Update updated_at on modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_trip_segments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_trip_segments_updated_at
  BEFORE UPDATE ON trip_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_segments_updated_at();

-- ============================================================================
-- Modify requests table for multi-segment support
-- ============================================================================

-- Add trip type column to identify single-leg, round-trip, or multi-city
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'trip_type'
  ) THEN
    ALTER TABLE requests
      ADD COLUMN trip_type TEXT DEFAULT 'single_leg'
      CHECK (trip_type IN ('single_leg', 'round_trip', 'multi_city'));
  END IF;
END $$;

-- Add segment count column for quick access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'segment_count'
  ) THEN
    ALTER TABLE requests
      ADD COLUMN segment_count INTEGER DEFAULT 1
      CHECK (segment_count >= 1 AND segment_count <= 20);
  END IF;
END $$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE trip_segments IS 'Individual flight legs for multi-segment trips (round-trip, multi-city)';
COMMENT ON COLUMN trip_segments.segment_order IS 'Order of segment in trip (0-indexed)';
COMMENT ON COLUMN trip_segments.departure_airport IS 'ICAO or IATA airport code for departure';
COMMENT ON COLUMN trip_segments.arrival_airport IS 'ICAO or IATA airport code for arrival';
COMMENT ON COLUMN trip_segments.departure_date IS 'Date of departure for this segment';
COMMENT ON COLUMN trip_segments.departure_time IS 'Optional preferred departure time (HH:MM format)';
COMMENT ON COLUMN trip_segments.passengers IS 'Number of passengers for this segment (can vary per leg)';

COMMENT ON COLUMN requests.trip_type IS 'Type of trip: single_leg, round_trip, or multi_city';
COMMENT ON COLUMN requests.segment_count IS 'Number of flight segments (1 for single, 2 for round-trip, 3+ for multi-city)';

-- ============================================================================
-- Helper function: Get segments for a request
-- ============================================================================

CREATE OR REPLACE FUNCTION get_trip_segments(p_request_id UUID)
RETURNS TABLE (
  segment_order INTEGER,
  departure_airport TEXT,
  arrival_airport TEXT,
  departure_date DATE,
  departure_time TEXT,
  passengers INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.segment_order,
    ts.departure_airport,
    ts.arrival_airport,
    ts.departure_date,
    ts.departure_time,
    ts.passengers
  FROM trip_segments ts
  WHERE ts.request_id = p_request_id
  ORDER BY ts.segment_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_trip_segments(UUID) TO authenticated;

-- ============================================================================
-- End of Migration
-- ============================================================================
