/**
 * Circuit Breaker Unit Tests
 *
 * Tests for the circuit breaker implementation including state transitions,
 * failure tracking, recovery behavior, and event emissions.
 *
 * @module __tests__/unit/resilience/circuit-breaker.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerEvent,
  CircuitBreakerOpenError,
  createCircuitBreaker,
  createAggressiveCircuitBreaker,
  createRelaxedCircuitBreaker,
} from '@/lib/resilience/circuit-breaker';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create a function that fails n times then succeeds
 */
function createFailingThenSucceedingFn(failCount: number, successValue: string = 'success') {
  let callCount = 0;
  return async () => {
    callCount++;
    if (callCount <= failCount) {
      throw new Error(`Failure ${callCount}`);
    }
    return successValue;
  };
}

/**
 * Create a function that always fails
 */
function createAlwaysFailingFn(errorMessage: string = 'Always fails') {
  return async () => {
    throw new Error(errorMessage);
  };
}

/**
 * Create a function that always succeeds
 */
function createSucceedingFn<T>(value: T) {
  return async () => value;
}

/**
 * Create a delayed function
 */
function createDelayedFn<T>(value: T, delayMs: number) {
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return value;
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    circuitBreaker?.destroy();
  });

  // ===========================================================================
  // INITIALIZATION TESTS
  // ===========================================================================

  describe('initialization', () => {
    it('should create with default configuration', () => {
      circuitBreaker = createCircuitBreaker('test-circuit');

      expect(circuitBreaker.getName()).toBe('test-circuit');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.isAllowingRequests()).toBe(true);
    });

    it('should create with custom configuration', () => {
      circuitBreaker = new CircuitBreaker({
        name: 'custom-circuit',
        failureThreshold: 10,
        successThreshold: 5,
        resetTimeout: 60000,
      });

      expect(circuitBreaker.getName()).toBe('custom-circuit');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should create aggressive circuit breaker with lower thresholds', () => {
      circuitBreaker = createAggressiveCircuitBreaker('aggressive-circuit');

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.name).toBe('aggressive-circuit');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should create relaxed circuit breaker with higher thresholds', () => {
      circuitBreaker = createRelaxedCircuitBreaker('relaxed-circuit');

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.name).toBe('relaxed-circuit');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  // ===========================================================================
  // EXECUTION TESTS
  // ===========================================================================

  describe('execute', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        name: 'test-circuit',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 5000,
        monitoringWindow: 10000,
      });
    });

    it('should execute successful functions in CLOSED state', async () => {
      const fn = createSucceedingFn('result');
      const result = await circuitBreaker.execute(fn);

      expect(result).toBe('result');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should track successful requests in metrics', async () => {
      const fn = createSucceedingFn('result');

      await circuitBreaker.execute(fn);
      await circuitBreaker.execute(fn);
      await circuitBreaker.execute(fn);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.successfulRequests).toBe(3);
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.failedRequests).toBe(0);
    });

    it('should propagate errors from failed functions', async () => {
      const fn = createAlwaysFailingFn('Test error');

      await expect(circuitBreaker.execute(fn)).rejects.toThrow('Test error');
    });

    it('should track failed requests in metrics', async () => {
      const fn = createAlwaysFailingFn();

      try {
        await circuitBreaker.execute(fn);
      } catch {
        // Expected
      }
      try {
        await circuitBreaker.execute(fn);
      } catch {
        // Expected
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failedRequests).toBe(2);
      expect(metrics.totalRequests).toBe(2);
    });
  });

  // ===========================================================================
  // STATE TRANSITION TESTS
  // ===========================================================================

  describe('state transitions', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        name: 'test-circuit',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 5000,
        monitoringWindow: 10000,
      });
    });

    it('should transition from CLOSED to OPEN after reaching failure threshold', async () => {
      const fn = createAlwaysFailingFn();

      // Make requests until circuit opens
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.isAllowingRequests()).toBe(false);
    });

    it('should reject requests immediately when OPEN', async () => {
      const fn = createAlwaysFailingFn();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      // Now requests should be rejected immediately
      await expect(circuitBreaker.execute(createSucceedingFn('test'))).rejects.toThrow(
        CircuitBreakerOpenError
      );
    });

    it('should transition from OPEN to HALF_OPEN after reset timeout', async () => {
      const fn = createAlwaysFailingFn();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Advance timer past reset timeout
      vi.advanceTimersByTime(5000);

      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should transition from HALF_OPEN to CLOSED after success threshold', async () => {
      const fn = createAlwaysFailingFn();
      const successFn = createSucceedingFn('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      // Move to HALF_OPEN
      vi.advanceTimersByTime(5000);
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Succeed twice to close circuit
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition from HALF_OPEN back to OPEN on failure', async () => {
      const fn = createAlwaysFailingFn();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      // Move to HALF_OPEN
      vi.advanceTimersByTime(5000);
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Fail - should go back to OPEN
      try {
        await circuitBreaker.execute(fn);
      } catch {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  // ===========================================================================
  // EVENT EMISSION TESTS
  // ===========================================================================

  describe('event emission', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        name: 'test-circuit',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 5000,
        monitoringWindow: 10000,
      });
    });

    it('should emit CIRCUIT_OPENED when transitioning to OPEN', async () => {
      const openedHandler = vi.fn();
      circuitBreaker.on(CircuitBreakerEvent.CIRCUIT_OPENED, openedHandler);

      const fn = createAlwaysFailingFn();

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      expect(openedHandler).toHaveBeenCalledTimes(1);
      expect(openedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          event: CircuitBreakerEvent.CIRCUIT_OPENED,
          circuitName: 'test-circuit',
          previousState: CircuitState.CLOSED,
          newState: CircuitState.OPEN,
        })
      );
    });

    it('should emit CIRCUIT_HALF_OPENED when transitioning to HALF_OPEN', async () => {
      const halfOpenedHandler = vi.fn();
      circuitBreaker.on(CircuitBreakerEvent.CIRCUIT_HALF_OPENED, halfOpenedHandler);

      const fn = createAlwaysFailingFn();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      // Advance to HALF_OPEN
      vi.advanceTimersByTime(5000);

      expect(halfOpenedHandler).toHaveBeenCalledTimes(1);
      expect(halfOpenedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          event: CircuitBreakerEvent.CIRCUIT_HALF_OPENED,
          previousState: CircuitState.OPEN,
          newState: CircuitState.HALF_OPEN,
        })
      );
    });

    it('should emit CIRCUIT_CLOSED when recovering', async () => {
      const closedHandler = vi.fn();
      circuitBreaker.on(CircuitBreakerEvent.CIRCUIT_CLOSED, closedHandler);

      const fn = createAlwaysFailingFn();
      const successFn = createSucceedingFn('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      // Move to HALF_OPEN
      vi.advanceTimersByTime(5000);

      // Recover
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);

      expect(closedHandler).toHaveBeenCalledTimes(1);
      expect(closedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          event: CircuitBreakerEvent.CIRCUIT_CLOSED,
          previousState: CircuitState.HALF_OPEN,
          newState: CircuitState.CLOSED,
        })
      );
    });

    it('should emit REQUEST_SUCCESS on successful requests', async () => {
      const successHandler = vi.fn();
      circuitBreaker.on(CircuitBreakerEvent.REQUEST_SUCCESS, successHandler);

      await circuitBreaker.execute(createSucceedingFn('result'));

      expect(successHandler).toHaveBeenCalledTimes(1);
      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          event: CircuitBreakerEvent.REQUEST_SUCCESS,
          responseTime: expect.any(Number),
        })
      );
    });

    it('should emit REQUEST_FAILURE on failed requests', async () => {
      const failureHandler = vi.fn();
      circuitBreaker.on(CircuitBreakerEvent.REQUEST_FAILURE, failureHandler);

      try {
        await circuitBreaker.execute(createAlwaysFailingFn());
      } catch {
        // Expected
      }

      expect(failureHandler).toHaveBeenCalledTimes(1);
      expect(failureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          event: CircuitBreakerEvent.REQUEST_FAILURE,
          error: expect.any(Error),
        })
      );
    });

    it('should emit REQUEST_REJECTED when circuit is open', async () => {
      const rejectedHandler = vi.fn();
      circuitBreaker.on(CircuitBreakerEvent.REQUEST_REJECTED, rejectedHandler);

      const fn = createAlwaysFailingFn();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      // Try to execute when open
      try {
        await circuitBreaker.execute(createSucceedingFn('test'));
      } catch {
        // Expected
      }

      expect(rejectedHandler).toHaveBeenCalledTimes(1);
    });

    it('should emit wildcard events', async () => {
      const wildcardHandler = vi.fn();
      circuitBreaker.on('*', wildcardHandler);

      await circuitBreaker.execute(createSucceedingFn('result'));

      expect(wildcardHandler).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // METRICS TESTS
  // ===========================================================================

  describe('metrics', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        name: 'test-circuit',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 5000,
        monitoringWindow: 10000,
      });
    });

    it('should calculate success rate correctly', async () => {
      const successFn = createSucceedingFn('success');
      const failFn = createAlwaysFailingFn();

      // 3 successes
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);

      // 1 failure
      try {
        await circuitBreaker.execute(failFn);
      } catch {
        // Expected
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.successRate).toBe(75); // 3/4 = 75%
    });

    it('should track rejected requests when circuit is open', async () => {
      const fn = createAlwaysFailingFn();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      // Try to execute when open (should be rejected)
      try {
        await circuitBreaker.execute(createSucceedingFn('test'));
      } catch {
        // Expected
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.rejectedRequests).toBe(1);
    });

    it('should provide time until half-open when in OPEN state', async () => {
      const fn = createAlwaysFailingFn();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.timeUntilHalfOpen).toBeDefined();
      expect(metrics.timeUntilHalfOpen).toBeGreaterThan(0);
      expect(metrics.timeUntilHalfOpen).toBeLessThanOrEqual(5000);
    });
  });

  // ===========================================================================
  // MANUAL CONTROL TESTS
  // ===========================================================================

  describe('manual control', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        name: 'test-circuit',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 5000,
        monitoringWindow: 10000,
      });
    });

    it('should reset to CLOSED state', async () => {
      const fn = createAlwaysFailingFn();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Reset
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.isAllowingRequests()).toBe(true);
    });

    it('should emit MANUAL_RESET event on reset', async () => {
      const resetHandler = vi.fn();
      circuitBreaker.on(CircuitBreakerEvent.MANUAL_RESET, resetHandler);

      circuitBreaker.reset();

      expect(resetHandler).toHaveBeenCalledTimes(1);
    });

    it('should force open circuit', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      circuitBreaker.forceOpen();

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.isAllowingRequests()).toBe(false);
    });
  });

  // ===========================================================================
  // FALLBACK TESTS
  // ===========================================================================

  describe('fallback', () => {
    it('should execute fallback when circuit is open', async () => {
      circuitBreaker = new CircuitBreaker({
        name: 'test-circuit',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 5000,
        monitoringWindow: 10000,
        fallback: async (_error: Error) => 'fallback-value',
      });

      const fn = createAlwaysFailingFn();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      // Should return fallback value
      const result = await circuitBreaker.execute(createSucceedingFn('test'));
      expect(result).toBe('fallback-value');
    });

    it('should emit FALLBACK_EXECUTED event', async () => {
      const fallbackHandler = vi.fn();

      circuitBreaker = new CircuitBreaker({
        name: 'test-circuit',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 5000,
        monitoringWindow: 10000,
        fallback: async (_error: Error) => 'fallback-value',
      });

      circuitBreaker.on(CircuitBreakerEvent.FALLBACK_EXECUTED, fallbackHandler);

      const fn = createAlwaysFailingFn();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fn);
        } catch {
          // Expected
        }
      }

      // Trigger fallback
      await circuitBreaker.execute(createSucceedingFn('test'));

      expect(fallbackHandler).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // CUSTOM FAILURE DETECTION TESTS
  // ===========================================================================

  describe('custom failure detection', () => {
    it('should use custom isFailure function', async () => {
      circuitBreaker = new CircuitBreaker({
        name: 'test-circuit',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 5000,
        monitoringWindow: 10000,
        // Only count errors containing "critical" as failures
        isFailure: (error) => error.message.includes('critical'),
      });

      const nonCriticalFn = async () => {
        throw new Error('non-critical error');
      };
      const criticalFn = async () => {
        throw new Error('critical error');
      };

      // Non-critical errors should not trip the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(nonCriticalFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      // Critical errors should trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(criticalFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  // ===========================================================================
  // TIMEOUT TESTS
  // ===========================================================================

  describe('timeout', () => {
    it('should timeout slow requests', async () => {
      vi.useRealTimers(); // Need real timers for timeout test

      circuitBreaker = new CircuitBreaker({
        name: 'test-circuit',
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 5000,
        monitoringWindow: 10000,
        requestTimeout: 100, // 100ms timeout
      });

      const slowFn = createDelayedFn('result', 500); // Takes 500ms

      await expect(circuitBreaker.execute(slowFn)).rejects.toThrow('Request timeout');
    });
  });
});
