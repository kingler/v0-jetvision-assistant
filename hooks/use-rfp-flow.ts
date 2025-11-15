/**
 * useRFPFlow Hook
 *
 * React hook for managing conversational RFP gathering flow in the chat interface.
 * Integrates RFPFlow, IntentExtractor, and FieldValidator with React state management.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { RFPFlow } from '@/lib/conversation/rfp-flow';
import type { RFPData, ProcessResult } from '@/lib/conversation/rfp-flow';

export interface RFPFlowState {
  flow: RFPFlow;
  isActive: boolean;
  isComplete: boolean;
  currentQuestion: string;
  data: RFPData;
  missingFields: string[];
  completedFields: string[];
}

export interface UseRFPFlowReturn {
  state: RFPFlowState;
  processInput: (input: string) => ProcessResult;
  goBack: () => void;
  reset: () => void;
  activate: () => void;
  deactivate: () => void;
  exportData: () => RFPData;
  serialize: () => string;
  restore: (serialized: string) => void;
}

/**
 * Hook for managing RFP conversational flow
 */
export function useRFPFlow(autoActivate = false): UseRFPFlowReturn {
  const flowRef = useRef<RFPFlow>(new RFPFlow());
  const [isActive, setIsActive] = useState(autoActivate);
  const [, forceUpdate] = useState({});

  // Force re-render when flow state changes
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // Initialize flow on mount
  useEffect(() => {
    flowRef.current = new RFPFlow();
    triggerUpdate();
  }, [triggerUpdate]);

  // Get current state from flow
  const getState = useCallback((): RFPFlowState => {
    const flow = flowRef.current;
    return {
      flow,
      isActive,
      isComplete: flow.isComplete(),
      currentQuestion: flow.getCurrentQuestion(),
      data: flow.getData(),
      missingFields: flow.getMissingFields(),
      completedFields: flow.getCompletedFields(),
    };
  }, [isActive]);

  // Process user input
  const processInput = useCallback((input: string): ProcessResult => {
    const result = flowRef.current.processInput(input);
    triggerUpdate();
    return result;
  }, [triggerUpdate]);

  // Go back to previous step
  const goBack = useCallback(() => {
    flowRef.current.goBack();
    triggerUpdate();
  }, [triggerUpdate]);

  // Reset flow to initial state
  const reset = useCallback(() => {
    flowRef.current = new RFPFlow();
    setIsActive(false);
    triggerUpdate();
  }, [triggerUpdate]);

  // Activate conversational mode
  const activate = useCallback(() => {
    setIsActive(true);
  }, []);

  // Deactivate conversational mode
  const deactivate = useCallback(() => {
    setIsActive(false);
  }, []);

  // Export RFP data
  const exportData = useCallback((): RFPData => {
    return flowRef.current.exportRFPData();
  }, []);

  // Serialize flow state
  const serialize = useCallback((): string => {
    return flowRef.current.serialize();
  }, []);

  // Restore flow from serialized state
  const restore = useCallback((serialized: string) => {
    flowRef.current = RFPFlow.deserialize(serialized);
    triggerUpdate();
  }, [triggerUpdate]);

  return {
    state: getState(),
    processInput,
    goBack,
    reset,
    activate,
    deactivate,
    exportData,
    serialize,
    restore,
  };
}

/**
 * Hook for persisting RFP flow state to session storage
 */
export function useRFPFlowPersistence(
  sessionId: string,
  rfpFlow: UseRFPFlowReturn
) {
  const storageKey = `rfp-flow-${sessionId}`;

  // Load from storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        rfpFlow.restore(stored);
      } catch (error) {
        console.error('Failed to restore RFP flow from storage:', error);
        sessionStorage.removeItem(storageKey);
      }
    }
  }, [sessionId, storageKey]); // Only run on mount

  // Save to storage whenever state changes
  useEffect(() => {
    if (rfpFlow.state.isActive || rfpFlow.state.completedFields.length > 0) {
      try {
        const serialized = rfpFlow.serialize();
        sessionStorage.setItem(storageKey, serialized);
      } catch (error) {
        console.error('Failed to save RFP flow to storage:', error);
      }
    }
  }, [rfpFlow.state.data, rfpFlow.state.isComplete, storageKey]);

  // Clear storage when reset
  useEffect(() => {
    if (!rfpFlow.state.isActive && rfpFlow.state.completedFields.length === 0) {
      sessionStorage.removeItem(storageKey);
    }
  }, [rfpFlow.state.isActive, rfpFlow.state.completedFields, storageKey]);
}
