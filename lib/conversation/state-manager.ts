/**
 * Conversation State Manager
 *
 * Manages persistent conversation state for RFQ flow using Supabase.
 * Handles state creation, retrieval, updates, field tracking, and cleanup.
 */

import { supabase } from '@/lib/supabase/client';
import type { RFPStep } from './rfp-flow';

/**
 * RFQ Data Interface
 * Matches the RFPData from rfq-flow.ts
 */
export interface RFPData {
  departure?: string;
  arrival?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  aircraftType?: string;
  budget?: number;
  specialRequirements?: string;
}

/**
 * Conversation Message
 * Represents a single message in the conversation history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * Conversation State
 * Complete state object for a conversation thread
 */
export interface ConversationState {
  threadId: string;
  userId: string;
  currentStep: RFPStep;
  data: RFPData;
  completedFields: string[];
  missingFields: string[];
  history: RFPStep[];
  conversationHistory: ConversationMessage[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database row format (snake_case for Supabase)
 */
interface ConversationStateRow {
  id?: string;
  thread_id: string;
  user_id: string;
  current_step: string;
  data: Record<string, any>;
  completed_fields: string[];
  missing_fields: string[];
  history: string[];
  conversation_history: any[];
  metadata: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Partial state update
 */
export interface StateUpdate {
  currentStep?: RFPStep;
  data?: RFPData;
  completedFields?: string[];
  missingFields?: string[];
  history?: RFPStep[];
  conversationHistory?: ConversationMessage[];
  metadata?: Record<string, any>;
}

/**
 * State creation parameters
 */
export interface CreateStateParams {
  threadId: string;
  userId: string;
  currentStep: RFPStep;
  data: RFPData;
  metadata?: Record<string, any>;
}

/**
 * ConversationStateManager
 *
 * Manages conversation state persistence using Supabase.
 * Provides methods for CRUD operations on conversation state.
 */
export class ConversationStateManager {
  /**
   * Create a new conversation state
   */
  async createState(params: CreateStateParams): Promise<ConversationState> {
    const row: ConversationStateRow = {
      thread_id: params.threadId,
      user_id: params.userId,
      current_step: params.currentStep,
      data: params.data,
      completed_fields: [],
      missing_fields: [],
      history: [],
      conversation_history: [],
      metadata: params.metadata || {},
    };

    const { data, error } = await supabase
      .from('conversation_state')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation state: ${error.message}`);
    }

    return this.rowToState(data);
  }

  /**
   * Retrieve conversation state by thread ID
   */
  async getState(threadId: string): Promise<ConversationState | null> {
    const { data, error } = await supabase
      .from('conversation_state')
      .select('*')
      .eq('thread_id', threadId)
      .single();

    // Not found is expected, return null
    if (error && error.code === 'PGRST116') {
      return null;
    }

    if (error) {
      throw new Error(`Failed to retrieve conversation state: ${error.message}`);
    }

    return this.rowToState(data);
  }

  /**
   * Update conversation state with partial data
   */
  async updateState(
    threadId: string,
    updates: StateUpdate
  ): Promise<ConversationState> {
    const updateRow: Partial<ConversationStateRow> = {};

    if (updates.currentStep !== undefined) {
      updateRow.current_step = updates.currentStep;
    }
    if (updates.data !== undefined) {
      updateRow.data = updates.data;
    }
    if (updates.completedFields !== undefined) {
      updateRow.completed_fields = updates.completedFields;
    }
    if (updates.missingFields !== undefined) {
      updateRow.missing_fields = updates.missingFields;
    }
    if (updates.history !== undefined) {
      updateRow.history = updates.history;
    }
    if (updates.conversationHistory !== undefined) {
      updateRow.conversation_history = updates.conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }));
    }
    if (updates.metadata !== undefined) {
      updateRow.metadata = updates.metadata;
    }

    const { data, error } = await supabase
      .from('conversation_state')
      .update(updateRow)
      .eq('thread_id', threadId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update conversation state: ${error.message}`);
    }

    return this.rowToState(data);
  }

  /**
   * Track field completion status
   */
  async trackFieldCompletion(
    threadId: string,
    completedFields: string[],
    missingFields: string[]
  ): Promise<ConversationState> {
    return this.updateState(threadId, {
      completedFields,
      missingFields,
    });
  }

  /**
   * Add a message to conversation history
   */
  async addConversationMessage(
    threadId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<ConversationState | null> {
    // First, get current state
    const currentState = await this.getState(threadId);

    if (!currentState) {
      return null;
    }

    // Append new message
    const newMessage: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
    };

    const updatedHistory = [
      ...currentState.conversationHistory,
      newMessage,
    ];

    // Update state with new history
    return this.updateState(threadId, {
      conversationHistory: updatedHistory,
    });
  }

  /**
   * Get all conversation states for a user
   */
  async getStatesByUserId(userId: string): Promise<ConversationState[]> {
    const { data, error } = await supabase
      .from('conversation_state')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to retrieve user conversation states: ${error.message}`);
    }

    return (data || []).map((row) => this.rowToState(row));
  }

  /**
   * Delete a conversation state
   */
  async deleteState(threadId: string): Promise<void> {
    const { error } = await supabase
      .from('conversation_state')
      .delete()
      .eq('thread_id', threadId);

    if (error) {
      throw new Error(`Failed to delete conversation state: ${error.message}`);
    }
  }

  /**
   * Cleanup old conversation states
   * @param daysOld - Delete states older than this many days (default: 30)
   */
  async cleanupOldStates(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error, count } = await supabase
      .from('conversation_state')
      .delete()
      .lt('updated_at', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to cleanup old conversation states: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Convert database row to ConversationState object
   */
  private rowToState(row: any): ConversationState {
    return {
      threadId: row.thread_id,
      userId: row.user_id,
      currentStep: row.current_step as RFPStep,
      data: row.data as RFPData,
      completedFields: row.completed_fields || [],
      missingFields: row.missing_fields || [],
      history: (row.history || []) as RFPStep[],
      conversationHistory: (row.conversation_history || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      })),
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
