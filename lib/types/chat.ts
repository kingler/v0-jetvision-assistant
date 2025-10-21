/**
 * Chat and Session Type Definitions
 * Used for RFP request tracking and workflow visualization
 */

/**
 * Customer information for personalization
 */
export interface Customer {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  isReturning?: boolean;
  preferences?: Record<string, any>;
}

/**
 * Valid chat session workflow states
 */
export type ChatSessionStatus =
  | 'understanding_request'
  | 'searching_aircraft'
  | 'requesting_quotes'
  | 'analyzing_options'
  | 'proposal_ready';

/**
 * Chat message type
 */
export interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  showWorkflow?: boolean;
  showProposal?: boolean;
  showQuoteStatus?: boolean;
  showCustomerPreferences?: boolean;
}

/**
 * Complete chat session with RFP workflow tracking
 */
export interface ChatSession {
  id: string;
  route: string;
  passengers: number;
  date: string;
  status: ChatSessionStatus;
  currentStep: number;
  totalSteps: number;
  aircraft?: string;
  operator?: string;
  basePrice?: number;
  totalPrice?: number;
  margin?: number;
  messages: ChatMessage[];
  quotesReceived?: number;
  quotesTotal?: number;
  customer?: Customer;
}
