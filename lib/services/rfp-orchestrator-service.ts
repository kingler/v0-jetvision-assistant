/**
 * RFP Orchestrator Service
 *
 * Service layer that bridges the RFP conversational flow with the OrchestratorAgent.
 * Handles the complete workflow from RFP data collection to agent execution.
 */

import { RFPFlow } from '@/lib/conversation/rfp-flow';
import type { RFPData } from '@/lib/conversation/rfp-flow';
import { AgentFactory } from '@agents/core/agent-factory';
import { AgentType } from '@agents/core/types';
import type { AgentContext, AgentResult } from '@agents/core/types';

/**
 * RFP workflow status
 */
export enum RFPWorkflowStatus {
  COLLECTING = 'collecting',           // Gathering RFP data through conversation
  VALIDATING = 'validating',           // Validating collected data
  PROCESSING = 'processing',           // OrchestratorAgent processing
  SEARCHING = 'searching',             // FlightSearchAgent searching
  AWAITING_QUOTES = 'awaiting_quotes', // Waiting for operator quotes
  ANALYZING = 'analyzing',             // ProposalAnalysisAgent analyzing
  GENERATING = 'generating',           // CommunicationAgent generating email
  COMPLETE = 'complete',               // Workflow complete
  FAILED = 'failed',                   // Workflow failed
}

/**
 * RFP workflow state
 */
export interface RFPWorkflowState {
  status: RFPWorkflowStatus;
  sessionId: string;
  requestId?: string;
  rfpData?: RFPData;
  agentResult?: AgentResult;
  error?: Error;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Service for coordinating RFP flow with OrchestratorAgent
 */
export class RFPOrchestratorService {
  private agentFactory: AgentFactory;
  private workflows: Map<string, RFPWorkflowState> = new Map();

  constructor() {
    this.agentFactory = AgentFactory.getInstance();
  }

  /**
   * Start a new RFP workflow
   */
  startWorkflow(sessionId: string): RFPWorkflowState {
    const workflow: RFPWorkflowState = {
      status: RFPWorkflowStatus.COLLECTING,
      sessionId,
      startedAt: new Date(),
    };

    this.workflows.set(sessionId, workflow);
    return workflow;
  }

  /**
   * Get workflow state
   */
  getWorkflow(sessionId: string): RFPWorkflowState | undefined {
    return this.workflows.get(sessionId);
  }

  /**
   * Update workflow status
   */
  updateWorkflow(sessionId: string, updates: Partial<RFPWorkflowState>): void {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) {
      throw new Error(`Workflow not found for session: ${sessionId}`);
    }

    Object.assign(workflow, updates);
    this.workflows.set(sessionId, workflow);
  }

  /**
   * Execute OrchestratorAgent with RFP data
   */
  async executeWithRFPData(
    sessionId: string,
    userId: string,
    rfpData: RFPData
  ): Promise<AgentResult> {
    // Update workflow status
    this.updateWorkflow(sessionId, {
      status: RFPWorkflowStatus.VALIDATING,
      rfpData,
    });

    // Validate RFP data
    this.validateRFPData(rfpData);

    // Update to processing
    this.updateWorkflow(sessionId, {
      status: RFPWorkflowStatus.PROCESSING,
    });

    try {
      // Create OrchestratorAgent
      const orchestrator = await this.agentFactory.createAndInitialize({
        type: AgentType.ORCHESTRATOR,
        name: `RFP Orchestrator - ${sessionId}`,
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
      });

      // Generate request ID
      const requestId = `rfp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Create agent context with RFP data
      const context: AgentContext = {
        sessionId,
        requestId,
        userId,
        metadata: {
          // Include RFP data in metadata for backward compatibility
          rfpData,
          // Also include as individual fields for direct access
          departure: rfpData.departure,
          arrival: rfpData.arrival,
          departureDate: rfpData.departureDate,
          passengers: rfpData.passengers,
          returnDate: rfpData.returnDate,
          aircraftType: rfpData.aircraftType,
          budget: rfpData.budget,
          specialRequirements: rfpData.specialRequirements,
        },
      };

      // Execute orchestrator
      const result = await orchestrator.execute(context);

      // Update workflow with result
      this.updateWorkflow(sessionId, {
        requestId,
        agentResult: result,
        status: result.success ? RFPWorkflowStatus.SEARCHING : RFPWorkflowStatus.FAILED,
        ...(result.success ? {} : { error: result.error }),
      });

      return result;
    } catch (error) {
      // Update workflow with error
      this.updateWorkflow(sessionId, {
        status: RFPWorkflowStatus.FAILED,
        error: error as Error,
        completedAt: new Date(),
      });

      throw error;
    }
  }

  /**
   * Validate RFP data before sending to orchestrator
   */
  private validateRFPData(rfpData: RFPData): void {
    const missingFields: string[] = [];

    if (!rfpData.departure) missingFields.push('departure');
    if (!rfpData.arrival) missingFields.push('arrival');
    if (!rfpData.departureDate) missingFields.push('departureDate');
    if (!rfpData.passengers || rfpData.passengers < 1) missingFields.push('passengers');

    if (missingFields.length > 0) {
      throw new Error(
        `RFP data validation failed. Missing required fields: ${missingFields.join(', ')}`
      );
    }

    // Validate dates (departureDate is guaranteed to exist by validation above)
    const departureDateStr = rfpData.departureDate as string;
    const departureDate = new Date(departureDateStr);
    if (isNaN(departureDate.getTime())) {
      throw new Error('Invalid departure date');
    }

    if (rfpData.returnDate) {
      const returnDate = new Date(rfpData.returnDate);
      if (isNaN(returnDate.getTime())) {
        throw new Error('Invalid return date');
      }

      if (returnDate <= departureDate) {
        throw new Error('Return date must be after departure date');
      }
    }
  }

  /**
   * Update workflow status when quotes are received
   * Called by webhook or polling mechanism
   */
  updateQuoteStatus(sessionId: string, quotesReceived: number, quotesTotal: number): void {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) return;

    this.updateWorkflow(sessionId, {
      status: RFPWorkflowStatus.AWAITING_QUOTES,
    });
  }

  /**
   * Update workflow status when analysis is complete
   */
  updateAnalysisComplete(sessionId: string): void {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) return;

    this.updateWorkflow(sessionId, {
      status: RFPWorkflowStatus.ANALYZING,
    });
  }

  /**
   * Update workflow status when email is being generated
   */
  updateEmailGenerating(sessionId: string): void {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) return;

    this.updateWorkflow(sessionId, {
      status: RFPWorkflowStatus.GENERATING,
    });
  }

  /**
   * Mark workflow as complete
   */
  completeWorkflow(sessionId: string, agentResult: AgentResult): void {
    this.updateWorkflow(sessionId, {
      status: RFPWorkflowStatus.COMPLETE,
      agentResult,
      completedAt: new Date(),
    });
  }

  /**
   * Clear completed workflows (optional cleanup)
   */
  clearWorkflow(sessionId: string): void {
    this.workflows.delete(sessionId);
  }

  /**
   * Get all active workflows (for monitoring)
   */
  getActiveWorkflows(): RFPWorkflowState[] {
    return Array.from(this.workflows.values()).filter(
      (w) => w.status !== RFPWorkflowStatus.COMPLETE && w.status !== RFPWorkflowStatus.FAILED
    );
  }
}

/**
 * Singleton instance
 */
let serviceInstance: RFPOrchestratorService | null = null;

/**
 * Get RFP orchestrator service instance
 */
export function getRFPOrchestratorService(): RFPOrchestratorService {
  if (!serviceInstance) {
    serviceInstance = new RFPOrchestratorService();
  }
  return serviceInstance;
}
