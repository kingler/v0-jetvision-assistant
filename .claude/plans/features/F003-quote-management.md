# Feature ID: F003
# Feature Name: Quote Management
# Status: Implemented
# Priority: Critical

## Description
Comprehensive quote management system that receives, displays, compares, and tracks operator quotes from the Avinode marketplace. Quotes arrive via Avinode webhooks (TripRequestSellerResponse events) and are presented to brokers with full pricing breakdowns, aircraft specifications, operator details, and amenity information. The system supports side-by-side quote comparison and real-time notifications via SSE when new quotes arrive.

## Business Value
Quote management is where brokers make their most critical business decisions -- selecting the right operator and aircraft at the right price for their client. By automating quote reception, providing structured comparison tools, and delivering real-time notifications, the system enables brokers to respond faster to client inquiries, compare more options, and ultimately close more deals with better margins. The structured quote data also feeds directly into proposal generation, eliminating manual re-entry.

## Key Capabilities
- Receive quotes via Avinode webhooks (TripRequestSellerResponse event type)
- Display detailed quote information including:
  - Pricing breakdown (base price, taxes, fees, total)
  - Aircraft specifications (type, model, capacity, range)
  - Operator information (name, rating, certifications)
  - Amenity details (catering, WiFi, entertainment)
- Side-by-side quote comparison across multiple operators
- Quote status tracking (sent, pending, received, declined, accepted)
- RFQ polling for periodic quote status updates
- Real-time quote arrival notifications via Server-Sent Events (SSE)
- Quote selection for downstream proposal generation
- Quote card rendering within the chat interface
- RFQ flight card with leg details and associated quotes

## Related Epics
- [[EPIC007-quote-reception-display|EPIC007 - Quote Reception & Display]]
- [[EPIC008-quote-comparison-selection|EPIC008 - Quote Comparison & Selection]]

## Dependencies
- [[F002-flight-request-management|F002 - Flight Request Management (quotes are associated with flight requests/RFQs)]]
- [[F006-avinode-marketplace-integration|F006 - Avinode Integration (quote data sourced from Avinode marketplace)]]

## Technical Components
- `app/api/quotes/` - API routes for quote retrieval and status management
- `components/avinode/rfq-flight-card.tsx` - RFQ flight card showing leg details with associated quotes
- `components/avinode/rfq-quote-details-card.tsx` - Detailed quote display with pricing, aircraft, and operator info
- `components/quotes/` - Quote comparison and selection UI components
- `lib/chat/transformers/rfq-transformer.ts` - Transforms raw Avinode RFQ/quote data into UI-ready structures
- `app/api/webhooks/avinode/` - Webhook handler for incoming Avinode quote events
- `app/api/avinode/events/` - SSE endpoint for real-time quote notifications
- `components/avinode/AvinodeConnectionStatus.tsx` - SSE connection health indicator
- `components/avinode/WebhookStatusIndicator.tsx` - Webhook event reception status
