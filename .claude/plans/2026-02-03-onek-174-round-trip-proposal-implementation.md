# ONEK-174: Round-Trip Proposal Implementation Plan

**Issue**: [ONEK-174](https://linear.app/designthru-ai/issue/ONEK-174)
**Created**: February 3, 2026
**Priority**: High
**Status**: Todo

---

## Problem Statement

When a user books a round-trip flight, the generated proposal displays only one leg (outbound). This creates incorrect itineraries where customers don't see their return flight details, pricing, or aircraft options.

**Current Behavior:**
```
TRIP DETAILS
Route: KTEB → KLAX
Departure Date: Tuesday, February 26, 2026

SELECTED FLIGHT OPTIONS
Option 1: KTEB → KLAX - $25,000
Option 2: KTEB → KLAX - $28,500

TOTAL: $27,500
```

**Expected Behavior:**
```
TRIP DETAILS
Route: KTEB → KLAX → KTEB (Round-trip)
Outbound: Tuesday, February 26, 2026
Return: Saturday, March 1, 2026

OUTBOUND FLIGHT OPTIONS
Option 1: KTEB → KLAX - $25,000
Option 2: KTEB → KLAX - $28,500

RETURN FLIGHT OPTIONS
Option 1: KLAX → KTEB - $24,000
Option 2: KLAX → KTEB - $27,000

PRICING SUMMARY
Outbound: $25,000
Return: $24,000
Jetvision Fee: $4,900
TOTAL: $53,900
```

---

## Architecture Analysis

### Current Data Flow

```
Conversation Layer (returnDate captured but unused)
    ↓
RFQ Creation (single-leg focus)
    ↓
Quote Generation (one-way quotes only)
    ↓
RFQ Transformation (no leg distinction)
    ↓
Proposal Generator (single departure/arrival)
    ↓
PDF Template (renders one route only)
```

### Key Finding

The conversation layer **already captures** `returnDate` and supports `TripType = 'round_trip'`, but this data **never flows into the proposal generation pipeline**.

---

## Implementation Phases

### Phase 1: Data Structure Extensions
**Estimated Effort**: 2-3 hours
**Risk**: Low (backward compatible)

### Phase 2: Proposal Generator Updates
**Estimated Effort**: 3-4 hours
**Risk**: Medium (core business logic)

### Phase 3: PDF Template Rendering
**Estimated Effort**: 4-5 hours
**Risk**: Medium (visual output)

### Phase 4: API Validation & Integration
**Estimated Effort**: 2-3 hours
**Risk**: Low

### Phase 5: UI Component Updates
**Estimated Effort**: 2-3 hours
**Risk**: Low

### Phase 6: Testing & Validation
**Estimated Effort**: 3-4 hours
**Risk**: Low

**Total Estimated Effort**: 16-22 hours

---

## Phase 1: Data Structure Extensions

### 1.1 Extend RFQFlight Interface

**File**: `lib/chat/types/index.ts`

```typescript
// BEFORE (line ~222)
export interface RFQFlight {
  id: string;
  departureAirport: AirportInfo;
  arrivalAirport: AirportInfo;
  departureDate: string;
  departureTime?: string;
  flightDuration: string;
  aircraft: AircraftInfo;
  operator: OperatorInfo;
  totalPrice: number;
  currency: string;
  // ... other fields
}

// AFTER
export interface RFQFlight {
  id: string;
  departureAirport: AirportInfo;
  arrivalAirport: AirportInfo;
  departureDate: string;
  departureTime?: string;
  flightDuration: string;
  aircraft: AircraftInfo;
  operator: OperatorInfo;
  totalPrice: number;
  currency: string;
  // NEW FIELDS
  legType?: 'outbound' | 'return';
  legSequence?: number; // 1 for outbound, 2 for return
  // ... other fields
}
```

### 1.2 Extend ProposalData Interface

**File**: `lib/pdf/proposal-template.tsx`

```typescript
// BEFORE (line ~27)
export interface ProposalData {
  customer: ProposalCustomer;
  tripDetails: {
    departureAirport: ProposalAirport;
    arrivalAirport: ProposalAirport;
    departureDate: string;
    departureTime?: string;
    passengers: number;
    tripId?: string;
  };
  selectedFlights: RFQFlight[];
  pricing: ProposalPricing;
  generatedAt: string;
  proposalId: string;
}

// AFTER
export interface ProposalData {
  customer: ProposalCustomer;
  tripDetails: {
    departureAirport: ProposalAirport;
    arrivalAirport: ProposalAirport;
    departureDate: string;
    departureTime?: string;
    passengers: number;
    tripId?: string;
    // NEW FIELDS
    tripType: 'one_way' | 'round_trip';
    returnDate?: string;
    returnTime?: string;
    returnAirport?: ProposalAirport; // Usually same as departure
  };
  selectedFlights: RFQFlight[];
  pricing: ProposalPricing;
  generatedAt: string;
  proposalId: string;
}
```

### 1.3 Extend GenerateProposalInput

**File**: `lib/pdf/proposal-generator.ts`

```typescript
// BEFORE (line ~21)
export interface GenerateProposalInput {
  customer: { name: string; email: string; company?: string; phone?: string };
  tripDetails: {
    departureAirport: { icao: string; name?: string; city?: string };
    arrivalAirport: { icao: string; name?: string; city?: string };
    departureDate: string;
    departureTime?: string;
    passengers: number;
    tripId?: string;
  };
  selectedFlights: RFQFlight[];
  jetvisionFeePercentage?: number;
}

// AFTER
export interface GenerateProposalInput {
  customer: { name: string; email: string; company?: string; phone?: string };
  tripDetails: {
    departureAirport: { icao: string; name?: string; city?: string };
    arrivalAirport: { icao: string; name?: string; city?: string };
    departureDate: string;
    departureTime?: string;
    passengers: number;
    tripId?: string;
    // NEW FIELDS
    tripType?: 'one_way' | 'round_trip'; // Default: 'one_way'
    returnDate?: string;
    returnTime?: string;
    returnAirport?: { icao: string; name?: string; city?: string };
  };
  selectedFlights: RFQFlight[];
  jetvisionFeePercentage?: number;
}
```

### 1.4 Extend ProposalPricing Interface

**File**: `lib/pdf/proposal-template.tsx`

```typescript
// BEFORE
export interface ProposalPricing {
  charterCost: number;
  jetvisionFee: number;
  totalAmount: number;
  currency: string;
}

// AFTER
export interface ProposalPricing {
  charterCost: number;
  jetvisionFee: number;
  totalAmount: number;
  currency: string;
  // NEW FIELDS (optional for backward compatibility)
  outboundCost?: number;
  returnCost?: number;
}
```

---

## Phase 2: Proposal Generator Updates

### 2.1 Update generateProposalPDF Function

**File**: `lib/pdf/proposal-generator.ts`

```typescript
export async function generateProposalPDF(
  input: GenerateProposalInput
): Promise<GenerateProposalResult> {
  // Validate input
  validateProposalInput(input);

  // Separate flights by leg type
  const outboundFlights = input.selectedFlights.filter(
    f => !f.legType || f.legType === 'outbound'
  );
  const returnFlights = input.selectedFlights.filter(
    f => f.legType === 'return'
  );

  // Calculate pricing
  const outboundCost = outboundFlights.reduce((sum, f) => sum + f.totalPrice, 0) / outboundFlights.length;
  const returnCost = returnFlights.length > 0
    ? returnFlights.reduce((sum, f) => sum + f.totalPrice, 0) / returnFlights.length
    : 0;
  const charterCost = outboundCost + returnCost;
  const jetvisionFee = charterCost * (input.jetvisionFeePercentage || 0.1);

  // Build proposal data
  const proposalData: ProposalData = {
    customer: input.customer,
    tripDetails: {
      ...input.tripDetails,
      tripType: input.tripDetails.tripType || 'one_way',
      returnDate: input.tripDetails.returnDate,
      returnAirport: input.tripDetails.returnAirport || input.tripDetails.departureAirport,
    },
    selectedFlights: input.selectedFlights,
    pricing: {
      charterCost,
      jetvisionFee,
      totalAmount: charterCost + jetvisionFee,
      currency: input.selectedFlights[0]?.currency || 'USD',
      outboundCost,
      returnCost,
    },
    generatedAt: new Date().toISOString(),
    proposalId: generateProposalId(),
  };

  // Generate PDF
  const pdfBuffer = await renderToBuffer(
    <ProposalTemplate data={proposalData} />
  );

  return {
    pdfBuffer,
    proposalId: proposalData.proposalId,
    fileName: generateFileName(proposalData),
  };
}
```

### 2.2 Add Input Validation

**File**: `lib/pdf/proposal-generator.ts`

```typescript
function validateProposalInput(input: GenerateProposalInput): void {
  if (!input.tripDetails.departureAirport?.icao) {
    throw new Error('Departure airport ICAO is required');
  }
  if (!input.tripDetails.arrivalAirport?.icao) {
    throw new Error('Arrival airport ICAO is required');
  }
  if (!input.tripDetails.departureDate) {
    throw new Error('Departure date is required');
  }

  // Round-trip validation
  if (input.tripDetails.tripType === 'round_trip') {
    if (!input.tripDetails.returnDate) {
      throw new Error('Return date is required for round-trip');
    }

    // Validate return flights exist
    const returnFlights = input.selectedFlights.filter(f => f.legType === 'return');
    if (returnFlights.length === 0) {
      throw new Error('At least one return flight must be selected for round-trip');
    }
  }

  if (input.selectedFlights.length === 0) {
    throw new Error('At least one flight must be selected');
  }
}
```

---

## Phase 3: PDF Template Rendering

### 3.1 Update Trip Details Section

**File**: `lib/pdf/proposal-template.tsx`

```tsx
// Trip Details Section (lines ~482-513)
const TripDetailsSection = ({ tripDetails }: { tripDetails: ProposalData['tripDetails'] }) => {
  const isRoundTrip = tripDetails.tripType === 'round_trip';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Trip Details</Text>

      {/* Route Display */}
      <View style={styles.row}>
        <Text style={styles.label}>Route:</Text>
        <Text style={styles.value}>
          {tripDetails.departureAirport.icao} → {tripDetails.arrivalAirport.icao}
          {isRoundTrip && ` → ${tripDetails.returnAirport?.icao || tripDetails.departureAirport.icao}`}
        </Text>
      </View>

      {/* Trip Type */}
      <View style={styles.row}>
        <Text style={styles.label}>Trip Type:</Text>
        <Text style={styles.value}>
          {isRoundTrip ? 'Round-trip' : 'One-way'}
        </Text>
      </View>

      {/* Outbound Date */}
      <View style={styles.row}>
        <Text style={styles.label}>
          {isRoundTrip ? 'Outbound:' : 'Departure Date:'}
        </Text>
        <Text style={styles.value}>
          {formatDate(tripDetails.departureDate)}
          {tripDetails.departureTime && ` at ${tripDetails.departureTime}`}
        </Text>
      </View>

      {/* Return Date (if round-trip) */}
      {isRoundTrip && tripDetails.returnDate && (
        <View style={styles.row}>
          <Text style={styles.label}>Return:</Text>
          <Text style={styles.value}>
            {formatDate(tripDetails.returnDate)}
            {tripDetails.returnTime && ` at ${tripDetails.returnTime}`}
          </Text>
        </View>
      )}

      {/* Passengers */}
      <View style={styles.row}>
        <Text style={styles.label}>Passengers:</Text>
        <Text style={styles.value}>{tripDetails.passengers}</Text>
      </View>
    </View>
  );
};
```

### 3.2 Update Flight Options Section

**File**: `lib/pdf/proposal-template.tsx`

```tsx
// Flight Options Section (lines ~515-523)
const FlightOptionsSection = ({
  selectedFlights,
  tripType
}: {
  selectedFlights: RFQFlight[];
  tripType: 'one_way' | 'round_trip';
}) => {
  const isRoundTrip = tripType === 'round_trip';

  // Separate flights by leg
  const outboundFlights = selectedFlights.filter(
    f => !f.legType || f.legType === 'outbound'
  );
  const returnFlights = selectedFlights.filter(
    f => f.legType === 'return'
  );

  return (
    <View style={styles.section}>
      {/* Outbound Flights */}
      <Text style={styles.sectionTitle}>
        {isRoundTrip ? 'Outbound Flight Options' : 'Selected Flight Options'}
      </Text>
      {outboundFlights.map((flight, index) => (
        <FlightCard
          key={flight.id}
          flight={flight}
          index={index}
          legLabel={isRoundTrip ? 'Outbound' : undefined}
        />
      ))}

      {/* Return Flights (if round-trip) */}
      {isRoundTrip && returnFlights.length > 0 && (
        <>
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>Return Flight Options</Text>
          {returnFlights.map((flight, index) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              index={index}
              legLabel="Return"
            />
          ))}
        </>
      )}
    </View>
  );
};
```

### 3.3 Update Pricing Section

**File**: `lib/pdf/proposal-template.tsx`

```tsx
// Pricing Section
const PricingSection = ({
  pricing,
  tripType
}: {
  pricing: ProposalPricing;
  tripType: 'one_way' | 'round_trip';
}) => {
  const isRoundTrip = tripType === 'round_trip';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pricing Summary</Text>

      {/* Per-leg breakdown for round-trip */}
      {isRoundTrip && pricing.outboundCost && pricing.returnCost && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Outbound Charter:</Text>
            <Text style={styles.value}>
              {formatPrice(pricing.outboundCost, pricing.currency)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Return Charter:</Text>
            <Text style={styles.value}>
              {formatPrice(pricing.returnCost, pricing.currency)}
            </Text>
          </View>
          <View style={styles.divider} />
        </>
      )}

      {/* Total charter cost */}
      <View style={styles.row}>
        <Text style={styles.label}>
          {isRoundTrip ? 'Total Charter Cost:' : 'Charter Cost:'}
        </Text>
        <Text style={styles.value}>
          {formatPrice(pricing.charterCost, pricing.currency)}
        </Text>
      </View>

      {/* Jetvision fee */}
      <View style={styles.row}>
        <Text style={styles.label}>Jetvision Fee:</Text>
        <Text style={styles.value}>
          {formatPrice(pricing.jetvisionFee, pricing.currency)}
        </Text>
      </View>

      {/* Total */}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>
          {formatPrice(pricing.totalAmount, pricing.currency)}
        </Text>
      </View>
    </View>
  );
};
```

---

## Phase 4: API Validation & Integration

### 4.1 Update Generate Proposal Endpoint

**File**: `app/api/proposal/generate/route.ts`

```typescript
// Add to request validation (lines ~91-134)
const validateRequest = (body: unknown): GenerateProposalRequest => {
  // ... existing validation ...

  // Round-trip validation
  if (body.tripDetails?.tripType === 'round_trip') {
    if (!body.tripDetails.returnDate) {
      throw new ValidationError('Return date is required for round-trip proposals');
    }

    // Validate date order
    const departureDate = new Date(body.tripDetails.departureDate);
    const returnDate = new Date(body.tripDetails.returnDate);
    if (returnDate <= departureDate) {
      throw new ValidationError('Return date must be after departure date');
    }

    // Validate return flights are included
    const returnFlights = body.selectedFlights?.filter(
      (f: RFQFlight) => f.legType === 'return'
    );
    if (!returnFlights || returnFlights.length === 0) {
      throw new ValidationError('At least one return flight must be selected for round-trip');
    }
  }

  return body as GenerateProposalRequest;
};
```

### 4.2 Update Send Proposal Endpoint

**File**: `app/api/proposal/send/route.ts`

Same validation as generate endpoint, plus email subject/body updates for round-trip.

### 4.3 Update RFQ Transformer

**File**: `lib/chat/transformers/rfq-transformer.ts`

```typescript
export function convertQuoteToRFQFlight(
  quote: Quote,
  routeParts: RouteParts,
  date?: string,
  legType?: 'outbound' | 'return',
  legSequence?: number
): RFQFlight | null {
  // ... existing conversion logic ...

  return {
    id: quote.id,
    departureAirport: { icao: routeParts[0], name: routeParts[0] },
    arrivalAirport: { icao: routeParts[1], name: routeParts[1] },
    departureDate: date || '',
    // ... other fields ...

    // NEW: Add leg information
    legType: legType || 'outbound',
    legSequence: legSequence || 1,
  };
}

// NEW: Helper for round-trip conversion
export function convertRoundTripQuotes(
  outboundQuotes: Quote[],
  returnQuotes: Quote[],
  outboundRoute: RouteParts,
  returnRoute: RouteParts,
  outboundDate: string,
  returnDate: string
): RFQFlight[] {
  const outboundFlights = outboundQuotes.map(q =>
    convertQuoteToRFQFlight(q, outboundRoute, outboundDate, 'outbound', 1)
  ).filter(Boolean) as RFQFlight[];

  const returnFlights = returnQuotes.map(q =>
    convertQuoteToRFQFlight(q, returnRoute, returnDate, 'return', 2)
  ).filter(Boolean) as RFQFlight[];

  return [...outboundFlights, ...returnFlights];
}
```

---

## Phase 5: UI Component Updates

### 5.1 Update Proposal Sent Confirmation

**File**: `components/proposal/proposal-sent-confirmation.tsx`

```tsx
interface ProposalSentConfirmationProps {
  route: string;
  departureDate: string;
  returnDate?: string;
  tripType?: 'one_way' | 'round_trip';
  totalPrice: string;
  customerEmail: string;
  proposalId: string;
}

export function ProposalSentConfirmation({
  route,
  departureDate,
  returnDate,
  tripType = 'one_way',
  totalPrice,
  customerEmail,
  proposalId,
}: ProposalSentConfirmationProps) {
  const isRoundTrip = tripType === 'round_trip';

  return (
    <Card className="bg-green-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          Proposal Sent Successfully
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Route:</span>
          <span className="font-medium">{route}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Trip Type:</span>
          <span className="font-medium">
            {isRoundTrip ? 'Round-trip' : 'One-way'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {isRoundTrip ? 'Outbound:' : 'Departure:'}
          </span>
          <span className="font-medium">{departureDate}</span>
        </div>
        {isRoundTrip && returnDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Return:</span>
            <span className="font-medium">{returnDate}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Price:</span>
          <span className="font-medium">{totalPrice}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sent to:</span>
          <span className="font-medium">{customerEmail}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.2 Update RFQ Flight Card Selection

**File**: `components/avinode/rfq-flights-list.tsx`

Add visual grouping for outbound vs return flights, and ensure selection logic supports paired flights.

---

## Phase 6: Testing & Validation

### 6.1 Unit Tests

**File**: `__tests__/unit/lib/services/proposal-service.test.ts`

```typescript
describe('Proposal Generation - Round Trip', () => {
  it('should generate proposal with both outbound and return legs', async () => {
    const input: GenerateProposalInput = {
      customer: { name: 'Test Customer', email: 'test@example.com' },
      tripDetails: {
        departureAirport: { icao: 'KTEB' },
        arrivalAirport: { icao: 'KLAX' },
        departureDate: '2026-02-26',
        returnDate: '2026-03-01',
        tripType: 'round_trip',
        passengers: 4,
      },
      selectedFlights: [
        { ...mockFlight, legType: 'outbound', legSequence: 1 },
        { ...mockFlight, legType: 'return', legSequence: 2 },
      ],
    };

    const result = await generateProposalPDF(input);

    expect(result.pdfBuffer).toBeDefined();
    expect(result.proposalId).toBeDefined();
  });

  it('should fail if round-trip missing return date', async () => {
    const input: GenerateProposalInput = {
      // ... same as above but without returnDate
      tripDetails: {
        tripType: 'round_trip',
        // returnDate: missing!
      },
    };

    await expect(generateProposalPDF(input)).rejects.toThrow(
      'Return date is required for round-trip'
    );
  });

  it('should fail if round-trip missing return flights', async () => {
    const input: GenerateProposalInput = {
      tripDetails: {
        tripType: 'round_trip',
        returnDate: '2026-03-01',
      },
      selectedFlights: [
        { ...mockFlight, legType: 'outbound' }, // Only outbound
      ],
    };

    await expect(generateProposalPDF(input)).rejects.toThrow(
      'At least one return flight must be selected'
    );
  });

  it('should calculate combined pricing for round-trip', async () => {
    const outboundPrice = 25000;
    const returnPrice = 24000;
    const feePercentage = 0.1;

    const input: GenerateProposalInput = {
      tripDetails: { tripType: 'round_trip', returnDate: '2026-03-01' },
      selectedFlights: [
        { ...mockFlight, totalPrice: outboundPrice, legType: 'outbound' },
        { ...mockFlight, totalPrice: returnPrice, legType: 'return' },
      ],
      jetvisionFeePercentage: feePercentage,
    };

    const result = await generateProposalPDF(input);
    const expectedTotal = (outboundPrice + returnPrice) * (1 + feePercentage);

    // Verify pricing in generated PDF
    expect(result.pricing.totalAmount).toBe(expectedTotal);
  });
});
```

### 6.2 Integration Tests

**File**: `__tests__/integration/proposal/round-trip.test.ts`

```typescript
describe('Round-Trip Proposal E2E', () => {
  it('should create, generate, and send round-trip proposal', async () => {
    // 1. Create round-trip request via chat
    // 2. Select outbound and return flights
    // 3. Generate proposal
    // 4. Verify PDF contains both legs
    // 5. Send proposal
    // 6. Verify email contains round-trip details
  });
});
```

### 6.3 Visual Regression Tests

Create PDF snapshots for:
- One-way proposal (regression)
- Round-trip proposal with single option per leg
- Round-trip proposal with multiple options per leg

---

## Acceptance Criteria Checklist

- [ ] **AC1**: Round-trip proposal includes exactly two legs (outbound + return)
- [ ] **AC2**: Each leg shows segments, times, airports, carrier/flight numbers
- [ ] **AC3**: UI shows both legs with clear "Outbound" / "Return" labels
- [ ] **AC4**: Total price equals sum of both legs plus fee
- [ ] **AC5**: Incomplete data (missing leg) fails with user-safe error
- [ ] **AC6**: Unit tests cover: one-way (1 leg), round-trip (2 legs), edge cases
- [ ] **AC7**: Regression test prevents reintroduction

---

## Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `lib/chat/types/index.ts` | Add `legType`, `legSequence` to `RFQFlight` | P1 |
| `lib/pdf/proposal-template.tsx` | Extend `ProposalData`, update rendering | P1 |
| `lib/pdf/proposal-generator.ts` | Add return date support, validation | P1 |
| `app/api/proposal/generate/route.ts` | Add round-trip validation | P2 |
| `app/api/proposal/send/route.ts` | Add round-trip validation | P2 |
| `lib/chat/transformers/rfq-transformer.ts` | Handle return leg conversion | P2 |
| `components/proposal/proposal-sent-confirmation.tsx` | Show round-trip details | P3 |
| `components/avinode/rfq-flights-list.tsx` | Group flights by leg | P3 |
| `__tests__/unit/lib/services/proposal-service.test.ts` | Add round-trip tests | P4 |

---

## Rollout Plan

1. **Development**: Implement all phases
2. **Code Review**: Full PR review with test coverage
3. **QA Testing**: Manual testing with round-trip scenarios
4. **Staging Deploy**: Deploy to staging environment
5. **Smoke Test**: Verify one-way proposals still work (regression)
6. **Production Deploy**: Deploy with feature flag if needed
7. **Monitor**: Watch for errors in proposal generation

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking one-way proposals | High | Backward compatible defaults, regression tests |
| PDF rendering issues | Medium | Visual regression tests, PDF snapshots |
| Price calculation errors | High | Comprehensive unit tests for pricing |
| API validation gaps | Medium | Request validation, error handling |

---

## Dependencies

- No external dependencies
- Internal: Proposal generation system, PDF library (@react-pdf/renderer)

---

## Related Issues

- ONEK-175: RFQ price updates (Done)
- ONEK-176: Book Flight customer name (Done)
- ONEK-140: Gmail MCP integration (In Progress)
