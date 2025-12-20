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
import { updateRequestWithAvinodeTrip } from '@/lib/supabase/admin';

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
 * Message in trip conversation thread
 */
interface TripMessage {
  messageId: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderType: 'broker' | 'operator';
  content: string;
  sentAt: string;
  readAt?: string;
}

/**
 * RFQ details including status and quotes
 */
interface RFQDetails {
  rfqId: string;
  tripId: string;
  status: 'pending' | 'quotes_received' | 'accepted' | 'cancelled' | 'expired';
  createdAt: string;
  quoteDeadline?: string;
  route: {
    departure: { airport: string; date: string; time?: string };
    arrival: { airport: string };
  };
  passengers: number;
  quotesReceived: number;
  quotes: Quote[];
  operatorsContacted: number;
  deepLink: string;
}

/**
 * Trip creation result from Avinode create_trip MCP tool
 */
interface TripResult {
  tripId: string;
  deepLink: string;
  rfpId?: string;
  status: string;
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
   * Creates trip in Avinode, saves to DB, and returns deep link for user
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

      // Create trip in Avinode (returns deep link for user to browse/submit RFQs)
      const tripResult = await this.createTrip(searchParams, context);

      // Save trip data to Supabase for frontend display
      if (context.requestId) {
        await this.saveTripToDatabase(context.requestId, tripResult);
      }

      // Wait briefly for operators to respond (in production, this would be async/webhook)
      await this.delay(2000);

      // Retrieve quotes from operators if RFP was created
      const quotes = tripResult.rfpId ? await this.getQuotes(tripResult.rfpId) : [];

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
          // Trip data for frontend display
          tripId: tripResult.tripId,
          deepLink: tripResult.deepLink,
          rfpId: tripResult.rfpId,
          tripStatus: tripResult.status,
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
   * Create trip in Avinode via MCP create_trip tool
   * Returns deep link URL for user to browse flights and submit RFQs
   */
  private async createTrip(
    params: FlightSearchParams,
    context: AgentContext
  ): Promise<TripResult> {
    this.metrics.toolCallsCount++;

    try {
      // Call Avinode MCP create_trip tool with retry
      const result = await this.executeToolWithRetry('create_trip', {
        departure_airport: params.departure,
        arrival_airport: params.arrival,
        departure_date: params.departureDate,
        passengers: params.passengers,
        days_flexibility: 0,
      });

      return {
        tripId: result.trip_id,
        deepLink: result.deep_link,
        rfpId: result.rfp_id, // May be set if RFQ was auto-created
        status: result.status || 'trip_created',
        createdAt: result.created_at || new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Trip creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Save trip data to Supabase requests table
   * Enables frontend to display trip ID and deep link
   */
  private async saveTripToDatabase(
    requestId: string,
    tripResult: TripResult
  ): Promise<void> {
    try {
      await updateRequestWithAvinodeTrip(requestId, {
        avinode_trip_id: tripResult.tripId,
        avinode_deep_link: tripResult.deepLink,
        avinode_rfp_id: tripResult.rfpId,
      });
    } catch (error) {
      // Log but don't fail - trip was created successfully, DB save is secondary
      console.error('Failed to save trip data to database:', error);
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

  // ============================================================================
  // Message Thread Integration Methods (ONEK-129)
  // ============================================================================

  /**
   * Send a message to operators in the trip conversation thread
   * Uses the send_trip_message MCP tool
   *
   * @param tripId - The trip identifier
   * @param message - The message content to send
   * @param recipientType - 'all_operators' or 'specific_operator'
   * @param operatorId - Required if recipientType is 'specific_operator'
   * @returns Message send result with message ID and status
   */
  async sendTripMessage(
    tripId: string,
    message: string,
    recipientType: 'all_operators' | 'specific_operator' = 'all_operators',
    operatorId?: string
  ): Promise<{ messageId: string; status: string; sentAt: string; recipientCount: number }> {
    this.metrics.toolCallsCount++;

    try {
      if (!tripId) {
        throw new Error('tripId is required');
      }
      if (!message || message.trim().length === 0) {
        throw new Error('message is required and cannot be empty');
      }
      if (recipientType === 'specific_operator' && !operatorId) {
        throw new Error('operatorId is required when recipientType is specific_operator');
      }

      const result = await this.executeToolWithRetry('send_trip_message', {
        trip_id: tripId,
        message: message.trim(),
        recipient_type: recipientType,
        operator_id: operatorId,
      });

      return {
        messageId: result.message_id,
        status: result.status || 'sent',
        sentAt: result.sent_at || new Date().toISOString(),
        recipientCount: result.recipient_count || 1,
      };
    } catch (error) {
      throw new Error(`Failed to send trip message: ${(error as Error).message}`);
    }
  }

  /**
   * Retrieve message history for a trip conversation thread
   * Uses the get_trip_messages MCP tool
   *
   * @param tripId - The trip identifier
   * @param limit - Maximum number of messages to retrieve (default: 50)
   * @param since - Optional ISO 8601 timestamp to retrieve messages after
   * @returns Message history with pagination info
   */
  async getTripMessages(
    tripId: string,
    limit: number = 50,
    since?: string
  ): Promise<{ tripId: string; messages: TripMessage[]; totalCount: number; hasMore: boolean }> {
    this.metrics.toolCallsCount++;

    try {
      if (!tripId) {
        throw new Error('tripId is required');
      }

      const result = await this.executeToolWithRetry('get_trip_messages', {
        trip_id: tripId,
        limit,
        since,
      });

      // Normalize message results
      const messages: TripMessage[] = (result.messages || []).map((msg: any) => ({
        messageId: msg.message_id,
        tripId: tripId,
        senderId: msg.sender_id,
        senderName: msg.sender_name || 'Unknown',
        senderType: msg.sender_type || 'operator',
        content: msg.content,
        sentAt: msg.sent_at,
        readAt: msg.read_at,
      }));

      return {
        tripId,
        messages,
        totalCount: result.total_count || messages.length,
        hasMore: result.has_more || false,
      };
    } catch (error) {
      throw new Error(`Failed to get trip messages: ${(error as Error).message}`);
    }
  }

  /**
   * Get RFQ details including status and received quotes
   * Uses the get_rfq MCP tool
   *
   * @param rfqId - The RFQ identifier (e.g., arfq-12345678)
   * @returns RFQ details with quotes
   */
  async getRfqDetails(rfqId: string): Promise<RFQDetails> {
    this.metrics.toolCallsCount++;

    try {
      if (!rfqId) {
        throw new Error('rfqId is required');
      }

      const result = await this.executeToolWithRetry('get_rfq', {
        rfq_id: rfqId,
      });

      // Normalize quote results
      const quotes = this.normalizeQuoteResults(result.quotes || [], rfqId);

      return {
        rfqId: result.rfq_id || rfqId,
        tripId: result.trip_id,
        status: result.status || 'pending',
        createdAt: result.created_at,
        quoteDeadline: result.quote_deadline,
        route: result.route || {
          departure: { airport: 'N/A', date: 'N/A' },
          arrival: { airport: 'N/A' },
        },
        passengers: result.passengers || 0,
        quotesReceived: result.quotes_received || quotes.length,
        quotes,
        operatorsContacted: result.operators_contacted || 0,
        deepLink: result.deep_link,
      };
    } catch (error) {
      throw new Error(`Failed to get RFQ details: ${(error as Error).message}`);
    }
  }

  /**
   * Cancel an active trip
   * Uses the cancel_trip MCP tool
   *
   * @param tripId - The trip identifier
   * @param reason - Optional cancellation reason
   * @returns Cancellation result
   */
  async cancelTrip(
    tripId: string,
    reason?: string
  ): Promise<{ tripId: string; status: string; cancelledAt: string; reason?: string }> {
    this.metrics.toolCallsCount++;

    try {
      if (!tripId) {
        throw new Error('tripId is required');
      }

      const result = await this.executeToolWithRetry('cancel_trip', {
        trip_id: tripId,
        reason,
      });

      return {
        tripId,
        status: 'cancelled',
        cancelledAt: result.cancelled_at || new Date().toISOString(),
        reason,
      };
    } catch (error) {
      throw new Error(`Failed to cancel trip: ${(error as Error).message}`);
    }
  }

  /**
   * Get detailed information about a specific quote
   * Uses the get_quote MCP tool
   *
   * @param quoteId - The quote identifier (e.g., aquote-12345678)
   * @returns Detailed quote information
   */
  async getQuoteDetails(quoteId: string): Promise<{
    quoteId: string;
    rfqId: string;
    tripId: string;
    status: string;
    operator: { id: string; name: string; rating?: number };
    aircraft: { type: string; category: string; capacity: number };
    pricing: { base: number; fuel: number; taxes: number; fees: number; total: number };
    availability: { departureTime: string; arrivalTime: string; duration: number };
    validUntil: string;
    createdAt: string;
    notes?: string;
  }> {
    this.metrics.toolCallsCount++;

    try {
      if (!quoteId) {
        throw new Error('quoteId is required');
      }

      const result = await this.executeToolWithRetry('get_quote', {
        quote_id: quoteId,
      });

      // Calculate total price from components
      const pricing = result.pricing || {};
      const basePrice = pricing.base || pricing.base_price || 0;
      const fuel = pricing.fuel || basePrice * 0.15;
      const taxes = pricing.taxes || basePrice * 0.08;
      const fees = pricing.fees || basePrice * 0.05;
      const total = basePrice + fuel + taxes + fees;

      return {
        quoteId: result.quote_id || quoteId,
        rfqId: result.rfq_id,
        tripId: result.trip_id,
        status: result.status || 'pending',
        operator: {
          id: result.operator?.id || 'unknown',
          name: result.operator?.name || 'Unknown Operator',
          rating: result.operator?.rating,
        },
        aircraft: {
          type: result.aircraft?.type || 'Unknown',
          category: result.aircraft?.category || this.mapAircraftTypeToCategory(result.aircraft?.type || ''),
          capacity: result.aircraft?.capacity || 8,
        },
        pricing: {
          base: basePrice,
          fuel,
          taxes,
          fees,
          total,
        },
        availability: {
          departureTime: result.availability?.departure_time || new Date().toISOString(),
          arrivalTime: result.availability?.arrival_time || new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          duration: result.availability?.duration || 180,
        },
        validUntil: result.valid_until || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: result.created_at || new Date().toISOString(),
        notes: result.notes,
      };
    } catch (error) {
      throw new Error(`Failed to get quote details: ${(error as Error).message}`);
    }
  }

  /**
   * Shutdown agent and cleanup resources
   */
  async shutdown(): Promise<void> {
    await this.mcpServer.stop();
    await super.shutdown();
  }
}
