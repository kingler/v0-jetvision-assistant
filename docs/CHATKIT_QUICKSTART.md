# ChatKit Session API - Quick Start

**5-Minute Setup Guide**

---

## 1. Database Setup

Run this migration in Supabase SQL Editor:

```bash
# Location: supabase/migrations/20250101000000_create_chatkit_sessions.sql
```

Or using Supabase CLI:
```bash
npx supabase db push
```

---

## 2. Environment Configuration

Add to `.env.local`:

```env
# Get this from your ChatKit dashboard
CHATKIT_WORKFLOW_ID=your_workflow_id_here
```

---

## 3. Client Usage

### React Hook (Recommended)

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export function useChatKitSession() {
  const { getToken } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);

  const createSession = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch('/api/chatkit/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const { session } = await response.json();
      setSession(session);
      return session;
    } finally {
      setLoading(false);
    }
  };

  return { session, loading, createSession };
}
```

### Use in Component

```typescript
export default function ChatWidget() {
  const { session, loading, createSession } = useChatKitSession();

  useEffect(() => {
    createSession();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!session) return null;

  return <ChatKitWidget sessionId={session.chatKitSessionId} />;
}
```

---

## 4. API Reference

### Endpoint

```
POST /api/chatkit/session
```

### Request (Optional)

```json
{
  "metadata": {
    "source": "web"
  }
}
```

### Response

```json
{
  "session": {
    "chatKitSessionId": "uuid-here",
    "deviceId": "device_user_123_timestamp",
    "userId": "user_123",
    "workflowId": "workflow_chatkit_prod",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "expiresAt": "2025-01-02T00:00:00.000Z"
  }
}
```

---

## 5. Troubleshooting

**500 Error - Configuration Error**
```bash
# Add CHATKIT_WORKFLOW_ID to .env.local
CHATKIT_WORKFLOW_ID=your_workflow_id
```

**403 Error - User role not found**
```bash
# Ensure user synced from Clerk
# Check Supabase: SELECT * FROM users WHERE clerk_user_id = 'user_xxx';
```

**401 Error - Unauthorized**
```bash
# User not authenticated - redirect to sign in
```

---

## Session Behavior

- **Duration**: 24 hours
- **Auto-refresh**: When <1 hour remaining
- **Auto-reuse**: Returns existing session if valid

---

## Complete Documentation

See: `/docs/CHATKIT_SESSION_ENDPOINT.md`

---

**Ready to go!** 🚀
