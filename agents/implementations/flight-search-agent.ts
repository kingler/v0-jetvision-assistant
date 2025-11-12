/**
 * Flight Search Agent Implementation
 *
 * Searches for charter flights using the Avinode MCP server.
 * Handles regular flights, empty legs, and RFP creation.
 */

import { BaseAgent } from '../core/base-agent';
import type {
  AgentContext,
  AgentResult,
  AgentConfig,
} from '../core/types';
import { AgentType, AgentStatus } from '../core/types';

interface FlightSearchParams {
  departure: string;
  arrival: string;
  departureDate: string;
  passengers: number;
  aircraftType?: string;
  budget?: number;
}

interface FlightOption {
  id: string;
  aircraftType: string;
  operator: string;
  price: number;
  departureTime: string;
  arrivalTime: string;
  duration: number;
}

interface EmptyLeg {
  id: string;
  aircraftType: string;
  operator: string;
  price: number;
  originalPrice: number;
  savings: number;
  departureTime: string;
}

/**
 * FlightSearchAgent
 * Searches for flights and creates RFPs via Avinode
 */
export class FlightSearchAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.FLIGHT_SEARCH,
    });
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    await super.initialize();
    console.log(`[${this.name}] FlightSearchAgent initialized`);
  }

  /**
   * Execute the agent
   * Searches for flights and creates RFP
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this._status = AgentStatus.RUNNING;

    try {
      // Extract and validate flight search parameters
      const searchParams = this.extractSearchParams(context);
      this.validateSearchParams(searchParams);

      // Search for regular flights
      const flights = await this.searchFlights(searchParams);

      // Search for empty legs (discounted flights)
      const emptyLegs = await this.searchEmptyLegs(searchParams);

      // Create RFP for the flight request
      const rfpResult = await this.createRFP(searchParams, context);

      // Calculate total options
      const totalOptions = flights.length + emptyLegs.length;

      // Update metrics
      this.metrics.totalExecutions++;
      this.metrics.successfulExecutions++;
      this._status = AgentStatus.COMPLETED;

      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);

      return {
        success: true,
        data: {
          flights,
          emptyLegs,
          searchParams,
          totalOptions,
          rfpId: rfpResult.rfpId,
          rfpStatus: rfpResult.status,
          operatorsContacted: rfpResult.operatorsContacted,
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
      aircraftType: (metadata.clientData as any)?.preferences?.aircraftType,
      budget: (metadata.clientData as any)?.preferences?.budget,
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
  }

  /**
   * Search for regular flights
   * Mock implementation - production would use Avinode MCP
   */
  private async searchFlights(params: FlightSearchParams): Promise<FlightOption[]> {
    // Increment tool calls metric
    this.metrics.toolCallsCount++;

    // Mock flight database
    const mockFlights: FlightOption[] = [
      {
        id: 'flight-1',
        aircraftType: params.aircraftType || 'light_jet',
        operator: 'Jet Elite',
        price: 45000,
        departureTime: params.departureDate,
        arrivalTime: '2025-11-15T17:30:00Z',
        duration: 180,
      },
      {
        id: 'flight-2',
        aircraftType: params.aircraftType || 'light_jet',
        operator: 'Sky Charter',
        price: 48000,
        departureTime: params.departureDate,
        arrivalTime: '2025-11-15T17:45:00Z',
        duration: 195,
      },
    ];

    // Filter by budget if provided
    let results = mockFlights;
    if (params.budget) {
      const budget = params.budget;
      results = results.filter((f) => f.price <= budget);
    }

    // Sort by price (lowest first)
    results.sort((a, b) => a.price - b.price);

    return results;
  }

  /**
   * Search for empty legs (discounted flights)
   * Mock implementation - production would use Avinode MCP
   */
  private async searchEmptyLegs(params: FlightSearchParams): Promise<EmptyLeg[]> {
    // Increment tool calls metric
    this.metrics.toolCallsCount++;

    // Mock empty leg database
    const mockEmptyLegs: EmptyLeg[] = [
      {
        id: 'empty-1',
        aircraftType: 'light_jet',
        operator: 'Premium Air',
        price: 15000,
        originalPrice: 40000,
        savings: 25000,
        departureTime: '2025-11-15T13:00:00Z',
      },
    ];

    // Filter by budget if provided
    let results = mockEmptyLegs;
    if (params.budget) {
      const budget = params.budget;
      results = results.filter((e) => e.price <= budget);
    }

    return results;
  }

  /**
   * Create RFP (Request for Proposal)
   * Mock implementation - production would use Avinode MCP
   */
  private async createRFP(
    params: FlightSearchParams,
    context: AgentContext
  ): Promise<{ rfpId: string; status: string; operatorsContacted: number }> {
    // Increment tool calls metric
    this.metrics.toolCallsCount++;

    // Mock RFP creation
    return {
      rfpId: `rfp-${context.requestId || Date.now()}`,
      status: 'awaiting_quotes',
      operatorsContacted: 5,
    };
  }

  /**
   * Update average execution time
   */
  private updateAverageExecutionTime(executionTime: number): void {
    const totalExecutions = this.metrics.totalExecutions;
    const currentAverage = this.metrics.averageExecutionTime;

    this.metrics.averageExecutionTime =
      (currentAverage * (totalExecutions - 1) + executionTime) / totalExecutions;
  }
}
