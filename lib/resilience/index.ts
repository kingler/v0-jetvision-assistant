/**
 * Resilience Module
 *
 * Provides fault tolerance and resilience patterns for external service calls.
 * Includes circuit breakers, retry logic, and health monitoring.
 *
 * @module lib/resilience
 *
 * @example
 * ```typescript
 * import {
 *   getServiceCircuitBreaker,
 *   executeWithCircuitBreaker,
 *   CircuitState,
 * } from '@/lib/resilience';
 *
 * // Execute with circuit breaker protection
 * const result = await executeWithCircuitBreaker('avinode-api', async () => {
 *   return await avinodeClient.searchFlights(params);
 * });
 *
 * // Or use the circuit breaker directly for more control
 * const cb = getServiceCircuitBreaker('avinode-api');
 * cb.on(CircuitBreakerEvent.CIRCUIT_OPENED, (event) => {
 *   console.error('Avinode API circuit opened!', event);
 *   // Alert ops team
 * });
 * ```
 */

// Core circuit breaker
export {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerEvent,
  CircuitBreakerOpenError,
  createCircuitBreaker,
  createAggressiveCircuitBreaker,
  createRelaxedCircuitBreaker,
} from './circuit-breaker';

// Types
export type {
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  CircuitBreakerEventPayload,
} from './circuit-breaker';

// Registry
export {
  CircuitBreakerRegistry,
  getCircuitBreakerRegistry,
  getServiceCircuitBreaker,
  executeWithCircuitBreaker,
} from './circuit-breaker-registry';

export type {
  CircuitBreakerHealthSummary,
  KnownService,
} from './circuit-breaker-registry';
