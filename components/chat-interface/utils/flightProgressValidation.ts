/**
 * Flight Progress Validation Utilities
 *
 * Utilities for validating when to show FlightSearchProgress component
 * and calculating current workflow steps.
 *
 * @module components/chat-interface/utils/flightProgressValidation
 */

import type { ChatSession } from '@/components/chat-sidebar';

/**
 * Determine if FlightSearchProgress should be shown.
 * Only show when trip is successfully created AND we have valid display data.
 *
 * @param chat - The current chat session
 * @returns Whether to show the flight search progress component
 *
 * @example
 * ```tsx
 * const showProgress = shouldShowFlightProgress(activeChat);
 * {showProgress && <FlightSearchProgress {...props} />}
 * ```
 */
export function shouldShowFlightProgress(chat: ChatSession): boolean {
  return (
    hasTripCreated(chat) &&
    hasValidRoute(chat) &&
    hasValidDate(chat) &&
    hasValidPassengers(chat)
  );
}

/**
 * Check if a trip has been created in Avinode.
 *
 * @param chat - The current chat session
 * @returns Whether a trip has been created
 */
function hasTripCreated(chat: ChatSession): boolean {
  return !!(chat.tripId || chat.deepLink || chat.requestId);
}

/**
 * Check if the chat has a valid route (departure → arrival).
 *
 * @param chat - The current chat session
 * @returns Whether the route is valid
 */
function hasValidRoute(chat: ChatSession): boolean {
  return (
    !!chat.route &&
    chat.route !== 'Select route' &&
    chat.route !== 'TBD' &&
    chat.route.trim().length > 0 &&
    chat.route.includes('→')
  );
}

/**
 * Check if the chat has a valid departure date.
 *
 * @param chat - The current chat session
 * @returns Whether the date is valid
 */
function hasValidDate(chat: ChatSession): boolean {
  return (
    !!chat.date &&
    chat.date !== 'Select date' &&
    chat.date !== 'Date TBD' &&
    chat.date !== 'TBD' &&
    chat.date.trim().length > 0
  );
}

/**
 * Check if the chat has a valid passenger count.
 *
 * @param chat - The current chat session
 * @returns Whether the passenger count is valid
 */
function hasValidPassengers(chat: ChatSession): boolean {
  return (chat.passengers ?? 0) > 0;
}

/**
 * Calculate the current workflow step based on chat state and RFQ data.
 *
 * Workflow Steps:
 * 1. Request created (default)
 * 2. Deep link available (ready to select in Avinode)
 * 3. Trip ID entered, waiting for RFQs
 * 4. RFQs received and ready for review
 *
 * @param chat - The current chat session
 * @param rfqFlightsCount - Number of RFQ flights received
 * @param tripIdSubmitted - Whether trip ID has been submitted
 * @returns The current workflow step (1-4)
 *
 * @example
 * ```tsx
 * const step = calculateCurrentStep(activeChat, rfqFlights.length, true);
 * // Returns 4 if RFQs are loaded, 3 if waiting, 2 if deep link, 1 otherwise
 * ```
 */
export function calculateCurrentStep(
  chat: ChatSession,
  rfqFlightsCount: number,
  tripIdSubmitted: boolean
): number {
  // Step 4: If we have RFQ flights and tripId is submitted
  if (rfqFlightsCount > 0 && tripIdSubmitted) {
    return 4;
  }

  // Step 3: If we have tripId and RFQs are not loaded yet
  if (chat.tripId && rfqFlightsCount === 0) {
    return 3;
  }

  // Step 2: If we have deepLink (request created, ready to select in Avinode)
  if (chat.deepLink) {
    return 2;
  }

  // Step 1: Default (request created)
  return chat.currentStep || 1;
}

/**
 * Get human-readable label for a workflow step.
 *
 * @param step - The workflow step number (1-4)
 * @returns Human-readable step label
 */
export function getStepLabel(step: number): string {
  switch (step) {
    case 1:
      return 'Request Created';
    case 2:
      return 'Select Operators';
    case 3:
      return 'Awaiting Quotes';
    case 4:
      return 'Review Quotes';
    default:
      return 'Unknown Step';
  }
}

/**
 * Check if the workflow is complete (has received quotes).
 *
 * @param step - The current workflow step
 * @returns Whether the workflow has reached the quotes stage
 */
export function isWorkflowAtQuotesStage(step: number): boolean {
  return step >= 4;
}

/**
 * Check if user action is required at the current step.
 *
 * @param step - The current workflow step
 * @returns Whether user action is required
 */
export function isUserActionRequired(step: number): boolean {
  // User action is required at step 2 (select operators) and step 4 (review quotes)
  return step === 2 || step === 4;
}
