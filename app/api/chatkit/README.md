# ChatKit API Endpoints

**MCP-UI + ChatKit Integration**

This directory contains API endpoints for ChatKit session management and workflow integration.

---

## Available Endpoints

### Session Management

#### `POST /api/chatkit/session`

Creates or refreshes a ChatKit session for authenticated users.

**Features**:
- ✅ Automatic session creation
- ✅ Session reuse for active sessions
- ✅ Auto-refresh when expiring soon
- ✅ Clerk authentication
- ✅ 24-hour session duration

**Quick Example**:
```typescript
const response = await fetch('/api/chatkit/session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${clerkToken}`,
  },
});
const { session } = await response.json();
// Use session.chatKitSessionId with ChatKit widget
```

**Documentation**: `/docs/CHATKIT_SESSION_ENDPOINT.md`

---

## Implementation Status

| Endpoint | Status | Phase |
|----------|--------|-------|
| POST /api/chatkit/session | ✅ Complete | Phase 1 |
| GET /api/chatkit/sessions | 🚧 Planned | Phase 2 |
| DELETE /api/chatkit/session/:id | 🚧 Planned | Phase 2 |
| POST /api/chatkit/revoke | 🚧 Planned | Phase 2 |

---

## Getting Started

1. **Setup Database**
   ```bash
   # Run migration
   npx supabase db push
   ```

2. **Configure Environment**
   ```env
   CHATKIT_WORKFLOW_ID=your_workflow_id
   ```

3. **Use in Your App**
   ```typescript
   import { useChatKitSession } from '@/hooks/use-chatkit-session';

   const { session } = useChatKitSession();
   ```

---

## Architecture

### Session Flow

```
User Request
    ↓
Clerk Auth (JWT)
    ↓
RBAC Middleware
    ↓
Check Existing Session
    ↓
    ├─→ Session Valid → Return Existing
    ├─→ Session Expiring → Refresh & Return
    └─→ No Session → Create New & Return
```

### Database Schema

```sql
chatkit_sessions (
  id UUID PRIMARY KEY,
  clerk_user_id TEXT,
  device_id TEXT,
  workflow_id TEXT,
  session_token TEXT UNIQUE,
  status session_status,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  ...
)
```

---

## Security

- ✅ Clerk JWT authentication
- ✅ RBAC authorization
- ✅ Row Level Security (RLS)
- ✅ Secure token generation
- ✅ User isolation
- ✅ Session expiration

---

## Testing

```bash
# Run session endpoint tests
npm run test:unit -- __tests__/unit/api/chatkit/session.test.ts

# Coverage: 100%
```

---

## Documentation

- **Quick Start**: `/docs/CHATKIT_QUICKSTART.md`
- **Complete Guide**: `/docs/CHATKIT_SESSION_ENDPOINT.md`
- **Implementation**: `/docs/implementations/ONEK-85-CHATKIT-SESSION-SUMMARY.md`

---

## Support

**Issues**: Report via Linear (use `chatkit` label)
**Questions**: See documentation or ask in #engineering

---

**Last Updated**: 2025-01-01
**Maintained By**: Tank (Backend Developer)
