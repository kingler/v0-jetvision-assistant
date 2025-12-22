/**
 * Utility Functions Index
 * @module lib/utils
 */

// API utilities - Authentication
export {
  getAuthenticatedAgent,
  getAuthenticatedUser,
  isErrorResponse,
  type ISOAgent,
  type AuthResult,
  type AuthenticatedUser,
  type UserAuthResult,
  type ApiHandlerOptions,
} from './api';

// API utilities - Middleware
export {
  withErrorHandling,
  withAuth,
  compose,
} from './api';

// API utilities - Request parsing
export {
  parseJsonBody,
  validateRequiredFields,
  parseQueryParams,
} from './api';

// API utilities - Response helpers
export {
  ErrorResponses,
  SuccessResponses,
} from './api';

// Formatting utilities
export {
  formatCurrency,
  formatTime,
  formatDuration,
  formatTimeAgo,
  formatDate,
  formatNumber,
} from './format';
