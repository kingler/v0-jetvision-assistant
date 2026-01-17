/**
 * Circuit Breaker Implementation
 *
 * Provides resilience for external service calls by preventing cascade failures.
 * Implements the Circuit Breaker pattern with three states:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failure threshold exceeded, requests fail fast
 * - HALF_OPEN: Testing recovery, limited requests allowed
 *
 * @module lib/resilience/circuit-breaker
 * @see https://martinfowler.com/bliki/CircuitBreaker.html
 */

import { EventEmitter } from 'events';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Circuit breaker states following the standard pattern
 */
export enum CircuitState {
  /** Normal operation - requests pass through */
  CLOSED = 'CLOSED',
  /** Failure threshold exceeded - requests fail immediately */
  OPEN = 'OPEN',
  /** Testing recovery - limited requests allowed */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Configuration options for circuit breaker behavior
 */
export interface CircuitBreakerConfig {
  /** Unique identifier for this circuit breaker instance */
  name: string;
  /** Number of failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Number of successful calls in HALF_OPEN to close circuit (default: 3) */
  successThreshold?: number;
  /** Time in ms to wait before transitioning from OPEN to HALF_OPEN (default: 30000) */
  resetTimeout?: number;
  /** Time window in ms for counting failures (default: 60000) */
  monitoringWindow?: number;
  /** Optional timeout for individual requests in ms */
  requestTimeout?: number;
  /** Whether to include stack traces in error reports (default: false) */
  includeStackTrace?: boolean;
  /** Custom function to determine if an error should trip the circuit */
  isFailure?: (error: Error) => boolean;
  /** Custom fallback function when circuit is open */
  fallback?: <T>(error: Error) => T | Promise<T>;
}

/**
 * Health metrics for circuit breaker monitoring
 */
export interface CircuitBreakerMetrics {
  /** Current circuit state */
  state: CircuitState;
  /** Total number of requests processed */
  totalRequests: number;
  /** Number of successful requests */
  successfulRequests: number;
  /** Number of failed requests */
  failedRequests: number;
  /** Number of requests rejected due to open circuit */
  rejectedRequests: number;
  /** Current failure count within monitoring window */
  currentFailureCount: number;
  /** Timestamp of last failure */
  lastFailureTime?: number;
  /** Timestamp when circuit opened */
  lastOpenTime?: number;
  /** Average response time in ms */
  averageResponseTime: number;
  /** P95 response time in ms */
  p95ResponseTime: number;
  /** Circuit breaker name */
  name: string;
  /** Success rate percentage */
  successRate: number;
  /** Time until half-open transition (when OPEN) */
  timeUntilHalfOpen?: number;
}

/**
 * Circuit breaker event types for monitoring
 */
export enum CircuitBreakerEvent {
  /** Circuit transitioned from CLOSED to OPEN */
  CIRCUIT_OPENED = 'circuit:opened',
  /** Circuit transitioned from OPEN to HALF_OPEN */
  CIRCUIT_HALF_OPENED = 'circuit:half_opened',
  /** Circuit transitioned from HALF_OPEN to CLOSED */
  CIRCUIT_CLOSED = 'circuit:closed',
  /** Request was rejected due to open circuit */
  REQUEST_REJECTED = 'request:rejected',
  /** Request succeeded */
  REQUEST_SUCCESS = 'request:success',
  /** Request failed */
  REQUEST_FAILURE = 'request:failure',
  /** Fallback was executed */
  FALLBACK_EXECUTED = 'fallback:executed',
  /** State was manually reset */
  MANUAL_RESET = 'manual:reset',
}

/**
 * Event payload for circuit breaker events
 */
export interface CircuitBreakerEventPayload {
  /** Event type */
  event: CircuitBreakerEvent;
  /** Circuit breaker name */
  circuitName: string;
  /** Timestamp of the event */
  timestamp: number;
  /** Previous state (for state transitions) */
  previousState?: CircuitState;
  /** New state (for state transitions) */
  newState?: CircuitState;
  /** Error that caused the event (for failures) */
  error?: Error;
  /** Response time in ms (for success/failure events) */
  responseTime?: number;
  /** Current metrics snapshot */
  metrics?: CircuitBreakerMetrics;
}

/**
 * Failure record for tracking within monitoring window
 */
interface FailureRecord {
  timestamp: number;
  error: Error;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: Required<Omit<CircuitBreakerConfig, 'name' | 'fallback' | 'isFailure'>> = {
  failureThreshold: 5,
  successThreshold: 3,
  resetTimeout: 30000, // 30 seconds
  monitoringWindow: 60000, // 1 minute
  requestTimeout: 30000, // 30 seconds
  includeStackTrace: false,
};

// =============================================================================
// CIRCUIT BREAKER IMPLEMENTATION
// =============================================================================

/**
 * Circuit Breaker Class
 *
 * Wraps external service calls with failure detection and recovery logic.
 * Prevents cascade failures by failing fast when a service is unhealthy.
 *
 * @example
 * ```typescript
 * const circuitBreaker = new CircuitBreaker({
 *   name: 'avinode-api',
 *   failureThreshold: 3,
 *   resetTimeout: 30000,
 * });
 *
 * const result = await circuitBreaker.execute(
 *   () => avinodeClient.searchFlights(params)
 * );
 * ```
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private config: Required<Omit<CircuitBreakerConfig, 'fallback' | 'isFailure'>> & {
    fallback?: <T>(error: Error) => T | Promise<T>;
    isFailure?: (error: Error) => boolean;
  };

  // Failure tracking
  private failures: FailureRecord[] = [];
  private halfOpenSuccesses: number = 0;
  private lastOpenTime?: number;

  // Metrics tracking
  private totalRequests: number = 0;
  private successfulRequests: number = 0;
  private failedRequests: number = 0;
  private rejectedRequests: number = 0;
  private responseTimes: number[] = [];

  // Recovery timer
  private recoveryTimer?: NodeJS.Timeout;

  /**
   * Create a new circuit breaker instance
   *
   * @param config - Configuration options for the circuit breaker
   */
  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Log circuit breaker creation
    console.log(`[CircuitBreaker] Created circuit breaker: ${this.config.name}`, {
      failureThreshold: this.config.failureThreshold,
      resetTimeout: this.config.resetTimeout,
      monitoringWindow: this.config.monitoringWindow,
    });
  }

  // ===========================================================================
  // PUBLIC METHODS
  // ===========================================================================

  /**
   * Execute a function with circuit breaker protection
   *
   * @param fn - The async function to execute
   * @returns The result of the function or fallback value
   * @throws CircuitBreakerOpenError if circuit is open and no fallback provided
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.totalRequests++;

    // Check circuit state before executing
    if (this.state === CircuitState.OPEN) {
      return this.handleOpenCircuit<T>();
    }

    try {
      // Execute with optional timeout
      const result = await this.executeWithTimeout(fn);

      // Record success
      this.recordSuccess(Date.now() - startTime);

      return result;
    } catch (error) {
      // Record failure
      const err = error instanceof Error ? error : new Error(String(error));
      this.recordFailure(err, Date.now() - startTime);

      throw err;
    }
  }

  /**
   * Get current circuit breaker metrics
   *
   * @returns Current health metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const now = Date.now();
    const successRate =
      this.totalRequests > 0
        ? (this.successfulRequests / this.totalRequests) * 100
        : 100;

    const avgResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;

    const p95ResponseTime = this.calculateP95();

    return {
      name: this.config.name,
      state: this.state,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      rejectedRequests: this.rejectedRequests,
      currentFailureCount: this.getRecentFailureCount(),
      lastFailureTime: this.failures.length > 0 ? this.failures[this.failures.length - 1].timestamp : undefined,
      lastOpenTime: this.lastOpenTime,
      averageResponseTime: Math.round(avgResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      timeUntilHalfOpen:
        this.state === CircuitState.OPEN && this.lastOpenTime
          ? Math.max(0, this.config.resetTimeout - (now - this.lastOpenTime))
          : undefined,
    };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually reset the circuit breaker to CLOSED state
   * Useful for administrative intervention
   */
  reset(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.halfOpenSuccesses = 0;
    this.clearRecoveryTimer();

    console.log(`[CircuitBreaker] ${this.config.name} manually reset`, {
      previousState,
    });

    this.emitEvent(CircuitBreakerEvent.MANUAL_RESET, {
      previousState,
      newState: CircuitState.CLOSED,
    });
  }

  /**
   * Force the circuit to open (for testing or emergency)
   */
  forceOpen(): void {
    this.transitionToOpen(new Error('Manually forced open'));
  }

  /**
   * Check if the circuit is allowing requests
   */
  isAllowingRequests(): boolean {
    return this.state !== CircuitState.OPEN;
  }

  /**
   * Get the circuit breaker name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Clean up resources (timers, etc.)
   */
  destroy(): void {
    this.clearRecoveryTimer();
    this.removeAllListeners();
    console.log(`[CircuitBreaker] ${this.config.name} destroyed`);
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Execute function with optional timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.requestTimeout) {
      return fn();
    }

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout after ${this.config.requestTimeout}ms`));
      }, this.config.requestTimeout);

      fn()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Handle request when circuit is open
   */
  private async handleOpenCircuit<T>(): Promise<T> {
    this.rejectedRequests++;

    this.emitEvent(CircuitBreakerEvent.REQUEST_REJECTED, {
      metrics: this.getMetrics(),
    });

    const error = new CircuitBreakerOpenError(
      `Circuit breaker "${this.config.name}" is OPEN`,
      this.config.name,
      this.getMetrics()
    );

    // Try fallback if available
    if (this.config.fallback) {
      console.log(`[CircuitBreaker] ${this.config.name} executing fallback`);
      this.emitEvent(CircuitBreakerEvent.FALLBACK_EXECUTED, { error });
      return this.config.fallback<T>(error);
    }

    throw error;
  }

  /**
   * Record a successful request
   */
  private recordSuccess(responseTime: number): void {
    this.successfulRequests++;
    this.responseTimes.push(responseTime);

    // Keep only last 100 response times for metrics
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    this.emitEvent(CircuitBreakerEvent.REQUEST_SUCCESS, { responseTime });

    // Handle HALF_OPEN state
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++;

      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(error: Error, responseTime: number): void {
    // Check if this error should trip the circuit
    const shouldTrip = this.config.isFailure ? this.config.isFailure(error) : true;

    if (!shouldTrip) {
      console.log(`[CircuitBreaker] ${this.config.name} error ignored (not a tripping error):`, error.message);
      return;
    }

    this.failedRequests++;
    this.responseTimes.push(responseTime);
    this.failures.push({ timestamp: Date.now(), error });

    // Clean up old failures outside monitoring window
    this.cleanupOldFailures();

    this.emitEvent(CircuitBreakerEvent.REQUEST_FAILURE, {
      error,
      responseTime,
    });

    // Check if we should open the circuit
    if (this.state === CircuitState.CLOSED) {
      if (this.getRecentFailureCount() >= this.config.failureThreshold) {
        this.transitionToOpen(error);
      }
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN reopens the circuit
      this.transitionToOpen(error);
    }
  }

  /**
   * Get count of failures within monitoring window
   */
  private getRecentFailureCount(): number {
    const windowStart = Date.now() - this.config.monitoringWindow;
    return this.failures.filter((f) => f.timestamp >= windowStart).length;
  }

  /**
   * Remove failures outside the monitoring window
   */
  private cleanupOldFailures(): void {
    const windowStart = Date.now() - this.config.monitoringWindow;
    this.failures = this.failures.filter((f) => f.timestamp >= windowStart);
  }

  /**
   * Transition circuit to OPEN state
   */
  private transitionToOpen(error: Error): void {
    const previousState = this.state;
    this.state = CircuitState.OPEN;
    this.lastOpenTime = Date.now();
    this.halfOpenSuccesses = 0;

    console.error(`[CircuitBreaker] ${this.config.name} OPENED`, {
      failureCount: this.getRecentFailureCount(),
      threshold: this.config.failureThreshold,
      error: error.message,
    });

    this.emitEvent(CircuitBreakerEvent.CIRCUIT_OPENED, {
      previousState,
      newState: CircuitState.OPEN,
      error,
    });

    // Schedule transition to HALF_OPEN
    this.scheduleRecovery();
  }

  /**
   * Transition circuit to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenSuccesses = 0;

    console.log(`[CircuitBreaker] ${this.config.name} transitioning to HALF_OPEN`);

    this.emitEvent(CircuitBreakerEvent.CIRCUIT_HALF_OPENED, {
      previousState,
      newState: CircuitState.HALF_OPEN,
    });
  }

  /**
   * Transition circuit to CLOSED state
   */
  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.halfOpenSuccesses = 0;

    console.log(`[CircuitBreaker] ${this.config.name} CLOSED (recovered)`);

    this.emitEvent(CircuitBreakerEvent.CIRCUIT_CLOSED, {
      previousState,
      newState: CircuitState.CLOSED,
    });
  }

  /**
   * Schedule recovery attempt
   */
  private scheduleRecovery(): void {
    this.clearRecoveryTimer();

    this.recoveryTimer = setTimeout(() => {
      if (this.state === CircuitState.OPEN) {
        this.transitionToHalfOpen();
      }
    }, this.config.resetTimeout);
  }

  /**
   * Clear recovery timer
   */
  private clearRecoveryTimer(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = undefined;
    }
  }

  /**
   * Calculate P95 response time
   */
  private calculateP95(): number {
    if (this.responseTimes.length === 0) return 0;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  /**
   * Emit circuit breaker event
   */
  private emitEvent(
    event: CircuitBreakerEvent,
    data: Partial<CircuitBreakerEventPayload> = {}
  ): void {
    const payload: CircuitBreakerEventPayload = {
      event,
      circuitName: this.config.name,
      timestamp: Date.now(),
      ...data,
    };

    this.emit(event, payload);
    this.emit('*', payload); // Wildcard event for all events
  }
}

// =============================================================================
// ERROR CLASSES
// =============================================================================

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  public readonly circuitName: string;
  public readonly metrics: CircuitBreakerMetrics;

  constructor(message: string, circuitName: string, metrics: CircuitBreakerMetrics) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.circuitName = circuitName;
    this.metrics = metrics;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a circuit breaker with common defaults for external APIs
 *
 * @param name - Unique name for the circuit breaker
 * @param overrides - Configuration overrides
 * @returns Configured circuit breaker instance
 */
export function createCircuitBreaker(
  name: string,
  overrides?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker({
    name,
    failureThreshold: 5,
    successThreshold: 3,
    resetTimeout: 30000,
    monitoringWindow: 60000,
    requestTimeout: 30000,
    ...overrides,
  });
}

/**
 * Create a circuit breaker with aggressive settings for critical services
 *
 * @param name - Unique name for the circuit breaker
 * @param overrides - Configuration overrides
 * @returns Configured circuit breaker instance
 */
export function createAggressiveCircuitBreaker(
  name: string,
  overrides?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker({
    name,
    failureThreshold: 3,
    successThreshold: 5,
    resetTimeout: 60000, // Wait longer before recovery
    monitoringWindow: 30000, // Shorter window for faster reaction
    requestTimeout: 15000,
    ...overrides,
  });
}

/**
 * Create a circuit breaker with relaxed settings for non-critical services
 *
 * @param name - Unique name for the circuit breaker
 * @param overrides - Configuration overrides
 * @returns Configured circuit breaker instance
 */
export function createRelaxedCircuitBreaker(
  name: string,
  overrides?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker({
    name,
    failureThreshold: 10,
    successThreshold: 2,
    resetTimeout: 15000, // Recover faster
    monitoringWindow: 120000, // Longer window
    requestTimeout: 60000,
    ...overrides,
  });
}
