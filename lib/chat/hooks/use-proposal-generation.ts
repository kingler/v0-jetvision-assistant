/**
 * useProposalGeneration - Proposal Generation Workflow Hook
 *
 * Manages the proposal generation flow including customer selection,
 * proposal sending, and confirmation message creation.
 *
 * Extracted from: components/chat-interface.tsx (lines 1389-1664)
 */

import { useState, useCallback } from 'react';
import {
  generateAndSend,
  persistConfirmation,
  buildProposalSentData,
  buildConfirmationContent,
  findValidRequestId,
  type ProposalCustomer,
  type ProposalTripDetails,
  type ProposalResult,
} from '../api/proposal-api';
import type { RFQFlight } from '../types';
import { extractRouteParts } from '../transformers/rfq-transformer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Client profile from database (matching agents/jetvision-agent/types.ts)
 */
export interface ClientProfile {
  id: string;
  iso_agent_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  notes?: string;
  preferences?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Active chat session context
 */
export interface ChatSession {
  id: string;
  route?: string;
  date?: string;
  isoDate?: string;
  passengers?: number;
  tripId?: string;
  requestId?: string;
  conversationId?: string;
  messages?: ChatMessage[];
  customer?: CustomerData;
}

/**
 * Chat message type
 */
export interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  showProposalSentConfirmation?: boolean;
  proposalSentData?: ProposalSentData;
}

/**
 * Proposal sent data for confirmation display
 */
export interface ProposalSentData {
  flightDetails: {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
  };
  client: {
    name: string;
    email: string;
  };
  pdfUrl: string;
  fileName?: string;
  proposalId?: string;
  pricing?: {
    total: number;
    currency: string;
  };
}

/**
 * Customer data stored in chat session
 */
export interface CustomerData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  isReturning?: boolean;
  preferences?: Record<string, unknown>;
}

/**
 * Options for the proposal generation hook
 */
export interface UseProposalGenerationOptions {
  /** Active chat session */
  activeChat: ChatSession;
  /** Available RFQ flights */
  rfqFlights: RFQFlight[];
  /** Callback when chat should be updated */
  onUpdateChat: (chatId: string, updates: Partial<ChatSession>) => void;
  /** Default fee percentage (default: 30) */
  jetvisionFeePercentage?: number;
}

/**
 * Return type for the proposal generation hook
 */
export interface UseProposalGenerationReturn {
  /** Whether the customer selection dialog should be open */
  isCustomerDialogOpen: boolean;
  /** Whether a proposal is currently being generated */
  isGeneratingProposal: boolean;
  /** Handler to initiate proposal generation (opens customer dialog) */
  handleGenerateProposal: (flightId: string, quoteId?: string) => void;
  /** Handler when customer is selected from dialog */
  handleCustomerSelected: (customer: ClientProfile) => Promise<void>;
  /** Handler to close the customer dialog */
  handleCancelCustomerSelection: () => void;
  /** Pending flight ID for proposal */
  pendingProposalFlightId: string | null;
  /** Pending quote ID for proposal */
  pendingProposalQuoteId: string | undefined;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get ISO date from chat session
 */
function getIsoDateFromChat(chat: ChatSession): string {
  // Prefer isoDate if available (already in YYYY-MM-DD format)
  if (chat.isoDate) {
    return chat.isoDate;
  }
  // Try to parse the formatted display date
  if (chat.date) {
    try {
      const parsed = new Date(chat.date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch {
      // Fall through to default
    }
  }
  // Default to today
  return new Date().toISOString().split('T')[0];
}

/**
 * Build trip details from chat session and route
 */
function buildTripDetails(
  chat: ChatSession,
  departureIcao: string,
  arrivalIcao: string
): ProposalTripDetails {
  return {
    departureAirport: {
      icao: departureIcao,
      name: departureIcao,
      city: '',
    },
    arrivalAirport: {
      icao: arrivalIcao,
      name: arrivalIcao,
      city: '',
    },
    departureDate: getIsoDateFromChat(chat),
    passengers: chat.passengers || 1,
    tripId: chat.tripId,
  };
}

/**
 * Build customer data from client profile
 */
function buildCustomerData(customer: ClientProfile): ProposalCustomer {
  return {
    name: customer.contact_name,
    email: customer.email,
    company: customer.company_name,
    phone: customer.phone || undefined,
  };
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing proposal generation workflow.
 *
 * Handles:
 * - Customer selection dialog state
 * - Proposal generation and sending
 * - PDF download and email sending
 * - Confirmation message creation and persistence
 *
 * @example
 * ```tsx
 * const {
 *   isCustomerDialogOpen,
 *   isGeneratingProposal,
 *   handleGenerateProposal,
 *   handleCustomerSelected,
 *   handleCancelCustomerSelection,
 * } = useProposalGeneration({
 *   activeChat,
 *   rfqFlights,
 *   onUpdateChat,
 * });
 *
 * // In RFQ card
 * <Button onClick={() => handleGenerateProposal(flight.id, flight.quoteId)}>
 *   Generate Proposal
 * </Button>
 *
 * // Customer dialog
 * <CustomerSelectionDialog
 *   open={isCustomerDialogOpen}
 *   onSelect={handleCustomerSelected}
 *   onCancel={handleCancelCustomerSelection}
 * />
 * ```
 */
export function useProposalGeneration(
  options: UseProposalGenerationOptions
): UseProposalGenerationReturn {
  const {
    activeChat,
    rfqFlights,
    onUpdateChat,
    jetvisionFeePercentage = 30,
  } = options;

  // State
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [pendingProposalFlightId, setPendingProposalFlightId] = useState<string | null>(null);
  const [pendingProposalQuoteId, setPendingProposalQuoteId] = useState<string | undefined>();

  /**
   * Handle generating proposal - opens customer selection dialog
   */
  const handleGenerateProposal = useCallback((flightId: string, quoteId?: string) => {
    console.log('[useProposalGeneration] Generate proposal clicked:', { flightId, quoteId });

    // Store the flight and quote IDs for when customer is selected
    setPendingProposalFlightId(flightId);
    setPendingProposalQuoteId(quoteId);

    // Open the customer selection dialog
    setIsCustomerDialogOpen(true);
  }, []);

  /**
   * Handle customer selection from dialog
   */
  const handleCustomerSelected = useCallback(
    async (customer: ClientProfile) => {
      if (!pendingProposalFlightId) {
        console.error('[useProposalGeneration] No pending flight ID for proposal generation');
        return;
      }

      setIsGeneratingProposal(true);
      setIsCustomerDialogOpen(false);

      try {
        // Find the selected flight from rfqFlights
        const selectedFlight = rfqFlights.find((f) => f.id === pendingProposalFlightId);

        if (!selectedFlight) {
          throw new Error('Selected flight not found');
        }

        // Parse route to get departure and arrival airports
        const routeParts = extractRouteParts(activeChat.route);
        const departureIcao = routeParts[0] || activeChat.route?.split(' → ')[0]?.trim() || '';
        const arrivalIcao = routeParts[1] || activeChat.route?.split(' → ')[1]?.trim() || '';

        if (!departureIcao || !arrivalIcao || departureIcao === 'N/A' || arrivalIcao === 'N/A') {
          throw new Error('Invalid route: missing departure or arrival airport');
        }

        // Build trip details
        const tripDetails = buildTripDetails(activeChat, departureIcao, arrivalIcao);

        // Build customer data
        const customerData = buildCustomerData(customer);

        console.log('[useProposalGeneration] Generating proposal with:', {
          customer: customerData,
          tripDetails,
          flight: {
            id: selectedFlight.id,
            quoteId: selectedFlight.quoteId,
            operatorName: selectedFlight.operatorName,
            totalPrice: selectedFlight.totalPrice,
          },
          margin: `${jetvisionFeePercentage}%`,
        });

        // Find valid request ID for persistence
        const requestIdForSave = findValidRequestId({
          requestId: activeChat.requestId,
          conversationId: activeChat.conversationId,
          id: activeChat.id,
        });

        // Enhanced debug logging
        console.log('[useProposalGeneration] 🔍 Proposal persistence debug:', {
          requestIdForSave,
          'activeChat.requestId': activeChat.requestId,
          'activeChat.conversationId': activeChat.conversationId,
          'activeChat.id': activeChat.id,
          'activeChat.tripId': activeChat.tripId,
        });

        // Warn if no valid requestId for a session with tripId
        if (!requestIdForSave && activeChat.tripId) {
          console.error(
            '[useProposalGeneration] ⚠️ CRITICAL: Cannot persist proposal - no valid requestId found!',
            {
              tripId: activeChat.tripId,
              sessionId: activeChat.id,
            }
          );
        }

        // Generate and send proposal
        const result = await generateAndSend({
          customer: customerData,
          tripDetails,
          selectedFlights: [selectedFlight],
          jetvisionFeePercentage,
          requestId: requestIdForSave ?? undefined,
        });

        console.log('[useProposalGeneration] Proposal sent successfully:', {
          proposalId: result.proposalId,
          emailSent: result.emailSent,
          messageId: result.messageId,
          pricing: result.pricing,
        });

        // Open PDF in new tab and trigger download
        if (result.pdfUrl) {
          window.open(result.pdfUrl, '_blank');

          const link = document.createElement('a');
          link.href = result.pdfUrl;
          link.download = result.fileName || 'proposal.pdf';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        // Build confirmation data and message
        const proposalSentData = buildProposalSentData(result, tripDetails, customerData);
        const confirmationContent = buildConfirmationContent(result, tripDetails, customerData);

        // Try to use server-persisted message ID
        let savedMessageId: string | null =
          typeof result.savedMessageId === 'string' && result.savedMessageId.trim() !== ''
            ? result.savedMessageId
            : null;

        // Fallback: persist client-side if server did not persist
        if (!savedMessageId && requestIdForSave) {
          savedMessageId = await persistConfirmation({
            requestId: requestIdForSave,
            content: confirmationContent,
            proposalSentData,
          });
        }

        if (!savedMessageId && !requestIdForSave) {
          console.warn(
            '[useProposalGeneration] Proposal confirmation will not survive refresh: no valid requestId'
          );
        }

        // Create confirmation message
        const confirmationMessage: ChatMessage = {
          id: savedMessageId ?? `agent-proposal-sent-${Date.now()}`,
          type: 'agent',
          content: confirmationContent,
          timestamp: new Date(),
          showProposalSentConfirmation: true,
          proposalSentData,
        };

        // Update chat with confirmation message and customer data
        const updatedMessages = [...(activeChat.messages || []), confirmationMessage];
        onUpdateChat(activeChat.id, {
          messages: updatedMessages,
          customer: {
            name: customerData.name,
            email: customerData.email,
            company: customerData.company,
            phone: customerData.phone,
            isReturning: false,
            preferences: {},
          },
        });
      } catch (error) {
        console.error('[useProposalGeneration] Error generating proposal:', error);
        alert(`Failed to generate proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsGeneratingProposal(false);
        setPendingProposalFlightId(null);
        setPendingProposalQuoteId(undefined);
      }
    },
    [
      pendingProposalFlightId,
      rfqFlights,
      activeChat,
      jetvisionFeePercentage,
      onUpdateChat,
    ]
  );

  /**
   * Handle cancel customer selection
   */
  const handleCancelCustomerSelection = useCallback(() => {
    setIsCustomerDialogOpen(false);
    setPendingProposalFlightId(null);
    setPendingProposalQuoteId(undefined);
  }, []);

  return {
    isCustomerDialogOpen,
    isGeneratingProposal,
    handleGenerateProposal,
    handleCustomerSelected,
    handleCancelCustomerSelection,
    pendingProposalFlightId,
    pendingProposalQuoteId,
  };
}

export type UseProposalGenerationReturn_Type = ReturnType<typeof useProposalGeneration>;
