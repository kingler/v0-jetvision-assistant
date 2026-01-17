/**
 * Circuit Breaker Registry Unit Tests
 *
 * Tests for the circuit breaker registry including registration,
 * health monitoring, and bulk operations.
 *
 * @module __tests__/unit/resilience/circuit-breaker-registry.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CircuitBreakerRegistry,
  getCircuitBreakerRegistry,
  getServiceCircuitBreaker,
  executeWithCircuitBreaker,
} from '@/lib/resilience/circuit-breaker-registry';
import {
  CircuitBreaker,
  CircuitState,
  createCircuitBreaker,
} from '@/lib/resilience/circuit-breaker';

// =============================================================================
// TESTS
// =============================================================================

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    // Reset singleton for each test
    CircuitBreakerRegistry.resetInstance();
    registry = CircuitBreakerRegistry.getInstance();
  });

  afterEach(() => {
    CircuitBreakerRegistry.resetInstance();
  });

  // ===========================================================================
  // SINGLETON TESTS
  // ===========================================================================

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = CircuitBreakerRegistry.getInstance();
      const instance2 = CircuitBreakerRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return same instance from convenience function', () => {
      const instance1 = registry;
      const instance2 = getCircuitBreakerRegistry();

      expect(instance1).toBe(instance2);
    });

    it('should reset instance properly', () => {
      const instance1 = CircuitBreakerRegistry.getInstance();

      // Register a circuit
      instance1.createCustom('test', {});

      // Reset
      CircuitBreakerRegistry.resetInstance();

      const instance2 = CircuitBreakerRegistry.getInstance();

      // Should be new instance with no circuits
      expect(instance1).not.toBe(instance2);
      expect(instance2.getNames()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // REGISTRATION TESTS
  // ===========================================================================

  describe('registration', () => {
    it('should register a circuit breaker', () => {
      const cb = createCircuitBreaker('test-circuit');
      registry.register(cb);

      expect(registry.get('test-circuit')).toBe(cb);
      expect(registry.getNames()).toContain('test-circuit');
    });

    it('should create circuit breaker for known service', () => {
      const cb = registry.create('avinode-api');

      expect(cb.getName()).toBe('avinode-api');
      expect(registry.get('avinode-api')).toBe(cb);
    });

    it('should create custom circuit breaker', () => {
      const cb = registry.createCustom('custom-service', {
        failureThreshold: 10,
        resetTimeout: 60000,
      });

      expect(cb.getName()).toBe('custom-service');
      expect(registry.get('custom-service')).toBe(cb);
    });

    it('should get or create circuit breaker', () => {
      const cb1 = registry.getOrCreate('avinode-api');
      const cb2 = registry.getOrCreate('avinode-api');

      expect(cb1).toBe(cb2);
    });

    it('should unregister circuit breaker', () => {
      const cb = registry.createCustom('test-circuit', {});

      expect(registry.get('test-circuit')).toBeDefined();

      registry.unregister('test-circuit');

      expect(registry.get('test-circuit')).toBeUndefined();
    });

    it('should replace existing circuit breaker with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const cb1 = createCircuitBreaker('test-circuit');
      const cb2 = createCircuitBreaker('test-circuit');

      registry.register(cb1);
      registry.register(cb2);

      expect(registry.get('test-circuit')).toBe(cb2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already exists')
      );

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // HEALTH MONITORING TESTS
  // ===========================================================================

  describe('health monitoring', () => {
    it('should return healthy when all circuits are closed', () => {
      registry.createCustom('service-1', {});
      registry.createCustom('service-2', {});
      registry.createCustom('service-3', {});

      const health = registry.getHealthSummary();

      expect(health.overallHealth).toBe('healthy');
      expect(health.closedCount).toBe(3);
      expect(health.openCount).toBe(0);
      expect(health.halfOpenCount).toBe(0);
      expect(health.unhealthyCircuits).toHaveLength(0);
    });

    it('should return degraded when some circuits are open', async () => {
      const cb1 = registry.createCustom('service-1', { failureThreshold: 1 });
      registry.createCustom('service-2', {});
      registry.createCustom('service-3', {});

      // Open one circuit
      try {
        await cb1.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }

      const health = registry.getHealthSummary();

      expect(health.overallHealth).toBe('degraded');
      expect(health.openCount).toBe(1);
      expect(health.unhealthyCircuits).toContain('service-1');
    });

    it('should return unhealthy when majority of circuits are open', async () => {
      const cb1 = registry.createCustom('service-1', { failureThreshold: 1 });
      const cb2 = registry.createCustom('service-2', { failureThreshold: 1 });
      registry.createCustom('service-3', {});

      // Open two circuits
      try {
        await cb1.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }
      try {
        await cb2.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }

      const health = registry.getHealthSummary();

      expect(health.overallHealth).toBe('unhealthy');
      expect(health.openCount).toBe(2);
    });

    it('should get metrics for specific circuit', () => {
      registry.createCustom('test-circuit', {});

      const metrics = registry.getMetrics('test-circuit');

      expect(metrics).toBeDefined();
      expect(metrics?.name).toBe('test-circuit');
      expect(metrics?.state).toBe(CircuitState.CLOSED);
    });

    it('should check if circuit is healthy', async () => {
      const cb = registry.createCustom('test-circuit', { failureThreshold: 1 });

      expect(registry.isHealthy('test-circuit')).toBe(true);

      // Open the circuit
      try {
        await cb.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }

      expect(registry.isHealthy('test-circuit')).toBe(false);
    });

    it('should return true for non-existent circuit', () => {
      expect(registry.isHealthy('non-existent')).toBe(true);
    });
  });

  // ===========================================================================
  // BULK OPERATIONS TESTS
  // ===========================================================================

  describe('bulk operations', () => {
    it('should reset all circuit breakers', async () => {
      const cb1 = registry.createCustom('service-1', { failureThreshold: 1 });
      const cb2 = registry.createCustom('service-2', { failureThreshold: 1 });

      // Open both circuits
      try {
        await cb1.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }
      try {
        await cb2.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }

      expect(cb1.getState()).toBe(CircuitState.OPEN);
      expect(cb2.getState()).toBe(CircuitState.OPEN);

      registry.resetAll();

      expect(cb1.getState()).toBe(CircuitState.CLOSED);
      expect(cb2.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reset specific circuit breakers', async () => {
      const cb1 = registry.createCustom('service-1', { failureThreshold: 1 });
      const cb2 = registry.createCustom('service-2', { failureThreshold: 1 });

      // Open both circuits
      try {
        await cb1.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }
      try {
        await cb2.execute(async () => {
          throw new Error('fail');
        });
      } catch {
        // Expected
      }

      registry.reset('service-1');

      expect(cb1.getState()).toBe(CircuitState.CLOSED);
      expect(cb2.getState()).toBe(CircuitState.OPEN);
    });

    it('should destroy all circuits', () => {
      registry.createCustom('service-1', {});
      registry.createCustom('service-2', {});

      expect(registry.getNames()).toHaveLength(2);

      registry.destroyAll();

      expect(registry.getNames()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // EVENT FORWARDING TESTS
  // ===========================================================================

  describe('event forwarding', () => {
    it('should forward circuit breaker events', async () => {
      const eventHandler = vi.fn();
      registry.on('circuit:event', eventHandler);

      const cb = registry.createCustom('test-circuit', {});

      await cb.execute(async () => 'success');

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should emit circuit:registered event', () => {
      const registeredHandler = vi.fn();
      registry.on('circuit:registered', registeredHandler);

      registry.createCustom('test-circuit', {});

      expect(registeredHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-circuit',
        })
      );
    });

    it('should emit circuit:unregistered event', () => {
      const unregisteredHandler = vi.fn();
      registry.on('circuit:unregistered', unregisteredHandler);

      registry.createCustom('test-circuit', {});
      registry.unregister('test-circuit');

      expect(unregisteredHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-circuit',
        })
      );
    });
  });

  // ===========================================================================
  // CONVENIENCE FUNCTION TESTS
  // ===========================================================================

  describe('convenience functions', () => {
    it('should get service circuit breaker', () => {
      const cb = getServiceCircuitBreaker('avinode-api');

      expect(cb).toBeDefined();
      expect(cb.getName()).toBe('avinode-api');
    });

    it('should execute with circuit breaker', async () => {
      const result = await executeWithCircuitBreaker('avinode-api', async () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });

    it('should throw when circuit is open', async () => {
      const cb = getServiceCircuitBreaker('avinode-api');

      // Force open
      cb.forceOpen();

      await expect(
        executeWithCircuitBreaker('avinode-api', async () => 'test')
      ).rejects.toThrow('OPEN');
    });
  });
});
