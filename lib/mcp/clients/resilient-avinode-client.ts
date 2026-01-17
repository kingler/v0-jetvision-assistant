/**
 * Resilient Avinode API Client
 *
 * Wraps the standard Avinode client with circuit breaker protection
 * for improved fault tolerance and resilience against API failures.
 *
 * @module lib/mcp/clients/resilient-avinode-client
 * @see lib/mcp/clients/avinode-client.ts
 * @see lib/resilience/circuit-breaker.ts
 */

import {
  getServiceCircuitBreaker,
  CircuitBreaker,
  CircuitBreakerMetrics,
  CircuitState,
  CircuitBreakerEvent,
  CircuitBreakerOpenError,
} from '@/lib/resilience';
import { AvinodeClient, RFQFlight, DatabaseQuote } from './avinode-client';
import { Logger, LogLevel } from '../logger';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Configuration for the resilient Avinode client
 */
export interface ResilientAvinodeConfig {
  /** Avinode API key for authentication */
  apiKey: string;
  /** Base URL for Avinode API */
  baseUrl: string;
  /** Enable circuit breaker (default: true) */
  enableCircuitBreaker?: boolean;
  /** Custom circuit breaker configuration */
  circuitBreakerConfig?: {
    failureThreshold?: number;
    successThreshold?: number;
    resetTimeout?: number;
    requestTimeout?: number;
  };
  /** Enable fallback behavior when circuit is open (default: true) */
  enableFallback?: boolean;
  /** Fallback data provider for when circuit is open */
  fallbackProvider?: AvinodeFallbackProvider;
}

/**
 * Interface for providing fallback data when circuit is open
 */
export interface AvinodeFallbackProvider {
  /** Provide fallback for getRFQ calls */
  getRFQFallback?: (rfqId: string) => Promise<any[]>;
  /** Provide fallback for getRFQFlights calls */
  getRFQFlightsFallback?: (rfqId: string) => Promise<ReturnType<AvinodeClient['getRFQFlights']>>;
  /** Provide fallback for listTrips calls */
  listTripsFallback?: () => Promise<ReturnType<AvinodeClient['listTrips']>>;
}

/**
 * Options for individual requests
 */
export interface RequestOptions {
  /** Skip circuit breaker for this request */
  bypassCircuitBreaker?: boolean;
  /** Custom timeout for this request */
  timeout?: number;
}

// =============================================================================
// RESILIENT AVINODE CLIENT
// =============================================================================

/**
 * Resilient Avinode Client
 *
 * Provides circuit breaker protection around Avinode API calls.
 * Automatically fails fast when the Avinode API is experiencing issues,
 * preventing cascade failures and allowing the service to recover.
 *
 * @example
 * ```typescript
 * const client = new ResilientAvinodeClient({
 *   apiKey: process.env.AVINODE_API_KEY!,
 *   baseUrl: process.env.AVINODE_API_URL!,
 * });
 *
 * // Make API calls with automatic circuit breaker protection
 * const flights = await client.getRFQFlights(rfqId);
 *
 * // Check circuit breaker health
 * const metrics = client.getCircuitBreakerMetrics();
 * console.log('Avinode API health:', metrics.state);
 * ```
 */
export class ResilientAvinodeClient {
  private client: AvinodeClient;
  private circuitBreaker: CircuitBreaker;
  private config: ResilientAvinodeConfig;
  private logger: Logger;
  private fallbackProvider?: AvinodeFallbackProvider;

  /**
   * Create a new resilient Avinode client
   *
   * @param config - Configuration options
   */
  constructor(config: ResilientAvinodeConfig) {
    this.config = {
      enableCircuitBreaker: true,
      enableFallback: true,
      ...config,
    };

    this.logger = new Logger({
      level: LogLevel.INFO,
      prefix: '[ResilientAvinodeClient]',
    });

    // Create the underlying Avinode client
    this.client = new AvinodeClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    });

    // Get or create circuit breaker for Avinode API
    this.circuitBreaker = getServiceCircuitBreaker('avinode-api');

    // Apply custom config if provided
    if (config.circuitBreakerConfig) {
      // Note: We use the registry's default config since custom config
      // should be applied at initialization time. Log for awareness.
      this.logger.info('Custom circuit breaker config provided but using registry defaults', {
        customConfig: config.circuitBreakerConfig,
      });
    }

    // Store fallback provider
    this.fallbackProvider = config.fallbackProvider;

    // Setup circuit breaker event listeners for logging
    this.setupCircuitBreakerListeners();

    this.logger.info('Resilient Avinode client initialized', {
      baseUrl: config.baseUrl,
      circuitBreakerEnabled: this.config.enableCircuitBreaker,
      fallbackEnabled: this.config.enableFallback,
    });
  }

  // ===========================================================================
  // PUBLIC API METHODS (with circuit breaker protection)
  // ===========================================================================

  /**
   * Search for available flights/aircraft with circuit breaker protection
   *
   * @param params - Search parameters
   * @param options - Request options
   * @returns Search results
   */
  async searchFlights(params: any, options?: RequestOptions): Promise<any> {
    return this.executeWithProtection(
      'searchFlights',
      () => this.client.searchFlights(params),
      options
    );
  }

  /**
   * Create RFP and distribute to operators with circuit breaker protection
   *
   * @param params - RFP parameters
   * @param options - Request options
   * @returns RFP creation result
   */
  async createRFP(params: any, options?: RequestOptions): Promise<any> {
    return this.executeWithProtection(
      'createRFP',
      () => this.client.createRFP(params),
      options
    );
  }

  /**
   * Get RFP status with circuit breaker protection
   *
   * @param rfpId - RFP ID
   * @param options - Request options
   * @returns RFP status
   */
  async getQuoteStatus(rfpId: string, options?: RequestOptions): Promise<any> {
    return this.executeWithProtection(
      'getQuoteStatus',
      () => this.client.getQuoteStatus(rfpId),
      options
    );
  }

  /**
   * Get all quotes for an RFP with circuit breaker protection
   *
   * @param rfpId - RFP ID
   * @param options - Request options
   * @returns Quote list
   */
  async getQuotes(rfpId: string, options?: RequestOptions): Promise<any> {
    return this.executeWithProtection(
      'getQuotes',
      () => this.client.getQuotes(rfpId),
      options
    );
  }

  /**
   * Get RFQ details with circuit breaker protection
   *
   * @param id - RFQ or Trip ID
   * @param queryOptions - Query parameters
   * @param options - Request options
   * @returns RFQ data
   */
  async getRFQ(
    id: string,
    queryOptions?: {
      taildetails?: boolean;
      typedetails?: boolean;
      timestamps?: boolean;
      tailphotos?: boolean;
      typephotos?: boolean;
      quotebreakdown?: boolean;
      latestquote?: boolean;
    },
    options?: RequestOptions
  ): Promise<any> {
    return this.executeWithProtection(
      'getRFQ',
      () => this.client.getRFQ(id, queryOptions),
      options,
      // Fallback handler for getRFQ
      async () => {
        if (this.fallbackProvider?.getRFQFallback) {
          this.logger.warn('Using fallback for getRFQ', { id });
          return this.fallbackProvider.getRFQFallback(id);
        }
        throw new Error('No fallback available for getRFQ');
      }
    );
  }

  /**
   * Create a trip container with circuit breaker protection
   *
   * @param params - Trip parameters
   * @param options - Request options
   * @returns Trip creation result with deep link
   */
  async createTrip(
    params: Parameters<AvinodeClient['createTrip']>[0],
    options?: RequestOptions
  ): Promise<ReturnType<AvinodeClient['createTrip']>> {
    return this.executeWithProtection(
      'createTrip',
      () => this.client.createTrip(params),
      options
    );
  }

  /**
   * Get RFQ flights in UI format with circuit breaker protection
   *
   * @param rfqId - RFQ ID
   * @param options - Request options
   * @returns RFQ flights data
   */
  async getRFQFlights(
    rfqId: string,
    options?: RequestOptions
  ): Promise<ReturnType<AvinodeClient['getRFQFlights']>> {
    return this.executeWithProtection(
      'getRFQFlights',
      () => this.client.getRFQFlights(rfqId),
      options,
      // Fallback handler
      async () => {
        if (this.fallbackProvider?.getRFQFlightsFallback) {
          this.logger.warn('Using fallback for getRFQFlights', { rfqId });
          return this.fallbackProvider.getRFQFlightsFallback(rfqId);
        }
        throw new Error('No fallback available for getRFQFlights');
      }
    );
  }

  /**
   * List trips with circuit breaker protection
   *
   * @param listOptions - Filter options
   * @param options - Request options
   * @returns Trip list
   */
  async listTrips(
    listOptions?: Parameters<AvinodeClient['listTrips']>[0],
    options?: RequestOptions
  ): Promise<ReturnType<AvinodeClient['listTrips']>> {
    return this.executeWithProtection(
      'listTrips',
      () => this.client.listTrips(listOptions),
      options,
      // Fallback handler - return empty list
      async () => {
        if (this.fallbackProvider?.listTripsFallback) {
          this.logger.warn('Using fallback for listTrips');
          return this.fallbackProvider.listTripsFallback();
        }
        // Default fallback: empty list
        return {
          trips: [],
          source: 'database' as const,
          total: 0,
        };
      }
    );
  }

  /**
   * Send a trip message with circuit breaker protection
   *
   * @param params - Message parameters
   * @param options - Request options
   * @returns Message result
   */
  async sendTripMessage(
    params: Parameters<AvinodeClient['sendTripMessage']>[0],
    options?: RequestOptions
  ): Promise<ReturnType<AvinodeClient['sendTripMessage']>> {
    return this.executeWithProtection(
      'sendTripMessage',
      () => this.client.sendTripMessage(params),
      options
    );
  }

  /**
   * Get trip messages with circuit breaker protection
   *
   * @param params - Query parameters
   * @param options - Request options
   * @returns Messages list
   */
  async getTripMessages(
    params: Parameters<AvinodeClient['getTripMessages']>[0],
    options?: RequestOptions
  ): Promise<ReturnType<AvinodeClient['getTripMessages']>> {
    return this.executeWithProtection(
      'getTripMessages',
      () => this.client.getTripMessages(params),
      options,
      // Fallback: return empty messages
      async () => ({
        messages: [],
        total: 0,
        trip_id: params.trip_id,
        request_id: params.request_id,
      })
    );
  }

  // ===========================================================================
  // CIRCUIT BREAKER MANAGEMENT
  // ===========================================================================

  /**
   * Get circuit breaker metrics
   *
   * @returns Current circuit breaker metrics
   */
  getCircuitBreakerMetrics(): CircuitBreakerMetrics {
    return this.circuitBreaker.getMetrics();
  }

  /**
   * Get circuit breaker state
   *
   * @returns Current circuit state
   */
  getCircuitBreakerState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Check if the circuit breaker is allowing requests
   *
   * @returns True if requests are allowed
   */
  isCircuitHealthy(): boolean {
    return this.circuitBreaker.isAllowingRequests();
  }

  /**
   * Manually reset the circuit breaker
   */
  resetCircuitBreaker(): void {
    this.logger.info('Manually resetting circuit breaker');
    this.circuitBreaker.reset();
  }

  /**
   * Force the circuit breaker to open (for testing/emergency)
   */
  forceCircuitOpen(): void {
    this.logger.warn('Force opening circuit breaker');
    this.circuitBreaker.forceOpen();
  }

  /**
   * Subscribe to circuit breaker events
   *
   * @param event - Event type to subscribe to
   * @param listener - Event handler
   * @returns Unsubscribe function
   */
  onCircuitBreakerEvent(
    event: CircuitBreakerEvent | '*',
    listener: (...args: any[]) => void
  ): () => void {
    this.circuitBreaker.on(event, listener);
    return () => this.circuitBreaker.off(event, listener);
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Execute a function with circuit breaker protection
   *
   * @param methodName - Name of the method for logging
   * @param fn - Function to execute
   * @param options - Request options
   * @param fallback - Optional fallback function
   * @returns Result of function or fallback
   */
  private async executeWithProtection<T>(
    methodName: string,
    fn: () => Promise<T>,
    options?: RequestOptions,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // Bypass circuit breaker if requested
    if (options?.bypassCircuitBreaker || !this.config.enableCircuitBreaker) {
      this.logger.debug(`Bypassing circuit breaker for ${methodName}`);
      return fn();
    }

    try {
      return await this.circuitBreaker.execute(fn);
    } catch (error) {
      // Check if circuit is open and we have a fallback
      if (error instanceof CircuitBreakerOpenError) {
        this.logger.warn(`Circuit breaker open for ${methodName}`, {
          state: error.metrics.state,
          failureCount: error.metrics.currentFailureCount,
        });

        // Try fallback if available
        if (this.config.enableFallback && fallback) {
          try {
            return await fallback();
          } catch (fallbackError) {
            this.logger.error(`Fallback failed for ${methodName}`, {
              error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            });
            throw error; // Throw original circuit breaker error
          }
        }
      }

      throw error;
    }
  }

  /**
   * Setup circuit breaker event listeners for logging and monitoring
   */
  private setupCircuitBreakerListeners(): void {
    // Log circuit state changes
    this.circuitBreaker.on(CircuitBreakerEvent.CIRCUIT_OPENED, (payload) => {
      this.logger.error('Avinode API circuit breaker OPENED', {
        previousState: payload.previousState,
        error: payload.error?.message,
        metrics: payload.metrics,
      });
    });

    this.circuitBreaker.on(CircuitBreakerEvent.CIRCUIT_HALF_OPENED, (payload) => {
      this.logger.info('Avinode API circuit breaker HALF_OPENED', {
        previousState: payload.previousState,
      });
    });

    this.circuitBreaker.on(CircuitBreakerEvent.CIRCUIT_CLOSED, (payload) => {
      this.logger.info('Avinode API circuit breaker CLOSED (recovered)', {
        previousState: payload.previousState,
      });
    });

    this.circuitBreaker.on(CircuitBreakerEvent.REQUEST_REJECTED, (payload) => {
      this.logger.warn('Avinode API request rejected (circuit open)', {
        metrics: payload.metrics,
      });
    });
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let resilientClientInstance: ResilientAvinodeClient | null = null;

/**
 * Get or create the singleton resilient Avinode client
 *
 * @param config - Configuration (only used on first call)
 * @returns Singleton instance
 */
export function getResilientAvinodeClient(
  config?: Partial<ResilientAvinodeConfig>
): ResilientAvinodeClient {
  if (!resilientClientInstance) {
    const apiKey = config?.apiKey || process.env.AVINODE_API_KEY || '';
    const baseUrl = config?.baseUrl || process.env.AVINODE_API_URL || 'https://api.avinode.com';

    if (!apiKey) {
      console.warn('[ResilientAvinodeClient] No API key provided, client may not function correctly');
    }

    resilientClientInstance = new ResilientAvinodeClient({
      apiKey,
      baseUrl,
      ...config,
    });
  }

  return resilientClientInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetResilientAvinodeClient(): void {
  resilientClientInstance = null;
}
