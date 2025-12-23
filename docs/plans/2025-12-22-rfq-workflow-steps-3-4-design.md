# RFQ Workflow Steps 3 & 4 Design

**Date:** 2025-12-22
**Feature:** View RFQ Flights (Step 3) & Send Proposal to Customer (Step 4)
**Linear Issue:** [ONEK-138](https://linear.app/designthru-ai/issue/ONEK-138)

---

## Overview

Implement a corrected 4-step workflow for the RFP processing flow in the chat interface:

1. **Request** - Trip request created, flight details displayed
2. **Select Flight & RFQ** - "Open in Avinode Marketplace" button
3. **Enter Trip ID & View RFQ Flights** - User enters Trip ID → Display RFQ flights in card list
4. **Send Proposal to Customer** - Select flights, generate PDF, send email

---

## Step 3: Enter Trip ID & View RFQ Flights

### Component Structure

```text
FlightSearchProgress
└── Step 3 Content
    ├── TripIDInput (existing)
    └── RFQFlightsList (NEW)
        └── RFQFlightCard (NEW) × N
```

### RFQFlightCard Features

- Aircraft image placeholder
- Route visualization (ICAO codes → arrow → destination)
- Departure date and time
- Flight duration
- Aircraft details (type, model, tail number, year, capacity)
- Operator info (name, rating)
- Pricing (total with currency, breakdown available)
- Amenities (WiFi, pets, smoking, galley, lavatory)
- Quote status badge (sent/unanswered/quoted/declined/expired)
- Last updated timestamp
- Selection checkbox for proposal

### Data Interface

```typescript
interface RFQFlight {
  id: string;
  quoteId: string;
  // Route & Schedule
  departureAirport: { icao: string; name: string; city: string };
  arrivalAirport: { icao: string; name: string; city: string };
  departureDate: string;
  departureTime?: string;
  flightDuration: string;
  // Aircraft
  aircraftType: string;
  aircraftModel: string;
  tailNumber?: string;
  yearOfManufacture?: number;
  passengerCapacity: number;
  aircraftImageUrl?: string;
  // Operator
  operatorName: string;
  operatorRating?: number;
  operatorEmail?: string;
  // Pricing
  price: number;
  currency: string;
  priceBreakdown?: { base: number; taxes: number; fees: number };
  validUntil?: string;
  // Amenities
  amenities: {
    wifi: boolean;
    pets: boolean;
    smoking: boolean;
    galley: boolean;
    lavatory: boolean;
    medical: boolean;
  };
  // Status
  rfqStatus: 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired';
  lastUpdated: string;
  responseTimeMinutes?: number;
  // Selection
  isSelected?: boolean;
}
```

### Behavior

1. User enters Trip ID in input field
2. System calls `get_rfq` MCP tool with Trip ID
3. RFQ flights are retrieved and displayed in card list
4. Trip ID is displayed in:
   - Chat header (next to flight name)
   - Sidebar chat history card
5. User can select one or more flights for proposal
6. "Continue to Send Proposal" button becomes active when flights selected

---

## Step 4: Send Proposal to Customer

### Component Structure

```
FlightSearchProgress
└── Step 4 Content
    └── SendProposalStep (NEW)
        ├── SelectedFlightsSummary
        ├── ProposalPreview
        ├── CustomerInfo
        ├── ActionButtons
        └── StatusIndicator
```

### Features

- Display selected flights in compact summary
- Show proposal preview with pricing breakdown
- Customer email input (or pre-filled from context)
- "Generate PDF Preview" button
- "Send Proposal" primary action button
- Status indicator: idle → generating → sending → sent

### PDF Proposal Contents

1. **Header**
   - Jetvision logo and branding
   - Document title: "Charter Flight Proposal"
   - Generated date and proposal ID

2. **Customer Section**
   - Customer name
   - Reference number

3. **Flight Itinerary**
   - Route (departure → arrival with airport names)
   - Date and time
   - Flight duration
   - Passengers

4. **Aircraft Details**
   - Aircraft type and model
   - Tail number
   - Year of manufacture
   - Passenger capacity
   - Amenities list

5. **Operator Information**
   - Operator name
   - Safety rating

6. **Pricing**
   - Base price
   - Jetvision service fee (margin)
   - Taxes and fees
   - **Total price** (prominent)
   - Currency

7. **Terms & Conditions**
   - Payment terms (deposit required)
   - Cancellation policy
   - Quote validity period

8. **Contact & Next Steps**
   - How to confirm booking
   - Contact information
   - Response deadline

### Email Template

```html
Subject: Your Private Jet Charter Proposal - [Route] on [Date]

Dear [Customer Name],

Thank you for your inquiry. Please find attached your personalized
charter flight proposal for:

✈️ Route: [Departure] → [Arrival]
📅 Date: [Date]
👥 Passengers: [Count]
💰 Total: [Price] [Currency]

Please review the attached PDF for complete details including
aircraft specifications, operator information, and booking terms.

To confirm this booking, please reply to this email or call us at
[Phone Number].

This quote is valid until [Expiry Date].

Best regards,
Jetvision Group
```

### API Endpoints

#### POST /api/proposal/generate
- Input: Selected flights, customer info, pricing
- Output: PDF as base64 string
- Uses `@react-pdf/renderer`

#### POST /api/proposal/send
- Input: Customer email, PDF base64, flight details
- Output: Success/failure status
- Uses Gmail MCP server `send_email` tool

### Database Updates

On successful send:
```sql
UPDATE requests SET
  status = 'proposal_sent',
  proposal_sent_at = NOW(),
  selected_quote_ids = [...],
  customer_email = '...'
WHERE id = ?
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `components/avinode/rfq-flight-card.tsx` | Individual RFQ flight card |
| `components/avinode/rfq-flights-list.tsx` | List container with selection |
| `components/avinode/send-proposal-step.tsx` | Step 4 UI component |
| `lib/pdf/proposal-generator.ts` | PDF generation logic |
| `lib/pdf/proposal-template.tsx` | React PDF template |
| `app/api/proposal/generate/route.ts` | PDF generation endpoint |
| `app/api/proposal/send/route.ts` | Email sending endpoint |

## Files to Modify

| File | Changes |
|------|---------|
| `components/avinode/flight-search-progress.tsx` | Update to 4-step flow |
| `components/chat/agent-message.tsx` | Integrate new Step 3 & 4 |
| `components/chat-interface.tsx` | Handle proposal flow |
| `components/chat-sidebar.tsx` | Show Trip ID in card |
| `components/chat/dynamic-chat-header.tsx` | Show Trip ID |
| `lib/mcp/clients/mock-avinode-client.ts` | Richer RFQ data |

---

## Dependencies

Add to `package.json`:
```json
{
  "@react-pdf/renderer": "^3.4.0"
}
```

---

## Test Coverage

Each new component will have corresponding tests:

- `__tests__/unit/components/avinode/rfq-flight-card.test.tsx`
- `__tests__/unit/components/avinode/rfq-flights-list.test.tsx`
- `__tests__/unit/components/avinode/send-proposal-step.test.tsx`
- `__tests__/unit/lib/pdf/proposal-generator.test.ts`
- `__tests__/integration/api/proposal.test.ts`
