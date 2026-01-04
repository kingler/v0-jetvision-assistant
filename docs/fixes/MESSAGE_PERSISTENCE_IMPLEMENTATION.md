# Message Persistence Implementation

## Overview

This document describes the implementation of message persistence for the Jetvision Assistant chat system. All chat messages (both user and agent) are now saved to the Supabase database and automatically loaded when chat sessions are restored.

## Implementation Date

December 2024

## Problem Statement

Previously, chat messages were only stored in the frontend state and would disappear when:
- The browser page was refreshed
- The user navigated away and returned
- The browser session ended

This meant users lost their conversation history, making it difficult to:
- Reference previous conversations
- Continue ongoing flight requests
- Review past interactions

## Solution

Implemented a complete message persistence system that:
1. **Saves all messages** (user and agent) to the `messages` table in Supabase
2. **Creates conversations** linked to flight requests in the `conversations` table
3. **Loads messages** automatically when chat sessions are restored from the database
4. **Handles new chats** that don't have a request ID yet (temp IDs)

## Architecture

### Database Schema

The system uses two main tables:

1. **`conversations`** - Represents a chat conversation
   - `id` (UUID) - Primary key
   - `request_id` (UUID, nullable) - Links to flight request (null for new chats)
   - `type` (enum) - Conversation type (e.g., 'rfp_negotiation')
   - `status` (enum) - Conversation status (e.g., 'active')
   - `subject` (text, nullable) - Conversation subject
   - `metadata` (jsonb) - Additional metadata

2. **`messages`** - Individual chat messages
   - `id` (UUID) - Primary key
   - `conversation_id` (UUID) - Foreign key to conversations
   - `sender_type` (enum) - 'iso_agent', 'operator', or 'ai_assistant'
   - `sender_iso_agent_id` (UUID, nullable) - ISO agent who sent the message
   - `sender_operator_id` (UUID, nullable) - Operator who sent the message
   - `sender_name` (text, nullable) - Display name of sender
   - `content` (text) - Message content
   - `content_type` (enum) - 'text', 'markdown', etc.
   - `rich_content` (jsonb, nullable) - Structured content
   - `status` (enum) - Message status (e.g., 'sent')
   - `metadata` (jsonb) - Additional metadata
   - `created_at` (timestamp) - When message was created

### Key Components

#### 1. Message Persistence Utilities (`lib/conversation/message-persistence.ts`)

Core functions for managing conversations and messages:

- **`getOrCreateConversation()`** - Creates or retrieves a conversation for a request
  - Handles both existing requests (with UUID) and new chats (temp IDs)
  - Validates request IDs to distinguish between UUIDs and temp IDs
  - Creates conversations without `request_id` for new chats

- **`saveMessage()`** - Saves a message to the database
  - Validates sender type and required fields
  - Supports ISO agents, operators, and AI assistants
  - Stores content, metadata, and rich content

- **`loadMessages()`** - Loads messages for a conversation
  - Returns messages in chronological order
  - Supports pagination via limit parameter
  - Filters out deleted messages

- **`linkConversationToRequest()`** - Links a conversation to a request
  - Used when a request is created after a conversation exists
  - Updates both `conversations.request_id` and `requests.primary_conversation_id`

- **`getIsoAgentIdFromClerkUserId()`** - Maps Clerk user ID to ISO agent ID
  - Required for message persistence
  - Returns null if user not found

#### 2. Chat API Route Updates (`app/api/chat/route.ts`)

The chat API route now:

1. **Saves user messages** before processing:
   ```typescript
   // Get or create conversation
   conversationId = await getOrCreateConversation({
     requestId: context?.flightRequestId, // May be undefined or temp ID
     userId: isoAgentId,
     subject: context?.route ? `Flight Request: ${context.route}` : 'New Flight Request',
   })

   // Save user message
   userMessageId = await saveMessage({
     conversationId,
     senderType: 'iso_agent',
     senderIsoAgentId: isoAgentId,
     content: message,
     contentType: 'text',
   })
   ```

2. **Saves agent responses** after streaming:
   - For orchestrator agent: Extracts response from result data
   - For legacy OpenAI: Accumulates streamed content and saves when complete
   - Handles partial responses on errors

3. **Links conversations to requests** when trips are created:
   ```typescript
   // When create_trip succeeds, create/update request and link conversation
   if (tripData.trip_id && isoAgentId && conversationId) {
     const request = await upsertRequestWithTripId(...)
     await linkConversationToRequest(conversationId, request.id)
   }
   ```

#### 3. Request-to-ChatSession Mapper (`lib/utils/request-to-chat-session.ts`)

Updated to load messages from the database:

- **`requestToChatSession()`** - Now async, loads messages
- **`loadMessagesForRequest()`** - Helper function that:
  - Validates request ID is a UUID (not temp ID)
  - Gets conversation for the request
  - Loads messages and converts to ChatSession format
  - Returns empty array if no conversation exists

- **`requestsToChatSessions()`** - Updated to async, loads messages in parallel

#### 4. Frontend Integration (`app/page.tsx`)

The main page component:

- Calls `requestsToChatSessions()` which now loads messages
- Messages are automatically included in restored chat sessions
- No changes needed to chat interface components

## Data Flow

### Message Creation Flow

1. **User sends message**:
   ```
   Frontend → POST /api/chat → Save user message → Process with AI → Stream response → Save agent response
   ```

2. **Conversation creation**:
   - If request ID exists (UUID): Create conversation linked to request
   - If request ID is temp: Create conversation without request_id
   - If no request ID: Create conversation without request_id

3. **Request linking**:
   - When `create_trip` succeeds: Create/update request and link conversation
   - Conversation's `request_id` is updated
   - Request's `primary_conversation_id` is set

### Message Loading Flow

1. **Page load**:
   ```
   Frontend → GET /api/requests → Load requests → For each request:
     → Get conversation → Load messages → Convert to ChatSession format
   ```

2. **Message conversion**:
   - Database messages → ChatSession messages
   - Maps `sender_type` to `type` ('iso_agent' → 'user', 'ai_assistant' → 'agent')
   - Preserves timestamps, content, and rich content

## Error Handling

The implementation includes comprehensive error handling:

1. **Graceful degradation**: If message persistence fails, chat continues to work
2. **Validation**: Request IDs are validated to distinguish UUIDs from temp IDs
3. **Partial saves**: Partial agent responses are saved even if streaming fails
4. **Logging**: All errors are logged for debugging

## Edge Cases Handled

1. **New chats without request IDs**:
   - Conversations created without `request_id`
   - Messages saved to these conversations
   - Linked to request when created later

2. **Temp IDs**:
   - Validated to distinguish from UUIDs
   - Conversations not linked until real request exists
   - Messages still saved for later linking

3. **Streaming failures**:
   - Partial content saved if streaming is interrupted
   - Error metadata stored with message

4. **Missing ISO agent**:
   - Message persistence skipped if user not found
   - Chat continues to work normally

## Testing Recommendations

1. **Basic persistence**:
   - Send messages in a chat
   - Refresh page
   - Verify messages are restored

2. **New chat flow**:
   - Start new chat (temp ID)
   - Send messages
   - Create trip (generates request)
   - Verify conversation is linked
   - Refresh and verify messages persist

3. **Multiple chats**:
   - Create multiple flight requests
   - Send messages in each
   - Refresh page
   - Verify all messages are restored correctly

4. **Error scenarios**:
   - Test with invalid user
   - Test with database errors
   - Verify graceful degradation

## Performance Considerations

1. **Parallel loading**: Messages for multiple requests are loaded in parallel
2. **Pagination**: Message loading supports limit parameter (default: 100)
3. **Lazy loading**: Messages only loaded when chat sessions are restored
4. **Caching**: Consider adding caching for frequently accessed conversations

## Future Enhancements

1. **Message search**: Add full-text search across messages
2. **Message editing**: Allow users to edit/delete messages
3. **Rich content**: Enhanced support for structured content (quotes, proposals, etc.)
4. **Message reactions**: Add reactions/feedback to messages
5. **Export**: Allow users to export conversation history

## Related Files

- `lib/conversation/message-persistence.ts` - Core persistence utilities
- `app/api/chat/route.ts` - Chat API with message saving
- `lib/utils/request-to-chat-session.ts` - Message loading for chat sessions
- `app/page.tsx` - Frontend integration
- `supabase/migrations/` - Database schema migrations

## Database Migrations

Ensure the following tables exist:
- `conversations` - For conversation management
- `messages` - For message storage

See `supabase/migrations/` for schema definitions.

## Summary

Message persistence is now fully implemented, ensuring that:
- ✅ All chat messages are saved to the database
- ✅ Messages are automatically loaded when chat sessions are restored
- ✅ Conversations are properly linked to flight requests
- ✅ New chats without request IDs are handled gracefully
- ✅ Error handling ensures chat continues to work even if persistence fails

Users can now safely refresh the page or navigate away without losing their conversation history.
