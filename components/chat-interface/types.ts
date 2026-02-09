/**
 * Chat Interface Types
 *
 * Shared types for chat interface components.
 */

import type { RFQFlight } from '@/components/avinode/rfq-flight-card';
import type { PipelineData } from '@/lib/chat';
import type { ProposalSentConfirmationProps } from '@/components/proposal/proposal-sent-confirmation';
import type { ContractSentConfirmationProps } from '@/components/contract/contract-sent-confirmation';
import type { EmailApprovalRequestContent } from '@/lib/types/chat';

/**
 * Unified message type for rendering in the chat interface.
 * Combines user, agent, and operator messages into a single format.
 */
export interface UnifiedMessage {
  id: string;
  type: 'user' | 'agent' | 'operator';
  content: string;
  timestamp: Date;
  // Agent message features
  showWorkflow?: boolean;
  showProposal?: boolean;
  showQuoteStatus?: boolean;
  showCustomerPreferences?: boolean;
  showQuotes?: boolean;
  showDeepLink?: boolean;
  deepLinkData?: { tripId?: string; deepLink?: string };
  showPipeline?: boolean;
  pipelineData?: PipelineData;
  showProposalSentConfirmation?: boolean;
  proposalSentData?: ProposalSentConfirmationProps;
  // Contract sent confirmation
  showContractSentConfirmation?: boolean;
  contractSentData?: ContractSentConfirmationProps;
  // Email approval workflow
  showEmailApprovalRequest?: boolean;
  emailApprovalData?: EmailApprovalRequestContent;
  // Operator message properties
  operatorName?: string;
  operatorQuoteId?: string;
  operatorMessageType?: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION';
}

/**
 * Operator message from the messages map
 */
export interface OperatorMessageItem {
  id?: string;
  type: 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION';
  content: string;
  timestamp: string;
  sender?: string;
}

/**
 * Flight request data for FlightSearchProgress
 */
export interface FlightRequestData {
  departureAirport: { icao: string; name?: string };
  arrivalAirport: { icao: string; name?: string };
  departureDate: string;
  passengers: number;
  requestId?: string;
}

/**
 * Props for message list rendering
 */
export interface ChatMessageListProps {
  /** All messages to render */
  messages: UnifiedMessage[];
  /** RFQ flights for display */
  rfqFlights: RFQFlight[];
  /** Selected RFQ flight IDs */
  selectedRfqFlightIds: string[];
  /** Whether to show FlightSearchProgress */
  shouldShowFlightSearchProgress: boolean;
  /** Whether processing is in progress */
  isProcessing: boolean;
  // FlightSearchProgress props
  flightRequest?: FlightRequestData;
  deepLink?: string;
  tripId?: string;
  isTripIdLoading?: boolean;
  tripIdError?: string;
  tripIdSubmitted?: boolean;
  currentStep?: number;
  rfqsLastFetchedAt?: string;
  customerEmail?: string;
  customerName?: string;
  operatorMessages?: Record<string, OperatorMessageItem[]>;
  // Handlers
  onTripIdSubmit: (tripId: string) => Promise<void>;
  onRfqFlightSelectionChange: (ids: string[]) => void;
  onViewChat: (flightId: string, quoteId?: string) => void;
  onGenerateProposal: (flightId: string, quoteId?: string) => void;
  onReviewAndBook: (flightId: string) => void;
  onBookFlight: (flightId: string, quoteId?: string) => void;
  onViewRequest?: (requestId: string) => void;
  onRefreshPipeline?: () => void;
}

/**
 * Props for ChatInput component
 */
export interface ChatInputProps {
  /** Current input value */
  value: string;
  /** Handler for value changes */
  onChange: (value: string) => void;
  /** Handler for sending message */
  onSend: () => void;
  /** Handler for viewing workflow */
  onViewWorkflow?: () => void;
  /** Whether processing is in progress */
  isProcessing: boolean;
  /** Whether to show view workflow button */
  showViewWorkflow?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
}
