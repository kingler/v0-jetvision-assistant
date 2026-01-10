/**
 * Avinode Webhook Types
 *
 * Types for handling Avinode webhook events
 * Docs: https://developer.avinodegroup.com/docs/getting-started-webhooks
 *
 * Key Events for JetVision:
 * - TripRequestSellerResponse: Operator submitted a quote
 * - TripChatSeller: Operator sent a message
 * - TripChatMine: Internal company message
 */

// ============================================================================
// Webhook Event Types
// ============================================================================

export type AvinodeWebhookEventType =
  | 'TripRequestSellerResponse'  // Operator quote received
  | 'TripChatSeller'             // Operator message received
  | 'TripChatMine'               // Internal (My Company) message
  | 'TripRequestMine'            // Trip status update
  | 'TripRequestBuyer'           // Buyer request update
  | 'EmptyLegCreatedMine'        // Empty leg created
  | 'EmptyLegUpdatedMine'        // Empty leg updated
  | 'EmptyLegDeletedMine'        // Empty leg deleted
  | 'Quotes'                     // Quote list update
  | 'QuotedTrips';               // Trip with quotes update

// ============================================================================
// Base Webhook Payload
// ============================================================================

export interface AvinodeWebhookPayload {
  /** Event type identifier */
  event: AvinodeWebhookEventType;

  /** Timestamp of the event (ISO-8601) */
  timestamp: string;

  /** Unique event ID for idempotency */
  eventId: string;

  /** API version */
  apiVersion: string;

  /** The actual event data */
  data: AvinodeWebhookData;
}

// ============================================================================
// Event-Specific Data Types
// ============================================================================

export type AvinodeWebhookData =
  | TripRequestSellerResponseData
  | TripChatData
  | TripRequestData
  | EmptyLegData;

/**
 * Trip Request - Seller Response (Quote Received)
 * Triggered when an operator responds to your RFQ with a quote
 */
export interface TripRequestSellerResponseData {
  type: 'TripRequestSellerResponse';

  /** Trip information */
  trip: {
    id: string;
    href: string;
  };

  /** RFQ/Request information */
  request: {
    id: string;
    href: string;
    status: 'quoted' | 'declined' | 'pending';
  };

  /** Seller (Operator) information */
  seller: {
    id: string;
    name: string;
    companyId: string;
  };

  /** Quote details (if status is 'quoted') */
  quote?: {
    id: string;
    href: string;
    totalPrice: {
      amount: number;
      currency: string;
    };
    validUntil: string;
    aircraft?: {
      type: string;
      model: string;
      tailNumber?: string;
      capacity: number;
    };
    schedule?: {
      departureTime: string;
      arrivalTime: string;
    };
  };

  /** Decline reason (if status is 'declined') */
  declineReason?: string;
}

/**
 * Trip Chat - Message from Seller or Internal
 * Triggered when a message is sent in a trip conversation
 */
export interface TripChatData {
  type: 'TripChatSeller' | 'TripChatMine';

  /** Trip information */
  trip: {
    id: string;
    href: string;
  };

  /** Message information */
  message: {
    id: string;
    href: string;
    content: string;
    sentAt: string;
  };

  /** Sender information */
  sender: {
    id: string;
    name: string;
    companyId: string;
    companyName: string;
  };

  /** Related request (if applicable) */
  request?: {
    id: string;
    href: string;
  };
}

/**
 * Trip Request - Status Updates
 * Triggered when a trip request status changes
 */
export interface TripRequestData {
  type: 'TripRequestMine' | 'TripRequestBuyer';

  /** Trip information */
  trip: {
    id: string;
    href: string;
  };

  /** Request information */
  request: {
    id: string;
    href: string;
    status: string;
  };

  /** Action that triggered the update */
  action: 'created' | 'updated' | 'cancelled' | 'expired';
}

/**
 * Empty Leg Events
 * Triggered when empty legs are created/updated/deleted
 */
export interface EmptyLegData {
  type: 'EmptyLegCreatedMine' | 'EmptyLegUpdatedMine' | 'EmptyLegDeletedMine';

  /** Empty leg information */
  emptyLeg: {
    id: string;
    href: string;
    status: 'active' | 'deleted' | 'expired';
  };

  /** Route information */
  route: {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
  };
}

// ============================================================================
// Webhook Registration Types (POST /webhooks/settings)
// ============================================================================

/**
 * Webhook authentication methods
 */
export type WebhookAuthType = 'None' | 'OAuth' | 'BasicAuth' | 'PreemptiveBasicAuth';

/**
 * Webhook settings for registration with Avinode
 */
export interface WebhookRegistration {
  /** Webhook name/description */
  name: string;

  /** URL where Avinode will send events */
  url: string;

  /** Whether webhook is active */
  active: boolean;

  /** Authentication method */
  authType: WebhookAuthType;

  /** OAuth credentials (if authType is 'OAuth') */
  oauth?: {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope?: string;
  };

  /** Basic Auth credentials (if authType is 'BasicAuth' or 'PreemptiveBasicAuth') */
  basicAuth?: {
    username: string;
    password: string;
  };

  /** Events to subscribe to */
  events: AvinodeWebhookEventType[];
}

/**
 * Response from webhook registration
 */
export interface WebhookRegistrationResponse {
  id: string;
  name: string;
  url: string;
  active: boolean;
  authType: WebhookAuthType;
  events: AvinodeWebhookEventType[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Full Message Details (from Avinode API fetch)
// ============================================================================

/**
 * Quote attributes from full API response
 */
export interface AvinodeQuoteAttributes {
  totalPrice: { amount: number; currency: string };
  validUntil: string;
  status: 'quoted' | 'declined' | 'counter_offer' | 'partial';
  aircraft: {
    type: string;
    model: string;
    tailNumber: string;
    capacity: number;
    yearOfManufacture: number;
    amenities: string[];
  };
  pricing: {
    basePrice: number;
    taxes: number;
    fees: number;
    fuelSurcharge: number;
    total: number;
    currency: string;
  };
  schedule: {
    departureTime: string;
    arrivalTime: string;
    flightDuration: number; // minutes
  };
  availability: {
    outbound: boolean;
    return: boolean;
    notes?: string;
  };
}

/**
 * Full message details returned when fetching the href URL
 * Used by webhook handler to get complete quote/message information
 */
export interface AvinodeMessageDetails {
  data: {
    id: string;
    type: 'tripmsgs' | 'quotes';
    attributes: {
      content?: string;
      sentAt: string;
      direction: 'incoming' | 'outgoing';
    };
    relationships: {
      trip: { data: { id: string; type: 'trips' } };
      request?: { data: { id: string; type: 'rfqs' } };
      sender: {
        data: {
          id: string;
          type: 'users';
          attributes: {
            name: string;
            email: string;
            companyName: string;
            companyId: string;
          };
        };
      };
      quote?: {
        data: {
          id: string;
          type: 'quotes';
          attributes: AvinodeQuoteAttributes;
        };
      };
    };
  };
}

// ============================================================================
// Database Storage Types
// ============================================================================

/**
 * Webhook event stored in database for processing
 */
export interface StoredWebhookEvent {
  id: string;
  event_type: AvinodeWebhookEventType;
  event_id: string;
  trip_id?: string;
  request_id?: string;
  payload: AvinodeWebhookPayload;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: string;
  error_message?: string;
  created_at: string;
}
