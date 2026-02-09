# Implementation Plan: Book Flight & Contract Generation Feature

**Date**: 2026-01-28
**Branch**: kingler/book-flight-contracts
**Status**: Planning

## Overview

Implement the contract generation and booking workflow triggered by the existing "Book Flight" button. The button already exists in `rfq-flight-card.tsx` and displays correctly when `rfqStatus === 'quoted'`. This plan focuses on the **modal, contract generation, and backend workflow**.

## Current State

- **"Book Flight" button**: Already exists at lines 700-711 and 922-933 in `components/avinode/rfq-flight-card.tsx`
- **Display logic**: `showActionButtons = flight.rfqStatus === 'quoted'` (line 514)
- **Handler**: `handleBookFlight` exists but only calls `onBookFlight?.(flight.id, quoteId)`
- **Missing**: Modal, contract PDF generation, database storage, email sending

## Contract Document Analysis

Based on the example Jetvision contract (13 pages):

| Page | Content |
|------|---------|
| 1 | Quote summary (client, aircraft, amenities, itinerary, pricing) |
| 2-12 | Terms & conditions (12 sections with full legal verbiage) |
| 13 | Credit card authorization form |

### Terms & Conditions Sections (from example)

1. **Services and Understanding** - Brokerage services, no operational control, operator selection
2. **Client Obligations** - Accurate info, compliance, payment obligations, passenger conduct
3. **Payment Terms** - Wire transfer, credit card (5% fee), late payment penalties
4. **Cancellation and Refunds** - Cancellation fees by timeframe, operator cancellation rights
5. **Aircraft Substitution and Flight Changes** - Substitution rights, weather/delays
6. **Force Majeure** - Acts of God, no liability for force majeure events
7. **Limitation of Liability** - Consequential damages exclusion, liability cap
8. **Indemnification** - Client indemnifies Jetvision
9. **Regulatory Compliance** - FAA, TSA, CBP compliance, sanctions
10. **Data Protection and Confidentiality** - Personal data, CCPA/GDPR, confidential info
11. **Governing Law and Dispute Resolution** - California law, arbitration
12. **Miscellaneous** - Entire agreement, amendments, notices, assignment

## Architecture

```
User clicks "Book Flight" (existing button)
    ↓
BookFlightModal (NEW)
├── Flight summary display
├── Client info (from proposal)
├── "Preview Contract" → opens PDF preview
└── "Send Contract" button
    ↓
POST /api/contract/generate
├── Generate PDF from template
├── Create DB record (status: draft)
└── Return PDF base64
    ↓
POST /api/contract/send
├── Upload PDF to Supabase storage
├── Send email via Gmail MCP
├── Update DB (status: sent)
└── Return confirmation
    ↓
contracts table tracks: draft→sent→viewed→signed→paid→completed
```

## Implementation Steps

### Phase 1: Database Schema

**File**: `supabase/migrations/040_contracts_table.sql`

```sql
-- Contract status enum
CREATE TYPE contract_status AS ENUM (
  'draft',           -- Created but not sent
  'sent',            -- Sent, awaiting signature
  'viewed',          -- Client opened contract
  'signed',          -- Client signed
  'payment_pending', -- Awaiting payment
  'paid',            -- Payment received
  'completed',       -- Fully executed
  'cancelled',       -- Cancelled
  'expired'          -- Quote expired
);

-- Main contracts table
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  iso_agent_id UUID NOT NULL REFERENCES iso_agents(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL,

  -- Contract identification
  contract_number TEXT UNIQUE NOT NULL,  -- CONTRACT-2026-001
  reference_quote_number TEXT,

  -- Document storage
  file_name TEXT,
  file_url TEXT,
  file_path TEXT,
  file_size_bytes INTEGER,

  -- Client info (snapshot at contract time)
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_company TEXT,
  client_phone TEXT,

  -- Flight details (snapshot)
  departure_airport TEXT NOT NULL,
  arrival_airport TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TIME,
  aircraft_type TEXT NOT NULL,
  aircraft_model TEXT,
  tail_number TEXT,
  passengers INTEGER NOT NULL,

  -- Pricing (snapshot)
  flight_cost DECIMAL(12,2) NOT NULL,
  federal_excise_tax DECIMAL(12,2) DEFAULT 0,
  domestic_segment_fee DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  credit_card_fee_percentage DECIMAL(4,2) DEFAULT 5.0,
  total_amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Amenities
  amenities JSONB DEFAULT '{}',

  -- Payment
  payment_method TEXT CHECK (payment_method IN ('wire', 'credit_card')),

  -- Status tracking
  status contract_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  payment_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,

  -- Email tracking
  sent_to_email TEXT,
  email_message_id TEXT,

  -- Signature tracking
  client_signature_data TEXT,
  client_signed_name TEXT,
  client_signed_date TIMESTAMPTZ,
  jetvision_signature_data TEXT,
  jetvision_signed_name TEXT,
  jetvision_signed_date TIMESTAMPTZ,

  -- Payment tracking
  payment_reference TEXT,
  payment_amount DECIMAL(12,2),
  payment_date TIMESTAMPTZ,
  cc_last_four TEXT,

  -- Versioning
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES contracts(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_contracts_request_id ON contracts(request_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_contract_number ON contracts(contract_number);

-- Auto-generate contract numbers
CREATE OR REPLACE FUNCTION generate_contract_number() RETURNS TEXT AS $$
DECLARE
  year TEXT;
  seq INTEGER;
BEGIN
  year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 'CONTRACT-' || year || '-(\d+)') AS INTEGER)), 0) + 1
  INTO seq FROM contracts WHERE contract_number LIKE 'CONTRACT-' || year || '-%';
  RETURN 'CONTRACT-' || year || '-' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE OR REPLACE FUNCTION trigger_set_contract_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contract_number IS NULL THEN
    NEW.contract_number := generate_contract_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_contract_number
  BEFORE INSERT ON contracts FOR EACH ROW
  EXECUTE FUNCTION trigger_set_contract_number();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_iso_agent_access ON contracts
  FOR ALL USING (iso_agent_id = auth.uid());
```

### Phase 2: TypeScript Types

**File**: `lib/types/contract.ts`

```typescript
import type { Database } from './database';

export type Contract = Database['public']['Tables']['contracts']['Row'];
export type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
export type ContractUpdate = Database['public']['Tables']['contracts']['Update'];

export type ContractStatus =
  | 'draft' | 'sent' | 'viewed' | 'signed'
  | 'payment_pending' | 'paid' | 'completed'
  | 'cancelled' | 'expired';

export interface ContractFlightDetails {
  departureAirport: { icao: string; name?: string; city?: string };
  arrivalAirport: { icao: string; name?: string; city?: string };
  departureDate: string;
  departureTime?: string;
  aircraftType: string;
  aircraftModel?: string;
  tailNumber?: string;
  passengers: number;
}

export interface ContractPricing {
  flightCost: number;
  federalExciseTax: number;
  domesticSegmentFee: number;
  subtotal: number;
  creditCardFeePercentage: number;
  totalAmount: number;
  currency: string;
}

export interface ContractCustomer {
  name: string;
  email: string;
  company?: string;
  phone?: string;
}

export interface GenerateContractInput {
  requestId: string;
  proposalId?: string;
  quoteId?: string;
  customer: ContractCustomer;
  flightDetails: ContractFlightDetails;
  pricing: ContractPricing;
  amenities?: Record<string, boolean>;
  paymentMethod?: 'wire' | 'credit_card';
}

export interface GenerateContractOutput {
  contractId: string;
  contractNumber: string;
  pdfBuffer: Buffer;
  pdfBase64: string;
  fileName: string;
  generatedAt: string;
}
```

### Phase 3: Contract PDF Template

**File**: `lib/pdf/contract-template.tsx`

React PDF template (~600 lines) matching the example contract:

1. **Cover Page (Page 1)**
   - Jetvision logo and header
   - "Prepared for" section with client name
   - Quote number and date
   - Aircraft type and amenities list
   - Itinerary table (Date, ETD/ETA, Depart/Arrive, PAX, ETE, NM)
   - Quote breakdown table (Flight Cost, Federal Excise Tax, Domestic Segment Fee, Total)
   - Signature line at bottom

2. **Terms and Conditions (Pages 2-12)**
   - Full legal text from example document
   - All 12 sections with proper formatting
   - Headers, numbered lists, bullet points
   - Payment method selection (Pay by Wire / Credit Card checkboxes)

3. **Signature Page (Page 12)**
   - "IN WITNESS WHEREOF" section
   - Jetvision signature block (Name, Date)
   - Client signature block (Name, Signature, Date)

4. **Credit Card Authorization (Page 13)**
   - Authorization statement
   - Fields: Name on Card, Card Type, Card Number, Expiration, CVV
   - Billing Address fields
   - Authorized Amount with 5% fee note
   - Cardholder Signature and Date
   - Note about including ID and card copies

### Phase 4: Contract Service

**File**: `lib/services/contract-service.ts`

CRUD operations following `proposal-service.ts` pattern:

```typescript
// Create
export async function createContract(input: ContractInsert): Promise<Contract>;
export async function createContractWithResolution(input, tripId?, email?): Promise<Contract | null>;

// Read
export async function getContractById(id: string): Promise<Contract | null>;
export async function getContractByNumber(contractNumber: string): Promise<Contract | null>;
export async function getContractsByRequest(requestId: string): Promise<Contract[]>;
export async function getContractsByAgent(isoAgentId: string, options?): Promise<Contract[]>;

// Update
export async function updateContractGenerated(id: string, fileData: FileMetadata): Promise<Contract>;
export async function updateContractSent(id: string, emailData: EmailMetadata): Promise<Contract>;
export async function updateContractStatus(id: string, status: ContractStatus): Promise<Contract>;
export async function updateContractSigned(id: string, signatureData: SignatureData): Promise<Contract>;
export async function updateContractPayment(id: string, paymentData: PaymentData): Promise<Contract>;
```

### Phase 5: Contract Generator

**File**: `lib/pdf/contract-generator.ts`

PDF generation logic following `proposal-generator.ts` pattern:

```typescript
export async function generateContract(input: GenerateContractInput): Promise<GenerateContractOutput>;
export async function generateCCAuthForm(contractData: ContractData): Promise<{ pdfBase64: string; fileName: string }>;
export function generateContractId(): string; // Format: CONTRACT-{timestamp}-{random}
export function generateFileName(departure: string, arrival: string, date: string, contractId: string): string;
```

### Phase 6: API Routes

| File | Method | Purpose |
|------|--------|---------|
| `app/api/contract/generate/route.ts` | POST | Generate PDF, create draft record, return base64 |
| `app/api/contract/send/route.ts` | POST | Upload PDF, send email, update status to sent |
| `app/api/contract/[id]/route.ts` | GET | Retrieve contract details |
| `app/api/contract/[id]/route.ts` | PATCH | Update contract status |
| `app/api/contract/[id]/sign/route.ts` | POST | Record client signature data |
| `app/api/contract/[id]/payment/route.ts` | POST | Record payment information |

### Phase 7: UI Components

**File**: `components/avinode/book-flight-modal.tsx`

Modal displayed when "Book Flight" is clicked:

```typescript
interface BookFlightModalProps {
  flight: RFQFlight;
  customer: { name: string; email: string; company?: string; phone?: string };
  tripDetails: TripDetails;
  onClose: () => void;
  onContractSent?: (contractId: string) => void;
}
```

Features:
- Client name and contact display
- Flight summary (route, dates, aircraft type, pricing)
- "Preview Contract" button → opens PDF in new tab
- "Send Contract" button → generates and sends contract
- Loading, success, and error states
- Close/cancel functionality

**File**: `components/contracts/contract-status-badge.tsx`

Status badge component matching proposal status badge pattern.

### Phase 8: Wire Up Handler

**File**: Parent component that renders RFQFlightCard (e.g., `components/avinode/rfq-quotes-list.tsx` or similar)

```typescript
const [bookFlightData, setBookFlightData] = useState<{
  flight: RFQFlight;
  customer: ContractCustomer;
  tripDetails: TripDetails;
} | null>(null);

const handleBookFlight = (flightId: string, quoteId?: string) => {
  const flight = flights.find(f => f.id === flightId);
  if (flight) {
    setBookFlightData({
      flight,
      customer: { name: customerName, email: customerEmail },
      tripDetails: currentTripDetails,
    });
  }
};

// In render:
<RFQFlightCard
  flight={flight}
  onBookFlight={handleBookFlight}
  // ... other props
/>

{bookFlightData && (
  <BookFlightModal
    flight={bookFlightData.flight}
    customer={bookFlightData.customer}
    tripDetails={bookFlightData.tripDetails}
    onClose={() => setBookFlightData(null)}
    onContractSent={(contractId) => {
      // Handle successful contract send
      setBookFlightData(null);
    }}
  />
)}
```

## Files to Create

| File | Purpose | Est. Lines |
|------|---------|------------|
| `supabase/migrations/040_contracts_table.sql` | Database schema | ~120 |
| `lib/types/contract.ts` | TypeScript types | ~80 |
| `lib/pdf/contract-template.tsx` | React PDF template | ~600 |
| `lib/pdf/contract-generator.ts` | PDF generation logic | ~150 |
| `lib/services/contract-service.ts` | Database CRUD | ~300 |
| `app/api/contract/generate/route.ts` | Generate API | ~120 |
| `app/api/contract/send/route.ts` | Send API | ~180 |
| `app/api/contract/[id]/route.ts` | Get/Update API | ~100 |
| `app/api/contract/[id]/sign/route.ts` | Signature API | ~80 |
| `app/api/contract/[id]/payment/route.ts` | Payment API | ~80 |
| `components/avinode/book-flight-modal.tsx` | Booking modal | ~250 |
| `components/contracts/contract-status-badge.tsx` | Status badge | ~50 |

**Total**: ~2,110 lines of new code

## Files to Modify

| File | Changes |
|------|---------|
| `lib/types/index.ts` | Export contract types |
| `lib/pdf/index.ts` | Export contract generator |
| Parent of RFQFlightCard | Add modal state and handler |

## Verification Steps

1. **Database**:
   - Run migration: `npx supabase db push`
   - Verify table created: `SELECT * FROM contracts LIMIT 1;`

2. **PDF Generation**:
   - Call `/api/contract/generate` with test data
   - Verify PDF matches example format (13 pages, all sections)

3. **Email Delivery**:
   - Call `/api/contract/send` with valid contract ID
   - Verify email received with PDF attachment

4. **UI Flow**:
   - Click "Book Flight" on a quoted flight
   - Verify modal opens with correct data
   - Click "Preview Contract" → verify PDF opens
   - Click "Send Contract" → verify success state

5. **Status Tracking**:
   - Verify contract status transitions: draft → sent
   - Check timestamps are recorded correctly

## Future Enhancements (Not in Scope)

- E-signature integration (DocuSign/HelloSign)
- Payment processing (Stripe/Square)
- Automated expiration cron job
- Contract versioning/amendments UI
- Admin dashboard for contract monitoring

## Dependencies

- `@react-pdf/renderer` (already installed for proposals)
- `decimal.js` (already installed for pricing calculations)
- Supabase storage (already configured)
- Gmail MCP server (already integrated)
