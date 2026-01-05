# Chat API Authentication and ISO Agent ID Verification

**Date:** 2025-01-14  
**Purpose:** Verify that the local UI hits `/api/chat` with authenticated sessions and that `getIsoAgentIdFromClerkUserId` returns the expected ISO agent ID.

---

## Summary

Based on code analysis, here's the current authentication and ISO agent ID retrieval flow:

### ✅ Authentication Flow

1. **Frontend Request** (`components/chat-interface.tsx:747`)
   - Makes `fetch("/api/chat", { method: "POST", ... })` 
   - **Cookies are automatically included** by the browser (Clerk session cookies)
   - No explicit auth headers needed - Next.js/Clerk handles this automatically

2. **Middleware** (`middleware.ts:16`)
   - `/api/chat` is marked as a **public route** (allows requests through)
   - However, this doesn't disable authentication - it just allows the request to reach the handler

3. **Route Handler Authentication** (`app/api/chat/route.ts:478`)
   - Uses `const { userId } = await auth()` from `@clerk/nextjs/server`
   - `auth()` reads Clerk session cookies from the request automatically
   - Returns 401 if `userId` is null/undefined
   - **Logs:** `[Chat API] Clerk userId: <userId>` on success

### ✅ ISO Agent ID Retrieval

1. **Function Call** (`app/api/chat/route.ts:521`)
   - Calls `await getIsoAgentIdFromClerkUserId(userId)`
   - Uses the `userId` from Clerk authentication

2. **Database Query** (`lib/conversation/message-persistence.ts:277-294`)
   - Queries `iso_agents` table: `.from('iso_agents').select('id').eq('clerk_user_id', userId).single()`
   - Returns `null` if not found or error occurs
   - **Logs:** 
     - `[Chat API] ✅ ISO agent ID retrieved successfully: <id>` on success
     - `[Chat API] ⚠️  ISO agent ID is null` if user not found
     - `[Chat API] ❌ Error getting ISO agent ID:` on database error
     - `[Message Persistence] Error getting ISO agent ID:` from the function itself

---

## How to Verify

### Method 1: Check Server Logs

When you send a message through the chat UI, check your server console for:

```
[Chat API] Clerk userId: user_xxxxxxxxxxxxx  ✅ Authentication working
[Chat API] ✅ ISO agent ID retrieved successfully: <uuid>  ✅ ISO agent ID found
```

Or if there's an issue:

```
[Chat API] Clerk userId: user_xxxxxxxxxxxxx  ✅ Authentication working
[Chat API] ⚠️  ISO agent ID is null - user may not exist in iso_agents table  ⚠️ User not in database
```

Or if authentication fails:

```
[Chat API] Missing Clerk userId; skipping persistence  ❌ Not authenticated
```

### Method 2: Use Diagnostic Script

Run the diagnostic script (requires Chrome with remote debugging enabled):

```bash
# Start Chrome with remote debugging
google-chrome --remote-debugging-port=9222
# Or on macOS:
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Sign in at http://localhost:3000

# Run diagnostic script
pnpm tsx scripts/diagnose-chat-auth.ts
```

### Method 3: Browser Network Tab

1. Open browser DevTools → Network tab
2. Send a message in the chat
3. Find the `/api/chat` request
4. Check:
   - **Status:** Should be `200` (not `401`)
   - **Request Headers:** Should include `Cookie` header with Clerk session cookies
   - **Response:** Should stream SSE data (not error JSON)

### Method 4: Direct API Test

Use the test script that uses browser cookies:

```bash
pnpm tsx scripts/test/test-api-with-auth.ts
```

---

## Expected Behavior

### ✅ Success Case

1. User is signed in via Clerk
2. Browser sends request with Clerk session cookies
3. `/api/chat` route handler receives request
4. `auth()` extracts `userId` from cookies ✅
5. `getIsoAgentIdFromClerkUserId(userId)` queries database ✅
6. Returns ISO agent ID (UUID) ✅
7. Message is persisted to database ✅

### ⚠️ Common Issues

1. **User not signed in**
   - Symptoms: `401 Unauthorized` response
   - Fix: Sign in at `/sign-in`

2. **User not in `iso_agents` table**
   - Symptoms: `isoAgentId` is `null`, but no error
   - Logs: `⚠️  ISO agent ID is null - user may not exist in iso_agents table`
   - Fix: Run `npm run clerk:sync-users` to sync Clerk users to database

3. **Database connection error**
   - Symptoms: Error in logs, `isoAgentId` is `null`
   - Logs: `❌ Error getting ISO agent ID: <error>`
   - Fix: Check Supabase connection and environment variables

---

## Code References

### Authentication Check
```477:487:app/api/chat/route.ts
    // Authenticate user with Clerk - required in all environments
    const { userId } = await auth()

    if (!userId) {
      console.warn('[Chat API] Missing Clerk userId; skipping persistence')
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Please sign in to use the chat' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    console.log('[Chat API] Clerk userId:', userId)
```

### ISO Agent ID Retrieval
```519:529:app/api/chat/route.ts
    // Get ISO agent ID for message persistence
    try {
      isoAgentId = await getIsoAgentIdFromClerkUserId(userId)
      if (isoAgentId) {
        console.log('[Chat API] ✅ ISO agent ID retrieved successfully:', isoAgentId)
      } else {
        console.warn('[Chat API] ⚠️  ISO agent ID is null - user may not exist in iso_agents table for Clerk user:', userId)
      }
    } catch (error) {
      console.error('[Chat API] ❌ Error getting ISO agent ID:', error)
      // Continue without message persistence if this fails
    }
```

### Frontend Request
```747:763:components/chat-interface.tsx
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
          context: {
            flightRequestId: activeChat.id,
            route: activeChat.route,
            passengers: activeChat.passengers,
            date: activeChat.date,
          },
        }),
        signal: abortControllerRef.current.signal,
      })
```

### Database Query Function
```277:294:lib/conversation/message-persistence.ts
export async function getIsoAgentIdFromClerkUserId(
  clerkUserId: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
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
```

---

## Verification Checklist

- [ ] User is signed in at http://localhost:3000
- [ ] Server logs show `[Chat API] Clerk userId: user_xxx`
- [ ] Server logs show `[Chat API] ✅ ISO agent ID retrieved successfully: <uuid>`
- [ ] No `401 Unauthorized` errors in network tab
- [ ] No errors about missing ISO agent ID (unless user not synced)
- [ ] Messages are being persisted to database (check `conversations` and `messages` tables)

---

## Notes

- **Middleware Configuration:** `/api/chat` is marked as public in middleware, but the route handler still enforces authentication. This is intentional - the middleware allows the request through, but the handler validates the session.
- **Cookie Handling:** Clerk cookies are automatically sent by the browser with fetch requests - no explicit headers needed.
- **Error Handling:** If ISO agent ID retrieval fails, the chat still works but messages are not persisted. This is by design to prevent chat failures from blocking user experience.
