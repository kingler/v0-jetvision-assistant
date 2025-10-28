-- Migration 006: Update Foreign Keys
-- Renames iso_agent_id columns to user_id across all related tables

-- Update client_profiles table
ALTER TABLE client_profiles
  RENAME COLUMN iso_agent_id TO user_id;

ALTER TABLE client_profiles
  DROP CONSTRAINT IF EXISTS client_profiles_iso_agent_id_fkey;

ALTER TABLE client_profiles
  ADD CONSTRAINT client_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update requests table
ALTER TABLE requests
  RENAME COLUMN iso_agent_id TO user_id;

ALTER TABLE requests
  DROP CONSTRAINT IF EXISTS requests_iso_agent_id_fkey;

ALTER TABLE requests
  ADD CONSTRAINT requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update quotes table
ALTER TABLE quotes
  RENAME COLUMN iso_agent_id TO user_id;

ALTER TABLE quotes
  DROP CONSTRAINT IF EXISTS quotes_iso_agent_id_fkey;

ALTER TABLE quotes
  ADD CONSTRAINT quotes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update workflow_states table
ALTER TABLE workflow_states
  RENAME COLUMN iso_agent_id TO user_id;

ALTER TABLE workflow_states
  DROP CONSTRAINT IF EXISTS workflow_states_iso_agent_id_fkey;

ALTER TABLE workflow_states
  ADD CONSTRAINT workflow_states_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update agent_executions table
ALTER TABLE agent_executions
  RENAME COLUMN iso_agent_id TO user_id;

ALTER TABLE agent_executions
  DROP CONSTRAINT IF EXISTS agent_executions_iso_agent_id_fkey;

ALTER TABLE agent_executions
  ADD CONSTRAINT agent_executions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes on new user_id columns for performance
CREATE INDEX IF NOT EXISTS idx_client_profiles_user_id ON client_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_user_id ON workflow_states(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_id ON agent_executions(user_id);

-- Add comments
COMMENT ON COLUMN client_profiles.user_id IS 'Reference to users table (formerly iso_agent_id)';
COMMENT ON COLUMN requests.user_id IS 'Reference to users table (formerly iso_agent_id)';
COMMENT ON COLUMN quotes.user_id IS 'Reference to users table (formerly iso_agent_id)';
COMMENT ON COLUMN workflow_states.user_id IS 'Reference to users table (formerly iso_agent_id)';
COMMENT ON COLUMN agent_executions.user_id IS 'Reference to users table (formerly iso_agent_id)';
