/**
 * Unit tests for useChatState reducer hook
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  chatReducer,
  initialChatState,
  useChatState,
  type ChatState,
  type ChatAction,
} from '@/lib/chat/hooks/use-chat-state';
import { WorkflowStatus, RFQStatus } from '@/lib/chat/constants';

describe('chatReducer', () => {
  describe('Message Actions', () => {
    it('should add a message', () => {
      const message = {
        id: 'msg1',
        type: 'user' as const,
        content: 'Hello',
        timestamp: new Date(),
      };

      const newState = chatReducer(initialChatState, {
        type: 'ADD_MESSAGE',
        payload: message,
      });

      expect(newState.messages).toHaveLength(1);
      expect(newState.messages[0].id).toBe('msg1');
      expect(newState.scrollToBottom).toBe(true);
    });

    it('should update a message', () => {
      const state: ChatState = {
        ...initialChatState,
        messages: [
          { id: 'msg1', type: 'agent', content: 'Initial', timestamp: new Date() },
        ],
      };

      const newState = chatReducer(state, {
        type: 'UPDATE_MESSAGE',
        payload: { id: 'msg1', updates: { content: 'Updated' } },
      });

      expect(newState.messages[0].content).toBe('Updated');
    });

    it('should clear messages', () => {
      const state: ChatState = {
        ...initialChatState,
        messages: [
          { id: 'msg1', type: 'user', content: 'Hello', timestamp: new Date() },
        ],
        conversationHistory: [{ role: 'user', content: 'Hello' }],
      };

      const newState = chatReducer(state, { type: 'CLEAR_MESSAGES' });

      expect(newState.messages).toHaveLength(0);
      expect(newState.conversationHistory).toHaveLength(0);
    });
  });

  describe('Input Actions', () => {
    it('should set input value', () => {
      const newState = chatReducer(initialChatState, {
        type: 'SET_INPUT_VALUE',
        payload: 'Test input',
      });

      expect(newState.inputValue).toBe('Test input');
    });
  });

  describe('Loading State Actions', () => {
    it('should set loading state', () => {
      const newState = chatReducer(initialChatState, {
        type: 'SET_LOADING',
        payload: true,
      });

      expect(newState.isLoading).toBe(true);
    });

    it('should set polling state', () => {
      const newState = chatReducer(initialChatState, {
        type: 'SET_POLLING',
        payload: true,
      });

      expect(newState.isPolling).toBe(true);
    });

    it('should set sending state', () => {
      const newState = chatReducer(initialChatState, {
        type: 'SET_SENDING',
        payload: true,
      });

      expect(newState.isSending).toBe(true);
    });
  });

  describe('Workflow Actions', () => {
    it('should set workflow status', () => {
      const newState = chatReducer(initialChatState, {
        type: 'SET_WORKFLOW_STATUS',
        payload: { status: WorkflowStatus.SEARCHING_AIRCRAFT, step: 2 },
      });

      expect(newState.workflowStatus).toBe(WorkflowStatus.SEARCHING_AIRCRAFT);
      expect(newState.currentStep).toBe(2);
    });

    it('should show/hide workflow', () => {
      const newState = chatReducer(initialChatState, {
        type: 'SHOW_WORKFLOW',
        payload: true,
      });

      expect(newState.showWorkflow).toBe(true);
    });
  });

  describe('RFQ/Quote Actions', () => {
    const mockFlight = {
      id: 'f1',
      quoteId: 'q1',
      departureAirport: { icao: 'KTEB' },
      arrivalAirport: { icao: 'KVNY' },
      departureDate: '2024-01-15',
      flightDuration: '5h',
      aircraftType: 'Gulfstream',
      aircraftModel: 'Gulfstream G650',
      passengerCapacity: 12,
      operatorName: 'Test Operator',
      totalPrice: 50000,
      currency: 'USD',
      amenities: {
        wifi: true,
        pets: false,
        smoking: false,
        galley: true,
        lavatory: true,
        medical: false,
      },
      rfqStatus: RFQStatus.QUOTED,
      lastUpdated: new Date().toISOString(),
      isSelected: false,
      hasMedical: false,
      hasPackage: false,
    };

    it('should set RFQ flights', () => {
      const newState = chatReducer(initialChatState, {
        type: 'SET_RFQ_FLIGHTS',
        payload: [mockFlight],
      });

      expect(newState.rfqFlights).toHaveLength(1);
      expect(newState.rfqFlights[0].id).toBe('f1');
    });

    it('should toggle flight selection', () => {
      const state: ChatState = {
        ...initialChatState,
        rfqFlights: [mockFlight],
      };

      const newState = chatReducer(state, {
        type: 'TOGGLE_FLIGHT_SELECTION',
        payload: 'f1',
      });

      expect(newState.selectedFlightIds).toContain('f1');
      expect(newState.rfqFlights[0].isSelected).toBe(true);

      // Toggle again to deselect
      const newerState = chatReducer(newState, {
        type: 'TOGGLE_FLIGHT_SELECTION',
        payload: 'f1',
      });

      expect(newerState.selectedFlightIds).not.toContain('f1');
      expect(newerState.rfqFlights[0].isSelected).toBe(false);
    });

    it('should select all flights', () => {
      const state: ChatState = {
        ...initialChatState,
        rfqFlights: [mockFlight, { ...mockFlight, id: 'f2', quoteId: 'q2' }],
      };

      const newState = chatReducer(state, { type: 'SELECT_ALL_FLIGHTS' });

      expect(newState.selectedFlightIds).toHaveLength(2);
      expect(newState.rfqFlights.every((f) => f.isSelected)).toBe(true);
    });

    it('should deselect all flights', () => {
      const state: ChatState = {
        ...initialChatState,
        rfqFlights: [
          { ...mockFlight, isSelected: true },
          { ...mockFlight, id: 'f2', quoteId: 'q2', isSelected: true },
        ],
        selectedFlightIds: ['f1', 'f2'],
      };

      const newState = chatReducer(state, { type: 'DESELECT_ALL_FLIGHTS' });

      expect(newState.selectedFlightIds).toHaveLength(0);
      expect(newState.rfqFlights.every((f) => !f.isSelected)).toBe(true);
    });
  });

  describe('Error Actions', () => {
    it('should set error', () => {
      const newState = chatReducer(initialChatState, {
        type: 'SET_ERROR',
        payload: 'Something went wrong',
      });

      expect(newState.error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      const state: ChatState = {
        ...initialChatState,
        error: 'Previous error',
      };

      const newState = chatReducer(state, { type: 'CLEAR_ERROR' });

      expect(newState.error).toBeNull();
    });
  });

  describe('Streaming Actions', () => {
    it('should set streaming content', () => {
      const newState = chatReducer(initialChatState, {
        type: 'SET_STREAMING_CONTENT',
        payload: 'Hello',
      });

      expect(newState.streamingContent).toBe('Hello');
    });

    it('should append streaming content', () => {
      const state: ChatState = {
        ...initialChatState,
        streamingContent: 'Hello',
      };

      const newState = chatReducer(state, {
        type: 'APPEND_STREAMING_CONTENT',
        payload: ' World',
      });

      expect(newState.streamingContent).toBe('Hello World');
    });

    it('should clear streaming', () => {
      const state: ChatState = {
        ...initialChatState,
        isStreaming: true,
        streamingContent: 'Hello',
      };

      const newState = chatReducer(state, { type: 'CLEAR_STREAMING' });

      expect(newState.isStreaming).toBe(false);
      expect(newState.streamingContent).toBe('');
    });
  });

  describe('Batch Actions', () => {
    it('should reset for new message', () => {
      const state: ChatState = {
        ...initialChatState,
        inputValue: 'Previous input',
        error: 'Previous error',
        streamingContent: 'Previous stream',
        isStreaming: true,
        showWorkflow: false,
        workflowStatus: WorkflowStatus.PROPOSAL_READY,
        currentStep: 5,
      };

      const newState = chatReducer(state, { type: 'RESET_FOR_NEW_MESSAGE' });

      expect(newState.inputValue).toBe('');
      expect(newState.error).toBeNull();
      expect(newState.streamingContent).toBe('');
      expect(newState.isStreaming).toBe(false);
      expect(newState.showWorkflow).toBe(true);
      expect(newState.workflowStatus).toBe(WorkflowStatus.UNDERSTANDING_REQUEST);
      expect(newState.currentStep).toBe(1);
    });

    it('should reset all state', () => {
      const state: ChatState = {
        ...initialChatState,
        messages: [{ id: 'msg1', type: 'user', content: 'Hello', timestamp: new Date() }],
        inputValue: 'Test',
        isLoading: true,
        error: 'Error',
      };

      const newState = chatReducer(state, { type: 'RESET_ALL' });

      expect(newState).toEqual(initialChatState);
    });
  });
});

describe('useChatState hook', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useChatState());

    expect(result.current.state.messages).toHaveLength(0);
    expect(result.current.state.inputValue).toBe('');
    expect(result.current.state.isLoading).toBe(false);
  });

  it('should initialize with custom initial state', () => {
    const { result } = renderHook(() =>
      useChatState({ tripId: 'trip123', inputValue: 'Hello' })
    );

    expect(result.current.state.tripId).toBe('trip123');
    expect(result.current.state.inputValue).toBe('Hello');
  });

  it('should provide action creators', () => {
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.actions.setInputValue('Test input');
    });

    expect(result.current.state.inputValue).toBe('Test input');
  });

  it('should provide computed values', () => {
    const { result } = renderHook(() => useChatState());

    expect(result.current.computed.hasMessages).toBe(false);
    expect(result.current.computed.canSendMessage).toBe(false);

    act(() => {
      result.current.actions.setInputValue('Hello');
    });

    expect(result.current.computed.canSendMessage).toBe(true);
  });

  it('should compute selected flights count', () => {
    const { result } = renderHook(() => useChatState());

    act(() => {
      result.current.actions.setRFQFlights([
        {
          id: 'f1',
          quoteId: 'q1',
          departureAirport: { icao: 'KTEB' },
          arrivalAirport: { icao: 'KVNY' },
          departureDate: '2024-01-15',
          flightDuration: '5h',
          aircraftType: 'Gulfstream',
          aircraftModel: 'Gulfstream G650',
          passengerCapacity: 12,
          operatorName: 'Test',
          totalPrice: 50000,
          currency: 'USD',
          amenities: {
            wifi: false,
            pets: false,
            smoking: false,
            galley: false,
            lavatory: false,
            medical: false,
          },
          rfqStatus: RFQStatus.QUOTED,
          lastUpdated: new Date().toISOString(),
          isSelected: false,
          hasMedical: false,
          hasPackage: false,
        },
      ]);
    });

    expect(result.current.computed.hasRFQFlights).toBe(true);
    expect(result.current.computed.quotedFlightsCount).toBe(1);
    expect(result.current.computed.selectedFlightsCount).toBe(0);

    act(() => {
      result.current.actions.toggleFlightSelection('f1');
    });

    expect(result.current.computed.selectedFlightsCount).toBe(1);
  });
});
