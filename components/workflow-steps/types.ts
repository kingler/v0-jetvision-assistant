/**
 * Workflow Step Types
 *
 * Shared type definitions for all workflow step components.
 * These components can be rendered independently by the Jetvision agent
 * via the MessageRenderer discriminated union system.
 */

/**
 * Status for workflow steps
 */
export type WorkflowStepStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

/**
 * Base interface for all workflow step components
 */
export interface BaseWorkflowStepProps {
  /** Current status of the step */
  status: WorkflowStepStatus;
  /** Whether the step details are expanded */
  isExpanded?: boolean;
  /** Callback when expand/collapse is toggled */
  onToggleExpand?: () => void;
  /** Whether to render in compact embedded mode */
  embedded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for CreatingTripStep component
 */
export interface CreatingTripStepProps extends BaseWorkflowStepProps {
  /** Avinode Trip ID once created */
  tripId?: string;
  /** Number of operators queried */
  operatorsQueried?: number;
  /** Number of potential aircraft found */
  aircraftFound?: number;
}

/**
 * Props for AwaitingSelectionStep component
 */
export interface AwaitingSelectionStepProps extends BaseWorkflowStepProps {
  /** Avinode Trip ID */
  tripId?: string;
  /** Deep link URL to Avinode marketplace */
  deepLink?: string;
  /** RFQ ID from Avinode */
  rfqId?: string;
  /** Number of quotes received so far */
  quotesReceived?: number;
  /** Callback when deep link is clicked */
  onDeepLinkClick?: () => void;
}

/**
 * Quote summary for display in receiving quotes step
 */
export interface QuoteSummary {
  operatorName: string;
  price: number;
  currency: string;
  aircraftType?: string;
}

/**
 * Props for ReceivingQuotesStep component
 */
export interface ReceivingQuotesStepProps extends BaseWorkflowStepProps {
  /** Total quotes received */
  quotesReceived?: number;
  /** Number of quotes analyzed */
  quotesAnalyzed?: number;
  /** Summary of top quotes */
  quotes?: QuoteSummary[];
}

/**
 * Props for GenerateProposalStep component
 */
export interface GenerateProposalStepProps extends BaseWorkflowStepProps {
  /** Whether proposal has been generated */
  proposalGenerated?: boolean;
  /** Generated proposal ID */
  proposalId?: string;
  /** Whether margin has been applied */
  marginApplied?: boolean;
  /** Callback when view proposal is clicked */
  onViewProposal?: (proposalId: string) => void;
}
