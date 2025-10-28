-- Migration 004: Update User Roles
-- Add 4 new user roles: sales_rep, admin, customer, operator
-- Migrates existing iso_agent roles to sales_rep

-- Drop existing check constraint if it exists
ALTER TABLE iso_agents DROP CONSTRAINT IF EXISTS iso_agents_role_check;

-- Update the role enum type
-- First, add the new values
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_rep';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operator';

-- Migrate existing iso_agent roles to sales_rep
UPDATE iso_agents
SET role = 'sales_rep'
WHERE role = 'iso_agent';

-- Add check constraint for valid roles
ALTER TABLE iso_agents
ADD CONSTRAINT iso_agents_role_check
CHECK (role IN ('sales_rep', 'admin', 'customer', 'operator', 'iso_agent'));

-- Add comment
COMMENT ON COLUMN iso_agents.role IS 'User role: sales_rep, admin, customer, operator (iso_agent is deprecated)';
