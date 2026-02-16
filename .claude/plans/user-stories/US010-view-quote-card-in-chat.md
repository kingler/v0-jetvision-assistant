# User Story ID: US010
# Title: View Quote Card in Chat
# Parent Epic: [[EPIC003-rich-message-components|EPIC003 - Rich Chat UI Components]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to see quote details as rich cards in chat, so that I can quickly evaluate operator offers.

## Acceptance Criteria

### AC1: Quote card displays key details
**Given** a quote message exists
**When** it renders
**Then** I see aircraft type, operator name, price, and status

### AC2: Booking action from card
**Given** the card is interactive
**When** I click "Review and Book"
**Then** the booking modal opens

### AC3: Amenities icons display
**Given** amenities data exists
**When** the card renders
**Then** WiFi, pet, smoking, catering, lavatory, medical icons show

## Tasks
- [[TASK025-implement-quote-card|TASK025 - Implement quote card component]]
- [[TASK026-map-amenities-icons|TASK026 - Map amenities to icons]]
- [[TASK027-wire-booking-action|TASK027 - Wire up booking action]]

## Technical Notes
- Quote cards are implemented in `components/avinode/rfq-flight-card.tsx`
- The card displays: aircraft type, operator name, total price, currency, and request status
- Amenities are mapped to Lucide icons: WiFi, PawPrint, Cigarette, UtensilsCrossed, Bath, HeartPulse
- The "Review and Book" action triggers the booking workflow which opens a confirmation modal
- Cards use the design system tokens for consistent styling
- The `FlightRequestStageBadge` component shows the current stage of the request
