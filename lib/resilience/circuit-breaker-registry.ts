/**
 * Circuit Breaker Registry
 *
 * Centralized management of circuit breakers across the application.
 * Provides singleton access, health monitoring, and bulk operations.
 *
 * @module lib/resilience/circuit-breaker-registry
 */

import { EventEmitter } from 'events';
import {
  CircuitBreaker,
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  CircuitState,
  CircuitBreakerEvent,
  CircuitBreakerEventPayload,
  createCircuitBreaker,
} from './circuit-breaker';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Aggregate health status for all circuit breakers
 */
export interface CircuitBreakerHealthSummary {
  /** Total number of registered circuit breakers */
  totalCircuits: number;
  /** Number of circuits in CLOSED state */
  closedCount: number;
  /** Number of circuits in OPEN state */
  openCount: number;
  /** Number of circuits in HALF_OPEN state */
  halfOpenCount: number;
  /** Overall health status */
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  /** List of unhealthy circuit names */
  unhealthyCircuits: string[];
  /** Aggregate success rate across all circuits */
  aggregateSuccessRate: number;
  /** Total requests across all circuits */
  totalRequests: number;
  /** Individual circuit metrics */
  circuits: Record<string, CircuitBreakerMetrics>;
  /** Timestamp of the health check */
  timestamp: number;
}

/**
 * Pre-configured circuit breakers for known services
 */
export type KnownService =
  | 'avinode-api'
  | 'avinode-mcp'
  | 'linear-api'
  | 'email-service'
  | 'openai-api'
  | 'supabase'
  | 'gmail-mcp'
  | 'google-sheets-mcp';

/**
 * Default configurations for known services
 */
const SERVICE_CONFIGS: Record<KnownService, Partial<CircuitBreakerConfig>> = {
  'avinode-api': {
    failureThreshold: 5,
    successThreshold: 3,
    resetTimeout: 30000,
    monitoringWindow: 60000,
    requestTimeout: 30000,
  },
  'avinode-mcp': {
    failureThreshold: 3,
    successThreshold: 3,
    resetTimeout: 45000,
    monitoringWindow: 60000,
    requestTimeout: 60000, // MCP calls can be slower
  },
  'linear-api': {
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeout: 20000,
    monitoringWindow: 60000,
    requestTimeout: 15000,
  },
  'email-service': {
    failureThreshold: 3,
    successThreshold: 2,
    resetTimeout: 60000, // Email issues might take longer to resolve
    monitoringWindow: 120000,
    requestTimeout: 30000,
  },
  'openai-api': {
    failureThreshold: 3,
    successThreshold: 2,
    resetTimeout: 30000,
    monitoringWindow: 60000,
    requestTimeout: 120000, // LLM calls can be slow
  },
  'supabase': {
    failureThreshold: 5,
    successThreshold: 3,
    resetTimeout: 15000, // Database should recover quickly
    monitoringWindow: 30000,
    requestTimeout: 10000,
  },
  'gmail-mcp': {
    failureThreshold: 3,
    successThreshold: 2,
    resetTimeout: 30000,
    monitoringWindow: 60000,
    requestTimeout: 30000,
  },
  'google-sheets-mcp': {
    failureThreshold: 3,
    successThreshold: 2,
    resetTimeout: 30000,
    monitoringWindow: 60000,
    requestTimeout: 30000,
  },
};

// =============================================================================
// CIRCUIT BREAKER REGISTRY
// =============================================================================

/**
 * Circuit Breaker Registry
 *
 * Singleton registry for managing all circuit breakers in the application.
 * Provides centralized monitoring, health checks, and event forwarding.
 *
 * @example
 * ```typescript
 * const registry = CircuitBreakerRegistry.getInstance();
 *
 * // Get or create a circuit breaker for a known service
 * const avinodeCB = registry.getOrCreate('avinode-api');
 *
 * // Execute a request through the circuit breaker
 * const result = await avinodeCB.execute(() => fetchAvinodeData());
 *
 * // Check overall health
 * const health = registry.getHealthSummary();
 * console.log('System health:', health.overallHealth);
 * ```
 */
export class CircuitBreakerRegistry extends EventEmitter {
  private static instance: CircuitBreakerRegistry | null = null;
  private circuits: Map<string, CircuitBreaker> = new Map();
  private eventForwarders: Map<string, () => void> = new Map();

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    super();
    console.log('[CircuitBreakerRegistry] Initialized');
  }

  /**
   * Get the singleton registry instance
   */
  public static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance.destroyAll();
      CircuitBreakerRegistry.instance = null;
    }
  }

  // ===========================================================================
  // CIRCUIT BREAKER MANAGEMENT
  // ===========================================================================

  /**
   * Register a circuit breaker with the registry
   *
   * @param circuitBreaker - The circuit breaker to register
   * @returns The registered circuit breaker
   */
  register(circuitBreaker: CircuitBreaker): CircuitBreaker {
    const name = circuitBreaker.getName();

    if (this.circuits.has(name)) {
      console.warn(`[CircuitBreakerRegistry] Circuit "${name}" already exists, replacing`);
      this.unregister(name);
    }

    this.circuits.set(name, circuitBreaker);
    this.setupEventForwarding(circuitBreaker);

    console.log(`[CircuitBreakerRegistry] Registered circuit: ${name}`);
    this.emit('circuit:registered', { name, circuit: circuitBreaker });

    return circuitBreaker;
  }

  /**
   * Create and register a circuit breaker for a known service
   *
   * @param serviceName - Name of the known service
   * @param overrides - Optional configuration overrides
   * @returns The created circuit breaker
   */
  create(serviceName: KnownService, overrides?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    const config = {
      ...SERVICE_CONFIGS[serviceName],
      ...overrides,
      name: serviceName,
    };

    const circuitBreaker = createCircuitBreaker(serviceName, config);
    return this.register(circuitBreaker);
  }

  /**
   * Create and register a circuit breaker with custom config
   *
   * @param name - Unique name for the circuit breaker
   * @param config - Configuration for the circuit breaker
   * @returns The created circuit breaker
   */
  createCustom(name: string, config: Partial<CircuitBreakerConfig>): CircuitBreaker {
    const circuitBreaker = createCircuitBreaker(name, config);
    return this.register(circuitBreaker);
  }

  /**
   * Get or create a circuit breaker for a known service
   *
   * @param serviceName - Name of the known service
   * @param overrides - Optional configuration overrides (only used if creating)
   * @returns The circuit breaker
   */
  getOrCreate(serviceName: KnownService, overrides?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    const existing = this.circuits.get(serviceName);
    if (existing) {
      return existing;
    }
    return this.create(serviceName, overrides);
  }

  /**
   * Get a circuit breaker by name
   *
   * @param name - Name of the circuit breaker
   * @returns The circuit breaker or undefined
   */
  get(name: string): CircuitBreaker | undefined {
    return this.circuits.get(name);
  }

  /**
   * Unregister a circuit breaker
   *
   * @param name - Name of the circuit breaker to remove
   */
  unregister(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) {
      // Clean up event forwarding
      const cleanup = this.eventForwarders.get(name);
      if (cleanup) {
        cleanup();
        this.eventForwarders.delete(name);
      }

      circuit.destroy();
      this.circuits.delete(name);

      console.log(`[CircuitBreakerRegistry] Unregistered circuit: ${name}`);
      this.emit('circuit:unregistered', { name });
    }
  }

  /**
   * Destroy all circuit breakers and clean up
   */
  destroyAll(): void {
    for (const name of this.circuits.keys()) {
      this.unregister(name);
    }
    this.removeAllListeners();
    console.log('[CircuitBreakerRegistry] All circuits destroyed');
  }

  // ===========================================================================
  // HEALTH MONITORING
  // ===========================================================================

  /**
   * Get health summary for all circuit breakers
   *
   * @returns Aggregate health summary
   */
  getHealthSummary(): CircuitBreakerHealthSummary {
    const circuits: Record<string, CircuitBreakerMetrics> = {};
    let closedCount = 0;
    let openCount = 0;
    let halfOpenCount = 0;
    let totalRequests = 0;
    let totalSuccesses = 0;
    const unhealthyCircuits: string[] = [];

    for (const [name, circuit] of this.circuits) {
      const metrics = circuit.getMetrics();
      circuits[name] = metrics;
      totalRequests += metrics.totalRequests;
      totalSuccesses += metrics.successfulRequests;

      switch (metrics.state) {
        case CircuitState.CLOSED:
          closedCount++;
          break;
        case CircuitState.OPEN:
          openCount++;
          unhealthyCircuits.push(name);
          break;
        case CircuitState.HALF_OPEN:
          halfOpenCount++;
          break;
      }
    }

    const totalCircuits = this.circuits.size;
    const aggregateSuccessRate =
      totalRequests > 0 ? (totalSuccesses / totalRequests) * 100 : 100;

    // Determine overall health
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    if (openCount === 0 && halfOpenCount === 0) {
      overallHealth = 'healthy';
    } else if (openCount > totalCircuits / 2) {
      overallHealth = 'unhealthy';
    } else {
      overallHealth = 'degraded';
    }

    return {
      totalCircuits,
      closedCount,
      openCount,
      halfOpenCount,
      overallHealth,
      unhealthyCircuits,
      aggregateSuccessRate: Math.round(aggregateSuccessRate * 100) / 100,
      totalRequests,
      circuits,
      timestamp: Date.now(),
    };
  }

  /**
   * Get metrics for a specific circuit breaker
   *
   * @param name - Name of the circuit breaker
   * @returns Metrics or undefined
   */
  getMetrics(name: string): CircuitBreakerMetrics | undefined {
    return this.circuits.get(name)?.getMetrics();
  }

  /**
   * Get all registered circuit breaker names
   *
   * @returns Array of circuit breaker names
   */
  getNames(): string[] {
    return Array.from(this.circuits.keys());
  }

  /**
   * Check if a specific circuit is healthy (CLOSED state)
   *
   * @param name - Name of the circuit breaker
   * @returns True if healthy or not found
   */
  isHealthy(name: string): boolean {
    const circuit = this.circuits.get(name);
    return circuit ? circuit.getState() === CircuitState.CLOSED : true;
  }

  // ===========================================================================
  // BULK OPERATIONS
  // ===========================================================================

  /**
   * Reset all circuit breakers to CLOSED state
   */
  resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
    console.log('[CircuitBreakerRegistry] All circuits reset');
    this.emit('registry:reset');
  }

  /**
   * Reset specific circuit breakers
   *
   * @param names - Names of circuits to reset
   */
  reset(...names: string[]): void {
    for (const name of names) {
      const circuit = this.circuits.get(name);
      if (circuit) {
        circuit.reset();
      }
    }
  }

  // ===========================================================================
  // EVENT FORWARDING
  // ===========================================================================

  /**
   * Setup event forwarding from circuit breaker to registry
   */
  private setupEventForwarding(circuit: CircuitBreaker): void {
    const name = circuit.getName();

    // Forward all events to registry
    const forwarder = (payload: CircuitBreakerEventPayload) => {
      this.emit(payload.event, payload);
      this.emit('circuit:event', payload);
    };

    circuit.on('*', forwarder);

    // Store cleanup function
    this.eventForwarders.set(name, () => {
      circuit.off('*', forwarder);
    });
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Get the global circuit breaker registry instance
 */
export function getCircuitBreakerRegistry(): CircuitBreakerRegistry {
  return CircuitBreakerRegistry.getInstance();
}

/**
 * Quick helper to get or create a circuit breaker for a known service
 *
 * @param serviceName - Name of the known service
 * @returns The circuit breaker
 */
export function getServiceCircuitBreaker(serviceName: KnownService): CircuitBreaker {
  return getCircuitBreakerRegistry().getOrCreate(serviceName);
}

/**
 * Execute a function with circuit breaker protection for a known service
 *
 * @param serviceName - Name of the known service
 * @param fn - The async function to execute
 * @returns The result of the function
 */
export async function executeWithCircuitBreaker<T>(
  serviceName: KnownService,
  fn: () => Promise<T>
): Promise<T> {
  return getServiceCircuitBreaker(serviceName).execute(fn);
}
