/**
 * Avinode Webhook Mock Payloads
 *
 * Realistic mock data for testing operator quote responses.
 * Matches Avinode webhook schema from lib/types/avinode-webhooks.ts
 *
 * @module lib/mock-data/avinode-webhook-payloads
 * @see ONEK-130
 */

import type {
  AvinodeWebhookPayload,
  TripRequestSellerResponseData,
  TripChatData,
} from '@/lib/types/avinode-webhooks';

// ============================================================================
// Types for Full Message Details (API Response)
// ============================================================================

/**
 * Full message details returned when fetching the href URL
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
          attributes: QuoteAttributes;
        };
      };
    };
  };
}

export interface QuoteAttributes {
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
    flightDuration: number;
  };
  availability: {
    outbound: boolean;
    return: boolean;
    notes?: string;
  };
}

// ============================================================================
// Webhook Notification Payloads (what Avinode sends)
// ============================================================================

/**
 * Scenario 1: Accepted quote with full availability
 */
export const mockAcceptedQuoteWebhook: AvinodeWebhookPayload = {
  event: 'TripRequestSellerResponse',
  eventId: 'evt-accepted-001',
  timestamp: new Date().toISOString(),
  apiVersion: 'v1.0',
  data: {
    type: 'TripRequestSellerResponse',
    trip: {
      id: 'atrip-64956153',
      href: 'https://sandbox.avinode.com/api/trips/atrip-64956153',
    },
    request: {
      id: 'arfq-12345678',
      href: 'https://sandbox.avinode.com/api/rfqs/arfq-12345678',
      status: 'quoted',
    },
    seller: {
      id: 'user-seller-001',
      name: 'John Smith',
      companyId: 'comp-exec-jet-001',
    },
    quote: {
      id: 'aquote-386512791',
      href: 'https://sandbox.avinode.com/api/quotes/aquote-386512791',
      totalPrice: { amount: 45000, currency: 'USD' },
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      aircraft: {
        type: 'Heavy Jet',
        model: 'Gulfstream G650',
        tailNumber: 'N650EJ',
        capacity: 16,
      },
      schedule: {
        departureTime: '2025-12-20T10:00:00Z',
        arrivalTime: '2025-12-20T14:30:00Z',
      },
    },
  } as TripRequestSellerResponseData,
};

/**
 * Scenario 2: Declined quote with reason
 */
export const mockDeclinedQuoteWebhook: AvinodeWebhookPayload = {
  event: 'TripRequestSellerResponse',
  eventId: 'evt-declined-002',
  timestamp: new Date().toISOString(),
  apiVersion: 'v1.0',
  data: {
    type: 'TripRequestSellerResponse',
    trip: {
      id: 'atrip-64956153',
      href: 'https://sandbox.avinode.com/api/trips/atrip-64956153',
    },
    request: {
      id: 'arfq-12345679',
      href: 'https://sandbox.avinode.com/api/rfqs/arfq-12345679',
      status: 'declined',
    },
    seller: {
      id: 'user-seller-002',
      name: 'Sarah Johnson',
      companyId: 'comp-sky-charter-002',
    },
    declineReason:
      'Aircraft not available for requested dates. Committed to another charter.',
  } as TripRequestSellerResponseData,
};

/**
 * Scenario 3: Counter-offer with modified pricing
 */
export const mockCounterOfferWebhook: AvinodeWebhookPayload = {
  event: 'TripRequestSellerResponse',
  eventId: 'evt-counter-003',
  timestamp: new Date().toISOString(),
  apiVersion: 'v1.0',
  data: {
    type: 'TripRequestSellerResponse',
    trip: {
      id: 'atrip-64956153',
      href: 'https://sandbox.avinode.com/api/trips/atrip-64956153',
    },
    request: {
      id: 'arfq-12345680',
      href: 'https://sandbox.avinode.com/api/rfqs/arfq-12345680',
      status: 'quoted',
    },
    seller: {
      id: 'user-seller-003',
      name: 'Michael Chen',
      companyId: 'comp-premier-air-003',
    },
    quote: {
      id: 'aquote-386512792',
      href: 'https://sandbox.avinode.com/api/quotes/aquote-386512792',
      totalPrice: { amount: 52000, currency: 'USD' },
      validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      aircraft: {
        type: 'Heavy Jet',
        model: 'Bombardier Global 7500',
        tailNumber: 'N7500PA',
        capacity: 19,
      },
      schedule: {
        departureTime: '2025-12-20T11:00:00Z',
        arrivalTime: '2025-12-20T15:00:00Z',
      },
    },
  } as TripRequestSellerResponseData,
};

/**
 * Scenario 4: Partial availability (one-way only)
 */
export const mockPartialAvailabilityWebhook: AvinodeWebhookPayload = {
  event: 'TripRequestSellerResponse',
  eventId: 'evt-partial-004',
  timestamp: new Date().toISOString(),
  apiVersion: 'v1.0',
  data: {
    type: 'TripRequestSellerResponse',
    trip: {
      id: 'atrip-64956153',
      href: 'https://sandbox.avinode.com/api/trips/atrip-64956153',
    },
    request: {
      id: 'arfq-12345681',
      href: 'https://sandbox.avinode.com/api/rfqs/arfq-12345681',
      status: 'quoted',
    },
    seller: {
      id: 'user-seller-004',
      name: 'Emily Rodriguez',
      companyId: 'comp-atlantic-aviation-004',
    },
    quote: {
      id: 'aquote-386512793',
      href: 'https://sandbox.avinode.com/api/quotes/aquote-386512793',
      totalPrice: { amount: 28000, currency: 'USD' },
      validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      aircraft: {
        type: 'Midsize Jet',
        model: 'Citation XLS+',
        tailNumber: 'N300AA',
        capacity: 9,
      },
      schedule: {
        departureTime: '2025-12-20T09:00:00Z',
        arrivalTime: '2025-12-20T12:30:00Z',
      },
    },
  } as TripRequestSellerResponseData,
};

/**
 * Scenario 5: Quote with special requirements/notes
 */
export const mockSpecialRequirementsWebhook: AvinodeWebhookPayload = {
  event: 'TripRequestSellerResponse',
  eventId: 'evt-special-005',
  timestamp: new Date().toISOString(),
  apiVersion: 'v1.0',
  data: {
    type: 'TripRequestSellerResponse',
    trip: {
      id: 'atrip-64956153',
      href: 'https://sandbox.avinode.com/api/trips/atrip-64956153',
    },
    request: {
      id: 'arfq-12345682',
      href: 'https://sandbox.avinode.com/api/rfqs/arfq-12345682',
      status: 'quoted',
    },
    seller: {
      id: 'user-seller-005',
      name: 'David Thompson',
      companyId: 'comp-luxury-jets-005',
    },
    quote: {
      id: 'aquote-386512794',
      href: 'https://sandbox.avinode.com/api/quotes/aquote-386512794',
      totalPrice: { amount: 68000, currency: 'USD' },
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      aircraft: {
        type: 'Ultra Long Range',
        model: 'Gulfstream G700',
        tailNumber: 'N700LJ',
        capacity: 19,
      },
      schedule: {
        departureTime: '2025-12-20T08:00:00Z',
        arrivalTime: '2025-12-20T11:30:00Z',
      },
    },
  } as TripRequestSellerResponseData,
};

/**
 * Scenario 6: Operator chat message
 */
export const mockOperatorChatWebhook: AvinodeWebhookPayload = {
  event: 'TripChatSeller',
  eventId: 'evt-chat-006',
  timestamp: new Date().toISOString(),
  apiVersion: 'v1.0',
  data: {
    type: 'TripChatSeller',
    trip: {
      id: 'atrip-64956153',
      href: 'https://sandbox.avinode.com/api/trips/atrip-64956153',
    },
    message: {
      id: 'asellermsg-1000000007',
      href: 'https://sandbox.avinode.com/api/tripmsgs/asellermsg-1000000007',
      content:
        'Thank you for your inquiry. We can offer a 10% discount for booking within the next 48 hours. Please let us know if you have any questions about the aircraft or our services.',
      sentAt: new Date().toISOString(),
    },
    sender: {
      id: 'user-seller-001',
      name: 'John Smith',
      companyId: 'comp-exec-jet-001',
      companyName: 'Executive Jet Management',
    },
    request: {
      id: 'arfq-12345678',
      href: 'https://sandbox.avinode.com/api/rfqs/arfq-12345678',
    },
  } as TripChatData,
};

// ============================================================================
// Full Message Details (what href URL returns)
// ============================================================================

/**
 * Full quote details for Scenario 1
 */
export const mockAcceptedQuoteDetails: AvinodeMessageDetails = {
  data: {
    id: 'aquote-386512791',
    type: 'quotes',
    attributes: {
      sentAt: new Date().toISOString(),
      direction: 'incoming',
    },
    relationships: {
      trip: { data: { id: 'atrip-64956153', type: 'trips' } },
      request: { data: { id: 'arfq-12345678', type: 'rfqs' } },
      sender: {
        data: {
          id: 'user-seller-001',
          type: 'users',
          attributes: {
            name: 'John Smith',
            email: 'john.smith@execjet.com',
            companyName: 'Executive Jet Management',
            companyId: 'comp-exec-jet-001',
          },
        },
      },
      quote: {
        data: {
          id: 'aquote-386512791',
          type: 'quotes',
          attributes: {
            totalPrice: { amount: 45000, currency: 'USD' },
            validUntil: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
            status: 'quoted',
            aircraft: {
              type: 'Heavy Jet',
              model: 'Gulfstream G650',
              tailNumber: 'N650EJ',
              capacity: 16,
              yearOfManufacture: 2020,
              amenities: [
                'WiFi',
                'Satellite Phone',
                'Full Galley',
                'Enclosed Lavatory',
                'Sleeping Configuration',
              ],
            },
            pricing: {
              basePrice: 38000,
              taxes: 2850,
              fees: 1500,
              fuelSurcharge: 2650,
              total: 45000,
              currency: 'USD',
            },
            schedule: {
              departureTime: '2025-12-20T10:00:00Z',
              arrivalTime: '2025-12-20T14:30:00Z',
              flightDuration: 270,
            },
            availability: {
              outbound: true,
              return: true,
              notes: 'Aircraft positioned at KTEB. Full crew available.',
            },
          },
        },
      },
    },
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Export all scenarios for easy testing
 */
export const mockWebhookScenarios = {
  acceptedQuote: mockAcceptedQuoteWebhook,
  declinedQuote: mockDeclinedQuoteWebhook,
  counterOffer: mockCounterOfferWebhook,
  partialAvailability: mockPartialAvailabilityWebhook,
  specialRequirements: mockSpecialRequirementsWebhook,
  operatorChat: mockOperatorChatWebhook,
};

export const mockDetailScenarios = {
  acceptedQuoteDetails: mockAcceptedQuoteDetails,
};

/**
 * Generate webhook payload with custom data
 */
export function generateMockWebhook(
  overrides: Partial<AvinodeWebhookPayload>
): AvinodeWebhookPayload {
  return {
    event: 'TripRequestSellerResponse',
    eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: new Date().toISOString(),
    apiVersion: 'v1.0',
    data: mockAcceptedQuoteWebhook.data,
    ...overrides,
  };
}
