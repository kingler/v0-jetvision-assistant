# Session Management Module

This module provides session tracking and conversation state management for the JetVision AI Assistant.

## ONEK-115: Redis Conversation Store

The `RedisConversationStore` replaces the in-memory `Map<string, ConversationState>` in the `OrchestratorAgent` with a distributed, persistent storage solution.

### Benefits

1. **Horizontal Scaling**: Multiple server instances share the same conversation state
2. **Persistence**: Conversation state survives server restarts
3. **Automatic Expiry**: Sessions automatically expire after 1 hour (configurable)
4. **Graceful Fallback**: Falls back to in-memory storage if Redis is unavailable

### Configuration

Configure Redis via environment variables:

```bash
# Option 1: Full Redis URL (recommended for cloud deployments)
REDIS_URL=redis://localhost:6379
# or with authentication
REDIS_URL=redis://:password@localhost:6379/0
# or with TLS (Upstash, Vercel KV, etc.)
REDIS_URL=rediss://default:password@hostname:6379

# Option 2: Individual variables
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password_here  # optional
REDIS_DB=0                          # optional, default: 0

# Optional: TTL for conversation sessions (default: 3600 = 1 hour)
REDIS_CONVERSATION_TTL=3600
```

### Local Development

Start a local Redis instance:

```bash
# Using the provided script
npm run redis:start

# Or using Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Check status
npm run redis:status
```

### Usage

The `OrchestratorAgent` automatically uses the Redis store. You can also use it directly:

```typescript
import { 
  getConversationStore, 
  RedisConversationStore 
} from '@/lib/sessions';

// Get singleton instance (recommended)
const store = getConversationStore();
await store.initialize();

// Or create custom instance
const customStore = new RedisConversationStore({
  host: 'localhost',
  port: 6379,
  keyPrefix: 'myapp:conv:',
  ttlSeconds: 1800, // 30 minutes
});
await customStore.initialize();

// Store operations (all async)
await store.set('session-123', conversationState);
const state = await store.get('session-123');
await store.delete('session-123');
await store.refreshTTL('session-123');

// Health check
const health = await store.getHealth();
console.log(health);
// { connected: true, latencyMs: 2, usingFallback: false }

// Cleanup
await store.close();
```

### Monitoring

Check the conversation store health via the agent:

```typescript
const agent = new OrchestratorAgent(config);
await agent.initialize();

const health = await agent.getStoreHealth();
console.log('Store health:', health);
```

### Fallback Behavior

If Redis is unavailable:

1. The store logs a warning and switches to in-memory fallback
2. All operations continue to work using the fallback `Map`
3. When Redis reconnects, new sessions use Redis while fallback sessions remain in-memory
4. No data migration occurs between fallback and Redis

### Production Recommendations

1. **Use managed Redis**: Upstash, Redis Cloud, AWS ElastiCache, or Vercel KV
2. **Enable TLS**: Use `rediss://` URLs for encrypted connections
3. **Set appropriate TTL**: Balance memory usage with session lifetime needs
4. **Monitor health**: Check `getHealth()` in your monitoring/health checks
5. **Handle reconnection**: The store automatically reconnects with exponential backoff

### Files

- `redis-conversation-store.ts` - Redis-backed conversation state storage
- `track-chat-session.ts` - Supabase-backed chat session tracking
- `index.ts` - Barrel exports for the module
