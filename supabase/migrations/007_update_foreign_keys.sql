-- JetVision AI Assistant - Update Foreign Key Constraints
-- Migration: 006_update_foreign_keys.sql
-- Description: Rename iso_agent_id to user_id in all dependent tables
-- Created: 2025-10-25
-- Dependencies: 005_rename_iso_agents_to_users.sql

-- ============================================================================
-- UPDATE client_profiles TABLE
-- ============================================================================

-- Step 1: Rename column in client_profiles
ALTER TABLE client_profiles
  RENAME COLUMN iso_agent_id TO user_id;

-- Step 2: Update column comment
COMMENT ON COLUMN client_profiles.user_id IS 'Reference to the user (sales rep) who manages this client';

-- Step 3: Rename index
ALTER INDEX idx_client_profiles_iso_agent_id
  RENAME TO idx_client_profiles_user_id;

-- ============================================================================
-- UPDATE requests TABLE
-- ============================================================================

-- Step 4: Rename column in requests
ALTER TABLE requests
  RENAME COLUMN iso_agent_id TO user_id;

-- Step 5: Update column comment
COMMENT ON COLUMN requests.user_id IS 'Reference to the user (sales rep or customer) who created this request';

-- Step 6: Rename index
ALTER INDEX idx_requests_iso_agent_id
  RENAME TO idx_requests_user_id;

-- ============================================================================
-- VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- The foreign key constraints should automatically update with column rename
-- But let's verify they still exist and point to the correct table

DO $$
DECLARE
  client_fk_exists BOOLEAN;
  request_fk_exists BOOLEAN;
BEGIN
  -- Check client_profiles foreign key
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'client_profiles'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
  ) INTO client_fk_exists;

  -- Check requests foreign key
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'requests'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
  ) INTO request_fk_exists;

  IF NOT client_fk_exists THEN
    RAISE EXCEPTION 'Foreign key constraint missing on client_profiles.user_id';
  END IF;

  IF NOT request_fk_exists THEN
    RAISE EXCEPTION 'Foreign key constraint missing on requests.user_id';
  END IF;

  RAISE NOTICE 'Foreign key constraints verified successfully';
END $$;

-- ============================================================================
-- DATA VALIDATION
-- ============================================================================

-- Verify no orphaned records in client_profiles
DO $$
DECLARE
  orphaned_clients INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO orphaned_clients
  FROM client_profiles cp
  LEFT JOIN users u ON cp.user_id = u.id
  WHERE u.id IS NULL;

  IF orphaned_clients > 0 THEN
    RAISE WARNING 'Found % orphaned client_profiles records (no matching user)', orphaned_clients;
  ELSE
    RAISE NOTICE 'No orphaned client_profiles records found';
  END IF;
END $$;

-- Verify no orphaned records in requests
DO $$
DECLARE
  orphaned_requests INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO orphaned_requests
  FROM requests r
  LEFT JOIN users u ON r.user_id = u.id
  WHERE u.id IS NULL;

  IF orphaned_requests > 0 THEN
    RAISE WARNING 'Found % orphaned requests records (no matching user)', orphaned_requests;
  ELSE
    RAISE NOTICE 'No orphaned requests records found';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Display foreign key statistics
-- SELECT
--   u.role,
--   COUNT(DISTINCT u.id) as user_count,
--   COUNT(DISTINCT cp.id) as client_count,
--   COUNT(DISTINCT r.id) as request_count
-- FROM users u
-- LEFT JOIN client_profiles cp ON cp.user_id = u.id
-- LEFT JOIN requests r ON r.user_id = u.id
-- GROUP BY u.role
-- ORDER BY user_count DESC;

-- Verify column names were updated
-- SELECT
--   table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name IN ('client_profiles', 'requests')
-- AND column_name LIKE '%user_id%'
-- ORDER BY table_name, column_name;

-- Verify indexes were renamed
-- SELECT
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND tablename IN ('client_profiles', 'requests')
-- AND indexname LIKE '%user_id%'
-- ORDER BY tablename, indexname;
