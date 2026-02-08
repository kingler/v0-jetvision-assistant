/**
 * Workflow Status Constants
 *
 * Defines all possible states in the chat workflow pipeline.
 * Replaces magic strings throughout the codebase.
 */

export const WorkflowStatus = {
  UNDERSTANDING_REQUEST: 'understanding_request',
  SEARCHING_AIRCRAFT: 'searching_aircraft',
  REQUESTING_QUOTES: 'requesting_quotes',
  ANALYZING_OPTIONS: 'analyzing_options',
  PROPOSAL_READY: 'proposal_ready',
  PROPOSAL_SENT: 'proposal_sent',
  CONTRACT_GENERATED: 'contract_generated',
  CONTRACT_SENT: 'contract_sent',
  PAYMENT_PENDING: 'payment_pending',
  CLOSED_WON: 'closed_won',
} as const;

export type WorkflowStatusType = typeof WorkflowStatus[keyof typeof WorkflowStatus];

/**
 * RFQ Status Constants
 *
 * Maps to Avinode API response statuses for quotes/RFQs.
 */
export const RFQStatus = {
  UNANSWERED: 'unanswered',
  SENT: 'sent',
  QUOTED: 'quoted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const;

export type RFQStatusType = typeof RFQStatus[keyof typeof RFQStatus];

/**
 * Message Types for operator communication
 */
export const MessageType = {
  REQUEST: 'REQUEST',
  RESPONSE: 'RESPONSE',
  INFO: 'INFO',
  CONFIRMATION: 'CONFIRMATION',
} as const;

export type MessageTypeValue = typeof MessageType[keyof typeof MessageType];

/**
 * Tool Names used in chat API responses
 */
export const ToolName = {
  SEARCH_FLIGHTS: 'search_flights',
  CREATE_TRIP: 'create_trip',
  CREATE_RFP: 'create_rfp',
  GET_QUOTES: 'get_quotes',
  GET_QUOTE: 'get_quote',
  GET_QUOTE_STATUS: 'get_quote_status',
  GET_RFQ: 'get_rfq',
  GET_TRIP_MESSAGES: 'get_trip_messages',
  GET_MESSAGE: 'get_message',
} as const;

export type ToolNameType = typeof ToolName[keyof typeof ToolName];

/**
 * Workflow step numbers
 */
export const WorkflowStep = {
  UNDERSTANDING: 1,
  CREATING_TRIP: 2,
  REQUESTING_QUOTES: 3,
  ANALYZING: 4,
  PROPOSAL: 5,
  PROPOSAL_SENT: 6,
  CONTRACT_GENERATED: 7,
  CONTRACT_SENT: 8,
  PAYMENT_PENDING: 9,
  CLOSED_WON: 10,
} as const;

/**
 * Status to Step mapping
 */
export const StatusToStep: Record<WorkflowStatusType, number> = {
  [WorkflowStatus.UNDERSTANDING_REQUEST]: WorkflowStep.UNDERSTANDING,
  [WorkflowStatus.SEARCHING_AIRCRAFT]: WorkflowStep.CREATING_TRIP,
  [WorkflowStatus.REQUESTING_QUOTES]: WorkflowStep.REQUESTING_QUOTES,
  [WorkflowStatus.ANALYZING_OPTIONS]: WorkflowStep.ANALYZING,
  [WorkflowStatus.PROPOSAL_READY]: WorkflowStep.PROPOSAL,
  [WorkflowStatus.PROPOSAL_SENT]: WorkflowStep.PROPOSAL_SENT,
  [WorkflowStatus.CONTRACT_GENERATED]: WorkflowStep.CONTRACT_GENERATED,
  [WorkflowStatus.CONTRACT_SENT]: WorkflowStep.CONTRACT_SENT,
  [WorkflowStatus.PAYMENT_PENDING]: WorkflowStep.PAYMENT_PENDING,
  [WorkflowStatus.CLOSED_WON]: WorkflowStep.CLOSED_WON,
};

/**
 * Quote indicators in message text
 * Used for parsing quotes from agent text responses
 */
export const QUOTE_INDICATORS = [
  'here are the quotes',
  'quotes for your trip',
  'quotes we\'ve received',
  'available options',
  'flight options',
  'available quotes',
  'quote details',
] as const;

/**
 * Polling configuration
 */
export const PollingConfig = {
  /** Interval between RFQ polls in milliseconds (60 seconds) */
  RFQ_POLL_INTERVAL_MS: 60000,
  /** Minimum time since last fetch before allowing new poll (30 seconds) */
  MIN_POLL_INTERVAL_MS: 30000,
  /** Maximum backoff time for rate limit errors (5 minutes) */
  MAX_RATE_LIMIT_BACKOFF_MS: 5 * 60000,
  /** Time to consider "just fetched" (10 seconds) */
  JUST_FETCHED_THRESHOLD_MS: 10000,
} as const;

/**
 * SSE configuration
 */
export const SSEConfig = {
  /** Prefix for SSE data lines */
  DATA_PREFIX: 'data: ',
} as const;
