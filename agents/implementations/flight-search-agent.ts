/**
 * Flight Search Agent Implementation
 *
 * Searches for charter flights using the Avinode MCP server.
 * Handles regular flights, empty legs, RFP creation, and quote retrieval.
 */

import { BaseAgent } from '../core/base-agent';
import type {
  AgentContext,
  AgentResult,
  AgentConfig,
} from '../core/types';
import { AgentType, AgentStatus } from '../core/types';
import { AvinodeMCPServer } from '@/lib/mcp/avinode-server';

/**
 * Flight search parameters extracted from context
 */
interface FlightSearchParams {
  departure: string;
  arrival: string;
  departureDate: string;
  passengers: number;
  aircraftCategory?: string;
  budget?: number;
  returnDate?: string;
  specialRequirements?: string;
}

/**
 * Normalized flight option from search results
 */
interface FlightOption {
  id: string;
  aircraftType: string;
  aircraftCategory: string;
  operator: {
    id: string;
    name: string;
    rating?: number;
  };
  price: number;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  capacity: number;
  range: number;
  speed: number;
  isEmptyLeg?: boolean;
  originalPrice?: number;
  savings?: number;
}

/**
 * Quote from operator in response to RFP
 */
interface Quote {
  quoteId: string;
  rfpId: string;
  operatorId: string;
  operatorName: string;
  aircraftType: string;
  basePrice: number;
  totalPrice: number;
  fuel?: number;
  taxes?: number;
  fees?: number;
  responseTime: number;
  createdAt: string;
}

/**
 * RFP creation result
 */
interface RFPResult {
  rfpId: string;
  status: string;
  operatorsContacted: number;
  createdAt: string;
}

/**
 * FlightSearchAgent
 * Searches for flights and creates RFPs via Avinode MCP server
 */
export class FlightSearchAgent extends BaseAgent {
  private mcpServer: AvinodeMCPServer;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.FLIGHT_SEARCH,
    });

    // Initialize Avinode MCP server
    this.mcpServer = new AvinodeMCPServer();
  }

  /**
   * Initialize the agent and MCP server
   */
  async initialize(): Promise<void> {
    await super.initialize();

    // Start MCP server
    await this.mcpServer.start();
  }

  /**
   * Execute the agent
   * Searches for flights, creates RFP, and retrieves quotes
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this._status = AgentStatus.RUNNING;

    try {
      // Extract and validate flight search parameters
      const searchParams = this.extractSearchParams(context);
      this.validateSearchParams(searchParams);

      // Search for flights from multiple operators in parallel
      const flights = await this.searchFlights(searchParams);

      // Create RFP and distribute to operators
      const rfpResult = await this.createRFP(searchParams, context);

      // Wait briefly for operators to respond (in production, this would be async/webhook)
      await this.delay(2000);

      // Retrieve quotes from operators
      const quotes = await this.getQuotes(rfpResult.rfpId);

      // Aggregate and deduplicate all results
      const allOptions = this.aggregateResults(flights, quotes);
      const uniqueOptions = this.deduplicateResults(allOptions);
      const sortedOptions = this.sortByPrice(uniqueOptions);

      // Calculate statistics
      const emptyLegs = sortedOptions.filter(opt => opt.isEmptyLeg);
      const totalSavings = emptyLegs.reduce((sum, leg) => sum + (leg.savings || 0), 0);

      // Update metrics
      this.metrics.totalExecutions++;
      this.metrics.successfulExecutions++;
      this._status = AgentStatus.COMPLETED;

      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);

      return {
        success: true,
        data: {
          flights: sortedOptions,
          emptyLegs,
          totalOptions: sortedOptions.length,
          totalSavings,
          searchParams,
          rfpId: rfpResult.rfpId,
          rfpStatus: rfpResult.status,
          operatorsContacted: rfpResult.operatorsContacted,
          quotesReceived: quotes.length,
          requestId: context.requestId,
          sessionId: context.sessionId,
          nextAgent: AgentType.PROPOSAL_ANALYSIS,
        },
        metadata: {
          executionTime,
          toolCalls: this.metrics.toolCallsCount,
        },
      };
    } catch (error) {
      // Handle errors
      this.metrics.totalExecutions++;
      this.metrics.failedExecutions++;
      this._status = AgentStatus.ERROR;

      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error as Error,
        metadata: {
          executionTime,
        },
      };
    }
  }

  /**
   * Extract flight search parameters from context
   */
  private extractSearchParams(context: AgentContext): FlightSearchParams {
    const metadata = context.metadata || {};

    return {
      departure: metadata.departure as string,
      arrival: metadata.arrival as string,
      departureDate: metadata.departureDate as string,
      passengers: metadata.passengers as number,
      aircraftCategory: (metadata.clientData as any)?.preferences?.aircraftType,
      budget: (metadata.clientData as any)?.preferences?.budget,
      returnDate: metadata.returnDate as string | undefined,
      specialRequirements: metadata.specialRequirements as string | undefined,
    };
  }

  /**
   * Validate flight search parameters
   */
  private validateSearchParams(params: FlightSearchParams): void {
    if (!params.departure) {
      throw new Error('Missing required field: departure airport');
    }
    if (!params.arrival) {
      throw new Error('Missing required field: arrival airport');
    }
    if (!params.departureDate) {
      throw new Error('Missing required field: departure date');
    }
    if (!params.passengers || params.passengers <= 0) {
      throw new Error('Invalid passengers count');
    }
    if (params.passengers > 19) {
      throw new Error('Passenger count exceeds maximum (19)');
    }
  }

  /**
   * Search for flights across multiple operators in parallel
   * Uses Avinode MCP server's search_flights tool
   */
  private async searchFlights(params: FlightSearchParams): Promise<FlightOption[]> {
    this.metrics.toolCallsCount++;

    try {
      // Call Avinode MCP search_flights tool with retry
      const result = await this.executeToolWithRetry('search_flights', {
        departure_airport: params.departure,
        arrival_airport: params.arrival,
        passengers: params.passengers,
        departure_date: params.departureDate,
        aircraft_category: params.aircraftCategory,
      });

      // Normalize and filter results
      const flights = this.normalizeFlightResults(result);

      // Filter by budget if specified
      const filtered = params.budget
        ? flights.filter(f => f.price <= params.budget!)
        : flights;

      return filtered;
    } catch (error) {
      // Log error but don't fail - return empty array
      throw new Error(`Flight search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Create RFP (Request for Proposal) via Avinode MCP
   */
  private async createRFP(
    params: FlightSearchParams,
    context: AgentContext
  ): Promise<RFPResult> {
    this.metrics.toolCallsCount++;

    try {
      // Get list of operators to contact (in production, this would come from client preferences)
      const operatorIds = this.selectOperators(params);

      // Call Avinode MCP create_rfp tool with retry
      const result = await this.executeToolWithRetry('create_rfp', {
        flight_details: {
          departure_airport: params.departure,
          arrival_airport: params.arrival,
          passengers: params.passengers,
          departure_date: params.departureDate,
        },
        operator_ids: operatorIds,
        special_requirements: params.specialRequirements,
      });

      return {
        rfpId: result.rfp_id,
        status: result.status,
        operatorsContacted: result.operators_notified || operatorIds.length,
        createdAt: result.created_at || new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`RFP creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get quotes for an RFP via Avinode MCP
   */
  private async getQuotes(rfpId: string): Promise<Quote[]> {
    this.metrics.toolCallsCount++;

    try {
      // Call Avinode MCP get_quotes tool with retry
      const result = await this.executeToolWithRetry('get_quotes', {
        rfp_id: rfpId,
      });

      // Normalize quote results
      return this.normalizeQuoteResults(result.quotes || [], rfpId);
    } catch (error) {
      // Return empty array if no quotes available yet
      return [];
    }
  }

  /**
   * Normalize flight search results to common format
   */
  private normalizeFlightResults(result: any): FlightOption[] {
    if (!result || !result.aircraft) {
      return [];
    }

    return result.aircraft.map((aircraft: any) => {
      const basePrice = this.calculateBasePrice(aircraft);
      const isEmptyLeg = this.isEmptyLeg(aircraft);
      const originalPrice = isEmptyLeg ? basePrice * 1.6 : basePrice;
      const savings = isEmptyLeg ? originalPrice - basePrice : 0;

      return {
        id: aircraft.id,
        aircraftType: aircraft.type,
        aircraftCategory: aircraft.category,
        operator: {
          id: aircraft.operator.id,
          name: aircraft.operator.name,
          rating: aircraft.operator.rating,
        },
        price: basePrice,
        departureTime: this.estimateDepartureTime(result.query?.departure_date),
        arrivalTime: this.estimateArrivalTime(result.query?.departure_date, aircraft),
        duration: this.estimateDuration(aircraft),
        capacity: aircraft.capacity,
        range: aircraft.range,
        speed: aircraft.speed,
        isEmptyLeg,
        originalPrice: isEmptyLeg ? originalPrice : undefined,
        savings: isEmptyLeg ? savings : undefined,
      };
    });
  }

  /**
   * Normalize quote results to common format
   */
  private normalizeQuoteResults(quotes: any[], rfpId: string): Quote[] {
    return quotes.map((quote: any) => {
      const basePrice = quote.base_price || 0;
      const fuel = quote.fuel || basePrice * 0.15;
      const taxes = quote.taxes || basePrice * 0.08;
      const fees = quote.fees || basePrice * 0.05;
      const totalPrice = basePrice + fuel + taxes + fees;

      return {
        quoteId: quote.quote_id,
        rfpId: rfpId,
        operatorId: quote.operator_id,
        operatorName: quote.operator_name,
        aircraftType: quote.aircraft_type,
        basePrice,
        totalPrice,
        fuel,
        taxes,
        fees,
        responseTime: quote.response_time || 0,
        createdAt: quote.created_at || new Date().toISOString(),
      };
    });
  }

  /**
   * Aggregate results from flight search and quotes
   */
  private aggregateResults(flights: FlightOption[], quotes: Quote[]): FlightOption[] {
    const aggregated: FlightOption[] = [...flights];

    // Convert quotes to flight options
    quotes.forEach(quote => {
      aggregated.push({
        id: quote.quoteId,
        aircraftType: quote.aircraftType,
        aircraftCategory: this.mapAircraftTypeToCategory(quote.aircraftType),
        operator: {
          id: quote.operatorId,
          name: quote.operatorName,
        },
        price: quote.totalPrice,
        departureTime: new Date().toISOString(),
        arrivalTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        duration: 180,
        capacity: 8,
        range: 3000,
        speed: 500,
      });
    });

    return aggregated;
  }

  /**
   * Remove duplicate flight options
   * Considers duplicates if same operator + aircraft type + similar departure time
   */
  private deduplicateResults(options: FlightOption[]): FlightOption[] {
    const seen = new Map<string, FlightOption>();

    options.forEach(option => {
      const key = `${option.operator.id}-${option.aircraftType}-${option.departureTime.substring(0, 13)}`;

      if (!seen.has(key)) {
        seen.set(key, option);
      } else {
        // Keep the cheaper option
        const existing = seen.get(key)!;
        if (option.price < existing.price) {
          seen.set(key, option);
        }
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Sort results by price (lowest first)
   */
  private sortByPrice(options: FlightOption[]): FlightOption[] {
    return options.sort((a, b) => a.price - b.price);
  }

  /**
   * Execute MCP tool with retry logic and exponential backoff
   */
  private async executeToolWithRetry(
    toolName: string,
    params: any,
    attempt: number = 0
  ): Promise<any> {
    try {
      return await this.mcpServer.executeTool(toolName, params, {
        timeout: 30000,
        retry: false, // We handle retry ourselves
      });
    } catch (error) {
      const isLastAttempt = attempt >= this.MAX_RETRY_ATTEMPTS - 1;

      if (isLastAttempt) {
        throw error;
      }

      // Exponential backoff delay
      const delay = this.RETRY_DELAYS[attempt] || 4000;
      await this.delay(delay);

      // Retry with incremented attempt counter
      return this.executeToolWithRetry(toolName, params, attempt + 1);
    }
  }

  /**
   * Select operators to send RFP to
   * In production, this would be based on client preferences and operator capabilities
   */
  private selectOperators(params: FlightSearchParams): string[] {
    // Default list of operators (would be dynamic in production)
    return ['OP-001', 'OP-002', 'OP-003', 'OP-004', 'OP-005'];
  }

  /**
   * Calculate base price for an aircraft
   */
  private calculateBasePrice(aircraft: any): number {
    // Simple pricing formula based on category
    const categoryPrices: Record<string, number> = {
      'light': 35000,
      'midsize': 50000,
      'heavy': 75000,
      'ultra-long-range': 100000,
    };

    const basePrice = categoryPrices[aircraft.category] || 50000;

    // Add random variation (±20%)
    const variation = 0.8 + Math.random() * 0.4;

    return Math.round(basePrice * variation);
  }

  /**
   * Determine if an aircraft is available as an empty leg
   */
  private isEmptyLeg(aircraft: any): boolean {
    // 30% chance of being an empty leg
    return Math.random() < 0.3;
  }

  /**
   * Estimate departure time based on requested date
   */
  private estimateDepartureTime(departureDate?: string): string {
    if (departureDate) {
      return departureDate;
    }
    return new Date().toISOString();
  }

  /**
   * Estimate arrival time based on aircraft speed and range
   */
  private estimateArrivalTime(departureDate: string | undefined, aircraft: any): string {
    const departure = departureDate ? new Date(departureDate) : new Date();
    const durationHours = 3; // Default 3 hours
    const arrival = new Date(departure.getTime() + durationHours * 60 * 60 * 1000);
    return arrival.toISOString();
  }

  /**
   * Estimate flight duration in minutes
   */
  private estimateDuration(aircraft: any): number {
    return 180; // Default 3 hours (180 minutes)
  }

  /**
   * Map aircraft type to category
   */
  private mapAircraftTypeToCategory(aircraftType: string): string {
    const type = aircraftType.toLowerCase();

    if (type.includes('phenom') || type.includes('citation cj')) {
      return 'light';
    }
    if (type.includes('challenger') || type.includes('citation x') || type.includes('falcon')) {
      return 'midsize';
    }
    if (type.includes('gulfstream') || type.includes('global 7500')) {
      return 'heavy';
    }
    if (type.includes('ultra') || type.includes('global 7500')) {
      return 'ultra-long-range';
    }

    return 'midsize'; // Default
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update average execution time metric
   */
  private updateAverageExecutionTime(executionTime: number): void {
    const totalExecutions = this.metrics.totalExecutions;
    const currentAverage = this.metrics.averageExecutionTime;

    this.metrics.averageExecutionTime =
      (currentAverage * (totalExecutions - 1) + executionTime) / totalExecutions;
  }

  /**
   * Shutdown agent and cleanup resources
   */
  async shutdown(): Promise<void> {
    await this.mcpServer.stop();
    await super.shutdown();
  }
}
