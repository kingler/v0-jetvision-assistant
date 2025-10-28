-- Migration 007: Update Row Level Security (RLS) Policies
-- Drops old policies from iso_agents table, creates new ones for users table

-- Drop existing policies on iso_agents table (if they exist)
DROP POLICY IF EXISTS "Users can view their own profile" ON iso_agents;
DROP POLICY IF EXISTS "Users can update their own profile" ON iso_agents;
DROP POLICY IF EXISTS "Admins can view all users" ON iso_agents;
DROP POLICY IF EXISTS "Admins can create users" ON iso_agents;
DROP POLICY IF EXISTS "Admins can update all users" ON iso_agents;
DROP POLICY IF EXISTS "Admins can delete users" ON iso_agents;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  USING (auth.uid()::text = clerk_user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  USING (auth.uid()::text = clerk_user_id)
  WITH CHECK (auth.uid()::text = clerk_user_id);

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_user_id = auth.uid()::text
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Policy: Admins can create users
CREATE POLICY "Admins can create users"
  ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_user_id = auth.uid()::text
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Policy: Admins can update all users
CREATE POLICY "Admins can update all users"
  ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_user_id = auth.uid()::text
      AND role = 'admin'
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_user_id = auth.uid()::text
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Policy: Admins can delete users (soft delete via is_active)
CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE clerk_user_id = auth.uid()::text
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Policy: Sales reps can view customers assigned to them
CREATE POLICY "Sales reps can view their customers"
  ON users
  FOR SELECT
  USING (
    role = 'customer'
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.clerk_user_id = auth.uid()::text
      AND u.role = 'sales_rep'
      AND u.is_active = true
    )
  );

-- Add grants for authenticated users
GRANT SELECT ON users TO authenticated;
GRANT INSERT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;
GRANT DELETE ON users TO authenticated;

-- Add comments
COMMENT ON POLICY "Users can view their own profile" ON users IS 'Allows users to view their own profile data';
COMMENT ON POLICY "Users can update their own profile" ON users IS 'Allows users to update their own profile data';
COMMENT ON POLICY "Admins can view all users" ON users IS 'Allows admin users to view all user profiles';
COMMENT ON POLICY "Admins can create users" ON users IS 'Allows admin users to create new user accounts';
COMMENT ON POLICY "Admins can update all users" ON users IS 'Allows admin users to update any user profile';
COMMENT ON POLICY "Admins can delete users" ON users IS 'Allows admin users to delete user accounts';
COMMENT ON POLICY "Sales reps can view their customers" ON users IS 'Allows sales reps to view customer profiles';
