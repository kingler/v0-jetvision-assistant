-- Migration 008: Rollback to iso_agents
-- EMERGENCY USE ONLY - Reverts all changes from migrations 004-007
-- WARNING: New user data (avatar_url, phone, etc.) will be moved to metadata column

BEGIN;

-- Step 1: Revert RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can create users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Sales reps can view their customers" ON users;

-- Step 2: Save new columns to metadata
UPDATE users
SET metadata = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{avatar_url}',
      to_jsonb(avatar_url),
      true
    ),
    '{phone}',
    to_jsonb(phone),
    true
  ),
  '{timezone}',
  to_jsonb(timezone),
  true
)
WHERE avatar_url IS NOT NULL OR phone IS NOT NULL OR timezone != 'UTC';

-- Step 3: Revert foreign key column names
ALTER TABLE client_profiles RENAME COLUMN user_id TO iso_agent_id;
ALTER TABLE client_profiles
  DROP CONSTRAINT IF EXISTS client_profiles_user_id_fkey;
ALTER TABLE client_profiles
  ADD CONSTRAINT client_profiles_iso_agent_id_fkey
  FOREIGN KEY (iso_agent_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE requests RENAME COLUMN user_id TO iso_agent_id;
ALTER TABLE requests
  DROP CONSTRAINT IF EXISTS requests_user_id_fkey;
ALTER TABLE requests
  ADD CONSTRAINT requests_iso_agent_id_fkey
  FOREIGN KEY (iso_agent_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE quotes RENAME COLUMN user_id TO iso_agent_id;
ALTER TABLE quotes
  DROP CONSTRAINT IF EXISTS quotes_user_id_fkey;
ALTER TABLE quotes
  ADD CONSTRAINT quotes_iso_agent_id_fkey
  FOREIGN KEY (iso_agent_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workflow_states RENAME COLUMN user_id TO iso_agent_id;
ALTER TABLE workflow_states
  DROP CONSTRAINT IF EXISTS workflow_states_user_id_fkey;
ALTER TABLE workflow_states
  ADD CONSTRAINT workflow_states_iso_agent_id_fkey
  FOREIGN KEY (iso_agent_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE agent_executions RENAME COLUMN user_id TO iso_agent_id;
ALTER TABLE agent_executions
  DROP CONSTRAINT IF EXISTS agent_executions_user_id_fkey;
ALTER TABLE agent_executions
  ADD CONSTRAINT agent_executions_iso_agent_id_fkey
  FOREIGN KEY (iso_agent_id) REFERENCES users(id) ON DELETE SET NULL;

-- Step 4: Drop new columns
ALTER TABLE users
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS timezone,
  DROP COLUMN IF EXISTS preferences,
  DROP COLUMN IF EXISTS last_login_at;

-- Step 5: Rename table back
ALTER TABLE users RENAME TO iso_agents;

-- Step 6: Rename indexes back
ALTER INDEX IF EXISTS users_pkey RENAME TO iso_agents_pkey;
ALTER INDEX IF EXISTS users_clerk_user_id_key RENAME TO iso_agents_clerk_user_id_key;
ALTER INDEX IF EXISTS users_email_key RENAME TO iso_agents_email_key;
ALTER INDEX IF EXISTS idx_users_role RENAME TO idx_iso_agents_role;
ALTER INDEX IF EXISTS idx_users_is_active RENAME TO idx_iso_agents_is_active;
DROP INDEX IF EXISTS idx_users_last_login_at;

-- Step 7: Drop new indexes
DROP INDEX IF EXISTS idx_client_profiles_user_id;
DROP INDEX IF EXISTS idx_requests_user_id;
DROP INDEX IF EXISTS idx_quotes_user_id;
DROP INDEX IF EXISTS idx_workflow_states_user_id;
DROP INDEX IF EXISTS idx_agent_executions_user_id;

-- Step 8: Recreate old RLS policies
CREATE POLICY "Users can view their own profile"
  ON iso_agents
  FOR SELECT
  USING (auth.uid()::text = clerk_user_id);

CREATE POLICY "Users can update their own profile"
  ON iso_agents
  FOR UPDATE
  USING (auth.uid()::text = clerk_user_id)
  WITH CHECK (auth.uid()::text = clerk_user_id);

CREATE POLICY "Admins can view all users"
  ON iso_agents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM iso_agents
      WHERE clerk_user_id = auth.uid()::text
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Step 9: Update table comment
COMMENT ON TABLE iso_agents IS 'ISO agent accounts (deprecated - will be renamed to users)';

COMMIT;

-- Log rollback
DO $$
BEGIN
  RAISE NOTICE 'Rollback complete. Database reverted to iso_agents table.';
  RAISE NOTICE 'New user data saved to metadata column.';
END $$;
