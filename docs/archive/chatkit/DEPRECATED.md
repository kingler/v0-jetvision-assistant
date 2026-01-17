# DEPRECATED - ChatKit Documentation

> **Status**: Archived (January 2025)
> **Reason**: ChatKit integration has been removed from the project

## What Changed

The `chatkit_sessions` table and ChatKit integration have been replaced with the consolidated schema:

- Chat sessions are now tracked directly in the `requests` table
- The old `chatkit_sessions` table was dropped in migration `018_drop_chatkit_sessions.sql`
- Session fields were consolidated into `requests` in migration `030_consolidate_schema_add_columns.sql`

## Current Approach

Chat session tracking is now done via:

- **Table**: `requests` (with session fields like `session_status`, `workflow_state`, etc.)
- **API**: `/api/chat-sessions` endpoint queries the `requests` table directly
- **Messages**: Linked via `messages.request_id` instead of conversation threads

## Why This Was Archived

These docs are preserved for historical reference but are no longer accurate:

- `CHATKIT_COMPONENT_DESIGN.md` - Component designs for deprecated ChatKit React integration
- `CHATKIT_QUICKSTART.md` - Setup guide for removed ChatKit SDK
- `CHATKIT_SESSION_ENDPOINT.md` - API docs for deprecated session management
- `CHAT_AGENT_INTEGRATION.md` - Agent integration patterns that have evolved

## See Also

- `supabase/migrations/017_create_chat_sessions.sql` - Current chat_sessions approach
- `supabase/migrations/030_consolidate_schema_add_columns.sql` - Schema consolidation
- `app/api/chat-sessions/route.ts` - Current API implementation
