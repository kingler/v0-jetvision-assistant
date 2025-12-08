-- JetVision AI Assistant - RLS Policies for 3-Party Chat System
-- Migration: 016_rls_policies.sql
-- Description: Row Level Security policies for new chat and Avinode tables
-- Created: 2025-12-08

-- ============================================================================
-- ENABLE RLS ON ALL NEW TABLES
-- ============================================================================

ALTER TABLE operator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE avinode_webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current user's ISO agent ID from Clerk JWT
CREATE OR REPLACE FUNCTION get_current_iso_agent_id()
RETURNS UUID AS $$
DECLARE
  clerk_user_id TEXT;
  agent_id UUID;
BEGIN
  -- Get Clerk user ID from JWT
  clerk_user_id := auth.jwt() ->> 'sub';

  IF clerk_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up the ISO agent
  SELECT id INTO agent_id
  FROM iso_agents
  WHERE iso_agents.clerk_user_id = clerk_user_id
    AND is_active = true;

  RETURN agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is participant in a conversation
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  agent_id UUID;
BEGIN
  agent_id := get_current_iso_agent_id();

  IF agent_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
      AND iso_agent_id = agent_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  agent_id UUID;
  user_role user_role;
BEGIN
  agent_id := get_current_iso_agent_id();

  IF agent_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO user_role
  FROM iso_agents
  WHERE id = agent_id;

  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- OPERATOR PROFILES POLICIES
-- ============================================================================

-- All authenticated users can view active operator profiles
CREATE POLICY "operator_profiles_select_authenticated"
ON operator_profiles FOR SELECT
TO authenticated
USING (is_active = true);

-- Only service_role can insert/update/delete operator profiles
-- (Operators are managed via Avinode webhooks, not user input)
CREATE POLICY "operator_profiles_insert_service"
ON operator_profiles FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "operator_profiles_update_service"
ON operator_profiles FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "operator_profiles_delete_service"
ON operator_profiles FOR DELETE
TO service_role
USING (true);

-- Admins can also manage operator profiles
CREATE POLICY "operator_profiles_admin_all"
ON operator_profiles FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================

-- Users can only see conversations they participate in
CREATE POLICY "conversations_select_participant"
ON conversations FOR SELECT
TO authenticated
USING (
  is_conversation_participant(id) OR
  is_admin()
);

-- Users can create conversations (will auto-add themselves as participant)
CREATE POLICY "conversations_insert_authenticated"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Participants can update conversation (mark as resolved, etc.)
CREATE POLICY "conversations_update_participant"
ON conversations FOR UPDATE
TO authenticated
USING (
  is_conversation_participant(id) OR
  is_admin()
)
WITH CHECK (
  is_conversation_participant(id) OR
  is_admin()
);

-- Only admins can delete conversations (soft delete preferred)
CREATE POLICY "conversations_delete_admin"
ON conversations FOR DELETE
TO authenticated
USING (is_admin());

-- Service role has full access (for webhooks and AI)
CREATE POLICY "conversations_service_all"
ON conversations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- CONVERSATION PARTICIPANTS POLICIES
-- ============================================================================

-- Participants can see other participants in their conversations
CREATE POLICY "participants_select_in_conversation"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  is_conversation_participant(conversation_id) OR
  is_admin()
);

-- Users with invite permission can add participants
CREATE POLICY "participants_insert_with_permission"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.iso_agent_id = get_current_iso_agent_id()
      AND cp.can_invite = true
      AND cp.is_active = true
  ) OR
  is_admin()
);

-- Participants can update their own record (read status, typing, etc.)
CREATE POLICY "participants_update_own"
ON conversation_participants FOR UPDATE
TO authenticated
USING (
  iso_agent_id = get_current_iso_agent_id() OR
  is_admin()
)
WITH CHECK (
  iso_agent_id = get_current_iso_agent_id() OR
  is_admin()
);

-- Admins can remove participants
CREATE POLICY "participants_delete_admin"
ON conversation_participants FOR DELETE
TO authenticated
USING (is_admin());

-- Service role has full access
CREATE POLICY "participants_service_all"
ON conversation_participants FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Participants can read messages in their conversations
CREATE POLICY "messages_select_participant"
ON messages FOR SELECT
TO authenticated
USING (
  is_conversation_participant(conversation_id) OR
  is_admin()
);

-- Participants with reply permission can send messages
CREATE POLICY "messages_insert_with_permission"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.iso_agent_id = get_current_iso_agent_id()
      AND cp.can_reply = true
      AND cp.is_active = true
  ) OR
  is_admin()
);

-- Users can only update their own messages (for editing)
CREATE POLICY "messages_update_own"
ON messages FOR UPDATE
TO authenticated
USING (
  (sender_type = 'iso_agent' AND sender_iso_agent_id = get_current_iso_agent_id()) OR
  is_admin()
)
WITH CHECK (
  (sender_type = 'iso_agent' AND sender_iso_agent_id = get_current_iso_agent_id()) OR
  is_admin()
);

-- Soft delete - users can only delete their own messages
CREATE POLICY "messages_delete_own"
ON messages FOR DELETE
TO authenticated
USING (
  (sender_type = 'iso_agent' AND sender_iso_agent_id = get_current_iso_agent_id()) OR
  is_admin()
);

-- Service role has full access (for AI messages and webhook processing)
CREATE POLICY "messages_service_all"
ON messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- AVINODE WEBHOOK EVENTS POLICIES
-- ============================================================================

-- Regular users should NOT have direct access to webhook events
-- Only for debugging/admin purposes

-- Admins can view webhook events
CREATE POLICY "webhook_events_select_admin"
ON avinode_webhook_events FOR SELECT
TO authenticated
USING (is_admin());

-- Only service role can insert (from webhook endpoint)
CREATE POLICY "webhook_events_insert_service"
ON avinode_webhook_events FOR INSERT
TO service_role
WITH CHECK (true);

-- Only service role can update (processing status)
CREATE POLICY "webhook_events_update_service"
ON avinode_webhook_events FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Only service role can delete (cleanup old events)
CREATE POLICY "webhook_events_delete_service"
ON avinode_webhook_events FOR DELETE
TO service_role
USING (true);

-- ============================================================================
-- ADDITIONAL POLICIES FOR MODIFIED TABLES
-- ============================================================================

-- Update iso_agents policy to allow users to update their own presence
CREATE POLICY "iso_agents_update_presence"
ON iso_agents FOR UPDATE
TO authenticated
USING (clerk_user_id = auth.jwt() ->> 'sub')
WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- ============================================================================
-- GRANTS FOR HELPER FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_current_iso_agent_id TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_conversation_participant TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated, service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_current_iso_agent_id IS 'Returns the current authenticated user''s ISO agent ID';
COMMENT ON FUNCTION is_conversation_participant IS 'Checks if current user is an active participant in the conversation';
COMMENT ON FUNCTION is_admin IS 'Checks if current user has admin role';

COMMENT ON POLICY "operator_profiles_select_authenticated" ON operator_profiles IS 'All authenticated users can view active operators';
COMMENT ON POLICY "conversations_select_participant" ON conversations IS 'Users can only see conversations they participate in';
COMMENT ON POLICY "messages_select_participant" ON messages IS 'Users can only see messages in conversations they participate in';
COMMENT ON POLICY "webhook_events_select_admin" ON avinode_webhook_events IS 'Only admins can view webhook events for debugging';
