/**
 * RFP Orchestrator Agent
 *
 * The brain of the JetVision system. Coordinates the entire RFP workflow:
 * - Analyzes flight requests using OpenAI
 * - Manages workflow state machine
 * - Coordinates with other specialized agents
 * - Handles error recovery and retries
 */

import { BaseAgent } from '@/agents/core/base-agent';
import {
  type AgentConfig,
  type AgentContext,
  type AgentResult,
  type AgentTask,
  AgentType,
  AgentStatus,
} from '@/agents/core/types';
import {
  WorkflowState,
  WorkflowStateMachine,
  workflowManager,
} from '@/agents/coordination/state-machine';
import { messageBus, MessageType } from '@/agents/coordination/message-bus';
import { handoffManager } from '@/agents/coordination/handoff-manager';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

/**
 * RFP Analysis Result
 */
interface RFPAnalysis {
  departure_airport?: string;
  arrival_airport?: string;
  passengers?: number;
  departure_date?: string;
  return_date?: string;
  aircraft_category?: string;
  urgency: 'urgent' | 'high' | 'normal' | 'low';
  complexity: 'simple' | 'standard' | 'complex';
  special_requirements: string[];
  missing_fields: string[];
}

/**
 * Workflow Result
 */
interface WorkflowResult {
  request_id: string;
  workflow_id: string;
  workflow_status: string;
  proposal_sent?: boolean;
  email_id?: string;
  error?: string;
}

/**
 * RFP Orchestrator Configuration
 */
interface RFPOrchestratorConfig extends AgentConfig {
  supabase: SupabaseClient<Database>;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * RFP Orchestrator Agent
 */
export class RFPOrchestratorAgent extends BaseAgent {
  private supabase: SupabaseClient<Database>;
  private maxRetries: number;
  private retryDelay: number;
  private activeWorkflows: Map<string, WorkflowStateMachine> = new Map();

  constructor(config: RFPOrchestratorConfig) {
    super({
      ...config,
      type: AgentType.ORCHESTRATOR,
      model: config.model || 'gpt-4-turbo-preview',
      systemPrompt: config.systemPrompt || RFPOrchestratorAgent.getDefaultSystemPrompt(),
    });

    this.supabase = config.supabase;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Default system prompt for RFP analysis
   */
  private static getDefaultSystemPrompt(): string {
    return `You are an expert flight request analyzer for a private jet charter service.

Your task is to extract structured data from flight requests and determine their urgency and complexity.

Extract the following information:
- departure_airport: ICAO code (e.g., KTEB, KJFK)
- arrival_airport: ICAO code
- passengers: number of passengers
- departure_date: ISO 8601 format (YYYY-MM-DD)
- return_date: ISO 8601 format (if round trip)
- aircraft_category: light, midsize, super-midsize, heavy, ultra-long-range (if specified)
- urgency: urgent (same day / ASAP), high (1-3 days), normal (4-7 days), low (7+ days)
- complexity: simple (one-way/round-trip, standard requirements), standard (multiple passengers, some preferences), complex (multi-leg, special requirements, tight timeline)
- special_requirements: array of special needs (pets, medical equipment, catering, wheelchair, etc.)
- missing_fields: array of fields that are required but not provided

Return ONLY valid JSON with these fields. If information is missing, include it in missing_fields array.`;
  }

  /**
   * Execute the orchestrator's main task
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    this._status = AgentStatus.RUNNING;
    const startTime = Date.now();

    try {
      console.log(`[${this.name}] Starting execution for context:`, context);

      // Extract request data from context
      const requestData = context.metadata as any;

      // Orchestrate the workflow
      const result = await this.orchestrateWorkflow(requestData);

      // Publish completion message
      await messageBus.publish({
        type: MessageType.TASK_COMPLETED,
        sourceAgent: this.id,
        payload: { result },
        context,
      });

      this._status = AgentStatus.COMPLETED;

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          tokenUsage: {
            prompt: 0,
            completion: 0,
            total: this.metrics.totalTokensUsed,
          },
        },
      };
    } catch (error: any) {
      this._status = AgentStatus.ERROR;

      // Publish error message
      await messageBus.publish({
        type: MessageType.ERROR,
        sourceAgent: this.id,
        payload: { error: error.message },
        context,
      });

      return {
        success: false,
        error,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Analyze flight request using OpenAI
   */
  async analyzeRequest(request: string): Promise<RFPAnalysis> {
    console.log(`[${this.name}] Analyzing request...`);

    try {
      const completion = await this.createChatCompletionLegacy([
        {
          role: 'system',
          content: this.getSystemPrompt(),
          timestamp: new Date(),
        },
        {
          role: 'user',
          content: request,
          timestamp: new Date(),
        },
      ]);

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON response
      const analysis = JSON.parse(content) as RFPAnalysis;

      console.log(`[${this.name}] Analysis complete:`, analysis);

      return analysis;
    } catch (error: any) {
      console.error(`[${this.name}] Analysis failed:`, error);
      throw new Error(`Request analysis failed: ${error.message}`);
    }
  }

  /**
   * Orchestrate complete RFP workflow
   */
  async orchestrateWorkflow(requestData: any): Promise<WorkflowResult> {
    let requestId: string | null = null;
    let workflowId: string | null = null;

    try {
      // Create request in database
      requestId = await this.createRequest(requestData);
      workflowId = requestId;

      // Create workflow state machine (or get existing one)
      let workflow = workflowManager.getWorkflow(workflowId);
      if (!workflow) {
        workflow = workflowManager.createWorkflow(workflowId);
      }
      this.activeWorkflows.set(workflowId, workflow);

      // State: CREATED -> ANALYZING
      await this.transitionState(requestId, WorkflowState.CREATED, WorkflowState.ANALYZING);

      // Analyze request
      const analysis = await this.executeWithRetry(() =>
        this.analyzeRequest(JSON.stringify(requestData))
      );

      // Check for missing fields
      if (analysis.missing_fields && analysis.missing_fields.length > 0) {
        throw new Error(
          `Missing required fields: ${analysis.missing_fields.join(', ')}`
        );
      }

      // State: ANALYZING -> FETCHING_CLIENT_DATA
      await this.transitionState(
        requestId,
        WorkflowState.ANALYZING,
        WorkflowState.FETCHING_CLIENT_DATA
      );

      // Fetch client data
      const clientData = await this.executeWithRetry(() =>
        this.fetchClientData(requestData.client_email || requestData.metadata?.client_email)
      );

      // State: FETCHING_CLIENT_DATA -> SEARCHING_FLIGHTS
      await this.transitionState(
        requestId,
        WorkflowState.FETCHING_CLIENT_DATA,
        WorkflowState.SEARCHING_FLIGHTS
      );

      // Search flights
      const flights = await this.executeWithRetry(() =>
        this.searchFlights({
          departure_airport: analysis.departure_airport || requestData.departure_airport,
          arrival_airport: analysis.arrival_airport || requestData.arrival_airport,
          passengers: analysis.passengers || requestData.passengers,
          departure_date: analysis.departure_date || requestData.departure_date,
        })
      );

      // State: SEARCHING_FLIGHTS -> AWAITING_QUOTES
      await this.transitionState(
        requestId,
        WorkflowState.SEARCHING_FLIGHTS,
        WorkflowState.AWAITING_QUOTES
      );

      // Wait for quotes (with timeout)
      const quotes = await this.executeWithRetry(() =>
        this.waitForQuotes(requestId!, 30 * 60 * 1000) // 30 minutes
      );

      // State: AWAITING_QUOTES -> ANALYZING_PROPOSALS
      await this.transitionState(
        requestId,
        WorkflowState.AWAITING_QUOTES,
        WorkflowState.ANALYZING_PROPOSALS
      );

      // Analyze proposals
      const rankedProposals = await this.executeWithRetry(() =>
        this.analyzeProposals(quotes, clientData)
      );

      // State: ANALYZING_PROPOSALS -> GENERATING_EMAIL
      await this.transitionState(
        requestId,
        WorkflowState.ANALYZING_PROPOSALS,
        WorkflowState.GENERATING_EMAIL
      );

      // Generate proposal email
      const proposalEmail = await this.executeWithRetry(() =>
        this.generateProposalEmail(rankedProposals, clientData)
      );

      // State: GENERATING_EMAIL -> SENDING_PROPOSAL
      await this.transitionState(
        requestId,
        WorkflowState.GENERATING_EMAIL,
        WorkflowState.SENDING_PROPOSAL
      );

      // Send proposal
      const sent = await this.executeWithRetry(() =>
        this.sendProposal(proposalEmail, requestData.client_email || requestData.metadata?.client_email)
      );

      // State: SENDING_PROPOSAL -> COMPLETED
      await this.transitionState(
        requestId,
        WorkflowState.SENDING_PROPOSAL,
        WorkflowState.COMPLETED
      );

      // Update request status
      await this.updateRequestStatus(requestId, WorkflowState.COMPLETED);

      return {
        request_id: requestId,
        workflow_id: workflowId,
        workflow_status: 'COMPLETED',
        proposal_sent: true,
        email_id: sent.message_id,
      };
    } catch (error: any) {
      console.error(`[${this.name}] Workflow failed:`, error);

      if (requestId) {
        try {
          // Get current state
          const currentState = await this.getCurrentState(requestId);

          // Only transition if not already in terminal state
          const workflow = this.activeWorkflows.get(requestId) || workflowManager.getWorkflow(requestId);
          if (workflow && !workflow.isTerminal()) {
            // Transition to FAILED
            await this.transitionState(requestId, currentState, WorkflowState.FAILED);
          }

          // Update request status
          await this.updateRequestStatus(requestId, WorkflowState.FAILED);

          // Escalate to Error Monitor
          await this.escalateToErrorMonitor(requestId, error);
        } catch (transitionError) {
          console.error(`[${this.name}] Failed to handle error state:`, transitionError);
        }
      }

      return {
        request_id: requestId || 'unknown',
        workflow_id: workflowId || 'unknown',
        workflow_status: 'FAILED',
        error: error.message,
      };
    } finally {
      if (workflowId) {
        this.activeWorkflows.delete(workflowId);
      }
    }
  }

  /**
   * Create request in database
   */
  async createRequest(requestData: any): Promise<string> {
    console.log(`[${this.name}] Creating request in database...`);

    const { data, error } = await this.supabase
      .from('requests')
      .insert({
        iso_agent_id: requestData.iso_agent_id || requestData.userId,
        client_profile_id: requestData.client_profile_id || null,
        departure_airport: requestData.departure_airport,
        arrival_airport: requestData.arrival_airport,
        departure_date: requestData.departure_date,
        return_date: requestData.return_date || null,
        passengers: requestData.passengers,
        aircraft_type: requestData.aircraft_type || null,
        budget: requestData.budget || null,
        special_requirements: requestData.special_requirements || null,
        status: 'draft' as any,
        metadata: requestData.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create request: ${error.message}`);
    }

    console.log(`[${this.name}] Request created with ID: ${data.id}`);
    return data.id;
  }

  /**
   * Transition workflow state
   */
  async transitionState(
    requestId: string,
    from: WorkflowState,
    to: WorkflowState
  ): Promise<void> {
    console.log(`[${this.name}] Transitioning state: ${from} -> ${to}`);

    // Get workflow state machine
    let workflow = this.activeWorkflows.get(requestId) || workflowManager.getWorkflow(requestId);

    // Create workflow if it doesn't exist
    if (!workflow) {
      workflow = workflowManager.createWorkflow(requestId);
      this.activeWorkflows.set(requestId, workflow);
    }

    // Transition state machine (only if not terminal state)
    if (!workflow.isTerminal()) {
      workflow.transition(to, this.id);
    }

    // Record in database
    await this.recordStateTransition(requestId, {
      from_state: from,
      to_state: to,
      agent_id: this.id,
      metadata: { timestamp: new Date().toISOString() },
    });

    // Update request status
    await this.updateRequestStatus(requestId, to);
  }

  /**
   * Get current workflow state
   */
  async getCurrentState(requestId: string): Promise<WorkflowState> {
    const { data, error } = await this.supabase
      .from('requests')
      .select('status')
      .eq('id', requestId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to get current state: ${error?.message}`);
    }

    return data.status as WorkflowState;
  }

  /**
   * Get state history
   */
  async getStateHistory(requestId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('workflow_states')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get state history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update request status
   */
  async updateRequestStatus(requestId: string, status: WorkflowState): Promise<void> {
    const { error } = await this.supabase
      .from('requests')
      .update({ status: status as any })
      .eq('id', requestId);

    if (error) {
      console.error(`[${this.name}] Failed to update request status:`, error);
    }
  }

  /**
   * Record state transition in database
   */
  async recordStateTransition(
    requestId: string,
    transition: {
      from_state: WorkflowState;
      to_state: WorkflowState;
      agent_id: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const { error } = await this.supabase.from('workflow_states').insert({
      request_id: requestId,
      current_state: transition.to_state as any,
      previous_state: transition.from_state as any,
      agent_id: transition.agent_id,
      metadata: transition.metadata || {},
      error_message: null,
      retry_count: 0,
      state_entered_at: new Date().toISOString(),
      state_duration_ms: null,
    });

    if (error) {
      console.error(`[${this.name}] Failed to record state transition:`, error);
    }
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[${this.name}] Attempt ${attempt}/${maxRetries} failed:`,
          error.message
        );

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[${this.name}] Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Execution failed after retries');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch client data (delegates to Client Data Manager agent)
   */
  private async fetchClientData(email: string): Promise<any> {
    console.log(`[${this.name}] Fetching client data for ${email}...`);

    // TODO: Implement actual delegation to Client Data Manager agent
    // For now, return mock data
    return {
      email,
      preferences: {},
      company_name: 'Mock Company',
    };
  }

  /**
   * Search flights (delegates to Flight Search agent)
   */
  private async searchFlights(params: any): Promise<any[]> {
    console.log(`[${this.name}] Searching flights...`, params);

    // TODO: Implement actual delegation to Flight Search agent
    // For now, return mock data
    return [
      { aircraft: 'Citation X', available: true },
    ];
  }

  /**
   * Wait for quotes (async)
   */
  private async waitForQuotes(
    requestId: string,
    timeoutMs: number = 30 * 60 * 1000
  ): Promise<any[]> {
    console.log(`[${this.name}] Waiting for quotes (timeout: ${timeoutMs}ms)...`);

    // TODO: Implement actual quote waiting logic with real-time updates
    // For now, return mock quotes
    return [
      {
        id: 'quote-1',
        request_id: requestId,
        total_price: 50000,
        aircraft_type: 'Citation X',
      },
    ];
  }

  /**
   * Analyze proposals (delegates to Proposal Analysis agent)
   */
  private async analyzeProposals(quotes: any[], clientData: any): Promise<any[]> {
    console.log(`[${this.name}] Analyzing ${quotes.length} proposals...`);

    // TODO: Implement actual delegation to Proposal Analysis agent
    // For now, return sorted quotes
    return quotes.sort((a, b) => a.total_price - b.total_price);
  }

  /**
   * Generate proposal email (delegates to Communication agent)
   */
  private async generateProposalEmail(proposals: any[], clientData: any): Promise<any> {
    console.log(`[${this.name}] Generating proposal email...`);

    // TODO: Implement actual delegation to Communication agent
    // For now, return mock email
    return {
      subject: 'Your Flight Proposal',
      body: 'Here are your flight options...',
      proposals,
    };
  }

  /**
   * Send proposal (delegates to Communication agent)
   */
  private async sendProposal(email: any, recipientEmail: string): Promise<any> {
    console.log(`[${this.name}] Sending proposal to ${recipientEmail}...`);

    // TODO: Implement actual delegation to Communication agent
    // For now, return mock result
    return {
      message_id: 'msg-123',
      sent_at: new Date().toISOString(),
    };
  }

  /**
   * Escalate to Error Monitor agent
   */
  private async escalateToErrorMonitor(requestId: string, error: Error): Promise<void> {
    console.error(`[${this.name}] Escalating error to Error Monitor:`, {
      requestId,
      error: error.message,
    });

    // Publish error message
    await messageBus.publish({
      type: MessageType.ERROR,
      sourceAgent: this.id,
      targetAgent: 'error-monitor',
      payload: {
        requestId,
        error: error.message,
        stack: error.stack,
      },
    });
  }

  /**
   * Execute tool (MCP integration)
   */
  private async executeMCPTool(
    serverName: string,
    toolName: string,
    params: any
  ): Promise<any> {
    console.log(`[${this.name}] Executing MCP tool: ${serverName}.${toolName}`);

    // TODO: Implement actual MCP tool execution
    // For now, throw error
    throw new Error('MCP tool execution not yet implemented');
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shutting down...`);

    // Clear active workflows
    this.activeWorkflows.clear();

    await super.shutdown();
  }
}
