# Feature ID: F002
# Feature Name: Flight Request Management
# Status: Implemented
# Priority: Critical

## Description
End-to-end flight request (RFP/RFQ) lifecycle management that takes a broker from initial client inquiry through trip creation on the Avinode marketplace. The system supports multi-leg and round-trip itineraries, airport search by ICAO code or city name, and manages requests through 10 distinct stages from creation to payment. Deep links to Avinode enable human-in-the-loop operator selection while maintaining automation benefits.

## Business Value
Flight request management is the backbone of the charter brokerage workflow. By automating request intake via natural language, creating trips directly on the Avinode marketplace, and tracking requests through a well-defined 10-stage lifecycle, the system eliminates manual data entry, reduces errors, and provides full visibility into every active deal. The deep link integration preserves the broker's expert judgment in operator selection while removing friction from the rest of the process.

## Key Capabilities
- Submit flight requests via natural language chat interaction
- Create trips on the Avinode marketplace via MCP tool calls
- Deep link generation to Avinode Web UI for manual operator selection and RFP dispatch
- TripID submission and validation for linking external Avinode trips
- Multi-leg and round-trip itinerary support
- Airport search by ICAO code, IATA code, and city name
- 10-stage flight request lifecycle management:
  1. Request Created
  2. Trip Created
  3. RFQ Created
  4. Awaiting Quotes
  5. Quotes Received
  6. Quote Selected
  7. Proposal Generated
  8. Proposal Sent
  9. Contract Generated
  10. Payment Pending
- Cancel and archive requests
- Stage badge visual indicators with color-coded status
- Flight request cards with route, date, passenger, and aircraft details

## Related Epics
- [[EPIC004-request-submission|EPIC004 - Request Submission]]
- [[EPIC005-trip-creation-deep-links|EPIC005 - Trip Creation & Deep Links]]
- [[EPIC006-request-lifecycle|EPIC006 - Request Lifecycle]]

## Dependencies
- [[F001-ai-chat-assistant|F001 - AI Chat Assistant (for request intake via conversational interface)]]
- [[F006-avinode-marketplace-integration|F006 - Avinode Integration (for trip creation, deep links, and marketplace connectivity)]]

## Technical Components
- `app/api/requests/` - API routes for flight request CRUD and lifecycle management
- `components/chat/flight-request-card.tsx` - Rich flight request card component with route display, stage badge, and actions
- `components/flight-request-stage-badge.tsx` - Color-coded badge component for the 10 request stages
- `lib/chat/constants/` - Stage definitions, fallback mappings, and request configuration
- `components/avinode/` - Avinode deep link buttons and trip summary cards
- `lib/types/` - Flight request type definitions and stage enums
- `app/api/chat-sessions/messages/route.ts` - Message route handling flight request tool calls
