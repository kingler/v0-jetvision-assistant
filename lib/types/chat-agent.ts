/**
 * Chat-Agent Communication Types
 * Type definitions for communication between chat UI and agent orchestrator
 */

import type { AgentResult, AgentContext } from '@/agents/core/types'

/**
 * Chat Message Types
 */
export type ChatMessageType = 'user' | 'agent' | 'system' | 'tool'

export type ChatMessageRole = 'user' | 'assistant' | 'system'

/**
 * Chat Intent Types
 * Determines what action the agent orchestrator should take
 */
export enum ChatIntent {
  // RFP Workflow
  CREATE_RFP = 'create_rfp',
  UPDATE_RFP = 'update_rfp',
  GET_RFP_STATUS = 'get_rfp_status',
  LIST_RFPS = 'list_rfps',

  // Search & Discovery
  SEARCH_FLIGHTS = 'search_flights',
  SEARCH_AIRCRAFT = 'search_aircraft',
  SEARCH_OPERATORS = 'search_operators',

  // Client Management
  GET_CLIENT_INFO = 'get_client_info',
  SEARCH_CLIENTS = 'search_clients',

  // Quotes & Proposals
  GET_QUOTES = 'get_quotes',
  ANALYZE_QUOTES = 'analyze_quotes',
  SELECT_QUOTE = 'select_quote',
  SEND_PROPOSAL = 'send_proposal',

  // Workflow Management
  VIEW_WORKFLOW = 'view_workflow',
  GET_WORKFLOW_STATUS = 'get_workflow_status',

  // Archived RFP Management
  LIST_ARCHIVED_RFPS = 'list_archived_rfps',
  VIEW_ARCHIVED_RFP = 'view_archived_rfp',

  // General
  HELP = 'help',
  CLARIFY = 'clarify',
  UNKNOWN = 'unknown',
}

/**
 * Extracted Entities from User Message
 */
export interface ExtractedEntities {
  // Client information
  clientName?: string
  clientEmail?: string
  clientId?: string

  // Flight details
  departureAirport?: string
  arrivalAirport?: string
  departureDate?: Date
  departureTime?: string
  returnDate?: Date
  returnTime?: string

  // Preferences
  passengers?: number
  aircraftType?: string
  budgetMin?: number
  budgetMax?: number
  specialRequirements?: string

  // Search parameters
  searchQuery?: string
  filters?: Record<string, unknown>

  // RFP references
  rfpId?: string
  quoteId?: string

  // Archived RFP filters
  statusFilter?: ('completed' | 'cancelled' | 'failed')[]
  startDate?: Date
  endDate?: Date
  archivedRfpId?: string

  // Other metadata
  [key: string]: unknown
}

/**
 * Chat Request to Agent
 * What the UI sends to the agent orchestrator
 */
export interface ChatAgentRequest {
  sessionId: string
  userId: string
  messageId: string
  content: string
  intent?: ChatIntent
  entities?: ExtractedEntities
  context?: {
    previousMessages?: ChatMessage[]
    currentWorkflow?: WorkflowState
    metadata?: Record<string, unknown>
  }
}

/**
 * Chat Response from Agent
 * What the agent orchestrator sends back to the UI
 */
export interface ChatAgentResponse {
  messageId: string
  content: string
  intent: ChatIntent
  responseType: ChatResponseType
  data?: ChatResponseData
  suggestedActions?: SuggestedAction[]
  requiresClarification?: boolean
  clarificationQuestions?: string[]
  metadata?: {
    processingTime: number
    agentChain?: string[]
    confidence?: number
  }
}

/**
 * Chat Response Types
 */
export enum ChatResponseType {
  TEXT = 'text',
  RFP_CREATED = 'rfp_created',
  RFP_UPDATED = 'rfp_updated',
  SEARCH_RESULTS = 'search_results',
  QUOTES_RECEIVED = 'quotes_received',
  PROPOSAL_READY = 'proposal_ready',
  WORKFLOW_UPDATE = 'workflow_update',
  CLIENT_INFO = 'client_info',
  ARCHIVED_RFPS_LIST = 'archived_rfps_list',
  ARCHIVED_RFP_DETAIL = 'archived_rfp_detail',
  ERROR = 'error',
  CLARIFICATION_NEEDED = 'clarification_needed',
}

/**
 * Archived RFP Summary
 * Lightweight data for list view
 */
export interface ArchivedRFPSummary {
  id: string
  clientName: string
  route: {
    departure: string
    arrival: string
  }
  date: string
  passengers: number
  status: 'completed' | 'cancelled' | 'failed'
  completedAt: string
  duration: number // milliseconds
  selectedOperator?: string
  finalPrice?: number
}

/**
 * Archived RFP Detail
 * Complete data for detail view
 */
export interface ArchivedRFPDetail extends ArchivedRFPSummary {
  // Full request data
  request: {
    id: string
    departureAirport: string
    arrivalAirport: string
    departureDate: string
    returnDate: string | null
    passengers: number
    aircraftType: string | null
    budget: number | null
    specialRequirements: string | null
  }

  // Client information
  client: {
    id: string
    name: string
    email: string
    company: string | null
    isVIP: boolean
    preferences?: Record<string, any>
  }

  // Selected quote (if completed)
  selectedQuote?: {
    id: string
    operatorName: string
    aircraftType: string
    basePrice: number
    totalPrice: number
    score: number | null
    ranking: number | null
  }

  // All quotes received
  allQuotes: QuoteData[]

  // Workflow timeline
  workflowHistory: {
    state: string
    enteredAt: string
    duration: number
    agentId: string | null
  }[]

  // Proposal info (if sent)
  proposal?: {
    sentAt: string
    status: 'sent' | 'accepted' | 'rejected'
    recipientEmail: string
  }
}

/**
 * Structured Data in Responses
 */
export interface ChatResponseData {
  // RFP data
  rfp?: RFPData

  // Search results
  searchResults?: SearchResult[]

  // Quotes and proposals
  quotes?: QuoteData[]
  selectedQuote?: QuoteData
  proposal?: ProposalData

  // Client data
  clientInfo?: ClientData

  // Workflow state
  workflowState?: WorkflowState

  // Archived RFP data
  archivedRfps?: ArchivedRFPSummary[]
  archivedRfpDetail?: ArchivedRFPDetail
  totalCount?: number
  hasMore?: boolean

  // Other structured data
  [key: string]: unknown
}

/**
 * RFP Data Structure
 */
export interface RFPData {
  id: string
  status: string
  clientName: string
  clientEmail?: string
  clientId?: string
  departureAirport: string
  arrivalAirport: string
  departureDate: Date
  departureTime?: string
  returnDate?: Date
  returnTime?: string
  passengers: number
  aircraftType?: string
  budgetMin?: number
  budgetMax?: number
  specialRequirements?: string
  createdAt: Date
  updatedAt: Date
  workflow?: WorkflowState
}

/**
 * Search Result
 */
export interface SearchResult {
  id: string
  type: 'flight' | 'aircraft' | 'operator' | 'client'
  title: string
  description: string
  data: Record<string, unknown>
  score?: number
  rank?: number
}

/**
 * Quote Data
 */
export interface QuoteData {
  id: string
  operatorName: string
  operatorId: string
  aircraftType: string
  price: number
  currency: string
  departureTime: string
  arrivalTime: string
  flightDuration: string
  aiScore: number
  rank: number
  operatorRating?: number
  isRecommended: boolean
  features?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Proposal Data
 */
export interface ProposalData {
  id: string
  rfpId: string
  selectedQuote: QuoteData
  emailContent: string
  pdfUrl?: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
  createdAt: Date
  sentAt?: Date
}

/**
 * Client Data
 */
export interface ClientData {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  vipStatus?: 'standard' | 'vip' | 'ultra_vip'
  preferences?: {
    aircraftTypes?: string[]
    catering?: string
    groundTransport?: boolean
    budgetRange?: { min: number; max: number }
    specialRequirements?: string
  }
  statistics?: {
    totalBookings: number
    totalSpent: number
    lastBookingDate?: Date
  }
}

/**
 * Workflow State
 */
export interface WorkflowState {
  id: string
  rfpId: string
  currentStage: WorkflowStage
  stages: WorkflowStageStatus[]
  progress: number
  estimatedTimeRemaining?: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Workflow Stages
 */
export enum WorkflowStage {
  CREATED = 'created',
  ANALYZING = 'analyzing',
  FETCHING_CLIENT_DATA = 'fetching_client_data',
  SEARCHING_FLIGHTS = 'searching_flights',
  AWAITING_QUOTES = 'awaiting_quotes',
  ANALYZING_PROPOSALS = 'analyzing_proposals',
  GENERATING_EMAIL = 'generating_email',
  SENDING_PROPOSAL = 'sending_proposal',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Workflow Stage Status
 */
export interface WorkflowStageStatus {
  stage: WorkflowStage
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  duration?: number
  agent?: string
  error?: string
}

/**
 * Suggested Actions for User
 */
export interface SuggestedAction {
  id: string
  label: string
  description?: string
  action: string
  icon?: string
  intent: ChatIntent
  parameters?: Record<string, unknown>
}

/**
 * Chat Message (UI Model)
 */
export interface ChatMessage {
  id: string
  type: ChatMessageType
  content: string
  timestamp: Date
  intent?: ChatIntent
  responseType?: ChatResponseType
  data?: ChatResponseData
  suggestedActions?: SuggestedAction[]
  showWorkflow?: boolean
  showQuotes?: boolean
  showQuoteStatus?: boolean
  showProposal?: boolean
  showCustomerPreferences?: boolean
  showArchivedRFPsList?: boolean
  showArchivedRFPDetail?: boolean
  metadata?: Record<string, unknown>
}

/**
 * Chat Session
 */
export interface ChatSession {
  id: string
  userId: string
  title?: string
  status: string
  messages: ChatMessage[]
  currentWorkflow?: WorkflowState
  context?: {
    rfpId?: string
    clientId?: string
    metadata?: Record<string, unknown>
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * Agent Service Interface
 * Contract for chat-agent communication service
 */
export interface IChatAgentService {
  /**
   * Send a message to the agent orchestrator
   */
  sendMessage(request: ChatAgentRequest): Promise<ChatAgentResponse>

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId: string): Promise<WorkflowState>

  /**
   * Subscribe to workflow updates
   */
  subscribeToWorkflow(workflowId: string, callback: (state: WorkflowState) => void): () => void

  /**
   * Subscribe to quote updates
   */
  subscribeToQuotes(rfpId: string, callback: (quotes: QuoteData[]) => void): () => void

  /**
   * Get chat session history
   */
  getSessionHistory(sessionId: string): Promise<ChatSession>

  /**
   * Create new chat session
   */
  createSession(userId: string): Promise<ChatSession>
}

/**
 * Intent Classification Result
 */
export interface IntentClassificationResult {
  intent: ChatIntent
  confidence: number
  entities: ExtractedEntities
  requiresClarification: boolean
  clarificationQuestions?: string[]
}

/**
 * Error Response
 */
export interface ChatErrorResponse {
  error: string
  code: string
  message: string
  details?: Record<string, unknown>
  suggestedActions?: SuggestedAction[]
}
