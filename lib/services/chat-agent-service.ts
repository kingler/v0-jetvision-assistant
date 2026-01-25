/**
 * Chat-Agent Service
 * Service layer for communication between chat UI and agent orchestrator
 */

import { EventEmitter } from 'events'
import { ChatIntent, ChatResponseType } from '@/lib/types/chat-agent'
import type {
  IChatAgentService,
  ChatAgentRequest,
  ChatAgentResponse,
  ChatSession,
  WorkflowState,
  QuoteData,
  IntentClassificationResult,
  ExtractedEntities,
} from '@/lib/types/chat-agent'
// Stub AgentType enum - agents/core/types doesn't exist in current architecture
enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  CLIENT_DATA = 'client_data',
  FLIGHT_SEARCH = 'flight_search',
  PROPOSAL_ANALYSIS = 'proposal_analysis',
  COMMUNICATION = 'communication',
}
import { getArchivedRFPs, getArchivedRFPDetail, type ArchivedRFPFilters } from '@/lib/services/supabase-queries'

/**
 * Chat Agent Service Implementation
 * Singleton service for chat-agent communication
 */
export class ChatAgentService implements IChatAgentService {
  private static instance: ChatAgentService
  private eventBus: EventEmitter
  private sessions: Map<string, ChatSession> = new Map()
  private workflows: Map<string, WorkflowState> = new Map()

  private constructor() {
    this.eventBus = new EventEmitter()
    this.eventBus.setMaxListeners(100) // Support many concurrent subscriptions
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ChatAgentService {
    if (!ChatAgentService.instance) {
      ChatAgentService.instance = new ChatAgentService()
    }
    return ChatAgentService.instance
  }

  /**
   * Send a message to the agent orchestrator
   */
  async sendMessage(request: ChatAgentRequest): Promise<ChatAgentResponse> {
    console.log('[ChatAgentService] Sending message to orchestrator:', request)

    try {
      // Step 1: Classify intent if not provided
      // If request.intent is a ChatIntent enum, wrap it in IntentClassificationResult
      const intent: IntentClassificationResult = request.intent
        ? { intent: request.intent, confidence: 1.0, entities: {}, requiresClarification: false }
        : await this.classifyIntent(request.content, request.context)

      // Step 2: Extract entities if not provided
      const entities = request.entities || (await this.extractEntities(request.content, intent))

      // Step 3: Route to appropriate agent handler based on intent
      const response = await this.routeToAgent(intent, {
        ...request,
        intent: intent.intent,
        entities,
      })

      console.log('[ChatAgentService] Received response from orchestrator:', response)

      // Step 4: Emit events for real-time updates
      if (response.responseType === ChatResponseType.WORKFLOW_UPDATE && response.data?.workflowState) {
        this.eventBus.emit(`workflow:${response.data.workflowState.id}`, response.data.workflowState)
      }

      if (response.responseType === ChatResponseType.QUOTES_RECEIVED && response.data?.quotes) {
        const rfpId = response.data.rfp?.id
        if (rfpId) {
          this.eventBus.emit(`quotes:${rfpId}`, response.data.quotes)
        }
      }

      return response
    } catch (error) {
      console.error('[ChatAgentService] Error sending message:', error)

      return {
        messageId: request.messageId,
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        intent: ChatIntent.UNKNOWN,
        responseType: ChatResponseType.ERROR,
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          processingTime: 0,
        },
      }
    }
  }

  /**
   * Classify intent from user message
   */
  private async classifyIntent(
    message: string,
    context?: ChatAgentRequest['context']
  ): Promise<IntentClassificationResult> {
    // This would call the orchestrator agent to classify the intent
    // For now, we'll use simple keyword matching

    const lowerMessage = message.toLowerCase()

    // RFP creation keywords
    if (
      lowerMessage.match(/book|create|new|request|need|want.*flight|rfp/i) &&
      !lowerMessage.match(/status|update|check/i)
    ) {
      return {
        intent: ChatIntent.CREATE_RFP,
        confidence: 0.8,
        entities: {},
        requiresClarification: false,
      }
    }

    // RFP status keywords
    if (lowerMessage.match(/status|progress|where|how.*going|update on/i)) {
      return {
        intent: ChatIntent.GET_RFP_STATUS,
        confidence: 0.85,
        entities: {},
        requiresClarification: false,
      }
    }

    // Search keywords
    if (lowerMessage.match(/search|find|look.*for|show.*me/i)) {
      if (lowerMessage.match(/flight|trip|route/i)) {
        return {
          intent: ChatIntent.SEARCH_FLIGHTS,
          confidence: 0.8,
          entities: {},
          requiresClarification: false,
        }
      }
      if (lowerMessage.match(/aircraft|plane|jet/i)) {
        return {
          intent: ChatIntent.SEARCH_AIRCRAFT,
          confidence: 0.8,
          entities: {},
          requiresClarification: false,
        }
      }
      if (lowerMessage.match(/client|customer/i)) {
        return {
          intent: ChatIntent.SEARCH_CLIENTS,
          confidence: 0.8,
          entities: {},
          requiresClarification: false,
        }
      }
    }

    // Quote keywords
    if (lowerMessage.match(/quote|proposal|price|cost|option/i)) {
      return {
        intent: ChatIntent.GET_QUOTES,
        confidence: 0.75,
        entities: {},
        requiresClarification: false,
      }
    }

    // Archived REP keywords
    const archivedKeywords = [
      'archived', 'archive', 'past', 'completed', 'history', 'previous',
      'old request', 'finished', 'cancelled', 'failed'
    ]
    const hasArchivedKeyword = archivedKeywords.some(kw => lowerMessage.includes(kw))

    if (hasArchivedKeyword) {
      const listKeywords = ['show', 'list', 'view', 'see', 'get', 'display', 'all', 'my']
      const detailKeywords = ['detail', 'information', 'about', 'specific', 'id']

      const hasListKeyword = listKeywords.some(kw => lowerMessage.includes(kw))
      const hasDetailKeyword = detailKeywords.some(kw => lowerMessage.includes(kw))

      if (hasDetailKeyword || context?.metadata?.archivedRfpId) {
        return {
          intent: ChatIntent.VIEW_ARCHIVED_RFP,
          confidence: 0.85,
          entities: {},
          requiresClarification: false,
        }
      } else if (hasListKeyword || hasArchivedKeyword) {
        return {
          intent: ChatIntent.LIST_ARCHIVED_RFPS,
          confidence: 0.9,
          entities: {},
          requiresClarification: false,
        }
      }
    }

    // Help keywords
    if (lowerMessage.match(/help|how.*work|what.*can.*do|assist/i)) {
      return {
        intent: ChatIntent.HELP,
        confidence: 0.9,
        entities: {},
        requiresClarification: false,
      }
    }

    // Default: unknown intent
    return {
      intent: ChatIntent.UNKNOWN,
      confidence: 0.5,
      entities: {},
      requiresClarification: true,
      clarificationQuestions: [
        'Could you please clarify what you need help with?',
        'Are you looking to create a new RFP, check status, or search for something?',
      ],
    }
  }

  /**
   * Extract entities from user message
   */
  private async extractEntities(message: string, intent: IntentClassificationResult): Promise<ExtractedEntities> {
    // This would use NER (Named Entity Recognition) or LLM to extract structured data
    // For now, we'll use simple regex patterns

    const entities: ExtractedEntities = {}

    // Extract airport codes (ICAO or IATA)
    const airportPattern = /\b([A-Z]{3,4})\b/g
    const airports = message.match(airportPattern) || []
    if (airports.length >= 2) {
      entities.departureAirport = airports[0]
      entities.arrivalAirport = airports[1]
    } else if (airports.length === 1) {
      // Determine if it's departure or arrival based on context
      if (message.toLowerCase().match(/from/i)) {
        entities.departureAirport = airports[0]
      } else if (message.toLowerCase().match(/to/i)) {
        entities.arrivalAirport = airports[0]
      }
    }

    // Extract dates (simple patterns)
    const datePattern = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?(?:,? \d{4})?)\b/gi
    const dates = message.match(datePattern) || []
    const firstDate = dates[0]
    if (firstDate) {
      entities.departureDate = new Date(firstDate)
      const secondDate = dates[1]
      if (secondDate) {
        entities.returnDate = new Date(secondDate)
      }
    }

    // Extract passenger count
    const passengerPattern = /(\d+)\s*(?:passenger|pax|people|person)/i
    const passengerMatch = message.match(passengerPattern)
    if (passengerMatch) {
      entities.passengers = parseInt(passengerMatch[1], 10)
    }

    // Extract client name (names after "for", "client", etc.)
    const clientPattern = /(?:for|client:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/
    const clientMatch = message.match(clientPattern)
    if (clientMatch) {
      entities.clientName = clientMatch[1]
    }

    // Extract email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    const emailMatch = message.match(emailPattern)
    if (emailMatch) {
      entities.clientEmail = emailMatch[0]
    }

    // Extract aircraft type
    const aircraftTypes = ['light jet', 'midsize', 'super midsize', 'heavy jet', 'ultra long range']
    for (const type of aircraftTypes) {
      if (message.toLowerCase().includes(type)) {
        entities.aircraftType = type.replace(/ /g, '_')
        break
      }
    }

    return entities
  }

  /**
   * Route request to appropriate agent based on intent
   */
  private async routeToAgent(
    intent: IntentClassificationResult,
    request: ChatAgentRequest
  ): Promise<ChatAgentResponse> {
    console.log(`[ChatAgentService] Routing to agent for intent: ${intent.intent}`)

    switch (intent.intent) {
      case ChatIntent.CREATE_RFP:
        return this.handleCreateRFP(request)

      case ChatIntent.GET_RFP_STATUS:
        return this.handleGetRFPStatus(request)

      case ChatIntent.SEARCH_FLIGHTS:
        return this.handleSearchFlights(request)

      case ChatIntent.SEARCH_AIRCRAFT:
        return this.handleSearchAircraft(request)

      case ChatIntent.SEARCH_CLIENTS:
        return this.handleSearchClients(request)

      case ChatIntent.GET_QUOTES:
        return this.handleGetQuotes(request)

      case ChatIntent.LIST_ARCHIVED_RFPS:
        return this.handleListArchivedRFPs(request)

      case ChatIntent.VIEW_ARCHIVED_RFP:
        return this.handleViewArchivedRFP(request)

      case ChatIntent.HELP:
        return this.handleHelp(request)

      case ChatIntent.UNKNOWN:
      default:
        return this.handleUnknown(request, intent)
    }
  }

  /**
   * Handle CREATE_RFP intent
   */
  private async handleCreateRFP(request: ChatAgentRequest): Promise<ChatAgentResponse> {
    const entities = request.entities!

    // Check if we have all required information
    const requiredFields = ['departureAirport', 'arrivalAirport', 'departureDate', 'passengers']
    const missingFields = requiredFields.filter((field) => !entities[field as keyof ExtractedEntities])

    if (missingFields.length > 0) {
      // Need clarification
      return {
        messageId: request.messageId,
        content: this.generateClarificationMessage(missingFields),
        intent: ChatIntent.CLARIFY,
        responseType: ChatResponseType.CLARIFICATION_NEEDED,
        requiresClarification: true,
        clarificationQuestions: missingFields.map((field) => this.getClarificationQuestion(field)),
        metadata: {
          processingTime: 0,
        },
      }
    }

    // TODO: Call actual orchestrator agent to create RFP
    // For now, simulate RFP creation
    const rfpId = `rfp-${Date.now()}`

    const rfpData = {
      id: rfpId,
      status: 'analyzing',
      clientName: entities.clientName || 'Unknown Client',
      clientEmail: entities.clientEmail,
      clientId: entities.clientId,
      departureAirport: entities.departureAirport!,
      arrivalAirport: entities.arrivalAirport!,
      departureDate: entities.departureDate!,
      departureTime: entities.departureTime,
      returnDate: entities.returnDate,
      returnTime: entities.returnTime,
      passengers: entities.passengers!,
      aircraftType: entities.aircraftType,
      budgetMin: entities.budgetMin,
      budgetMax: entities.budgetMax,
      specialRequirements: entities.specialRequirements,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Create workflow state
    const workflowState: WorkflowState = {
      id: `workflow-${rfpId}`,
      rfpId,
      currentStage: 'analyzing' as any,
      stages: [],
      progress: 10,
      estimatedTimeRemaining: 240, // 4 minutes
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.workflows.set(workflowState.id, workflowState)

    return {
      messageId: request.messageId,
      content: this.generateRFPCreatedMessage(rfpData),
      intent: ChatIntent.CREATE_RFP,
      responseType: ChatResponseType.RFP_CREATED,
      data: {
        rfp: rfpData,
        workflowState,
      },
      suggestedActions: [
        {
          id: 'view-workflow',
          label: 'View Workflow',
          description: 'See the progress of your RFP',
          action: 'view_workflow',
          intent: ChatIntent.VIEW_WORKFLOW,
        },
        {
          id: 'update-details',
          label: 'Update Details',
          description: 'Modify flight information',
          action: 'update_rfp',
          intent: ChatIntent.UPDATE_RFP,
        },
      ],
      metadata: {
        processingTime: 150,
        agentChain: [AgentType.ORCHESTRATOR, AgentType.CLIENT_DATA],
      },
    }
  }

  /**
   * Handle GET_RFP_STATUS intent
   */
  private async handleGetRFPStatus(request: ChatAgentRequest): Promise<ChatAgentResponse> {
    // TODO: Fetch actual RFP status from database
    // For now, return mock status

    return {
      messageId: request.messageId,
      content: 'Your RFP is currently being processed. The system is searching for available flights and requesting quotes from operators.',
      intent: ChatIntent.GET_RFP_STATUS,
      responseType: ChatResponseType.WORKFLOW_UPDATE,
      data: {
        workflowState: {
          id: 'workflow-123',
          rfpId: 'rfp-123',
          currentStage: 'searching_flights' as any,
          stages: [],
          progress: 45,
          estimatedTimeRemaining: 120,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      metadata: {
        processingTime: 50,
      },
    }
  }

  /**
   * Handle SEARCH_FLIGHTS intent
   */
  private async handleSearchFlights(request: ChatAgentRequest): Promise<ChatAgentResponse> {
    // TODO: Call flight search agent

    return {
      messageId: request.messageId,
      content: 'I found several flight options for your search criteria. Here are the top results:',
      intent: ChatIntent.SEARCH_FLIGHTS,
      responseType: ChatResponseType.SEARCH_RESULTS,
      data: {
        searchResults: [
          {
            id: 'flight-1',
            type: 'flight',
            title: 'KJFK → KMIA',
            description: 'Light Jet, 3h 30m',
            data: { departureTime: '9:00 AM', price: 25000 },
            score: 0.95,
            rank: 1,
          },
        ],
      },
      metadata: {
        processingTime: 200,
        agentChain: [AgentType.ORCHESTRATOR, AgentType.FLIGHT_SEARCH],
      },
    }
  }

  /**
   * Handle SEARCH_AIRCRAFT intent
   */
  private async handleSearchAircraft(request: ChatAgentRequest): Promise<ChatAgentResponse> {
    return {
      messageId: request.messageId,
      content: 'Here are the aircraft types available for your route and passenger count:',
      intent: ChatIntent.SEARCH_AIRCRAFT,
      responseType: ChatResponseType.SEARCH_RESULTS,
      data: {
        searchResults: [
          {
            id: 'aircraft-1',
            type: 'aircraft',
            title: 'Challenger 350',
            description: 'Midsize Jet, 9 passengers',
            data: { range: 3200, speed: 540 },
            rank: 1,
          },
        ],
      },
      metadata: {
        processingTime: 100,
      },
    }
  }

  /**
   * Handle SEARCH_CLIENTS intent
   */
  private async handleSearchClients(request: ChatAgentRequest): Promise<ChatAgentResponse> {
    return {
      messageId: request.messageId,
      content: 'I found matching clients in the system:',
      intent: ChatIntent.SEARCH_CLIENTS,
      responseType: ChatResponseType.SEARCH_RESULTS,
      data: {
        searchResults: [
          {
            id: 'client-1',
            type: 'client',
            title: 'John Smith',
            description: 'VIP Client, 15 past bookings',
            data: { email: 'john@example.com', vipStatus: 'vip' },
            rank: 1,
          },
        ],
      },
      metadata: {
        processingTime: 75,
      },
    }
  }

  /**
   * Handle GET_QUOTES intent
   */
  private async handleGetQuotes(request: ChatAgentRequest): Promise<ChatAgentResponse> {
    // Mock quotes
    const quotes: QuoteData[] = [
      {
        id: 'quote-1',
        operatorName: 'NetJets',
        operatorId: 'op-1',
        aircraftType: 'Challenger 350',
        price: 42500,
        currency: 'USD',
        departureTime: '9:00 AM',
        arrivalTime: '12:30 PM',
        flightDuration: '3h 30m',
        aiScore: 95,
        rank: 1,
        operatorRating: 4.8,
        isRecommended: true,
      },
    ]

    return {
      messageId: request.messageId,
      content: 'I have received quotes from operators. Here are your options:',
      intent: ChatIntent.GET_QUOTES,
      responseType: ChatResponseType.QUOTES_RECEIVED,
      data: {
        quotes,
      },
      metadata: {
        processingTime: 180,
        agentChain: [AgentType.ORCHESTRATOR, AgentType.PROPOSAL_ANALYSIS],
      },
    }
  }

  /**
   * Handle HELP intent
   */
  private async handleHelp(request: ChatAgentRequest): Promise<ChatAgentResponse> {
    const helpMessage = `I'm here to help you book private jet flights! Here's what I can do:

**Create RFPs**: Just tell me your flight details like "Book a flight from JFK to LAX on Dec 15 for 4 passengers"

**Check Status**: Ask "What's the status of my request?"

**Search**: Find flights, aircraft, or client information

**Quotes**: Review and compare operator quotes

How can I help you today?`

    return {
      messageId: request.messageId,
      content: helpMessage,
      intent: ChatIntent.HELP,
      responseType: ChatResponseType.TEXT,
      suggestedActions: [
        {
          id: 'create-rfp',
          label: 'Create New RFP',
          action: 'create_rfp',
          intent: ChatIntent.CREATE_RFP,
        },
        {
          id: 'search-flights',
          label: 'Search Flights',
          action: 'search_flights',
          intent: ChatIntent.SEARCH_FLIGHTS,
        },
      ],
      metadata: {
        processingTime: 10,
      },
    }
  }

  /**
   * Handle UNKNOWN intent
   */
  private async handleUnknown(request: ChatAgentRequest, intent: IntentClassificationResult): Promise<ChatAgentResponse> {
    return {
      messageId: request.messageId,
      content: 'I\'m not sure I understood that. Could you please rephrase or let me know if you need help?',
      intent: ChatIntent.UNKNOWN,
      responseType: ChatResponseType.CLARIFICATION_NEEDED,
      requiresClarification: true,
      clarificationQuestions: intent.clarificationQuestions,
      suggestedActions: [
        {
          id: 'help',
          label: 'Show Help',
          action: 'help',
          intent: ChatIntent.HELP,
        },
      ],
      metadata: {
        processingTime: 10,
        confidence: intent.confidence,
      },
    }
  }

  /**
   * Generate clarification message for missing fields
   */
  private generateClarificationMessage(missingFields: string[]): string {
    const fieldLabels: Record<string, string> = {
      departureAirport: 'departure airport',
      arrivalAirport: 'arrival airport',
      departureDate: 'departure date',
      passengers: 'number of passengers',
      clientName: 'client name',
    }

    const fields = missingFields.map((f) => fieldLabels[f] || f).join(', ')
    return `I'd be happy to help create an RFP! I just need a bit more information. Could you please provide: ${fields}?`
  }

  /**
   * Get clarification question for a specific field
   */
  private getClarificationQuestion(field: string): string {
    const questions: Record<string, string> = {
      departureAirport: 'What is the departure airport?',
      arrivalAirport: 'What is the destination airport?',
      departureDate: 'When would you like to depart?',
      passengers: 'How many passengers?',
      clientName: 'Who is this booking for?',
    }
    return questions[field] || `What is the ${field}?`
  }

  /**
   * Generate RFP created message
   */
  private generateRFPCreatedMessage(rfp: any): string {
    return `Perfect! I've created RFP ${rfp.id} for your flight from ${rfp.departureAirport} to ${rfp.arrivalAirport} on ${rfp.departureDate.toLocaleDateString()} for ${rfp.passengers} passenger${rfp.passengers > 1 ? 's' : ''}.

I'm now searching for available aircraft and requesting quotes from operators. This typically takes 3-5 minutes.`
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowState> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }
    return workflow
  }

  /**
   * Subscribe to workflow updates
   */
  subscribeToWorkflow(workflowId: string, callback: (state: WorkflowState) => void): () => void {
    const listener = (state: WorkflowState) => callback(state)
    this.eventBus.on(`workflow:${workflowId}`, listener)

    // Return unsubscribe function
    return () => {
      this.eventBus.off(`workflow:${workflowId}`, listener)
    }
  }

  /**
   * Subscribe to quote updates
   */
  subscribeToQuotes(rfpId: string, callback: (quotes: QuoteData[]) => void): () => void {
    const listener = (quotes: QuoteData[]) => callback(quotes)
    this.eventBus.on(`quotes:${rfpId}`, listener)

    // Return unsubscribe function
    return () => {
      this.eventBus.off(`quotes:${rfpId}`, listener)
    }
  }

  /**
   * Get chat session history
   */
  async getSessionHistory(sessionId: string): Promise<ChatSession> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    return session
  }

  /**
   * Create new chat session
   */
  async createSession(userId: string): Promise<ChatSession> {
    const sessionId = `session-${Date.now()}`
    const session: ChatSession = {
      id: sessionId,
      userId,
      title: 'New Conversation',
      status: 'active',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.sessions.set(sessionId, session)
    return session
  }

  /**
   * Handle LIST_ARCHIVED_RFPS intent
   * Returns paginated list of archived REPs
   */
  private async handleListArchivedRFPs(
    request: ChatAgentRequest
  ): Promise<ChatAgentResponse> {
    try {
      const { userId, entities } = request

      // Extract filters from entities
      const filters: ArchivedRFPFilters = {
        statusFilter: entities?.statusFilter,
        startDate: entities?.startDate,
        endDate: entities?.endDate,
        limit: 10, // Default page size
      }

      // Query database
      const { rfps, totalCount, hasMore } = await getArchivedRFPs(userId, filters)

      // Generate response message
      let content = ''
      if (rfps.length === 0) {
        content = 'You don\'t have any archived REPs yet. Completed, cancelled, or failed requests will appear here.'
      } else {
        const statusText = filters.statusFilter
          ? ` ${filters.statusFilter.join(', ')} `
          : ' '
        content = `I found ${rfps.length}${statusText}archived REP${rfps.length !== 1 ? 's' : ''}${totalCount > rfps.length ? ` (showing first ${rfps.length} of ${totalCount})` : ''}.`
      }

      return {
        messageId: request.messageId,
        content,
        intent: ChatIntent.LIST_ARCHIVED_RFPS,
        responseType: ChatResponseType.ARCHIVED_RFPS_LIST,
        data: {
          archivedRfps: rfps,
          totalCount,
          hasMore,
        },
        suggestedActions: rfps.length > 0 ? [
          {
            id: 'view-details',
            label: 'View Details',
            description: 'See full information for a REP',
            action: 'view_archived_rfp_detail',
            icon: '📄',
            intent: ChatIntent.VIEW_ARCHIVED_RFP,
          },
          hasMore ? {
            id: 'load-more',
            label: 'Load More',
            description: 'Show more archived REPs',
            action: 'load_more_archived_rfps',
            icon: '⬇️',
            intent: ChatIntent.LIST_ARCHIVED_RFPS,
            parameters: { offset: rfps.length },
          } : null,
        ].filter((action): action is NonNullable<typeof action> => action !== null) : [],
        metadata: {
          processingTime: 0,
        },
      }
    } catch (error) {
      console.error('[handleListArchivedRFPs] Error:', error)

      return {
        messageId: request.messageId,
        content: 'I encountered an error retrieving your archived REPs. Please try again.',
        intent: ChatIntent.LIST_ARCHIVED_RFPS,
        responseType: ChatResponseType.ERROR,
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          processingTime: 0,
        },
      }
    }
  }

  /**
   * Handle VIEW_ARCHIVED_RFP intent
   * Returns complete archived REP details
   */
  private async handleViewArchivedRFP(
    request: ChatAgentRequest
  ): Promise<ChatAgentResponse> {
    try {
      const { userId, entities } = request

      // Get RFP ID from entities
      const rfpId = entities?.archivedRfpId || entities?.rfpId

      if (!rfpId) {
        return {
          messageId: request.messageId,
          content: 'Which archived REP would you like to view? Please provide the REP ID or select from the list.',
          intent: ChatIntent.VIEW_ARCHIVED_RFP,
          responseType: ChatResponseType.CLARIFICATION_NEEDED,
          requiresClarification: true,
          clarificationQuestions: ['Which archived REP would you like to view?'],
          metadata: {
            processingTime: 0,
          },
        }
      }

      // Fetch detail from database
      const detail = await getArchivedRFPDetail(rfpId, userId)

      // Generate response message
      const statusEmoji = {
        completed: '✅',
        cancelled: '❌',
        failed: '⚠️',
      }[detail.status] || '📄'

      const content = `${statusEmoji} Here are the details for your ${detail.status} REP from ${detail.route.departure} to ${detail.route.arrival} on ${new Date(detail.date).toLocaleDateString()}.`

      return {
        messageId: request.messageId,
        content,
        intent: ChatIntent.VIEW_ARCHIVED_RFP,
        responseType: ChatResponseType.ARCHIVED_RFP_DETAIL,
        data: {
          archivedRfpDetail: detail,
        },
        suggestedActions: [
          {
            id: 'view-quotes',
            label: 'See All Quotes',
            description: `View all ${detail.allQuotes.length} quotes received`,
            action: 'show_all_quotes',
            icon: '💰',
            intent: ChatIntent.GET_QUOTES,
            parameters: { rfpId: detail.id },
          },
          {
            id: 'similar-flight',
            label: 'Request Similar Flight',
            description: 'Create new request with same route',
            action: 'create_similar_rfp',
            icon: '✈️',
            intent: ChatIntent.CREATE_RFP,
            parameters: {
              departureAirport: detail.request.departureAirport,
              arrivalAirport: detail.request.arrivalAirport,
              passengers: detail.request.passengers,
              aircraftType: detail.request.aircraftType,
            },
          },
        ],
        metadata: {
          processingTime: 0,
        },
      }
    } catch (error) {
      console.error('[handleViewArchivedRFP] Error:', error)

      return {
        messageId: request.messageId,
        content: 'I couldn\'t find that archived REP. Please check the ID and try again.',
        intent: ChatIntent.VIEW_ARCHIVED_RFP,
        responseType: ChatResponseType.ERROR,
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          processingTime: 0,
        },
      }
    }
  }
}

/**
 * Export singleton instance
 */
export const chatAgentService = ChatAgentService.getInstance()
