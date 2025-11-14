-- Jetvision AI Assistant - Update User Roles
-- Migration: 004_update_user_roles.sql
-- Description: Add new role values for multi-role support (sales_rep, customer)
-- Created: 2025-10-25
-- Dependencies: 001_initial_schema.sql

-- ============================================================================
-- ADD NEW ROLE VALUES TO ENUM
-- ============================================================================

-- PostgreSQL doesn't allow modifying enums directly with ALTER TYPE if values exist
-- We need to create a new enum and migrate the data

-- Step 1: Create new enum with all desired values
CREATE TYPE user_role_new AS ENUM (
  'sales_rep',      -- New: Sales representative (replaces iso_agent)
  'admin',          -- Existing: Administrative users
  'customer',       -- New: Customer users
  'operator',       -- Existing: System operators (keep for compatibility)
  'iso_agent'       -- Legacy: Keep temporarily for migration compatibility
);

-- Step 2: Add temporary column with new enum type
ALTER TABLE iso_agents
  ADD COLUMN role_new user_role_new;

-- Step 3: Migrate existing data to new enum
-- Map iso_agent -> sales_rep (this is the main migration)
UPDATE iso_agents
SET role_new = CASE
  WHEN role::text = 'iso_agent' THEN 'sales_rep'::user_role_new
  WHEN role::text = 'admin' THEN 'admin'::user_role_new
  WHEN role::text = 'operator' THEN 'operator'::user_role_new
  ELSE 'customer'::user_role_new  -- Default fallback (shouldn't happen)
END;

-- Step 4: Verify all records have been migrated
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM iso_agents WHERE role_new IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: Some records have NULL role_new';
  END IF;
END $$;

-- Step 5: Drop old role column and configure new one
ALTER TABLE iso_agents
  DROP COLUMN role,
  ALTER COLUMN role_new SET NOT NULL,
  ALTER COLUMN role_new SET DEFAULT 'customer'::user_role_new;

-- Step 6: Rename the new column to replace old one
ALTER TABLE iso_agents
  RENAME COLUMN role_new TO role;

-- Step 7: Drop old enum type and rename new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Step 7: Recreate index on role column (it was dropped with the column)
CREATE INDEX idx_iso_agents_role ON iso_agents(role);

-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================

COMMENT ON TYPE user_role IS 'User role types: sales_rep (sales representative), admin (administrator), customer (end customer), operator (system operator)';

COMMENT ON COLUMN iso_agents.role IS 'User role: sales_rep, admin, customer, or operator';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Verify the migration
-- SELECT role, COUNT(*) as count
-- FROM iso_agents
-- GROUP BY role
-- ORDER BY count DESC;

-- Expected output:
-- role        | count
-- ------------|-------
-- sales_rep   | X     (all former iso_agents)
-- admin       | Y     (unchanged)
-- operator    | Z     (unchanged if any)
