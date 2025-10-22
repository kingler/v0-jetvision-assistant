/**
 * Orchestrator Agent Implementation
 *
 * The OrchestratorAgent is the entry point for RFP processing.
 * It analyzes requests, validates data, creates workflows, and delegates tasks to other agents.
 */

import { BaseAgent } from '../core/base-agent';
import type {
  AgentContext,
  AgentResult,
  AgentConfig,
  AgentTask,
} from '../core/types';
import { AgentType, AgentStatus } from '../core/types';

interface RFPData {
  departure: string;
  arrival: string;
  departureDate: string;
  passengers: number;
  clientName?: string;
  returnDate?: string;
  aircraftType?: string;
  budget?: number;
}

interface RFPAnalysis {
  departure: string;
  arrival: string;
  departureDate: string;
  passengers: number;
  clientName?: string;
  isRoundTrip: boolean;
  urgency: 'urgent' | 'high' | 'normal' | 'low';
}

/**
 * OrchestratorAgent
 * Analyzes RFP requests and coordinates the workflow
 */
export class OrchestratorAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.ORCHESTRATOR,
    });
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    await super.initialize();
    console.log(`[${this.name}] OrchestratorAgent initialized`);
  }

  /**
   * Execute the agent
   * Analyzes RFP and creates tasks for downstream agents
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this._status = AgentStatus.RUNNING;

    try {
      // Extract and validate RFP data
      const rfpData = this.extractRFPData(context);
      this.validateRFPData(rfpData);

      // Analyze the RFP
      const analysis = this.analyzeRFP(rfpData);

      // Determine priority based on urgency
      const priority = this.determinePriority(rfpData.departureDate);

      // Create workflow
      const workflowId = context.requestId || `workflow-${Date.now()}`;
      const workflowState = 'ANALYZING';

      // Identify next steps
      const nextSteps = ['fetch_client_data', 'search_flights'];

      // Create tasks for downstream agents
      const tasks = this.createTasks(rfpData, context, priority);

      // Update metrics
      this.metrics.totalExecutions++;
      this.metrics.successfulExecutions++;
      this._status = AgentStatus.COMPLETED;

      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);

      return {
        success: true,
        data: {
          requestId: context.requestId,
          analysis,
          nextSteps,
          priority,
          workflowId,
          workflowState,
          tasks,
        },
        metadata: {
          executionTime,
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
   * Extract RFP data from context
   */
  private extractRFPData(context: AgentContext): RFPData {
    const rfpData = context.metadata?.rfpData as RFPData;

    if (!rfpData) {
      throw new Error('Missing RFP data in context');
    }

    return rfpData;
  }

  /**
   * Validate RFP data has required fields
   */
  private validateRFPData(rfpData: RFPData): void {
    const requiredFields: (keyof RFPData)[] = [
      'departure',
      'arrival',
      'departureDate',
      'passengers',
    ];

    for (const field of requiredFields) {
      if (!rfpData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate passengers is a positive number
    if (rfpData.passengers <= 0) {
      throw new Error('Passengers must be greater than 0');
    }
  }

  /**
   * Analyze RFP request
   */
  private analyzeRFP(rfpData: RFPData): RFPAnalysis {
    return {
      departure: rfpData.departure,
      arrival: rfpData.arrival,
      departureDate: rfpData.departureDate,
      passengers: rfpData.passengers,
      clientName: rfpData.clientName,
      isRoundTrip: !!rfpData.returnDate,
      urgency: this.calculateUrgency(rfpData.departureDate),
    };
  }

  /**
   * Calculate urgency based on departure date
   */
  private calculateUrgency(departureDate: string): 'urgent' | 'high' | 'normal' | 'low' {
    const departure = new Date(departureDate);
    const now = new Date();
    const daysUntilDeparture = Math.floor(
      (departure.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeparture <= 1) return 'urgent';
    if (daysUntilDeparture <= 3) return 'high';
    if (daysUntilDeparture <= 7) return 'normal';
    return 'low';
  }

  /**
   * Determine task priority based on departure date
   */
  private determinePriority(departureDate: string): 'urgent' | 'high' | 'normal' | 'low' {
    const urgency = this.calculateUrgency(departureDate);
    return urgency;
  }

  /**
   * Create tasks for downstream agents
   */
  private createTasks(
    rfpData: RFPData,
    context: AgentContext,
    priority: 'urgent' | 'high' | 'normal' | 'low'
  ): AgentTask[] {
    const tasks: AgentTask[] = [];

    // Task 1: Fetch client data
    if (rfpData.clientName) {
      tasks.push({
        id: `task-client-${Date.now()}`,
        type: 'fetch_client_data',
        payload: {
          clientName: rfpData.clientName,
          sessionId: context.sessionId,
          requestId: context.requestId,
          rfpData,
        },
        priority,
        status: 'pending',
        targetAgent: AgentType.CLIENT_DATA,
        createdAt: new Date(),
      });
    }

    // Task 2: Search flights
    tasks.push({
      id: `task-flight-${Date.now()}`,
      type: 'search_flights',
      payload: {
        departure: rfpData.departure,
        arrival: rfpData.arrival,
        departureDate: rfpData.departureDate,
        passengers: rfpData.passengers,
        returnDate: rfpData.returnDate,
        aircraftType: rfpData.aircraftType,
        budget: rfpData.budget,
        sessionId: context.sessionId,
        requestId: context.requestId,
        rfpData,
      },
      priority,
      status: 'pending',
      targetAgent: AgentType.FLIGHT_SEARCH,
      createdAt: new Date(),
    });

    return tasks;
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
