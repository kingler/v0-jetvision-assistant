/**
 * Orchestrator Agent Implementation
 *
 * The OrchestratorAgent is the entry point for RFP processing.
 * It handles natural language conversation, progressive data extraction,
 * and coordinates the multi-agent workflow.
 *
 * ONEK-98: Enhanced with conversational capabilities:
 * - Natural language intent parsing
 * - Progressive data extraction
 * - Contextual question generation
 * - Conversation state tracking
 * - Structured message component responses
 *
 * ONEK-115: Redis-backed conversation state storage
 * - Replaced in-memory Map with RedisConversationStore
 * - Enables horizontal scaling (multiple server instances)
 * - State persistence across server restarts
 * - Automatic session expiry (1 hour TTL)
 * - Graceful fallback to in-memory on Redis failure
 */

import { BaseAgent } from '../core/base-agent';
import type {
  AgentContext,
  AgentResult,
  AgentConfig,
  AgentTask,
} from '../core/types';
import { AgentType, AgentStatus } from '../core/types';
import { getSystemPrompt } from '../config';
import {
  IntentParser,
  DataExtractor,
  QuestionGenerator,
  UserIntent,
  type ConversationState,
  createConversationState,
  updateConversationState,
} from '../tools';
import type { MessageComponent } from '@/components/message-components/types';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { detectTripId } from '@/lib/avinode/trip-id';
import { RedisConversationStore, getConversationStore } from '@/lib/sessions';

/**
 * RFP data structure (backward compatibility)
 */
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

/**
 * RFP analysis result
 */
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
 * Conversational response
 */
interface ConversationalResponse {
  message: string;
  components: MessageComponent[];
  intent: UserIntent;
  conversationState: ConversationState;
  isComplete: boolean;
  nextAction?: 'ask_question' | 'create_rfp' | 'provide_info';
}

/**
 * OrchestratorAgent
 * Analyzes RFP requests, handles conversation, and coordinates the workflow
 */
export class OrchestratorAgent extends BaseAgent {
  private intentParser: IntentParser;
  private dataExtractor: DataExtractor;
  private questionGenerator: QuestionGenerator;

  /**
   * ONEK-115: Redis-backed conversation state store
   * - Replaces in-memory Map for scalability
   * - Provides automatic TTL (1 hour default)
   * - Falls back to in-memory on Redis connection failure
   */
  private conversationStore: RedisConversationStore;

  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.ORCHESTRATOR,
      systemPrompt: config.systemPrompt || getSystemPrompt(AgentType.ORCHESTRATOR),
    });

    // Initialize conversational tools
    this.intentParser = new IntentParser();
    this.dataExtractor = new DataExtractor();
    this.questionGenerator = new QuestionGenerator();

    // Initialize Redis-backed conversation store (ONEK-115)
    this.conversationStore = getConversationStore();
  }

  /**
   * Initialize the agent
   * Sets up base agent and Redis conversation store
   */
  async initialize(): Promise<void> {
    await super.initialize();

    // Initialize Redis conversation store connection
    await this.conversationStore.initialize();

    // Log health status for debugging
    const health = await this.conversationStore.getHealth();
    console.log(`[${this.name}] OrchestratorAgent initialized with conversational capabilities`);
    console.log(`[${this.name}] Conversation store: ${health.connected ? 'Redis connected' : 'Using in-memory fallback'}`, {
      connected: health.connected,
      latencyMs: health.latencyMs,
      usingFallback: health.usingFallback,
    });
  }

  /**
   * Execute the agent
   * Main entry point - handles both conversational and direct RFP creation
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this._status = AgentStatus.RUNNING;

    try {
      // Check if this is a conversational request or direct RFP
      const userMessage = context.metadata?.userMessage as string | undefined;

      if (userMessage) {
        // Conversational mode - process natural language
        const response = await this.handleConversation(userMessage, context);
        return this.buildConversationalResult(response, startTime);
      } else {
        // Legacy mode - direct RFP processing (backward compatibility)
        return await this.executeLegacy(context, startTime);
      }
    } catch (error) {
      this.metrics.totalExecutions++;
      this.metrics.failedExecutions++;
      this._status = AgentStatus.ERROR;

      return {
        success: false,
        error: error as Error,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Handle conversational interaction
   * ONEK-115: Updated to use async Redis-backed conversation store
   */
  private async handleConversation(
    userMessage: string,
    context: AgentContext
  ): Promise<ConversationalResponse> {
    const sessionId = context.sessionId || 'default-session';

    // Get or create conversation state from Redis store
    let conversationState = await this.conversationStore.get(sessionId);
    if (!conversationState) {
      conversationState = createConversationState(
        sessionId,
        context.userId,
        context.requestId
      );
      await this.conversationStore.set(sessionId, conversationState);
    } else {
      // Refresh TTL on existing session to extend lifetime
      await this.conversationStore.refreshTTL(sessionId);
    }

    // Add user message to history
    conversationState.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Check if message contains a TripID - handle TripID queries first
    const tripId = this.extractTripId(userMessage);
    if (tripId) {
      return await this.handleTripIDQuery(tripId, conversationState, context);
    }

    // Parse user intent
    const intentResult = await this.intentParser.parseIntent(
      userMessage,
      conversationState.conversationHistory
    );

    conversationState = updateConversationState(conversationState, {
      intent: intentResult.intent,
    });

    // Handle based on intent
    switch (intentResult.intent) {
      case UserIntent.RFP_CREATION:
      case UserIntent.CLARIFICATION_RESPONSE:
        return await this.handleRFPCreation(userMessage, conversationState, context);

      case UserIntent.INFORMATION_QUERY:
        return await this.handleInformationQuery(userMessage, conversationState);

      case UserIntent.GENERAL_CONVERSATION:
        return await this.handleGeneralConversation(userMessage, conversationState);

      default:
        return await this.handleRFPCreation(userMessage, conversationState, context);
    }
  }

  /**
   * Handle RFP creation and clarification
   */
  private async handleRFPCreation(
    userMessage: string,
    conversationState: ConversationState,
    context: AgentContext
  ): Promise<ConversationalResponse> {
    // Extract data from user message
    const extractionResult = await this.dataExtractor.extractData(
      userMessage,
      conversationState.extractedData,
      conversationState.conversationHistory
    );

    // Update conversation state
    const missingFields = this.dataExtractor.getMissingFields(extractionResult.data);
    const isComplete = this.dataExtractor.isComplete(extractionResult.data);

    conversationState = updateConversationState(conversationState, {
      extractedData: extractionResult.data,
      missingFields,
      isComplete,
    });

    // Persist updated state to Redis store (ONEK-115)
    await this.conversationStore.set(conversationState.sessionId, conversationState);

    // If complete, create RFP and delegate to downstream agents
    if (isComplete) {
      return await this.completeRFPCreation(conversationState, context);
    }

    // Otherwise, ask clarifying question
    return await this.askClarifyingQuestion(conversationState);
  }

  /**
   * Ask clarifying question for missing data
   */
  private async askClarifyingQuestion(
    conversationState: ConversationState
  ): Promise<ConversationalResponse> {
    const questionResult = await this.questionGenerator.generateQuestion(
      conversationState.missingFields,
      conversationState.extractedData,
      conversationState.conversationHistory,
      conversationState.clarificationRound
    );

    if (!questionResult) {
      // Max clarification rounds reached, work with what we have
      return {
        message: 'I need a bit more information to complete your request. Could you provide the missing details?',
        components: [
          {
            type: 'text',
            content: 'I need a bit more information to complete your request. Could you provide the missing details?',
          },
        ],
        intent: UserIntent.RFP_CREATION,
        conversationState,
        isComplete: false,
        nextAction: 'ask_question',
      };
    }

    // Update conversation state
    conversationState = updateConversationState(conversationState, {
      clarificationRound: conversationState.clarificationRound + 1,
      questionsAsked: [...conversationState.questionsAsked, questionResult.field],
    });

    // Add assistant message to history
    conversationState.conversationHistory.push({
      role: 'assistant',
      content: questionResult.question,
      timestamp: new Date(),
    });

    // Persist updated state to Redis store (ONEK-115)
    await this.conversationStore.set(conversationState.sessionId, conversationState);

    return {
      message: questionResult.question,
      components: questionResult.components || [
        {
          type: 'text',
          content: questionResult.question,
        },
      ],
      intent: UserIntent.RFP_CREATION,
      conversationState,
      isComplete: false,
      nextAction: 'ask_question',
    };
  }

  /**
   * Complete RFP creation and delegate to downstream agents
   */
  private async completeRFPCreation(
    conversationState: ConversationState,
    context: AgentContext
  ): Promise<ConversationalResponse> {
    const rfpData = conversationState.extractedData as RFPData;

    // Analyze the RFP
    const analysis = this.analyzeRFP(rfpData);
    const priority = this.determinePriority(rfpData.departureDate);

    // Create tasks for downstream agents
    const tasks = this.createTasks(rfpData, context, priority);

    // Build success message with workflow status
    const message = `Perfect! I've created your flight request from ${rfpData.departure} to ${rfpData.arrival} on ${rfpData.departureDate} for ${rfpData.passengers} passenger${rfpData.passengers > 1 ? 's' : ''}. I'm now searching for available flights and quotes.`;

    const components: MessageComponent[] = [
      {
        type: 'text',
        content: message,
      },
      {
        type: 'workflow_status',
        stage: 'searching',
        progress: 25,
        message: 'Searching for flights...',
        details: [
          { label: 'Route', value: `${rfpData.departure} → ${rfpData.arrival}` },
          { label: 'Date', value: rfpData.departureDate },
          { label: 'Passengers', value: rfpData.passengers },
          { label: 'Status', value: 'In Progress', status: 'in_progress' },
        ],
      },
    ];

    // Add assistant message to history
    conversationState.conversationHistory.push({
      role: 'assistant',
      content: message,
      timestamp: new Date(),
    });

    // Mark as complete
    conversationState = updateConversationState(conversationState, {
      isComplete: true,
    });

    // Persist completed state to Redis store (ONEK-115)
    await this.conversationStore.set(conversationState.sessionId, conversationState);

    return {
      message,
      components,
      intent: UserIntent.RFP_CREATION,
      conversationState,
      isComplete: true,
      nextAction: 'create_rfp',
    };
  }

  /**
   * Extract TripID from user message
   * Supports formats: "atrip-123456", "TRP-123456", "123456", or mentions like "Trip ID: atrip-123"
   */
  private extractTripId(message: string): string | null {
    const detection = detectTripId(message, { allowStandalone: true, awaitingTripId: true });
    return detection?.normalized ?? null;
  }

  /**
   * Handle TripID query - fetch and return linked RFQs
   */
  private async handleTripIDQuery(
    tripId: string,
    conversationState: ConversationState,
    context: AgentContext
  ): Promise<ConversationalResponse> {
    try {
      // Build query for requests linked to this TripID
      // Filter by user_id for security (context.userId should be the database user ID)
      let query = supabaseAdmin
        .from('requests')
        .select(`
          id,
          departure_airport,
          arrival_airport,
          departure_date,
          return_date,
          passengers,
          status,
          created_at,
          updated_at,
          avinode_rfq_id,
          avinode_deep_link,
          iso_agent_id,
          client_profiles (
            id,
            contact_name,
            company_name
          ),
          quotes (
            id,
            operator_name,
            aircraft_type,
            total_price,
            base_price,
            score,
            ranking,
            status,
            aircraft_details,
            availability_confirmed,
            valid_until
          )
        `)
        .eq('avinode_trip_id', tripId);

      // Filter by iso_agent_id if provided in context (security: users should only see their own RFQs)
      if (context.userId) {
        query = query.eq('iso_agent_id', context.userId);
      }

      // Order by creation date (most recent first)
      query = query.order('created_at', { ascending: false });

      const { data: requests, error } = await query;

      if (error) {
        console.error('[OrchestratorAgent] Error fetching RFQs for TripID:', error);
        const errorMessage = `I encountered an error while looking up RFQs for Trip ID ${tripId}. Please try again.`;
        
        conversationState.conversationHistory.push({
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
        });

        return {
          message: errorMessage,
          components: [
            {
              type: 'text',
              content: errorMessage,
            },
          ],
          intent: UserIntent.INFORMATION_QUERY,
          conversationState,
          isComplete: false,
          nextAction: 'provide_info',
        };
      }

      if (!requests || requests.length === 0) {
        const notFoundMessage = `I couldn't find any RFQs linked to Trip ID ${tripId}. Please verify the Trip ID and try again.`;
        
        conversationState.conversationHistory.push({
          role: 'assistant',
          content: notFoundMessage,
          timestamp: new Date(),
        });

        return {
          message: notFoundMessage,
          components: [
            {
              type: 'text',
              content: notFoundMessage,
            },
          ],
          intent: UserIntent.INFORMATION_QUERY,
          conversationState,
          isComplete: false,
          nextAction: 'provide_info',
        };
      }

      // Format RFQs for display
      const components: MessageComponent[] = [];
      const rfqMessages: string[] = [];

      rfqMessages.push(`I found ${requests.length} RFQ${requests.length > 1 ? 's' : ''} linked to Trip ID ${tripId}:`);

      for (const request of requests) {
        const clientName = (request.client_profiles as any)?.contact_name || 
                          (request.client_profiles as any)?.company_name || 
                          'Unknown Client';
        
        const route = `${request.departure_airport} → ${request.arrival_airport}`;
        const departureDate = new Date(request.departure_date).toLocaleDateString();
        const quotes = (request.quotes as any[]) || [];
        const quotesCount = quotes.length;

        // Build RFQ summary message
        let rfqSummary = `\n**RFQ ${request.id.substring(0, 8)}...**\n`;
        rfqSummary += `Route: ${route}\n`;
        rfqSummary += `Date: ${departureDate}\n`;
        rfqSummary += `Passengers: ${request.passengers}\n`;
        rfqSummary += `Status: ${request.status}\n`;
        rfqSummary += `Client: ${clientName}\n`;
        rfqSummary += `Quotes: ${quotesCount}`;

        rfqMessages.push(rfqSummary);

        // Add quote cards for each quote
        if (quotes.length > 0) {
          quotes
            .sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
            .forEach((quote, index) => {
              components.push({
                type: 'quote_card',
                quote: {
                  id: quote.id,
                  operatorName: quote.operator_name || 'Unknown Operator',
                  aircraftType: quote.aircraft_type || 'Unknown Aircraft',
                  price: quote.total_price || 0,
                  departureTime: '', // Would need flight details
                  arrivalTime: '',
                  flightDuration: '',
                  isRecommended: quote.ranking === 1,
                },
              });

              // Add quote details to message
              rfqMessages.push(
                `  ${index + 1}. ${quote.operator_name} - ${quote.aircraft_type || 'N/A'}` +
                ` - $${(quote.total_price || 0).toLocaleString()}` +
                (quote.ranking === 1 ? ' (Recommended)' : '')
              );
            });
        }
      }

      const fullMessage = rfqMessages.join('\n');

      // Add text component at the beginning
      components.unshift({
        type: 'text',
        content: fullMessage,
        markdown: true,
      });

      conversationState.conversationHistory.push({
        role: 'assistant',
        content: fullMessage,
        timestamp: new Date(),
      });

      // Persist updated state to Redis store (ONEK-115)
      await this.conversationStore.set(conversationState.sessionId, conversationState);

      return {
        message: fullMessage,
        components,
        intent: UserIntent.INFORMATION_QUERY,
        conversationState,
        isComplete: true,
        nextAction: 'provide_info',
      };
    } catch (error) {
      console.error('[OrchestratorAgent] Error handling TripID query:', error);
      const errorMessage = `I encountered an error while processing your Trip ID query. Please try again.`;

      conversationState.conversationHistory.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      });

      return {
        message: errorMessage,
        components: [
          {
            type: 'text',
            content: errorMessage,
          },
        ],
        intent: UserIntent.INFORMATION_QUERY,
        conversationState,
        isComplete: false,
        nextAction: 'provide_info',
      };
    }
  }

  /**
   * Handle information query
   */
  private async handleInformationQuery(
    userMessage: string,
    conversationState: ConversationState
  ): Promise<ConversationalResponse> {
    const questionResult = await this.questionGenerator.generateInformationResponse(userMessage);

    // Add messages to history
    conversationState.conversationHistory.push({
      role: 'assistant',
      content: questionResult.question,
      timestamp: new Date(),
    });

    // Persist updated state to Redis store (ONEK-115)
    await this.conversationStore.set(conversationState.sessionId, conversationState);

    return {
      message: questionResult.question,
      components: questionResult.components || [
        {
          type: 'text',
          content: questionResult.question,
        },
      ],
      intent: UserIntent.INFORMATION_QUERY,
      conversationState,
      isComplete: false,
      nextAction: 'provide_info',
    };
  }

  /**
   * Handle general conversation
   */
  private async handleGeneralConversation(
    userMessage: string,
    conversationState: ConversationState
  ): Promise<ConversationalResponse> {
    const greetings = ['Hello', 'Hi', 'Hey'];
    const thanks = ['Thank you', 'Thanks', 'Great'];
    const responses = ['You\'re welcome', 'Happy to help', 'My pleasure'];

    let response = 'Hello! I can help you book a private jet flight. What are your travel plans?';

    if (userMessage.toLowerCase().includes('thank')) {
      response = responses[Math.floor(Math.random() * responses.length)] + '! Is there anything else I can help you with?';
    } else if (userMessage.toLowerCase().match(/^(hi|hello|hey)/)) {
      response = 'Hello! I can help you book a private jet flight. Where would you like to fly?';
    }

    conversationState.conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    });

    // Persist updated state to Redis store (ONEK-115)
    await this.conversationStore.set(conversationState.sessionId, conversationState);

    return {
      message: response,
      components: [
        {
          type: 'text',
          content: response,
        },
      ],
      intent: UserIntent.GENERAL_CONVERSATION,
      conversationState,
      isComplete: false,
      nextAction: 'provide_info',
    };
  }

  /**
   * Build result for conversational response
   */
  private buildConversationalResult(
    response: ConversationalResponse,
    startTime: number
  ): AgentResult {
    this.metrics.totalExecutions++;
    this.metrics.successfulExecutions++;
    this._status = AgentStatus.COMPLETED;

    const executionTime = Date.now() - startTime;
    this.updateAverageExecutionTime(executionTime);

    return {
      success: true,
      data: {
        message: response.message,
        components: response.components,
        intent: response.intent,
        conversationState: response.conversationState,
        isComplete: response.isComplete,
        nextAction: response.nextAction,
      },
      metadata: {
        executionTime,
      },
    };
  }

  /**
   * Legacy RFP processing (backward compatibility)
   */
  private async executeLegacy(context: AgentContext, startTime: number): Promise<AgentResult> {
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
  }

  /**
   * Extract RFP data from context (legacy)
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

  /**
   * Get conversation state for a session (for testing/debugging)
   * ONEK-115: Updated to async Redis store access
   */
  async getConversationState(sessionId: string): Promise<ConversationState | undefined> {
    return this.conversationStore.get(sessionId);
  }

  /**
   * Clear conversation state (for testing/session reset)
   * ONEK-115: Updated to async Redis store access
   */
  async clearConversationState(sessionId: string): Promise<void> {
    await this.conversationStore.delete(sessionId);
  }

  /**
   * Get conversation store health status (for monitoring/debugging)
   * ONEK-115: New method to check Redis connection status
   */
  async getStoreHealth(): Promise<{ connected: boolean; latencyMs: number; usingFallback: boolean }> {
    return this.conversationStore.getHealth();
  }

  /**
   * Shutdown - cleanup conversation store connection
   * ONEK-115: Updated to close Redis connection properly
   */
  async shutdown(): Promise<void> {
    await super.shutdown();
    await this.conversationStore.close();
  }
}
