-- JetVision AI Assistant - Rename iso_agents to users
-- Migration: 005_rename_iso_agents_to_users.sql
-- Description: Rename iso_agents table to users and add enhanced user profile columns
-- Created: 2025-10-25
-- Dependencies: 004_update_user_roles.sql

-- ============================================================================
-- RENAME TABLE
-- ============================================================================

-- Step 1: Rename the main table
ALTER TABLE iso_agents RENAME TO users;

COMMENT ON TABLE users IS 'User profiles for sales reps, admins, customers, and operators, synced from Clerk';

-- ============================================================================
-- RENAME INDEXES
-- ============================================================================

-- Step 2: Rename all indexes to match new table name
ALTER INDEX idx_iso_agents_clerk_user_id RENAME TO idx_users_clerk_user_id;
ALTER INDEX idx_iso_agents_email RENAME TO idx_users_email;
ALTER INDEX idx_iso_agents_role RENAME TO idx_users_role;

-- ============================================================================
-- ADD NEW COLUMNS FOR ENHANCED USER PROFILES
-- ============================================================================

-- Step 3: Add new columns for richer user profiles
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add column comments
COMMENT ON COLUMN users.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.timezone IS 'User preferred timezone (default: UTC)';
COMMENT ON COLUMN users.preferences IS 'User-specific preferences and settings';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';

-- ============================================================================
-- CREATE INDEXES FOR NEW COLUMNS
-- ============================================================================

-- Step 4: Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- ============================================================================
-- UPDATE TRIGGER
-- ============================================================================

-- Step 5: Update trigger to use new table name
DROP TRIGGER IF EXISTS update_iso_agents_updated_at ON users;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATE EXISTING DATA
-- ============================================================================

-- Step 6: Set default timezone for existing users based on metadata if available
UPDATE users
SET timezone = COALESCE(
  metadata->>'timezone',
  'UTC'
)
WHERE timezone IS NULL OR timezone = 'UTC';

-- Step 7: Migrate phone numbers from metadata if available
UPDATE users
SET phone = metadata->>'phone'
WHERE phone IS NULL AND metadata->>'phone' IS NOT NULL;

-- ============================================================================
-- DATA VALIDATION
-- ============================================================================

-- Verify all users have valid roles
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO invalid_count
  FROM users
  WHERE role NOT IN ('sales_rep', 'admin', 'customer', 'operator');

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % users with invalid roles', invalid_count;
  END IF;
END $$;

-- Verify all users have clerk_user_id and email
DO $$
DECLARE
  missing_clerk_id INTEGER;
  missing_email INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_clerk_id FROM users WHERE clerk_user_id IS NULL;
  SELECT COUNT(*) INTO missing_email FROM users WHERE email IS NULL;

  IF missing_clerk_id > 0 THEN
    RAISE EXCEPTION 'Found % users with missing clerk_user_id', missing_clerk_id;
  END IF;

  IF missing_email > 0 THEN
    RAISE EXCEPTION 'Found % users with missing email', missing_email;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Display migration statistics
-- SELECT
--   role,
--   COUNT(*) as total_users,
--   COUNT(CASE WHEN is_active THEN 1 END) as active_users,
--   COUNT(CASE WHEN last_login_at IS NOT NULL THEN 1 END) as users_with_login,
--   COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as users_with_phone
-- FROM users
-- GROUP BY role
-- ORDER BY total_users DESC;

-- Verify table was renamed successfully
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('users', 'iso_agents');
-- Expected: Only 'users' should appear

-- Verify indexes were renamed
-- SELECT indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND tablename = 'users'
-- ORDER BY indexname;
