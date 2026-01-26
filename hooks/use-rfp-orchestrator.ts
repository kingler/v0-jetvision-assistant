/**
 * useRFPOrchestrator Hook
 *
 * Combines RFQ flow with OrchestratorAgent execution.
 * Handles the complete workflow from data collection to agent coordination.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRFPFlow, useRFPFlowPersistence } from './use-rfp-flow';
import type { UseRFPFlowReturn } from './use-rfp-flow';
import {
  getRFPOrchestratorService,
  RFPWorkflowStatus,
  type RFPWorkflowState,
} from '@/lib/services/rfp-orchestrator-service';
// Import AgentResult from the service's local type since it's a stub
// The service returns a simplified AgentResult without the message field
type AgentResult = {
  success: boolean;
  error?: Error;
  message?: string;
  data?: unknown;
};

export interface UseRFPOrchestratorOptions {
  sessionId: string;
  userId: string;
  autoStart?: boolean;
  onWorkflowComplete?: (result: AgentResult) => void;
  onWorkflowError?: (error: Error) => void;
  onStatusChange?: (status: RFPWorkflowStatus) => void;
}

export interface UseRFPOrchestratorReturn {
  // RFQ Flow
  rfpFlow: UseRFPFlowReturn;

  // Workflow State
  workflowState: RFPWorkflowState | undefined;
  isExecuting: boolean;

  // Actions
  startWorkflow: () => void;
  executeOrchestrator: () => Promise<void>;
  reset: () => void;

  // Status
  canExecute: boolean;
  error: Error | undefined;
}

/**
 * Hook for managing RFQ flow and orchestrator execution
 */
export function useRFPOrchestrator(
  options: UseRFPOrchestratorOptions
): UseRFPOrchestratorReturn {
  const { sessionId, userId, autoStart = false, onWorkflowComplete, onWorkflowError, onStatusChange } = options;

  // Initialize RFQ flow
  const rfpFlow = useRFPFlow(autoStart);
  useRFPFlowPersistence(sessionId, rfpFlow);

  // Service instance
  const [service] = useState(() => getRFPOrchestratorService());

  // Workflow state
  const [workflowState, setWorkflowState] = useState<RFPWorkflowState | undefined>();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  // Start workflow
  const startWorkflow = useCallback(() => {
    const workflow = service.startWorkflow(sessionId);
    setWorkflowState(workflow);
    rfpFlow.activate();
  }, [sessionId, service, rfpFlow]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && !workflowState) {
      startWorkflow();
    }
  }, [autoStart, workflowState, startWorkflow]);

  // Execute orchestrator when RFQ is complete
  const executeOrchestrator = useCallback(async () => {
    if (!rfpFlow.state.isComplete) {
      throw new Error('RFQ flow is not complete');
    }

    setIsExecuting(true);
    setError(undefined);

    try {
      // Export RFQ data
      const rfpData = rfpFlow.exportData();

      // Execute orchestrator
      const result = await service.executeWithRFPData(sessionId, userId, rfpData);

      // Update workflow state
      const updatedWorkflow = service.getWorkflow(sessionId);
      setWorkflowState(updatedWorkflow);

      // Notify completion
      if (result.success && onWorkflowComplete) {
        onWorkflowComplete(result);
      } else if (!result.success && result.error && onWorkflowError) {
        onWorkflowError(result.error);
        setError(result.error);
      }

      // Deactivate RFQ flow
      rfpFlow.deactivate();
    } catch (err) {
      const error = err as Error;
      setError(error);

      if (onWorkflowError) {
        onWorkflowError(error);
      }

      // Update workflow state
      const updatedWorkflow = service.getWorkflow(sessionId);
      setWorkflowState(updatedWorkflow);
    } finally {
      setIsExecuting(false);
    }
  }, [rfpFlow, service, sessionId, userId, onWorkflowComplete, onWorkflowError]);

  // Auto-execute when RFQ is complete
  useEffect(() => {
    if (rfpFlow.state.isComplete && rfpFlow.state.isActive && !isExecuting && !workflowState?.agentResult) {
      executeOrchestrator();
    }
  }, [rfpFlow.state.isComplete, rfpFlow.state.isActive, isExecuting, workflowState, executeOrchestrator]);

  // Monitor workflow status changes
  useEffect(() => {
    if (workflowState?.status && onStatusChange) {
      onStatusChange(workflowState.status);
    }
  }, [workflowState?.status, onStatusChange]);

  // Reset workflow
  const reset = useCallback(() => {
    rfpFlow.reset();
    service.clearWorkflow(sessionId);
    setWorkflowState(undefined);
    setIsExecuting(false);
    setError(undefined);
  }, [rfpFlow, service, sessionId]);

  // Can execute if RFQ is complete and not already executing
  const canExecute = rfpFlow.state.isComplete && !isExecuting;

  return {
    rfpFlow,
    workflowState,
    isExecuting,
    startWorkflow,
    executeOrchestrator,
    reset,
    canExecute,
    error,
  };
}

/**
 * Hook for monitoring workflow status updates
 * Useful for displaying live status in UI
 */
export function useWorkflowStatusMonitor(sessionId: string) {
  const service = getRFPOrchestratorService();
  const [workflowState, setWorkflowState] = useState<RFPWorkflowState | undefined>();

  useEffect(() => {
    // Poll for workflow updates every 2 seconds
    const interval = setInterval(() => {
      const workflow = service.getWorkflow(sessionId);
      setWorkflowState(workflow);
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, service]);

  return workflowState;
}

/**
 * Get human-readable status message
 */
export function getStatusMessage(status: RFPWorkflowStatus): string {
  switch (status) {
    case RFPWorkflowStatus.COLLECTING:
      return 'Collecting RFQ information...';
    case RFPWorkflowStatus.VALIDATING:
      return 'Validating RFQ data...';
    case RFPWorkflowStatus.PROCESSING:
      return 'Processing RFQ with OrchestratorAgent...';
    case RFPWorkflowStatus.SEARCHING:
      return 'Searching for available flights...';
    case RFPWorkflowStatus.AWAITING_QUOTES:
      return 'Awaiting quotes from operators...';
    case RFPWorkflowStatus.ANALYZING:
      return 'Analyzing proposals...';
    case RFPWorkflowStatus.GENERATING:
      return 'Generating proposal email...';
    case RFPWorkflowStatus.COMPLETE:
      return 'Workflow complete!';
    case RFPWorkflowStatus.FAILED:
      return 'Workflow failed';
    default:
      return 'Unknown status';
  }
}
