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

**Multi-Flight Document Structure:**
- All selected flights are included in a **single PDF document**
- Each flight is presented as its own **dedicated section** (or page for 3+ flights)
- Layout optimizations:
  - **1 flight**: Condensed single-page layout (existing design)
  - **2 flights**: Two sections on same page or split across 2 pages
  - **3+ flights**: Each flight on separate page with page breaks

#### Document Structure

1. **Header** (appears on first page only)
   - Jetvision logo and branding
   - Document title: "Charter Flight Proposal" (or "Multi-Flight Charter Proposal" if 2+ flights)
   - Generated date and proposal ID
   - Total number of flights indicator (if multi-flight)

2. **Customer Section** (appears on first page only)
   - Customer name
   - Reference number

3. **Executive Summary** (multi-flight only, appears on first page)
   - Total aggregated price across all flights
   - Flight count and route overview
   - Combined passenger count
   - Quick reference table: Flight # | Route | Date | Operator | Price

4. **Flight Sections** (one per selected flight)

   **For Single Flight (Condensed Layout):**
   - All details on one page
   - Compact table format for itinerary and aircraft details

   **For Multi-Flight (Dedicated Section/Page per Flight):**
   - Each flight gets its own section with clear separator
   - Page break between flights for 3+ flights
   - Section header: "Flight [N] of [Total]" with route

   4a. **Flight Itinerary**
       - Route (departure → arrival with airport names and ICAO codes)
       - Date and time
       - Flight duration
       - Passengers

   4b. **Aircraft Details**
       - Aircraft type and model
       - Tail number
       - Year of manufacture
       - Passenger capacity
       - Amenities list (icons or text)

   4c. **Operator Information**
       - Operator name
       - Safety rating
       - Operator contact details (email, phone if available)
       - **Note:** Operators are displayed per-flight. If multiple flights share the same operator, each flight section shows the operator details independently.

   4d. **Per-Flight Pricing**
       - Base price
       - Jetvision service fee (margin)
       - Taxes and fees
       - **Subtotal for this flight** (prominent)
       - Currency

5. **Aggregated Pricing Summary** (appears after all flight sections)
   - **For Single Flight:**
     - Same as per-flight pricing (no separate summary needed)

   - **For Multi-Flight:**
     - **Total Aggregated Price** (large, prominent)
     - Breakdown table:

       ```text
       Flight 1: [Route] - [Price] [Currency]
       Flight 2: [Route] - [Price] [Currency]
       Flight 3: [Route] - [Price] [Currency]
       ──────────────────────────────────────
       Subtotal (all flights): [Amount]
       Jetvision Service Fee: [Amount]
       Taxes & Fees: [Amount]
       ──────────────────────────────────────
       TOTAL: [Amount] [Currency]
       ```
     - Currency (must be consistent across all flights)

6. **Operator Contact Directory** (multi-flight only, if multiple operators)
   - Grouped by operator name
   - Lists all flights handled by each operator
   - Contact information (email, phone)
   - Example:

     ```text
     Operator A (Rating: 4.8/5)
     - Flight 1: NYC → LAX
     - Flight 3: LAX → SFO
     Contact: operator-a@example.com | +1-555-0100

     Operator B (Rating: 4.9/5)
     - Flight 2: LAX → MIA
     Contact: operator-b@example.com | +1-555-0200
     ```

7. **Terms & Conditions** (appears on last page)
   - Payment terms (deposit required)
   - Cancellation policy
   - Quote validity period
   - Multi-flight booking terms (if applicable)

8. **Contact & Next Steps** (appears on last page)
   - How to confirm booking
   - Contact information
   - Response deadline

#### Layout Examples

**Example 1: Single-Flight Proposal**

```
┌─────────────────────────────────────────┐
│ [Jetvision Logo]                        │
│ Charter Flight Proposal                 │
│ Generated: 2025-12-22 | ID: PRO-12345   │
├─────────────────────────────────────────┤
│ Customer: Acme Corp                     │
│ Reference: REF-789                      │
├─────────────────────────────────────────┤
│ FLIGHT ITINERARY                        │
│ ┌─────────────────────────────────────┐ │
│ │ NYC (JFK) → LAX (Los Angeles)       │ │
│ │ Date: 2025-12-25 10:00 AM           │ │
│ │ Duration: 5h 30m | Passengers: 8    │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ AIRCRAFT                                │
│ Type: Citation XLS+ | Tail: N123AB     │
│ Year: 2020 | Capacity: 9 passengers    │
│ Amenities: WiFi ✓ | Galley ✓ | Lav ✓   │
├─────────────────────────────────────────┤
│ OPERATOR                                │
│ Elite Aviation Services                 │
│ Safety Rating: 4.8/5                   │
├─────────────────────────────────────────┤
│ PRICING                                 │
│ Base Price:        $45,000              │
│ Service Fee:       $4,500               │
│ Taxes & Fees:      $2,250               │
│ ─────────────────────────────────────── │
│ TOTAL:             $51,750 USD          │
├─────────────────────────────────────────┤
│ Terms & Conditions | Contact Info       │
└─────────────────────────────────────────┘
```

**Example 2: Multi-Flight Proposal (3 flights)**

```text
Page 1: Header & Summary
┌─────────────────────────────────────────┐
│ [Jetvision Logo]                        │
│ Multi-Flight Charter Proposal           │
│ Generated: 2025-12-22 | ID: PRO-12345  │
│ Total Flights: 3                        │
├─────────────────────────────────────────┤
│ Customer: Acme Corp                     │
│ Reference: REF-789                      │
├─────────────────────────────────────────┤
│ EXECUTIVE SUMMARY                       │
│ Total Price: $145,500 USD               │
│ Flights: 3 | Total Passengers: 8        │
│                                          │
│ Quick Reference:                        │
│ ┌─────────────────────────────────────┐ │
│ │ # | Route      | Date      | Price │ │
│ ├─────────────────────────────────────┤ │
│ │ 1 | NYC→LAX    | 12/25     | $51,750 │ │
│ │ 2 | LAX→MIA    | 12/27     | $48,500 │ │
│ │ 3 | MIA→NYC    | 12/29     | $45,250 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

Page 2: Flight 1 of 3
┌─────────────────────────────────────────┐
│ FLIGHT 1 OF 3                           │
│ NYC (JFK) → LAX (Los Angeles)            │
├─────────────────────────────────────────┤
│ Itinerary: 2025-12-25 10:00 AM         │
│ Duration: 5h 30m | Passengers: 8        │
├─────────────────────────────────────────┤
│ Aircraft: Citation XLS+ (N123AB, 2020) │
│ Capacity: 9 | Amenities: WiFi, Galley  │
├─────────────────────────────────────────┤
│ Operator: Elite Aviation Services       │
│ Rating: 4.8/5                           │
├─────────────────────────────────────────┤
│ Pricing:                                │
│ Base: $45,000 | Fee: $4,500            │
│ Taxes: $2,250                           │
│ ─────────────────────────────────────── │
│ Subtotal: $51,750 USD                   │
└─────────────────────────────────────────┘

Page 3: Flight 2 of 3
┌─────────────────────────────────────────┐
│ FLIGHT 2 OF 3                           │
│ LAX (Los Angeles) → MIA (Miami)        │
├─────────────────────────────────────────┤
│ [Same structure as Flight 1]            │
│ Subtotal: $48,500 USD                  │
└─────────────────────────────────────────┘

Page 4: Flight 3 of 3
┌─────────────────────────────────────────┐
│ FLIGHT 3 OF 3                           │
│ MIA (Miami) → NYC (JFK)                 │
├─────────────────────────────────────────┤
│ [Same structure as Flight 1]            │
│ Subtotal: $45,250 USD                  │
└─────────────────────────────────────────┘

Page 5: Pricing Summary & Operators
┌─────────────────────────────────────────┐
│ PRICING SUMMARY                         │
│ ┌─────────────────────────────────────┐ │
│ │ Flight 1: NYC→LAX    $51,750        │ │
│ │ Flight 2: LAX→MIA    $48,500        │ │
│ │ Flight 3: MIA→NYC    $45,250        │ │
│ ├─────────────────────────────────────┤ │
│ │ Subtotal:            $145,500       │ │
│ │ Service Fee:         $14,550        │ │
│ │ Taxes & Fees:        $7,275         │ │
│ ├─────────────────────────────────────┤ │
│ │ TOTAL:               $167,325 USD    │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ OPERATOR CONTACT DIRECTORY              │
│                                          │
│ Elite Aviation Services (4.8/5)        │
│ • Flight 1: NYC → LAX                  │
│ • Flight 3: MIA → NYC                  │
│ Contact: ops@eliteav.com | 555-0100    │
│                                          │
│ Premium Charters Inc. (4.9/5)          │
│ • Flight 2: LAX → MIA                   │
│ Contact: charter@premium.com | 555-0200│
└─────────────────────────────────────────┘

Page 6: Terms & Contact
┌─────────────────────────────────────────┐
│ Terms & Conditions | Contact & Next Steps│
└─────────────────────────────────────────┘
```

#### Pricing Presentation Strategy

**Selected Approach: Aggregated Total + Per-Flight Breakdown**

- Each flight section shows its individual subtotal
- Final summary page shows:
  - Line-item breakdown per flight
  - Aggregated subtotal
  - Combined service fees and taxes
  - **Grand total** (most prominent)
- This allows customers to:
  - See individual flight costs for transparency
  - Understand the total investment at a glance
  - Compare flight pricing if needed

#### Operator Display Strategy

**Selected Approach: Per-Flight with Operator Directory**

- Each flight section displays its operator information independently
- Multi-flight proposals include an "Operator Contact Directory" section that:
  - Groups flights by operator
  - Shows which flights each operator handles
  - Provides consolidated contact information
- This approach:
  - Maintains flight-specific context
  - Provides easy reference for multi-operator scenarios
  - Simplifies contact management for customers

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

**Purpose:** Generate a PDF proposal document from selected flights and customer information.

**Authentication:** Required (Clerk JWT token in `Authorization` header)

**Request Headers:**
```
Authorization: Bearer <clerk_jwt_token>
Content-Type: application/json
Idempotency-Key: <optional_unique_key> (UUID v4 recommended)
```

**Request Schema:**
```typescript
interface GenerateProposalRequest {
  request_id: string;                    // Required: UUID of the request
  selected_quote_ids: string[];         // Required: Array of quote IDs (1-10 items, each UUID)
  customer_name: string;                  // Required: 1-200 characters
  customer_reference?: string;            // Optional: 0-100 characters
  customer_email: string;                 // Required: Valid email format, max 320 characters (RFC 5321)
  // Additional metadata
  notes?: string;                         // Optional: 0-5000 characters
  custom_terms?: string;                 // Optional: 0-2000 characters
}
```

**Validation Rules:**
- `request_id`: Required, must be valid UUID, must exist in `requests` table
- `selected_quote_ids`: Required, array of 1-10 UUIDs, each must exist in `avinode_webhook_events` table
- `customer_name`: Required, 1-200 characters, no control characters
- `customer_email`: Required, valid email format (RFC 5322), max 320 characters
- `customer_reference`: Optional, 0-100 characters if provided
- `notes`: Optional, 0-5000 characters if provided
- `custom_terms`: Optional, 0-2000 characters if provided

**Response Schema (200 OK):**
```typescript
interface GenerateProposalResponse {
  success: true;
  proposal_id: string;                   // UUID for tracking
  pdf_base64: string;                    // Base64-encoded PDF (max 10MB when decoded)
  pdf_size_bytes: number;                // Size of decoded PDF in bytes
  generated_at: string;                  // ISO 8601 timestamp
  idempotency_key?: string;              // Echoed if provided in request
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Request validation failed",
  "field_errors": [
    {
      "field": "customer_email",
      "message": "Invalid email format",
      "code": "INVALID_EMAIL"
    },
    {
      "field": "selected_quote_ids",
      "message": "Array must contain between 1 and 10 items",
      "code": "ARRAY_LENGTH_INVALID"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "unauthorized",
  "message": "Authentication required. Please provide a valid JWT token."
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "forbidden",
  "message": "You do not have permission to generate proposals for this request.",
  "request_id": "uuid-here"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "not_found",
  "message": "Request not found",
  "request_id": "uuid-here"
}
```

**409 Conflict - Idempotency:**
```json
{
  "success": false,
  "error": "idempotency_conflict",
  "message": "A proposal with this idempotency key already exists",
  "proposal_id": "existing-uuid",
  "idempotency_key": "provided-key",
  "existing_proposal": {
    "proposal_id": "uuid",
    "generated_at": "2025-12-22T10:30:00Z"
  }
}
```

**413 Payload Too Large:**
```json
{
  "success": false,
  "error": "payload_too_large",
  "message": "Request payload exceeds maximum size limit"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "internal_error",
  "message": "An unexpected error occurred while generating the proposal",
  "error_id": "error-uuid-for-logging"
}
```

**Idempotency Strategy:**
- Accept optional `Idempotency-Key` header (UUID v4 recommended)
- Store idempotency key in `proposal_generations` table with unique constraint
- If key exists, return existing proposal response (409 with existing data)
- Idempotency window: 24 hours (keys expire after 24h)
- Database constraint: `UNIQUE (idempotency_key, created_at > NOW() - INTERVAL '24 hours')`

**Authorization Rules:**
- User must be authenticated (valid Clerk JWT)
- User must own the request (`requests.owner_id = current_user_id`) OR have admin role
- Verify ownership before generating proposal

---

#### POST /api/proposal/send

**Purpose:** Send a generated proposal PDF via email to the customer.

**Authentication:** Required (Clerk JWT token in `Authorization` header)

**Request Headers:**
```
Authorization: Bearer <clerk_jwt_token>
Content-Type: application/json
Idempotency-Key: <optional_unique_key> (UUID v4 recommended)
```

**Request Schema:**
```typescript
interface SendProposalRequest {
  request_id: string;                    // Required: UUID of the request
  proposal_id: string;                   // Required: UUID from generate endpoint
  pdf_base64: string;                    // Required: Base64-encoded PDF (max 10MB decoded)
  customer_email: string;                 // Required: Valid email format, max 320 characters
  customer_name: string;                  // Required: 1-200 characters
  subject?: string;                       // Optional: Email subject (default: auto-generated)
  email_body?: string;                    // Optional: Custom email body (max 10000 characters)
  selected_quote_ids: string[];         // Required: Array of quote IDs (1-10 items, each UUID)
}
```

**Validation Rules:**
- `request_id`: Required, must be valid UUID, must exist in `requests` table
- `proposal_id`: Required, must be valid UUID, must exist in `proposal_generations` table
- `pdf_base64`: Required, valid base64 string, decoded size max 10MB (10,485,760 bytes)
- `customer_email`: Required, valid email format (RFC 5322), max 320 characters
- `customer_name`: Required, 1-200 characters, no control characters
- `subject`: Optional, 0-200 characters if provided
- `email_body`: Optional, 0-10000 characters if provided
- `selected_quote_ids`: Required, array of 1-10 UUIDs, must match quotes used in proposal

**Response Schema (200 OK):**
```typescript
interface SendProposalResponse {
  success: true;
  message_id: string;                    // Gmail message ID
  sent_at: string;                       // ISO 8601 timestamp
  request_id: string;                     // Echoed request ID
  proposal_id: string;                    // Echoed proposal ID
  customer_email: string;                 // Echoed customer email
  idempotency_key?: string;              // Echoed if provided in request
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Request validation failed",
  "field_errors": [
    {
      "field": "pdf_base64",
      "message": "PDF size exceeds maximum of 10MB",
      "code": "PDF_TOO_LARGE",
      "actual_size_bytes": 15728640
    },
    {
      "field": "customer_email",
      "message": "Invalid email format",
      "code": "INVALID_EMAIL"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "unauthorized",
  "message": "Authentication required. Please provide a valid JWT token."
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "forbidden",
  "message": "You do not have permission to send proposals for this request.",
  "request_id": "uuid-here"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "not_found",
  "message": "Request or proposal not found",
  "request_id": "uuid-here",
  "proposal_id": "uuid-here"
}
```

**409 Conflict - Idempotency or Status:**
```json
{
  "success": false,
  "error": "conflict",
  "message": "Proposal already sent for this request",
  "request_id": "uuid-here",
  "existing_status": "proposal_sent",
  "proposal_sent_at": "2025-12-22T10:30:00Z"
}
```

Or for idempotency key conflict:
```json
{
  "success": false,
  "error": "idempotency_conflict",
  "message": "A proposal send with this idempotency key already exists",
  "message_id": "existing-gmail-message-id",
  "idempotency_key": "provided-key",
  "sent_at": "2025-12-22T10:30:00Z"
}
```

**413 Payload Too Large:**
```json
{
  "success": false,
  "error": "payload_too_large",
  "message": "PDF size exceeds maximum of 10MB",
  "max_size_bytes": 10485760,
  "actual_size_bytes": 15728640
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "internal_error",
  "message": "An unexpected error occurred while sending the proposal",
  "error_id": "error-uuid-for-logging"
}
```

**502 Bad Gateway:**
```json
{
  "success": false,
  "error": "gateway_error",
  "message": "Failed to send email via Gmail MCP server",
  "service": "gmail_mcp",
  "error_id": "error-uuid-for-logging"
}
```

**Idempotency Strategy:**
- Accept optional `Idempotency-Key` header (UUID v4 recommended)
- Store idempotency key in `proposal_sends` table with unique constraint
- If key exists, return existing send response (409 with existing data)
- Idempotency window: 24 hours
- **Critical:** Use database transaction with conditional WHERE clause to prevent double-sends:
  ```sql
  UPDATE requests SET
    status = 'proposal_sent',
    proposal_sent_at = NOW(),
    selected_quote_ids = $1,
    customer_email = $2
  WHERE id = $3
    AND status != 'proposal_sent'  -- Prevent double-update
  RETURNING id, status, proposal_sent_at;
  ```
- If UPDATE returns 0 rows, request was already sent → return 409 Conflict

**Authorization Rules:**
- User must be authenticated (valid Clerk JWT)
- User must own the request (`requests.owner_id = current_user_id`) OR have admin role
- Verify ownership before sending proposal
- Check request status: if already `proposal_sent`, return 409 Conflict

**Database Updates:**

On successful send (with idempotency and conflict prevention):
```sql
-- Transaction: Atomic update with conflict prevention
BEGIN;

-- 1. Update request status (only if not already sent)
UPDATE requests SET
  status = 'proposal_sent',
  proposal_sent_at = NOW(),
  selected_quote_ids = $1::uuid[],
  customer_email = $2,
  updated_at = NOW()
WHERE id = $3
  AND status != 'proposal_sent'  -- Guard: prevent double-update
RETURNING id, status, proposal_sent_at;

-- 2. If UPDATE returned 0 rows, request was already sent → ROLLBACK and return 409
-- 3. Insert proposal send record (with idempotency key if provided)
INSERT INTO proposal_sends (
  id,
  request_id,
  proposal_id,
  customer_email,
  message_id,
  idempotency_key,
  sent_at
) VALUES (
  gen_random_uuid(),
  $3,
  $4,
  $2,
  $5,
  $6,  -- NULL if no idempotency key
  NOW()
)
ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours'
DO UPDATE SET
  updated_at = NOW()
RETURNING id, message_id, sent_at;

COMMIT;
```

**Database Schema Requirements:**

Verify or create the following tables/columns:

1. **`requests` table:**
   - `status` (enum or text): Must support `'proposal_sent'` value
   - `proposal_sent_at` (timestamp): Nullable, set on send
   - `selected_quote_ids` (uuid[]): Array of quote UUIDs
   - `customer_email` (text): Max 320 characters
   - `owner_id` (uuid): Foreign key to users table for authorization

2. **`proposal_generations` table (new):**
   ```sql
   CREATE TABLE proposal_generations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     request_id UUID NOT NULL REFERENCES requests(id),
     proposal_id UUID NOT NULL UNIQUE,
     pdf_base64 TEXT NOT NULL,  -- Store or reference S3/storage
     pdf_size_bytes INTEGER NOT NULL,
     selected_quote_ids UUID[] NOT NULL,
     customer_name TEXT NOT NULL,
     customer_email TEXT NOT NULL,
     idempotency_key UUID,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
   );
   
   CREATE INDEX idx_proposal_generations_request_id ON proposal_generations(request_id);
   CREATE UNIQUE INDEX CONCURRENTLY idx_proposal_generations_idempotency_unique 
     ON proposal_generations (idempotency_key) 
     WHERE idempotency_key IS NOT NULL;
   ```

3. **`proposal_sends` table (new):**
   ```sql
   CREATE TABLE proposal_sends (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     request_id UUID NOT NULL REFERENCES requests(id),
     proposal_id UUID NOT NULL REFERENCES proposal_generations(proposal_id),
     customer_email TEXT NOT NULL,
     message_id TEXT NOT NULL,  -- Gmail message ID
     idempotency_key UUID UNIQUE,
     sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
     CONSTRAINT idempotency_key_unique_window UNIQUE (idempotency_key)
       WHERE idempotency_key IS NOT NULL
         AND created_at > NOW() - INTERVAL '24 hours'
   );
   
   CREATE INDEX idx_proposal_sends_request_id ON proposal_sends(request_id);
   CREATE INDEX idx_proposal_sends_idempotency ON proposal_sends(idempotency_key)
     WHERE idempotency_key IS NOT NULL;
   ```

**Implementation Notes:**
- Use conditional WHERE clauses (`status != 'proposal_sent'`) to prevent race conditions
- Always use transactions for multi-step database operations
- Check RETURNING clause to verify update succeeded before committing
- Store idempotency keys with expiration windows (24 hours)
- Validate PDF size before base64 encoding/decoding
- Sanitize email addresses and customer names before storage
- Log all proposal generation and send events for audit trail

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
