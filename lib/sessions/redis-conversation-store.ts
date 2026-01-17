/**
 * Redis Conversation Store
 *
 * ONEK-115: Redis-backed storage for OrchestratorAgent conversation states.
 * Replaces in-memory Map with distributed, persistent storage for:
 * - Horizontal scaling (multiple server instances)
 * - State persistence across restarts
 * - Automatic session expiry (TTL)
 *
 * Features:
 * - Automatic JSON serialization/deserialization
 * - Configurable TTL (default 1 hour)
 * - Graceful fallback to in-memory on Redis connection failure
 * - Connection health monitoring
 * - Batch operations support
 *
 * @see https://github.com/luin/ioredis
 */

import Redis from 'ioredis';
import type { ConversationState } from '@/agents/tools/types';

/**
 * Redis connection configuration
 */
export interface RedisConfig {
  /** Redis host (default: localhost) */
  host?: string;
  /** Redis port (default: 6379) */
  port?: number;
  /** Redis password (optional) */
  password?: string;
  /** Redis database number (default: 0) */
  db?: number;
  /** Key prefix for conversation states (default: 'conv:') */
  keyPrefix?: string;
  /** TTL in seconds for conversation states (default: 3600 = 1 hour) */
  ttlSeconds?: number;
  /** Connection timeout in ms (default: 5000) */
  connectTimeout?: number;
  /** Enable TLS (default: false, auto-enabled for rediss:// URLs) */
  tls?: boolean;
  /** Full Redis URL (overrides host/port/password) */
  url?: string;
}

/**
 * Store health status
 */
export interface StoreHealth {
  connected: boolean;
  latencyMs: number;
  usingFallback: boolean;
  lastError?: string;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<RedisConfig, 'password' | 'url' | 'tls'>> = {
  host: 'localhost',
  port: 6379,
  db: 0,
  keyPrefix: 'conv:',
  ttlSeconds: 3600, // 1 hour
  connectTimeout: 5000,
};

/**
 * RedisConversationStore
 *
 * Manages conversation state storage with Redis backend and in-memory fallback.
 * Implements the same interface as Map for drop-in replacement.
 */
export class RedisConversationStore {
  private redis: Redis | null = null;
  private config: Required<Omit<RedisConfig, 'password' | 'url' | 'tls'>> & Pick<RedisConfig, 'password' | 'tls'>;
  private fallbackStore: Map<string, ConversationState> = new Map();
  private usingFallback: boolean = false;
  private lastError: string | undefined;
  private initialized: boolean = false;

  /**
   * Create a new Redis conversation store
   *
   * @param config - Redis configuration options
   */
  constructor(config: RedisConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Initialize Redis connection
   * Should be called before using the store
   *
   * @returns Promise that resolves when connected or falls back to in-memory
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Build Redis connection options
      const redisOptions = this.buildRedisOptions();

      console.log('[RedisConversationStore] Connecting to Redis...', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        ttlSeconds: this.config.ttlSeconds,
      });

      this.redis = new Redis(redisOptions);

      // Set up event handlers
      this.redis.on('error', (error) => {
        console.error('[RedisConversationStore] Redis error:', error.message);
        this.lastError = error.message;
        this.handleConnectionFailure();
      });

      this.redis.on('connect', () => {
        console.log('[RedisConversationStore] Connected to Redis');
        this.usingFallback = false;
      });

      this.redis.on('close', () => {
        console.warn('[RedisConversationStore] Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        console.log('[RedisConversationStore] Reconnecting to Redis...');
      });

      // Test connection with ping
      await this.redis.ping();
      console.log('[RedisConversationStore] Redis connection verified');
      this.initialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[RedisConversationStore] Failed to connect to Redis:', errorMessage);
      this.lastError = errorMessage;
      this.handleConnectionFailure();
      this.initialized = true; // Mark as initialized even with fallback
    }
  }

  /**
   * Build Redis connection options from config
   */
  private buildRedisOptions(): Redis.RedisOptions {
    // If URL is provided, use it directly
    if (this.config.url) {
      return {
        lazyConnect: false,
        connectTimeout: this.config.connectTimeout,
        retryStrategy: (times) => {
          // Exponential backoff with max 30 seconds
          const delay = Math.min(times * 1000, 30000);
          console.log(`[RedisConversationStore] Retry attempt ${times}, delay ${delay}ms`);
          return delay;
        },
      };
    }

    const options: Redis.RedisOptions = {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      connectTimeout: this.config.connectTimeout,
      lazyConnect: false,
      retryStrategy: (times) => {
        // Exponential backoff with max 30 seconds
        const delay = Math.min(times * 1000, 30000);
        console.log(`[RedisConversationStore] Retry attempt ${times}, delay ${delay}ms`);
        return delay;
      },
    };

    // Enable TLS if configured
    if (this.config.tls) {
      options.tls = {};
    }

    return options;
  }

  /**
   * Handle Redis connection failure - switch to in-memory fallback
   */
  private handleConnectionFailure(): void {
    if (!this.usingFallback) {
      console.warn('[RedisConversationStore] Falling back to in-memory storage');
      this.usingFallback = true;
    }
  }

  /**
   * Generate Redis key for a session ID
   */
  private getKey(sessionId: string): string {
    return `${this.config.keyPrefix}${sessionId}`;
  }

  /**
   * Serialize conversation state for Redis storage
   */
  private serialize(state: ConversationState): string {
    return JSON.stringify(state, (key, value) => {
      // Handle Date objects
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });
  }

  /**
   * Deserialize conversation state from Redis storage
   */
  private deserialize(data: string): ConversationState {
    return JSON.parse(data, (key, value) => {
      // Restore Date objects
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      // Handle lastUpdated field that might be a string
      if (key === 'lastUpdated' && typeof value === 'string') {
        return new Date(value);
      }
      // Handle timestamp in conversationHistory
      if (key === 'timestamp' && typeof value === 'string') {
        return new Date(value);
      }
      return value;
    });
  }

  /**
   * Get a conversation state by session ID
   *
   * @param sessionId - The session identifier
   * @returns The conversation state or undefined if not found
   */
  async get(sessionId: string): Promise<ConversationState | undefined> {
    await this.ensureInitialized();

    if (this.usingFallback || !this.redis) {
      return this.fallbackStore.get(sessionId);
    }

    try {
      const key = this.getKey(sessionId);
      const data = await this.redis.get(key);

      if (!data) {
        return undefined;
      }

      return this.deserialize(data);
    } catch (error) {
      console.error('[RedisConversationStore] Error getting state:', error);
      // Fallback to in-memory on error
      return this.fallbackStore.get(sessionId);
    }
  }

  /**
   * Set a conversation state
   *
   * @param sessionId - The session identifier
   * @param state - The conversation state to store
   * @returns The store instance for chaining
   */
  async set(sessionId: string, state: ConversationState): Promise<RedisConversationStore> {
    await this.ensureInitialized();

    // Always update in-memory fallback for redundancy
    this.fallbackStore.set(sessionId, state);

    if (this.usingFallback || !this.redis) {
      return this;
    }

    try {
      const key = this.getKey(sessionId);
      const data = this.serialize(state);

      // Set with TTL
      await this.redis.setex(key, this.config.ttlSeconds, data);
    } catch (error) {
      console.error('[RedisConversationStore] Error setting state:', error);
      // In-memory fallback already updated above
    }

    return this;
  }

  /**
   * Check if a conversation state exists
   *
   * @param sessionId - The session identifier
   * @returns True if the state exists
   */
  async has(sessionId: string): Promise<boolean> {
    await this.ensureInitialized();

    if (this.usingFallback || !this.redis) {
      return this.fallbackStore.has(sessionId);
    }

    try {
      const key = this.getKey(sessionId);
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('[RedisConversationStore] Error checking existence:', error);
      return this.fallbackStore.has(sessionId);
    }
  }

  /**
   * Delete a conversation state
   *
   * @param sessionId - The session identifier
   * @returns True if the state was deleted
   */
  async delete(sessionId: string): Promise<boolean> {
    await this.ensureInitialized();

    // Always remove from fallback store
    const fallbackResult = this.fallbackStore.delete(sessionId);

    if (this.usingFallback || !this.redis) {
      return fallbackResult;
    }

    try {
      const key = this.getKey(sessionId);
      const deleted = await this.redis.del(key);
      return deleted > 0 || fallbackResult;
    } catch (error) {
      console.error('[RedisConversationStore] Error deleting state:', error);
      return fallbackResult;
    }
  }

  /**
   * Clear all conversation states
   *
   * @returns Promise that resolves when cleared
   */
  async clear(): Promise<void> {
    await this.ensureInitialized();

    this.fallbackStore.clear();

    if (this.usingFallback || !this.redis) {
      return;
    }

    try {
      // Find all keys with our prefix and delete them
      const pattern = `${this.config.keyPrefix}*`;
      let cursor = '0';

      do {
        const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      console.error('[RedisConversationStore] Error clearing states:', error);
    }
  }

  /**
   * Refresh TTL for a conversation state
   * Use this to extend session lifetime on activity
   *
   * @param sessionId - The session identifier
   * @returns True if TTL was refreshed
   */
  async refreshTTL(sessionId: string): Promise<boolean> {
    await this.ensureInitialized();

    if (this.usingFallback || !this.redis) {
      return this.fallbackStore.has(sessionId);
    }

    try {
      const key = this.getKey(sessionId);
      const result = await this.redis.expire(key, this.config.ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error('[RedisConversationStore] Error refreshing TTL:', error);
      return false;
    }
  }

  /**
   * Get all session IDs (for debugging/admin)
   *
   * @returns Array of session IDs
   */
  async keys(): Promise<string[]> {
    await this.ensureInitialized();

    if (this.usingFallback || !this.redis) {
      return Array.from(this.fallbackStore.keys());
    }

    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys: string[] = [];
      let cursor = '0';

      do {
        const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const foundKeys = result[1];

        // Strip prefix from keys
        keys.push(...foundKeys.map((k) => k.replace(this.config.keyPrefix, '')));
      } while (cursor !== '0');

      return keys;
    } catch (error) {
      console.error('[RedisConversationStore] Error listing keys:', error);
      return Array.from(this.fallbackStore.keys());
    }
  }

  /**
   * Get store health status
   *
   * @returns Health status object
   */
  async getHealth(): Promise<StoreHealth> {
    const health: StoreHealth = {
      connected: false,
      latencyMs: -1,
      usingFallback: this.usingFallback,
      lastError: this.lastError,
    };

    if (this.usingFallback || !this.redis) {
      return health;
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      health.latencyMs = Date.now() - start;
      health.connected = true;
    } catch (error) {
      health.lastError = error instanceof Error ? error.message : String(error);
    }

    return health;
  }

  /**
   * Ensure the store is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Close Redis connection and cleanup
   */
  async close(): Promise<void> {
    if (this.redis) {
      console.log('[RedisConversationStore] Closing Redis connection...');
      await this.redis.quit();
      this.redis = null;
    }
    this.fallbackStore.clear();
    this.initialized = false;
  }

  /**
   * Get the number of stored sessions
   * Note: This may be approximate for Redis due to distributed nature
   *
   * @returns Number of stored sessions
   */
  async size(): Promise<number> {
    await this.ensureInitialized();

    if (this.usingFallback || !this.redis) {
      return this.fallbackStore.size;
    }

    try {
      const keys = await this.keys();
      return keys.length;
    } catch (error) {
      console.error('[RedisConversationStore] Error getting size:', error);
      return this.fallbackStore.size;
    }
  }
}

/**
 * Create a Redis conversation store from environment variables
 *
 * Environment variables:
 * - REDIS_URL: Full Redis URL (e.g., redis://localhost:6379)
 * - REDIS_HOST: Redis host (default: localhost)
 * - REDIS_PORT: Redis port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_DB: Redis database number (default: 0)
 * - REDIS_CONVERSATION_TTL: TTL in seconds (default: 3600)
 *
 * @returns Configured RedisConversationStore instance
 */
export function createConversationStore(): RedisConversationStore {
  const config: RedisConfig = {};

  // Check for Redis URL first (commonly used in cloud environments)
  if (process.env.REDIS_URL) {
    config.url = process.env.REDIS_URL;
    // Auto-enable TLS for rediss:// URLs
    config.tls = process.env.REDIS_URL.startsWith('rediss://');
  } else {
    // Use individual environment variables
    config.host = process.env.REDIS_HOST || 'localhost';
    config.port = parseInt(process.env.REDIS_PORT || '6379', 10);
    config.password = process.env.REDIS_PASSWORD;
    config.db = parseInt(process.env.REDIS_DB || '0', 10);
  }

  // TTL configuration
  if (process.env.REDIS_CONVERSATION_TTL) {
    config.ttlSeconds = parseInt(process.env.REDIS_CONVERSATION_TTL, 10);
  }

  return new RedisConversationStore(config);
}

/**
 * Singleton instance of the conversation store
 * Use this for shared access across the application
 */
let sharedStore: RedisConversationStore | null = null;

/**
 * Get the shared conversation store instance (singleton)
 *
 * @returns The shared RedisConversationStore instance
 */
export function getConversationStore(): RedisConversationStore {
  if (!sharedStore) {
    sharedStore = createConversationStore();
  }
  return sharedStore;
}

/**
 * Reset the shared store (for testing)
 */
export function resetConversationStore(): void {
  if (sharedStore) {
    sharedStore.close();
    sharedStore = null;
  }
}
