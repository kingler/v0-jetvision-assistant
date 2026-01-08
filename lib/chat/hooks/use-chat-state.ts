/**
 * useChatState - Centralized Chat State Management
 *
 * Consolidates 25+ useState calls from chat-interface.tsx into a single
 * useReducer-based state management system.
 *
 * Benefits:
 * - Single source of truth for chat state
 * - Predictable state transitions via actions
 * - Easier debugging and testing
 * - Reduced re-renders
 */

import { useReducer, useCallback, useMemo } from 'react';
import { WorkflowStatus, RFQStatus } from '../constants';
import type {
  ChatMessage,
  RFQFlight,
  DeepLinkData,
  PipelineData,
  OperatorMessagesMap,
  QuoteDetailsMap,
  ConversationMessage,
} from '../types';

/**
 * Chat state interface
 */
export interface ChatState {
  // Messages
  messages: ChatMessage[];
  conversationHistory: ConversationMessage[];

  // Input
  inputValue: string;

  // Loading states
  isLoading: boolean;
  isPolling: boolean;
  isSending: boolean;

  // Workflow
  workflowStatus: string;
  currentStep: number;
  showWorkflow: boolean;

  // Deep link / Trip
  showDeepLink: boolean;
  deepLinkData: DeepLinkData | null;
  tripId: string;

  // RFQ / Quotes
  rfqFlights: RFQFlight[];
  selectedFlightIds: string[];
  quoteDetailsMap: QuoteDetailsMap;
  showQuotes: boolean;
  showProposal: boolean;

  // Operator messages
  operatorMessagesMap: OperatorMessagesMap;
  expandedMessageIds: string[];

  // Pipeline
  showPipeline: boolean;
  pipelineData: PipelineData | null;

  // Errors
  error: string | null;

  // Streaming
  streamingContent: string;
  isStreaming: boolean;

  // UI state
  showCustomerPreferences: boolean;
  scrollToBottom: boolean;
}

/**
 * Initial state
 */
export const initialChatState: ChatState = {
  messages: [],
  conversationHistory: [],
  inputValue: '',
  isLoading: false,
  isPolling: false,
  isSending: false,
  workflowStatus: WorkflowStatus.UNDERSTANDING_REQUEST,
  currentStep: 1,
  showWorkflow: false,
  showDeepLink: false,
  deepLinkData: null,
  tripId: '',
  rfqFlights: [],
  selectedFlightIds: [],
  quoteDetailsMap: {},
  showQuotes: false,
  showProposal: false,
  operatorMessagesMap: {},
  expandedMessageIds: [],
  showPipeline: false,
  pipelineData: null,
  error: null,
  streamingContent: '',
  isStreaming: false,
  showCustomerPreferences: false,
  scrollToBottom: false,
};

/**
 * Action types
 */
export type ChatAction =
  // Message actions
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<ChatMessage> } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_CONVERSATION_HISTORY'; payload: ConversationMessage[] }
  | { type: 'ADD_TO_CONVERSATION_HISTORY'; payload: ConversationMessage }

  // Input actions
  | { type: 'SET_INPUT_VALUE'; payload: string }

  // Loading state actions
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_POLLING'; payload: boolean }
  | { type: 'SET_SENDING'; payload: boolean }

  // Workflow actions
  | { type: 'SET_WORKFLOW_STATUS'; payload: { status: string; step: number } }
  | { type: 'SHOW_WORKFLOW'; payload: boolean }

  // Deep link actions
  | { type: 'SET_DEEP_LINK'; payload: { show: boolean; data: DeepLinkData | null } }
  | { type: 'SET_TRIP_ID'; payload: string }

  // RFQ/Quote actions
  | { type: 'SET_RFQ_FLIGHTS'; payload: RFQFlight[] }
  | { type: 'UPDATE_RFQ_FLIGHTS'; payload: RFQFlight[] }
  | { type: 'TOGGLE_FLIGHT_SELECTION'; payload: string }
  | { type: 'SELECT_ALL_FLIGHTS' }
  | { type: 'DESELECT_ALL_FLIGHTS' }
  | { type: 'SET_QUOTE_DETAILS'; payload: QuoteDetailsMap }
  | { type: 'ADD_QUOTE_DETAILS'; payload: { quoteId: string; details: QuoteDetailsMap[string] } }
  | { type: 'SHOW_QUOTES'; payload: boolean }
  | { type: 'SHOW_PROPOSAL'; payload: boolean }

  // Operator message actions
  | { type: 'SET_OPERATOR_MESSAGES'; payload: OperatorMessagesMap }
  | { type: 'ADD_OPERATOR_MESSAGES'; payload: { quoteId: string; messages: OperatorMessagesMap[string] } }
  | { type: 'TOGGLE_MESSAGE_EXPANSION'; payload: string }

  // Pipeline actions
  | { type: 'SET_PIPELINE'; payload: { show: boolean; data: PipelineData | null } }

  // Error actions
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }

  // Streaming actions
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'SET_STREAMING_CONTENT'; payload: string }
  | { type: 'APPEND_STREAMING_CONTENT'; payload: string }
  | { type: 'CLEAR_STREAMING' }

  // UI actions
  | { type: 'SHOW_CUSTOMER_PREFERENCES'; payload: boolean }
  | { type: 'TRIGGER_SCROLL_TO_BOTTOM' }
  | { type: 'RESET_SCROLL_TO_BOTTOM' }

  // Batch actions
  | { type: 'RESET_FOR_NEW_MESSAGE' }
  | { type: 'RESET_ALL' };

/**
 * Chat state reducer
 */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    // Message actions
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        scrollToBottom: true,
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        ),
      };

    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
        conversationHistory: [],
      };

    case 'SET_CONVERSATION_HISTORY':
      return {
        ...state,
        conversationHistory: action.payload,
      };

    case 'ADD_TO_CONVERSATION_HISTORY':
      return {
        ...state,
        conversationHistory: [...state.conversationHistory, action.payload],
      };

    // Input actions
    case 'SET_INPUT_VALUE':
      return {
        ...state,
        inputValue: action.payload,
      };

    // Loading state actions
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_POLLING':
      return {
        ...state,
        isPolling: action.payload,
      };

    case 'SET_SENDING':
      return {
        ...state,
        isSending: action.payload,
      };

    // Workflow actions
    case 'SET_WORKFLOW_STATUS':
      return {
        ...state,
        workflowStatus: action.payload.status,
        currentStep: action.payload.step,
      };

    case 'SHOW_WORKFLOW':
      return {
        ...state,
        showWorkflow: action.payload,
      };

    // Deep link actions
    case 'SET_DEEP_LINK':
      return {
        ...state,
        showDeepLink: action.payload.show,
        deepLinkData: action.payload.data,
      };

    case 'SET_TRIP_ID':
      return {
        ...state,
        tripId: action.payload,
      };

    // RFQ/Quote actions
    case 'SET_RFQ_FLIGHTS':
      return {
        ...state,
        rfqFlights: action.payload,
      };

    case 'UPDATE_RFQ_FLIGHTS':
      // Merge new flights with existing, updating by id
      const existingIds = new Set(state.rfqFlights.map((f) => f.id));
      const newFlights = action.payload.filter((f) => !existingIds.has(f.id));
      const updatedFlights = state.rfqFlights.map((existing) => {
        const update = action.payload.find((f) => f.id === existing.id);
        return update ? { ...existing, ...update } : existing;
      });
      return {
        ...state,
        rfqFlights: [...updatedFlights, ...newFlights],
      };

    case 'TOGGLE_FLIGHT_SELECTION':
      const flightId = action.payload;
      const isSelected = state.selectedFlightIds.includes(flightId);
      return {
        ...state,
        selectedFlightIds: isSelected
          ? state.selectedFlightIds.filter((id) => id !== flightId)
          : [...state.selectedFlightIds, flightId],
        rfqFlights: state.rfqFlights.map((f) =>
          f.id === flightId ? { ...f, isSelected: !isSelected } : f
        ),
      };

    case 'SELECT_ALL_FLIGHTS':
      return {
        ...state,
        selectedFlightIds: state.rfqFlights.map((f) => f.id),
        rfqFlights: state.rfqFlights.map((f) => ({ ...f, isSelected: true })),
      };

    case 'DESELECT_ALL_FLIGHTS':
      return {
        ...state,
        selectedFlightIds: [],
        rfqFlights: state.rfqFlights.map((f) => ({ ...f, isSelected: false })),
      };

    case 'SET_QUOTE_DETAILS':
      return {
        ...state,
        quoteDetailsMap: action.payload,
      };

    case 'ADD_QUOTE_DETAILS':
      return {
        ...state,
        quoteDetailsMap: {
          ...state.quoteDetailsMap,
          [action.payload.quoteId]: action.payload.details,
        },
      };

    case 'SHOW_QUOTES':
      return {
        ...state,
        showQuotes: action.payload,
      };

    case 'SHOW_PROPOSAL':
      return {
        ...state,
        showProposal: action.payload,
      };

    // Operator message actions
    case 'SET_OPERATOR_MESSAGES':
      return {
        ...state,
        operatorMessagesMap: action.payload,
      };

    case 'ADD_OPERATOR_MESSAGES':
      return {
        ...state,
        operatorMessagesMap: {
          ...state.operatorMessagesMap,
          [action.payload.quoteId]: action.payload.messages,
        },
      };

    case 'TOGGLE_MESSAGE_EXPANSION':
      const messageId = action.payload;
      const isExpanded = state.expandedMessageIds.includes(messageId);
      return {
        ...state,
        expandedMessageIds: isExpanded
          ? state.expandedMessageIds.filter((id) => id !== messageId)
          : [...state.expandedMessageIds, messageId],
      };

    // Pipeline actions
    case 'SET_PIPELINE':
      return {
        ...state,
        showPipeline: action.payload.show,
        pipelineData: action.payload.data,
      };

    // Error actions
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    // Streaming actions
    case 'SET_STREAMING':
      return {
        ...state,
        isStreaming: action.payload,
      };

    case 'SET_STREAMING_CONTENT':
      return {
        ...state,
        streamingContent: action.payload,
      };

    case 'APPEND_STREAMING_CONTENT':
      return {
        ...state,
        streamingContent: state.streamingContent + action.payload,
      };

    case 'CLEAR_STREAMING':
      return {
        ...state,
        isStreaming: false,
        streamingContent: '',
      };

    // UI actions
    case 'SHOW_CUSTOMER_PREFERENCES':
      return {
        ...state,
        showCustomerPreferences: action.payload,
      };

    case 'TRIGGER_SCROLL_TO_BOTTOM':
      return {
        ...state,
        scrollToBottom: true,
      };

    case 'RESET_SCROLL_TO_BOTTOM':
      return {
        ...state,
        scrollToBottom: false,
      };

    // Batch actions
    case 'RESET_FOR_NEW_MESSAGE':
      return {
        ...state,
        inputValue: '',
        error: null,
        streamingContent: '',
        isStreaming: false,
        showWorkflow: true,
        workflowStatus: WorkflowStatus.UNDERSTANDING_REQUEST,
        currentStep: 1,
      };

    case 'RESET_ALL':
      return {
        ...initialChatState,
      };

    default:
      return state;
  }
}

/**
 * Custom hook for chat state management
 */
export function useChatState(initialState: Partial<ChatState> = {}) {
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialChatState,
    ...initialState,
  });

  // Memoized action creators
  const actions = useMemo(
    () => ({
      // Message actions
      addMessage: (message: ChatMessage) => dispatch({ type: 'ADD_MESSAGE', payload: message }),
      updateMessage: (id: string, updates: Partial<ChatMessage>) =>
        dispatch({ type: 'UPDATE_MESSAGE', payload: { id, updates } }),
      clearMessages: () => dispatch({ type: 'CLEAR_MESSAGES' }),
      setConversationHistory: (history: ConversationMessage[]) =>
        dispatch({ type: 'SET_CONVERSATION_HISTORY', payload: history }),
      addToConversationHistory: (message: ConversationMessage) =>
        dispatch({ type: 'ADD_TO_CONVERSATION_HISTORY', payload: message }),

      // Input actions
      setInputValue: (value: string) => dispatch({ type: 'SET_INPUT_VALUE', payload: value }),

      // Loading state actions
      setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
      setPolling: (polling: boolean) => dispatch({ type: 'SET_POLLING', payload: polling }),
      setSending: (sending: boolean) => dispatch({ type: 'SET_SENDING', payload: sending }),

      // Workflow actions
      setWorkflowStatus: (status: string, step: number) =>
        dispatch({ type: 'SET_WORKFLOW_STATUS', payload: { status, step } }),
      showWorkflow: (show: boolean) => dispatch({ type: 'SHOW_WORKFLOW', payload: show }),

      // Deep link actions
      setDeepLink: (show: boolean, data: DeepLinkData | null) =>
        dispatch({ type: 'SET_DEEP_LINK', payload: { show, data } }),
      setTripId: (tripId: string) => dispatch({ type: 'SET_TRIP_ID', payload: tripId }),

      // RFQ/Quote actions
      setRFQFlights: (flights: RFQFlight[]) => dispatch({ type: 'SET_RFQ_FLIGHTS', payload: flights }),
      updateRFQFlights: (flights: RFQFlight[]) =>
        dispatch({ type: 'UPDATE_RFQ_FLIGHTS', payload: flights }),
      toggleFlightSelection: (flightId: string) =>
        dispatch({ type: 'TOGGLE_FLIGHT_SELECTION', payload: flightId }),
      selectAllFlights: () => dispatch({ type: 'SELECT_ALL_FLIGHTS' }),
      deselectAllFlights: () => dispatch({ type: 'DESELECT_ALL_FLIGHTS' }),
      setQuoteDetails: (details: QuoteDetailsMap) =>
        dispatch({ type: 'SET_QUOTE_DETAILS', payload: details }),
      addQuoteDetails: (quoteId: string, details: QuoteDetailsMap[string]) =>
        dispatch({ type: 'ADD_QUOTE_DETAILS', payload: { quoteId, details } }),
      showQuotes: (show: boolean) => dispatch({ type: 'SHOW_QUOTES', payload: show }),
      showProposal: (show: boolean) => dispatch({ type: 'SHOW_PROPOSAL', payload: show }),

      // Operator message actions
      setOperatorMessages: (messages: OperatorMessagesMap) =>
        dispatch({ type: 'SET_OPERATOR_MESSAGES', payload: messages }),
      addOperatorMessages: (quoteId: string, messages: OperatorMessagesMap[string]) =>
        dispatch({ type: 'ADD_OPERATOR_MESSAGES', payload: { quoteId, messages } }),
      toggleMessageExpansion: (messageId: string) =>
        dispatch({ type: 'TOGGLE_MESSAGE_EXPANSION', payload: messageId }),

      // Pipeline actions
      setPipeline: (show: boolean, data: PipelineData | null) =>
        dispatch({ type: 'SET_PIPELINE', payload: { show, data } }),

      // Error actions
      setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
      clearError: () => dispatch({ type: 'CLEAR_ERROR' }),

      // Streaming actions
      setStreaming: (streaming: boolean) => dispatch({ type: 'SET_STREAMING', payload: streaming }),
      setStreamingContent: (content: string) =>
        dispatch({ type: 'SET_STREAMING_CONTENT', payload: content }),
      appendStreamingContent: (content: string) =>
        dispatch({ type: 'APPEND_STREAMING_CONTENT', payload: content }),
      clearStreaming: () => dispatch({ type: 'CLEAR_STREAMING' }),

      // UI actions
      showCustomerPreferences: (show: boolean) =>
        dispatch({ type: 'SHOW_CUSTOMER_PREFERENCES', payload: show }),
      triggerScrollToBottom: () => dispatch({ type: 'TRIGGER_SCROLL_TO_BOTTOM' }),
      resetScrollToBottom: () => dispatch({ type: 'RESET_SCROLL_TO_BOTTOM' }),

      // Batch actions
      resetForNewMessage: () => dispatch({ type: 'RESET_FOR_NEW_MESSAGE' }),
      resetAll: () => dispatch({ type: 'RESET_ALL' }),
    }),
    []
  );

  // Computed values
  const computed = useMemo(
    () => ({
      hasMessages: state.messages.length > 0,
      hasRFQFlights: state.rfqFlights.length > 0,
      selectedFlightsCount: state.selectedFlightIds.length,
      quotedFlightsCount: state.rfqFlights.filter((f) => f.rfqStatus === RFQStatus.QUOTED).length,
      isWorkflowComplete: state.workflowStatus === WorkflowStatus.PROPOSAL_READY,
      canSendMessage: !state.isLoading && !state.isSending && state.inputValue.trim().length > 0,
    }),
    [
      state.messages.length,
      state.rfqFlights,
      state.selectedFlightIds.length,
      state.workflowStatus,
      state.isLoading,
      state.isSending,
      state.inputValue,
    ]
  );

  return {
    state,
    dispatch,
    actions,
    computed,
  };
}

export type UseChatStateReturn = ReturnType<typeof useChatState>;
