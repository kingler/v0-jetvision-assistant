/**
 * Shared TypeScript interfaces for Avinode workflow UI components
 *
 * @deprecated Import core types from '@/lib/types/quotes' instead.
 * This file re-exports types for backwards compatibility and adds Avinode-specific props.
 */

// Re-export all common types from centralized location
export {
  type AirportInfo,
  type BuyerInfo,
  type QuoteOperator as OperatorInfo,
  type QuoteAircraft as AircraftInfo,
  type QuotePricing as PriceInfo,
  type FlightDetails as FlightDetailsInfo,
  type LinkInfo,
  type TripStatus,
  type QuoteStatus,
  type AvinodeMessageType as MessageType,
  type AuthMethod,
  type EnvironmentType,
  type QuickAction,
  type SidebarQuote as QuoteInfo,
  type WebhookStatus,
  type WorkflowStatus,
} from '@/lib/types/quotes';

// =============================================================================
// AVINODE-SPECIFIC COMPONENT PROPS
// These are UI-specific and stay in this file
// =============================================================================

/**
 * Deep link prompt props
 */
export interface DeepLinkPromptProps {
  departureAirport: {
    icao: string;
    name?: string;
    city?: string;
  };
  arrivalAirport: {
    icao: string;
    name?: string;
    city?: string;
  };
  departureDate: string; // ISO date format (YYYY-MM-DD)
  passengers: number;
  requestId: string;
  deepLink: string;
  /**
   * Auto-open the Avinode marketplace in a new tab when the component mounts
   * @default true
   */
  autoOpen?: boolean;
  onLinkClick?: () => void;
  onCopyLink?: () => void;
}

/**
 * Props for the TripIDInput component
 */
export interface TripIDInputProps {
  /**
   * Callback function invoked when a valid Trip ID is submitted
   */
  onSubmit: (tripId: string) => Promise<void>;
  /**
   * Loading state indicator
   */
  isLoading?: boolean;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Optional callback for cancel action
   */
  onCancel?: () => void;
  /**
   * Optional help text explaining where to find the Trip ID
   */
  helpText?: string;
}
