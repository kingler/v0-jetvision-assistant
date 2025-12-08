-- JetVision AI Assistant - Operator Profiles
-- Migration: 010_operator_profiles.sql
-- Description: Flight operator profiles for 3-party communication system
-- Created: 2025-12-08

-- ============================================================================
-- TABLE: operator_profiles
-- Description: Flight operator information synced from Avinode
-- ============================================================================

CREATE TABLE operator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Avinode identifiers
  avinode_operator_id TEXT UNIQUE NOT NULL,
  avinode_company_id TEXT,

  -- Profile info
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  -- Business details
  aoc_number TEXT,                    -- Air Operator Certificate
  country_code TEXT,
  region TEXT,
  operator_rating DECIMAL(3, 2),      -- 0-5 scale from Avinode
  fleet_size INTEGER,

  -- Capabilities
  aircraft_types TEXT[] DEFAULT '{}',              -- Array of aircraft types operated
  certifications TEXT[] DEFAULT '{}',              -- ARGUS, Wyvern, IS-BAO, etc.

  -- Communication preferences
  preferred_contact_method TEXT DEFAULT 'avinode' CHECK (preferred_contact_method IN ('avinode', 'email', 'both')),
  notification_preferences JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_preferred_partner BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_operator_rating CHECK (operator_rating IS NULL OR (operator_rating >= 0 AND operator_rating <= 5)),
  CONSTRAINT valid_fleet_size CHECK (fleet_size IS NULL OR fleet_size >= 0),
  CONSTRAINT valid_contact_email CHECK (contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_operator_profiles_avinode_id ON operator_profiles(avinode_operator_id);
CREATE INDEX idx_operator_profiles_avinode_company ON operator_profiles(avinode_company_id);
CREATE INDEX idx_operator_profiles_company_name ON operator_profiles(company_name);
CREATE INDEX idx_operator_profiles_rating ON operator_profiles(operator_rating DESC NULLS LAST);
CREATE INDEX idx_operator_profiles_is_active ON operator_profiles(is_active) WHERE is_active = true;
CREATE INDEX idx_operator_profiles_preferred_partner ON operator_profiles(is_preferred_partner) WHERE is_preferred_partner = true;

-- GIN index for array searches
CREATE INDEX idx_operator_profiles_aircraft_types ON operator_profiles USING GIN (aircraft_types);
CREATE INDEX idx_operator_profiles_certifications ON operator_profiles USING GIN (certifications);

-- Comments
COMMENT ON TABLE operator_profiles IS 'Flight operator profiles synced from Avinode for multi-party communication';
COMMENT ON COLUMN operator_profiles.avinode_operator_id IS 'Unique operator identifier from Avinode system';
COMMENT ON COLUMN operator_profiles.avinode_company_id IS 'Company identifier from Avinode (may differ from operator ID)';
COMMENT ON COLUMN operator_profiles.aoc_number IS 'Air Operator Certificate number for regulatory compliance';
COMMENT ON COLUMN operator_profiles.operator_rating IS 'Avinode marketplace rating (0-5 scale)';
COMMENT ON COLUMN operator_profiles.aircraft_types IS 'Array of aircraft types this operator has in fleet';
COMMENT ON COLUMN operator_profiles.certifications IS 'Safety certifications: ARGUS, Wyvern, IS-BAO, etc.';
COMMENT ON COLUMN operator_profiles.preferred_contact_method IS 'How operator prefers to be contacted: avinode, email, or both';
COMMENT ON COLUMN operator_profiles.is_preferred_partner IS 'Flag for operators with special partnership status';
COMMENT ON COLUMN operator_profiles.last_synced_at IS 'Last time profile was synced from Avinode';

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE TRIGGER update_operator_profiles_updated_at
  BEFORE UPDATE ON operator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON operator_profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON operator_profiles TO authenticated;
GRANT SELECT ON operator_profiles TO anon;
