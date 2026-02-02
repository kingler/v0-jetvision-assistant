/**
 * Chat Interface Utilities
 *
 * Utility functions for the chat interface components.
 */

export {
  shouldShowFlightProgress,
  calculateCurrentStep,
  getStepLabel,
  isWorkflowAtQuotesStage,
  isUserActionRequired,
} from './flightProgressValidation';

export {
  unifyMessages,
  filterByType,
  getProposalConfirmations,
  getRegularMessages,
  separateProposalConfirmations,
  getMostRecentByType,
  hasUnreadOperatorMessages,
  countByType,
} from './messageTransformers';
