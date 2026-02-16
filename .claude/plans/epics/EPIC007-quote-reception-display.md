# Epic ID: EPIC007
# Epic Name: Quote Reception & Display
# Parent Feature: [[F003-quote-management|F003 - Quote Management & Comparison]]
# Status: Implemented
# Priority: Critical

## Description
Real-time reception and display of operator quotes arriving from the Avinode marketplace via webhooks. This epic covers webhook event processing for TripRequestSellerResponse events, transformation of raw quote data into structured display models, and rich UI rendering of quote details including pricing breakdowns, aircraft specifications, operator information, and amenity listings.

## Goals
- Process Avinode webhook events for new operator quotes in real-time
- Display quote details with comprehensive pricing breakdown (flight cost, fees, taxes)
- Show aircraft details including type, photo, year, and specifications
- Present operator information with safety ratings and contact details
- Display available amenities and cabin features for each quoted aircraft

## User Stories
- [[US030-receive-realtime-quote-notification|US030 - Receive real-time quote notification]]
- [[US031-view-quote-pricing-breakdown|US031 - View quote with pricing breakdown]]
- [[US032-view-aircraft-details|US032 - View aircraft details and photo]]
- [[US033-view-operator-rating|US033 - View operator rating]]
- [[US034-see-quote-status-badge|US034 - See quote status badge]]

## Acceptance Criteria Summary
- Webhook endpoint receives and validates TripRequestSellerResponse events from Avinode
- New quotes trigger real-time notifications in the active chat session via SSE
- Quote card displays total price, currency, and itemized cost breakdown
- Aircraft section shows type, registration, year of manufacture, and photo (when available)
- Operator section shows company name, safety rating, and response time
- Quote status badge reflects current state (pending, accepted, rejected, expired)
- All webhook events are persisted to avinode_webhook_events table for audit

## Technical Scope
- app/api/webhooks/avinode/ - Webhook endpoint for Avinode events
- components/avinode/rfq-flight-card.tsx - Flight leg card within RFQ display
- components/avinode/rfq-quote-details-card.tsx - Detailed quote display with pricing
- lib/chat/transformers/rfq-transformer.ts - Raw webhook data to UI model transformation
- Supabase avinode_webhook_events table - Webhook event persistence
- app/api/avinode/events/ - SSE endpoint for real-time quote push to frontend
