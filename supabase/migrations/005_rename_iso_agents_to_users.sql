-- Migration 005: Rename iso_agents table to users
-- Adds new columns: avatar_url, phone, timezone, preferences, last_login_at

-- Rename the table
ALTER TABLE iso_agents RENAME TO users;

-- Rename indexes
ALTER INDEX IF EXISTS iso_agents_pkey RENAME TO users_pkey;
ALTER INDEX IF EXISTS iso_agents_clerk_user_id_key RENAME TO users_clerk_user_id_key;
ALTER INDEX IF EXISTS iso_agents_email_key RENAME TO users_email_key;
ALTER INDEX IF EXISTS idx_iso_agents_role RENAME TO idx_users_role;
ALTER INDEX IF EXISTS idx_iso_agents_is_active RENAME TO idx_users_is_active;

-- Add new columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Migrate data from metadata if exists
UPDATE users
SET
  avatar_url = (metadata->>'avatar_url'),
  phone = (metadata->>'phone'),
  timezone = COALESCE((metadata->>'timezone'), 'UTC'),
  preferences = COALESCE((metadata->'preferences')::jsonb, '{}'::jsonb)
WHERE metadata IS NOT NULL;

-- Update table comment
COMMENT ON TABLE users IS 'User accounts with RBAC roles (sales_rep, admin, customer, operator)';

-- Add column comments
COMMENT ON COLUMN users.avatar_url IS 'URL to user profile picture';
COMMENT ON COLUMN users.phone IS 'User phone number (E.164 format recommended)';
COMMENT ON COLUMN users.timezone IS 'User timezone (IANA timezone identifier)';
COMMENT ON COLUMN users.preferences IS 'User preferences as JSON (notifications, display settings, etc.)';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';

-- Create index on last_login_at for analytics queries
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);
