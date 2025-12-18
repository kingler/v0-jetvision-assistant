/**
 * Conversation State Manager Tests
 *
 * Tests for conversation state persistence and management.
 * Tests cover state creation, retrieval, updates, field tracking, and cleanup.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConversationStateManager } from '@/lib/conversation/state-manager';
import type { ConversationState, RFPData } from '@/lib/conversation/state-manager';
import { supabase } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('ConversationStateManager', () => {
  let stateManager: ConversationStateManager;
  const mockThreadId = 'thread-123';
  const mockUserId = 'user-456';

  // Mock data
  const mockRFPData: RFPData = {
    departure: 'JFK',
    arrival: 'LAX',
    departureDate: '2025-12-25',
    passengers: 5,
  };

  const mockConversationState: ConversationState = {
    threadId: mockThreadId,
    userId: mockUserId,
    currentStep: 'route',
    data: mockRFPData,
    completedFields: ['departure', 'arrival'],
    missingFields: ['departureDate', 'passengers'],
    history: [],
    conversationHistory: [
      {
        role: 'user',
        content: 'I need a flight from JFK to LAX',
        timestamp: new Date('2025-12-13T10:00:00Z'),
      },
      {
        role: 'assistant',
        content: 'Great! When would you like to depart?',
        timestamp: new Date('2025-12-13T10:00:05Z'),
      },
    ],
    metadata: {},
    createdAt: new Date('2025-12-13T10:00:00Z'),
    updatedAt: new Date('2025-12-13T10:00:05Z'),
  };

  // Database row format (snake_case)
  const mockDatabaseRow = {
    id: 'row-id-123',
    thread_id: mockThreadId,
    user_id: mockUserId,
    current_step: 'route',
    data: mockRFPData,
    completed_fields: ['departure', 'arrival'],
    missing_fields: ['departureDate', 'passengers'],
    history: [],
    conversation_history: [
      {
        role: 'user',
        content: 'I need a flight from JFK to LAX',
        timestamp: '2025-12-13T10:00:00.000Z',
      },
      {
        role: 'assistant',
        content: 'Great! When would you like to depart?',
        timestamp: '2025-12-13T10:00:05.000Z',
      },
    ],
    metadata: {},
    created_at: '2025-12-13T10:00:00.000Z',
    updated_at: '2025-12-13T10:00:05.000Z',
  };

  beforeEach(() => {
    stateManager = new ConversationStateManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createState', () => {
    it('should create a new conversation state', async () => {
      const mockSupabaseResponse = {
        data: mockDatabaseRow,
        error: null,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      (supabase.from as any) = mockFrom;

      const result = await stateManager.createState({
        threadId: mockThreadId,
        userId: mockUserId,
        currentStep: 'route',
        data: {},
      });

      expect(mockFrom).toHaveBeenCalledWith('conversation_state');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          thread_id: mockThreadId,
          user_id: mockUserId,
          current_step: 'route',
          data: {},
          completed_fields: [],
          missing_fields: [],
          history: [],
          conversation_history: [],
          metadata: {},
        })
      );
      expect(result).toEqual(mockConversationState);
    });

    it('should throw error if creation fails', async () => {
      const mockError = { message: 'Database error', code: '23505' };
      const mockSupabaseResponse = {
        data: null,
        error: mockError,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockSupabaseResponse),
        }),
      });

      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      (supabase.from as any) = mockFrom;

      await expect(
        stateManager.createState({
          threadId: mockThreadId,
          userId: mockUserId,
          currentStep: 'route',
          data: {},
        })
      ).rejects.toThrow('Failed to create conversation state');
    });
  });

  describe('getState', () => {
    it('should retrieve conversation state by threadId', async () => {
      const mockSupabaseResponse = {
        data: mockDatabaseRow,
        error: null,
      };

      const mockEq = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(mockSupabaseResponse),
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as any) = mockFrom;

      const result = await stateManager.getState(mockThreadId);

      expect(mockFrom).toHaveBeenCalledWith('conversation_state');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('thread_id', mockThreadId);
      expect(result).toEqual(mockConversationState);
    });

    it('should return null if state not found', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      };

      const mockEq = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(mockSupabaseResponse),
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as any) = mockFrom;

      const result = await stateManager.getState('nonexistent-thread');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      const mockError = { message: 'Connection error', code: '08006' };
      const mockSupabaseResponse = {
        data: null,
        error: mockError,
      };

      const mockEq = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(mockSupabaseResponse),
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as any) = mockFrom;

      await expect(stateManager.getState(mockThreadId)).rejects.toThrow(
        'Failed to retrieve conversation state'
      );
    });
  });

  describe('updateState', () => {
    it('should update conversation state with partial data', async () => {
      const updates = {
        currentStep: 'date' as const,
        data: { ...mockRFPData, departureDate: '2025-12-25' },
      };

      const updatedRow = {
        ...mockDatabaseRow,
        current_step: 'date',
        updated_at: new Date().toISOString(),
      };

      const mockSupabaseResponse = {
        data: updatedRow,
        error: null,
      };

      const mockSingle = vi.fn().mockResolvedValue(mockSupabaseResponse);

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      (supabase.from as any) = mockFrom;

      const result = await stateManager.updateState(mockThreadId, updates);

      expect(mockFrom).toHaveBeenCalledWith('conversation_state');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          current_step: 'date',
          data: updates.data,
        })
      );
      expect(mockEq).toHaveBeenCalledWith('thread_id', mockThreadId);
      expect(result.currentStep).toBe('date');
    });

    it('should throw error if update fails', async () => {
      const mockError = { message: 'Update failed', code: '23503' };
      const mockSupabaseResponse = {
        data: null,
        error: mockError,
      };

      const mockSingle = vi.fn().mockResolvedValue(mockSupabaseResponse);

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      (supabase.from as any) = mockFrom;

      await expect(
        stateManager.updateState(mockThreadId, { currentStep: 'date' })
      ).rejects.toThrow('Failed to update conversation state');
    });
  });

  describe('trackFieldCompletion', () => {
    it('should update completed and missing fields', async () => {
      const completedFields = ['departure', 'arrival', 'departureDate'];
      const missingFields = ['passengers'];

      const updatedRow = {
        ...mockDatabaseRow,
        completed_fields: completedFields,
        missing_fields: missingFields,
      };

      const mockSupabaseResponse = {
        data: updatedRow,
        error: null,
      };

      const mockSingle = vi.fn().mockResolvedValue(mockSupabaseResponse);

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockEq = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      });

      (supabase.from as any) = mockFrom;

      const result = await stateManager.trackFieldCompletion(
        mockThreadId,
        completedFields,
        missingFields
      );

      expect(mockUpdate).toHaveBeenCalledWith({
        completed_fields: completedFields,
        missing_fields: missingFields,
      });
      expect(result.completedFields).toEqual(completedFields);
      expect(result.missingFields).toEqual(missingFields);
    });
  });

  describe('addConversationMessage', () => {
    it('should append message to conversation history', async () => {
      const newMessage = {
        role: 'user' as const,
        content: 'December 25th',
        timestamp: new Date('2025-12-13T10:01:00Z'),
      };

      // First call to getState
      const getStateResponse = {
        data: mockDatabaseRow,
        error: null,
      };

      const updatedHistory = [
        ...mockDatabaseRow.conversation_history,
        {
          role: 'user',
          content: 'December 25th',
          timestamp: '2025-12-13T10:01:00.000Z',
        },
      ];

      const updatedRow = {
        ...mockDatabaseRow,
        conversation_history: updatedHistory,
      };

      // Second call to update
      const updateResponse = {
        data: updatedRow,
        error: null,
      };

      // Mock getState call
      const mockGetSingle = vi.fn().mockResolvedValue(getStateResponse);
      const mockGetEq = vi.fn().mockReturnValue({
        single: mockGetSingle,
      });
      const mockGetSelect = vi.fn().mockReturnValue({
        eq: mockGetEq,
      });

      // Mock update call
      const mockUpdateSingle = vi.fn().mockResolvedValue(updateResponse);
      const mockUpdateSelect = vi.fn().mockReturnValue({
        single: mockUpdateSingle,
      });
      const mockUpdateEq = vi.fn().mockReturnValue({
        select: mockUpdateSelect,
      });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });

      const mockFrom = vi.fn()
        .mockReturnValueOnce({
          select: mockGetSelect,
        })
        .mockReturnValueOnce({
          update: mockUpdate,
        });

      (supabase.from as any) = mockFrom;

      const result = await stateManager.addConversationMessage(
        mockThreadId,
        newMessage.role,
        newMessage.content
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation_history: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'December 25th',
            }),
          ]),
        })
      );
      expect(result?.conversationHistory.length).toBe(3);
    });

    it('should handle state not found', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      };

      const mockEq = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(mockSupabaseResponse),
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as any) = mockFrom;

      const result = await stateManager.addConversationMessage(
        'nonexistent-thread',
        'user',
        'test'
      );

      expect(result).toBeNull();
    });
  });

  describe('cleanupOldStates', () => {
    it('should delete states older than specified days', async () => {
      const deletedCount = 5;
      const daysOld = 30;

      const mockSupabaseResponse = {
        data: null,
        error: null,
        count: deletedCount,
      };

      const mockLt = vi.fn().mockResolvedValue(mockSupabaseResponse);

      const mockDelete = vi.fn().mockReturnValue({
        lt: mockLt,
      });

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      });

      (supabase.from as any) = mockFrom;

      const result = await stateManager.cleanupOldStates(daysOld);

      expect(mockFrom).toHaveBeenCalledWith('conversation_state');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockLt).toHaveBeenCalledWith(
        'updated_at',
        expect.any(String) // ISO date string
      );
      expect(result).toBe(deletedCount);
    });

    it('should use default 30 days if not specified', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: null,
        count: 0,
      };

      const mockLt = vi.fn().mockResolvedValue(mockSupabaseResponse);

      const mockDelete = vi.fn().mockReturnValue({
        lt: mockLt,
      });

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      });

      (supabase.from as any) = mockFrom;

      await stateManager.cleanupOldStates();

      expect(mockLt).toHaveBeenCalled();
    });

    it('should throw error on cleanup failure', async () => {
      const mockError = { message: 'Delete failed', code: '42501' };
      const mockSupabaseResponse = {
        data: null,
        error: mockError,
        count: null,
      };

      const mockLt = vi.fn().mockResolvedValue(mockSupabaseResponse);

      const mockDelete = vi.fn().mockReturnValue({
        lt: mockLt,
      });

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      });

      (supabase.from as any) = mockFrom;

      await expect(stateManager.cleanupOldStates()).rejects.toThrow(
        'Failed to cleanup old conversation states'
      );
    });
  });

  describe('getStatesByUserId', () => {
    it('should retrieve all states for a user', async () => {
      const userStates = [
        mockDatabaseRow,
        { ...mockDatabaseRow, thread_id: 'thread-789' },
      ];

      const mockSupabaseResponse = {
        data: userStates,
        error: null,
      };

      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseResponse);

      const mockEq = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as any) = mockFrom;

      const result = await stateManager.getStatesByUserId(mockUserId);

      expect(mockFrom).toHaveBeenCalledWith('conversation_state');
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockOrder).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(result).toHaveLength(2);
      expect(result[0].threadId).toBe(mockThreadId);
      expect(result[1].threadId).toBe('thread-789');
    });

    it('should return empty array if no states found', async () => {
      const mockSupabaseResponse = {
        data: [],
        error: null,
      };

      const mockOrder = vi.fn().mockResolvedValue(mockSupabaseResponse);

      const mockEq = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      (supabase.from as any) = mockFrom;

      const result = await stateManager.getStatesByUserId('user-nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('deleteState', () => {
    it('should delete a conversation state by threadId', async () => {
      const mockSupabaseResponse = {
        data: null,
        error: null,
      };

      const mockEq = vi.fn().mockResolvedValue(mockSupabaseResponse);

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      });

      (supabase.from as any) = mockFrom;

      await stateManager.deleteState(mockThreadId);

      expect(mockFrom).toHaveBeenCalledWith('conversation_state');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('thread_id', mockThreadId);
    });

    it('should throw error if deletion fails', async () => {
      const mockError = { message: 'Delete failed', code: '42501' };
      const mockSupabaseResponse = {
        data: null,
        error: mockError,
      };

      const mockEq = vi.fn().mockResolvedValue(mockSupabaseResponse);

      const mockDelete = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      const mockFrom = vi.fn().mockReturnValue({
        delete: mockDelete,
      });

      (supabase.from as any) = mockFrom;

      await expect(stateManager.deleteState(mockThreadId)).rejects.toThrow(
        'Failed to delete conversation state'
      );
    });
  });
});
