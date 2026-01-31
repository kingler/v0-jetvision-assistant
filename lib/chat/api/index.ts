/**
 * Chat API Module
 *
 * Client-side API services for chat functionality.
 * These services wrap fetch calls and provide type-safe interfaces.
 *
 * Usage:
 * ```ts
 * import { chatApi, proposalApi, rfqUtils } from '@/lib/chat/api';
 *
 * // Send a message
 * const { response, abortController } = await chatApi.sendMessage({
 *   message: 'I need a flight',
 *   conversationHistory: [],
 * });
 *
 * // Generate a proposal
 * const result = await proposalApi.generateAndSend({
 *   customer: { name: 'John', email: 'john@example.com' },
 *   tripDetails: { ... },
 *   selectedFlights: [flight],
 *   jetvisionFeePercentage: 30,
 * });
 *
 * // Merge RFQ flights
 * const merged = rfqUtils.mergeRFQFlights(existing, incoming);
 * ```
 */

// Chat API
export {
  chatApi,
  sendMessage,
  fetchRFQs,
  buildConversationHistory,
  type ConversationHistoryItem,
  type SendMessageParams,
  type SendMessageResult,
  type FetchRFQsParams,
} from './chat-api';

// Proposal API
export {
  proposalApi,
  generateAndSend,
  persistConfirmation,
  buildProposalSentData,
  buildConfirmationContent,
  openAndDownloadPdf,
  isValidRequestId,
  findValidRequestId,
  type ProposalCustomer,
  type ProposalAirport,
  type ProposalTripDetails,
  type GenerateProposalParams,
  type ProposalPricing,
  type ProposalResult,
  type ProposalSentData,
  type PersistConfirmationParams,
} from './proposal-api';

// RFQ Utilities
export {
  rfqUtils,
  mergeRFQFlights,
  updateFlightsById,
  getRFQStats,
  getQuotedCount,
  getPendingCount,
  filterByStatus,
  filterWithPrice,
  filterQuoted,
  filterNeedingAttention,
  sortByPriceAsc,
  sortByPriceDesc,
  sortByLastUpdated,
  sortByStatusPriority,
  getSelectedFlights,
  toggleSelection,
  selectAll,
  deselectAll,
  findFlightById,
  findFlightByQuoteId,
  type RFQStats,
  type MergeOptions,
} from './rfq-utils';
