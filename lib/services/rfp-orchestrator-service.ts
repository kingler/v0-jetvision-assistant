/**
 * RFP Orchestrator Service
 *
 * DEPRECATED: This service used the old multi-agent infrastructure which has been removed.
 * The new architecture uses JetvisionAgent directly via /api/chat.
 *
 * This file is kept as a stub to prevent import errors.
 * TODO: Remove this file and its consumers once all references are cleaned up.
 */

import type { RFPData } from '@/lib/conversation/rfp-flow';

// Stub types for backward compatibility
interface AgentResult {
  success: boolean;
  error?: Error;
}

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
 * DEPRECATED: Stubbed implementation - use JetvisionAgent via /api/chat instead
 */
export class RFPOrchestratorService {
  private workflows: Map<string, RFPWorkflowState> = new Map();

  constructor() {
    // No-op - old AgentFactory has been removed
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
   * DEPRECATED: This method is stubbed. Use JetvisionAgent via /api/chat instead.
   */
  async executeWithRFPData(
    sessionId: string,
    userId: string,
    rfpData: RFPData
  ): Promise<AgentResult> {
    console.warn('[RFPOrchestratorService] DEPRECATED: executeWithRFPData is no longer functional');
    console.warn('[RFPOrchestratorService] Use JetvisionAgent via /api/chat instead');

    // Update workflow status to failed since this is deprecated
    this.updateWorkflow(sessionId, {
      status: RFPWorkflowStatus.FAILED,
      rfpData,
      error: new Error('RFPOrchestratorService is deprecated. Use JetvisionAgent via /api/chat.'),
      completedAt: new Date(),
    });

    return {
      success: false,
      error: new Error('RFPOrchestratorService is deprecated. Use JetvisionAgent via /api/chat.'),
    };
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
