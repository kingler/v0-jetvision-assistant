/**
 * Shared TypeScript interfaces for Avinode workflow UI components
 */

// Airport information
export interface AirportInfo {
  icao: string; // e.g., "KTEB"
  name: string; // e.g., "Teterboro"
  city: string; // e.g., "NJ"
}

// Buyer information
export interface BuyerInfo {
  company: string; // e.g., "Jetvision LLC"
  contact: string; // e.g., "Kingler Bercy"
}

// Operator information
export interface OperatorInfo {
  name: string; // e.g., "Prime Jet, LLC"
  rating?: number; // e.g., 4.8
}

// Aircraft information
export interface AircraftInfo {
  type: string; // e.g., "Gulfstream G-IV"
  tail: string; // e.g., "N144PK"
  category: string; // e.g., "Heavy Jet"
  maxPassengers: number; // e.g., 13
}

// Price information
export interface PriceInfo {
  amount: number; // e.g., 37036.32
  currency: string; // e.g., "USD"
}

// Flight details
export interface FlightDetailsInfo {
  flightTimeMinutes: number; // e.g., 334
  distanceNm: number; // e.g., 2128
}

// Link information for deep links
export interface LinkInfo {
  href: string;
  description: string;
}

// Trip status
export type TripStatus = 'active' | 'pending' | 'completed' | 'cancelled';

// Quote status
export type QuoteStatus =
  | 'unanswered'
  | 'quoted'
  | 'accepted'
  | 'declined'
  | 'expired';

// Message type
export type MessageType = 'REQUEST' | 'RESPONSE' | 'INFO' | 'CONFIRMATION';

// Authentication method
export type AuthMethod = 'bearer' | 'api_key';

// Environment type
export type EnvironmentType = 'sandbox' | 'production';

// Quick action for sidebar
export interface QuickAction {
  label: string;
  onClick: () => void;
}

// Quote information for sidebar
export interface QuoteInfo {
  price: PriceInfo;
  operator: string;
  aircraft: string;
}

// Deep link prompt props
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
  onLinkClick?: () => void;
  onCopyLink?: () => void;
}
