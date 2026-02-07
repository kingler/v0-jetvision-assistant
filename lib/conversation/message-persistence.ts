/**
 * Message Persistence Utilities (Consolidated Schema)
 *
 * Handles saving and loading chat messages to/from Supabase database.
 * Ensures all chat conversations are persisted and recoverable across page refreshes.
 *
 * NOTE: After schema consolidation (migration 030-033), messages link directly
 * to requests via `request_id`. The old `conversations` and `conversation_participants`
 * tables are deprecated.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

type MessageSenderType = 'iso_agent' | 'operator' | 'ai_assistant' | 'system';
type MessageContentType =
  | 'text'
  | 'rich'
  | 'system'
  | 'action'
  | 'quote'
  | 'proposal_shared'
  | 'contract_shared'
  // Email approval workflow types (human-in-the-loop)
  | 'email_approval_request'
  | 'email_approved'
  | 'email_rejected'
  // Margin / customer selection summary
  | 'margin_selection';

/**
 * Interface for saving a message (consolidated schema)
 */
export interface SaveMessageParams {
  requestId: string;
  quoteId?: string; // Optional - for operator message threading
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
 * Interface for backward compatibility - maps to SaveMessageParams
 * @deprecated Use SaveMessageParams with requestId instead
 */
export interface SaveMessageParamsLegacy {
  conversationId: string; // Maps to requestId in new schema
  senderType: string;
  senderIsoAgentId?: string;
  senderOperatorId?: string;
  senderName?: string;
  content: string;
  contentType?: string;
  richContent?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for creating a conversation (now creates/updates a request)
 * @deprecated With consolidated schema, work with requests directly
 */
export interface CreateConversationParams {
  requestId?: string;
  userId: string;
  subject?: string;
  type?: string;
}

/**
 * Get or create a request for messaging
 *
 * If requestId is provided and valid, returns it.
 * If no requestId, creates a new draft request.
 *
 * @param params - Conversation creation parameters
 * @returns Request ID
 */
export async function getOrCreateConversation(
  params: CreateConversationParams
): Promise<string> {
  // If requestId is provided and valid, return it
  if (params.requestId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(params.requestId)) {
      // Verify request exists
      const { data: existing, error: findError } = await supabaseAdmin
        .from('requests')
        .select('id')
        .eq('id', params.requestId)
        .maybeSingle();

      if (findError) {
        console.error('[Message Persistence] Error finding request:', findError);
        throw new Error(`Failed to find request: ${findError.message}`);
      }

      if (existing) {
        return existing.id;
      }
    }
  }

  // Create new draft request for conversation
  const { data: newRequest, error: createError } = await supabaseAdmin
    .from('requests')
    .insert({
      iso_agent_id: params.userId,
      departure_airport: '',
      arrival_airport: '',
      departure_date: new Date().toISOString().split('T')[0], // Default to today, will be updated when details are provided
      passengers: 1,
      status: 'draft',
      session_status: 'active',
      conversation_type: (params.type === 'general' ? 'general' : 'flight_request') as 'flight_request' | 'general',
      subject: params.subject || null,
      session_started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (createError) {
    console.error('[Message Persistence] Error creating request:', createError);
    throw new Error(`Failed to create request: ${createError.message}`);
  }

  console.log('[Message Persistence] Created request for conversation:', newRequest.id);
  return newRequest.id;
}

/**
 * Get request ID for a conversation (backward compatibility)
 *
 * @param requestId - Request ID
 * @returns Request ID or null if not found
 * @deprecated Use requestId directly
 */
export async function getConversationForRequest(
  requestId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('requests')
    .select('id')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    console.error('[Message Persistence] Error getting request:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Link a conversation to a request (no-op in new schema)
 *
 * @param conversationId - Request ID (conversation = request now)
 * @param requestId - Should be same as conversationId
 * @deprecated No longer needed - messages link directly to requests
 */
export async function linkConversationToRequest(
  conversationId: string,
  requestId: string
): Promise<void> {
  // In the new schema, conversationId IS the requestId
  // This function exists for backward compatibility
  console.log('[Message Persistence] linkConversationToRequest is deprecated:', {
    conversationId,
    requestId,
  });
}

/**
 * Save a message to the database (new schema)
 *
 * @param params - Message parameters with requestId
 * @returns Message ID
 */
export async function saveMessage(
  params: SaveMessageParams | SaveMessageParamsLegacy
): Promise<string> {
  // Handle both new and legacy params
  const requestId = 'requestId' in params ? params.requestId : params.conversationId;
  const quoteId = 'quoteId' in params ? params.quoteId : undefined;

  // Validate sender based on sender type
  if (params.senderType === 'iso_agent' && !params.senderIsoAgentId) {
    throw new Error('senderIsoAgentId is required for iso_agent sender type');
  }
  if (params.senderType === 'operator' && !params.senderOperatorId) {
    throw new Error('senderOperatorId is required for operator sender type');
  }

  const insertData = {
    request_id: requestId,
    quote_id: quoteId || null,
    sender_type: params.senderType as 'iso_agent' | 'operator' | 'ai_assistant' | 'system',
    sender_iso_agent_id: params.senderIsoAgentId || null,
    sender_operator_id: params.senderOperatorId || null,
    sender_name: params.senderName || null,
    content: params.content,
    content_type: (params.contentType || 'text') as MessageContentType,
    rich_content: params.richContent as Record<string, unknown> | null || null,
    status: 'sent' as 'draft' | 'sent' | 'delivered' | 'read' | 'failed',
    metadata: params.metadata as Record<string, unknown> || {},
  };
  const { data: message, error } = await supabaseAdmin
    .from('messages')
    // @ts-expect-error - insertData matches schema but TypeScript inference is incomplete
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('[Message Persistence] Error saving message:', error);
    throw new Error(`Failed to save message: ${error.message}`);
  }

  return message.id;
}

/**
 * Save a message with request ID (explicit new schema)
 *
 * @param params - Message parameters
 * @returns Message ID
 */
export async function saveMessageToRequest(
  params: SaveMessageParams
): Promise<string> {
  return saveMessage(params);
}

/**
 * Load messages for a request
 *
 * @param requestId - Request ID
 * @param options - Optional filters (quoteId, limit)
 * @returns Array of messages
 */
export async function loadMessages(
  requestId: string,
  options?: {
    quoteId?: string; // Filter by quote for operator threading
    limit?: number;
    includeDeleted?: boolean;
  }
): Promise<Array<{
  id: string;
  requestId: string;
  quoteId: string | null;
  senderType: MessageSenderType;
  senderName: string | null;
  content: string;
  contentType: MessageContentType;
  richContent: Record<string, unknown> | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}>> {
  let query = supabaseAdmin
    .from('messages')
    .select('id, request_id, quote_id, sender_type, sender_name, content, content_type, rich_content, created_at, metadata')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  // Filter by quote_id if provided (for operator threading)
  if (options?.quoteId) {
    query = query.eq('quote_id', options.quoteId);
  }

  // Exclude soft-deleted messages unless explicitly requested
  if (!options?.includeDeleted) {
    query = query.is('deleted_at', null);
  }

  // Apply limit
  if (options?.limit) {
    query = query.limit(options.limit);
  } else {
    query = query.limit(100);
  }

  const { data: messages, error } = await query;

  if (error) {
    console.error('[Message Persistence] Error loading messages:', error);
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  const mappedMessages = (messages || []).map((msg) => ({
    id: msg.id,
    requestId: msg.request_id || '',
    quoteId: msg.quote_id,
    senderType: msg.sender_type as MessageSenderType,
    senderName: msg.sender_name,
    content: msg.content || '',
    contentType: msg.content_type as MessageContentType,
    richContent: msg.rich_content as Record<string, unknown> | null,
    createdAt: msg.created_at || '',
    metadata: msg.metadata as Record<string, unknown> | null,
  }));

  // Filter out operator messages that were created before the first user (iso_agent) message
  // 
  // This handles edge cases where operator messages can predate the initial request:
  // 1. Data import/backfill: Trip created in Avinode first, operators responded, then request imported later
  // 2. Webhook timestamps: Operator messages from webhooks use original Avinode timestamps (message.sentAt)
  //    which may predate when the request was created in our system
  //
  // In normal flow, operators shouldn't be able to message before a request exists, but we filter
  // to ensure the user's initial request always appears first in the conversation UI.
  const firstUserMessage = mappedMessages.find(
    (msg) => msg.senderType === 'iso_agent'
  );

  if (firstUserMessage) {
    const firstUserMessageTime = new Date(firstUserMessage.createdAt).getTime();
    
    // Filter out operator messages created before the first user message
    // Keep all other messages (ai_assistant, system, etc.)
    return mappedMessages.filter((msg) => {
      if (msg.senderType === 'operator') {
        const msgTime = new Date(msg.createdAt).getTime();
        // Only include operator messages that were created after the first user message
        // This ensures proper conversation flow: user request → operator responses
        return msgTime >= firstUserMessageTime;
      }
      // Keep all non-operator messages
      return true;
    });
  }

  // If no user message found, return all messages as-is
  return mappedMessages;
}

/**
 * Load messages grouped by operator (quote_id)
 *
 * @param requestId - Request ID
 * @returns Messages grouped by quote_id
 */
export async function loadMessagesGroupedByOperator(
  requestId: string
): Promise<Map<string | null, Array<{
  id: string;
  quoteId: string | null;
  senderType: MessageSenderType;
  senderName: string | null;
  content: string;
  createdAt: string;
}>>> {
  const messages = await loadMessages(requestId, { limit: 500 });

  const grouped = new Map<string | null, typeof messages>();

  for (const msg of messages) {
    const key = msg.quoteId;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(msg);
  }

  return grouped;
}

/**
 * Get operator threads for a request
 *
 * @param requestId - Request ID
 * @returns Array of operator thread summaries
 */
export async function getOperatorThreads(
  requestId: string
): Promise<Array<{
  quoteId: string;
  operatorName: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  hasUnread: boolean;
}>> {
  // Get quotes for this request
  const { data: quotes, error: quotesError } = await supabaseAdmin
    .from('quotes')
    .select('id, operator_name')
    .eq('request_id', requestId);

  if (quotesError) {
    console.error('[Message Persistence] Error fetching quotes:', quotesError);
    return [];
  }

  // Get message counts per quote
  const threads: Array<{
    quoteId: string;
    operatorName: string | null;
    messageCount: number;
    lastMessageAt: string | null;
    hasUnread: boolean;
  }> = [];

  for (const quote of quotes || []) {
    const { data: messages, count } = await supabaseAdmin
      .from('messages')
      .select('id, created_at, read_by', { count: 'exact' })
      .eq('request_id', requestId)
      .eq('quote_id', quote.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastMessage = messages?.[0];

    // Check if there are unread operator messages
    const { count: unreadCount } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('request_id', requestId)
      .eq('quote_id', quote.id)
      .eq('sender_type', 'operator')
      .is('deleted_at', null);

    threads.push({
      quoteId: quote.id,
      operatorName: quote.operator_name,
      messageCount: count || 0,
      lastMessageAt: lastMessage?.created_at || null,
      hasUnread: (unreadCount || 0) > 0,
    });
  }

  // Sort by last message time
  threads.sort((a, b) => {
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  return threads;
}

/**
 * Get user's ISO agent ID from Clerk user ID
 * Auto-creates the user in iso_agents table if not found (auto-sync)
 *
 * @param clerkUserId - Clerk user ID
 * @returns ISO agent ID or null
 */
export async function getIsoAgentIdFromClerkUserId(
  clerkUserId: string
): Promise<string | null> {
  console.log('[Message Persistence] Looking up ISO agent for Clerk user:', clerkUserId);

  // First, try to find existing user
  const { data, error } = await supabaseAdmin
    .from('iso_agents')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (data) {
    console.log('[Message Persistence] ✅ Found existing ISO agent:', data.id);
    return data.id;
  }

  console.log('[Message Persistence] User lookup result:', { data, error: error?.code, errorMessage: error?.message });

  // User not found - attempt auto-sync from Clerk
  if (error?.code === 'PGRST116') {
    // PGRST116 = "No rows returned" - user doesn't exist, try to auto-create
    console.log('[Message Persistence] User not found in iso_agents, attempting auto-sync for:', clerkUserId);

    try {
      // Dynamically import Clerk to avoid issues with server components
      const { clerkClient } = await import('@clerk/nextjs/server');
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkUserId);

      if (!clerkUser) {
        console.error('[Message Persistence] Clerk user not found:', clerkUserId);
        return null;
      }

      // Extract user data
      const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      );

      if (!primaryEmail) {
        console.error('[Message Persistence] Clerk user has no email:', clerkUserId);
        return null;
      }

      const email = primaryEmail.emailAddress;
      const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email;

      // Get role from metadata or default to iso_agent
      const metadata = clerkUser.publicMetadata as Record<string, unknown>;
      const proposedRole = metadata?.role;
      const validRoles = ['iso_agent', 'admin', 'operator'] as const;
      let role: 'iso_agent' | 'admin' | 'operator' = 'iso_agent';
      if (typeof proposedRole === 'string' && validRoles.includes(proposedRole as typeof validRoles[number])) {
        role = proposedRole as typeof validRoles[number];
      }

      // Create the user in iso_agents
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('iso_agents')
        .insert({
          clerk_user_id: clerkUserId,
          email,
          full_name: fullName,
          role,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError) {
        // Handle race condition: another request may have created the user
        // PostgreSQL error code 23505 = unique_violation (duplicate key)
        if (insertError.code === '23505') {
          console.log('[Message Persistence] Race condition detected - user created by another request, retrying query');
          const { data: existingUser, error: retryError } = await supabaseAdmin
            .from('iso_agents')
            .select('id')
            .eq('clerk_user_id', clerkUserId)
            .single();

          if (existingUser && !retryError) {
            console.log('[Message Persistence] ✅ Found user after race condition retry:', existingUser.id);
            return existingUser.id;
          }
        }

        console.error('[Message Persistence] Error auto-creating user:', insertError);
        return null;
      }

      console.log('[Message Persistence] ✅ Auto-synced user from Clerk:', {
        clerkUserId,
        email,
        isoAgentId: newUser.id,
      });

      return newUser.id;
    } catch (syncError) {
      console.error('[Message Persistence] Error during auto-sync:', syncError);
      return null;
    }
  }

  // Some other error occurred
  console.error('[Message Persistence] Error getting ISO agent ID:', error);
  return null;
}

/**
 * Soft delete a message
 *
 * @param messageId - Message ID
 * @returns true if deleted, false otherwise
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) {
    console.error('[Message Persistence] Error deleting message:', error);
    return false;
  }

  return true;
}

/**
 * Mark messages as read for a user
 *
 * @param requestId - Request ID
 * @param userId - User ID who is reading
 * @param userType - 'iso' or 'operator'
 */
export async function markMessagesAsRead(
  requestId: string,
  userId: string,
  userType: 'iso' | 'operator'
): Promise<void> {
  // Use the database function if available
  try {
    await supabaseAdmin.rpc('mark_request_messages_read', {
      p_request_id: requestId,
      p_reader_type: userType,
      p_reader_id: userId,
    });
  } catch (rpcError) {
    // Function may not exist yet, fall back to manual update
    console.warn('[Message Persistence] RPC not available, using manual update:', rpcError);

    // Update request unread count
    const updateField = userType === 'iso' ? 'unread_count_iso' : 'unread_count_operator';
    await supabaseAdmin
      .from('requests')
      .update({ [updateField]: 0 })
      .eq('id', requestId);
  }
}
