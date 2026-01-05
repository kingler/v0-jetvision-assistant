/**
 * Message Persistence Utilities
 * 
 * Handles saving and loading chat messages to/from Supabase database.
 * Ensures all chat conversations are persisted and recoverable across page refreshes.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
type MessageSenderType = string;
type MessageContentType = string;
type MessageStatus = string;
type ConversationType = string;

/**
 * Interface for creating a conversation
 */
export interface CreateConversationParams {
  requestId?: string; // Optional - can create conversation before request exists
  userId: string;
  subject?: string;
  type?: ConversationType;
}

/**
 * Interface for saving a message
 */
export interface SaveMessageParams {
  conversationId: string;
  senderType: MessageSenderType;
  senderIsoAgentId?: string;
  senderOperatorId?: string;
  senderName?: string;
  content: string;
  contentType?: MessageContentType;
  richContent?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Get or create a conversation for a request
 * 
 * If requestId is provided, looks for existing conversation linked to that request.
 * If no requestId or no existing conversation, creates a new one.
 * 
 * @param params - Conversation creation parameters
 * @returns Conversation ID
 */
export async function getOrCreateConversation(
  params: CreateConversationParams
): Promise<string> {
  // If requestId is provided, check for existing conversation
  if (params.requestId) {
    // Validate that requestId is a valid UUID (not a temp ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidRequestId = uuidRegex.test(params.requestId);

    if (isValidRequestId) {
      const { data: existing, error: findError } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('request_id', params.requestId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) {
        console.error('[Message Persistence] Error finding conversation:', findError);
        throw new Error(`Failed to find conversation: ${findError.message}`);
      }

      // Return existing conversation ID if found
      if (existing) {
        return existing.id;
      }
    }
  }

  // Create new conversation (with or without request_id)
  const { data: newConversation, error: createError } = await supabaseAdmin
    .from('conversations')
    .insert({
      request_id: params.requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.requestId)
        ? params.requestId
        : null,
      type: params.type || 'rfp_negotiation',
      status: 'active',
      subject: params.subject || null,
      metadata: {},
    })
    .select('id')
    .single();

  if (createError) {
    console.error('[Message Persistence] Error creating conversation:', createError);
    throw new Error(`Failed to create conversation: ${createError.message}`);
  }

  // Create participant record to link user to conversation
  // This is required so the user can see and access the conversation
  // Use supabaseAdmin to bypass RLS (service role has full access per policy)
  const { error: participantError } = await supabaseAdmin
    .from('conversation_participants')
    .insert({
      conversation_id: newConversation.id,
      iso_agent_id: params.userId,
      role: 'iso_agent',
      is_active: true,
      can_reply: true,
      can_invite: false,
      notifications_enabled: true,
    });

  if (participantError) {
    console.error('[Message Persistence] Error creating conversation participant:', participantError);
    // Don't throw - conversation was created, participant creation failure is non-fatal
    // But log it so we know something went wrong
  } else {
    console.log('[Message Persistence] ✅ Created conversation participant for user:', params.userId);
  }

  // Also add AI assistant as a participant (for system messages)
  const { error: aiParticipantError } = await supabaseAdmin
    .from('conversation_participants')
    .insert({
      conversation_id: newConversation.id,
      role: 'ai_assistant',
      is_active: true,
      can_reply: true,
      can_invite: false,
      notifications_enabled: false,
    });

  if (aiParticipantError) {
    // Non-fatal - log but don't throw
    console.warn('[Message Persistence] Warning: Could not create AI assistant participant:', aiParticipantError);
  }

  // Update request with primary_conversation_id if requestId was provided and is valid
  if (params.requestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.requestId)) {
    await supabaseAdmin
      .from('requests')
      .update({ primary_conversation_id: newConversation.id })
      .eq('id', params.requestId)
      .is('primary_conversation_id', null);
  }

  return newConversation.id;
}

/**
 * Get conversation ID for a request
 * 
 * @param requestId - Request ID
 * @returns Conversation ID or null if not found
 */
export async function getConversationForRequest(
  requestId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('request_id', requestId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Message Persistence] Error getting conversation:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Link a conversation to a request
 * 
 * Used when a request is created after a conversation already exists
 * (e.g., when a new chat creates a request via the chat API)
 * 
 * @param conversationId - Conversation ID to link
 * @param requestId - Request ID to link to
 */
export async function linkConversationToRequest(
  conversationId: string,
  requestId: string
): Promise<void> {
  const { error: updateError } = await supabaseAdmin
    .from('conversations')
    .update({ request_id: requestId })
    .eq('id', conversationId)
    .is('request_id', null); // Only update if request_id is currently null

  if (updateError) {
    console.error('[Message Persistence] Error linking conversation to request:', updateError);
    throw new Error(`Failed to link conversation to request: ${updateError.message}`);
  }

  // Also update request with primary_conversation_id if not set
  await supabaseAdmin
    .from('requests')
    .update({ primary_conversation_id: conversationId })
    .eq('id', requestId)
    .is('primary_conversation_id', null);

  console.log('[Message Persistence] Linked conversation to request:', {
    conversationId,
    requestId,
  });
}

/**
 * Save a message to the database
 * 
 * @param params - Message parameters
 * @returns Message ID
 */
export async function saveMessage(
  params: SaveMessageParams
): Promise<string> {
  // Validate sender based on sender type
  if (params.senderType === 'iso_agent' && !params.senderIsoAgentId) {
    throw new Error('senderIsoAgentId is required for iso_agent sender type');
  }
  if (params.senderType === 'operator' && !params.senderOperatorId) {
    throw new Error('senderOperatorId is required for operator sender type');
  }

  const { data: message, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_type: params.senderType,
      sender_iso_agent_id: params.senderIsoAgentId || null,
      sender_operator_id: params.senderOperatorId || null,
      sender_name: params.senderName || null,
      content: params.content,
      content_type: params.contentType || 'text',
      rich_content: params.richContent || null,
      status: 'sent',
      metadata: params.metadata || {},
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Message Persistence] Error saving message:', error);
    throw new Error(`Failed to save message: ${error.message}`);
  }

  return message.id;
}

/**
 * Load messages for a conversation
 * 
 * @param conversationId - Conversation ID
 * @param limit - Maximum number of messages to load (default: 100)
 * @returns Array of messages
 */
export async function loadMessages(
  conversationId: string,
  limit: number = 100
): Promise<Array<{
  id: string;
  senderType: MessageSenderType;
  senderName: string | null;
  content: string;
  contentType: MessageContentType;
  richContent: Record<string, unknown> | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}>> {
  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender_type, sender_name, content, content_type, rich_content, created_at, metadata')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Message Persistence] Error loading messages:', error);
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  return (messages || []).map((msg) => ({
    id: msg.id,
    senderType: msg.sender_type,
    senderName: msg.sender_name,
    content: msg.content || '',
    contentType: msg.content_type,
    richContent: msg.rich_content as Record<string, unknown> | null,
    createdAt: msg.created_at || '',
    metadata: msg.metadata as Record<string, unknown> | null,
  }));
}

/**
 * Get user's ISO agent ID from Clerk user ID
 * 
 * @param clerkUserId - Clerk user ID
 * @returns ISO agent ID or null
 */
export async function getIsoAgentIdFromClerkUserId(
  clerkUserId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('iso_agents')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error || !data) {
    console.error('[Message Persistence] Error getting ISO agent ID:', error);
    return null;
  }

  return data.id;
}
