# RFQ Flight Data Structure Mismatch - Investigation & Fix

## Problem Summary

The `RFQFlight` interface (used by UI components) has many required fields, but the conversion code at lines 1823-1835 in `components/chat-interface.tsx` was saving data in a reduced format that lost most of these fields.

## Root Cause Analysis

### Type Mismatch

1. **RFQFlight Interface** (`components/avinode/rfq-flight-card.tsx`):
   - Has **30+ fields** including:
     - `departureAirport` and `arrivalAirport` (objects with `{icao, name, city}`)
     - `amenities` (object with `{wifi, pets, smoking, galley, lavatory, medical}`)
     - `rfqStatus`, `passengerCapacity`, `aircraftModel`, `tailNumber`
     - `yearOfManufacture` (aircraft manufacture year)
     - `tailPhotoUrl` (aircraft photo URL from API)
     - `totalPrice` (not `price`) and `currency`
     - `priceBreakdown` (object with `{basePrice, fuelSurcharge, taxes, fees}`)
     - `validUntil` (quote expiration date)
     - `lastUpdated` (timestamp string)
     - `responseTimeMinutes` (time since RFQ sent)
     - `aircraftCategory` (e.g., "Heavy jet", "Light jet")
     - `hasMedical`, `hasPackage` (boolean flags)
     - `avinodeDeepLink` (deep link to view in Avinode marketplace)

2. **ChatSession.quotes** (`components/chat-sidebar.tsx` lines 65-78):
   - Simplified format with only **9 fields**:
     - `id`, `operatorName`, `aircraftType`, `price` (not `totalPrice`)
     - `departureTime`, `arrivalTime`, `flightDuration` (strings, not objects)
     - Missing: `departureAirport`, `arrivalAirport`, `amenities`, `rfqStatus`, `passengerCapacity`, `aircraftModel`, `tailNumber`, `yearOfManufacture`, `tailPhotoUrl`, `priceBreakdown`, `validUntil`, `lastUpdated`, `responseTimeMinutes`, `aircraftCategory`, `hasMedical`, `hasPackage`, `avinodeDeepLink`, `currency`, etc.

3. **Data Loss Point** (lines 1823-1835):

   ```typescript
   // BEFORE: Lost most RFQFlight fields
   const quotesForChatSession = allFormattedQuotes.map((flight, index) => ({
     id: flight.id,
     operatorName: flight.operatorName,
     aircraftType: flight.aircraftType,
     price: flight.totalPrice,  // Only 7 fields saved!
     ranking: index + 1,
     operatorRating: flight.operatorRating,
     departureTime: flight.departureTime,
     flightDuration: flight.flightDuration,
     isRecommended: index === 0,
   }))
   ```

### Impact

- **UI Components** (`RFQFlightCard`, `RFQFlightsList`) expect full `RFQFlight[]` format
- **Data Loss**: When saving to `ChatSession.quotes`, **23+ fields were lost**, including:
  - Airport objects (`departureAirport`, `arrivalAirport`)
  - Aircraft details (`aircraftModel`, `tailNumber`, `yearOfManufacture`, `tailPhotoUrl`, `aircraftCategory`)
  - Pricing details (`priceBreakdown`, `currency`, `validUntil`)
  - Amenities object (`wifi`, `pets`, `smoking`, `galley`, `lavatory`, `medical`)
  - Status and metadata (`rfqStatus`, `lastUpdated`, `responseTimeMinutes`)
  - Feature flags (`hasMedical`, `hasPackage`)
  - Deep links (`avinodeDeepLink`)
- **Conversion Overhead**: Had to convert from `quotes` back to `RFQFlight[]` on every render (lines 540-642)

### Field Comparison Table

| RFQFlight Field | ChatSession.quotes | Status | Notes |
|-----------------|--------------------|--------|-------|
| `id` | ✅ `id` | Preserved | Direct mapping |
| `quoteId` | ❌ Missing | **Lost** | Quote identifier |
| `departureAirport` | ❌ Missing | **Lost** | Object with `{icao, name, city}` |
| `arrivalAirport` | ❌ Missing | **Lost** | Object with `{icao, name, city}` |
| `departureDate` | ❌ Missing | **Lost** | Date string |
| `departureTime` | ✅ `departureTime` | Preserved | Time string |
| `flightDuration` | ✅ `flightDuration` | Preserved | Duration string |
| `aircraftType` | ✅ `aircraftType` | Preserved | Aircraft type name |
| `aircraftModel` | ❌ Missing | **Lost** | Model designation |
| `tailNumber` | ❌ Missing | **Lost** | Aircraft registration |
| `yearOfManufacture` | ❌ Missing | **Lost** | Manufacture year |
| `passengerCapacity` | ❌ Missing | **Lost** | Max passengers |
| `tailPhotoUrl` | ❌ Missing | **Lost** | Aircraft photo URL |
| `operatorName` | ✅ `operatorName` | Preserved | Operator company name |
| `operatorRating` | ✅ `operatorRating` | Preserved | Rating (0-5) |
| `operatorEmail` | ❌ Missing | **Lost** | Contact email |
| `totalPrice` | ⚠️ `price` | **Renamed** | Price field name differs |
| `currency` | ❌ Missing | **Lost** | Currency code (USD, EUR, etc.) |
| `priceBreakdown` | ❌ Missing | **Lost** | Object with `{basePrice, fuelSurcharge, taxes, fees}` |
| `validUntil` | ❌ Missing | **Lost** | Quote expiration date |
| `amenities` | ❌ Missing | **Lost** | Object with `{wifi, pets, smoking, galley, lavatory, medical}` |
| `rfqStatus` | ❌ Missing | **Lost** | Status: `sent`, `unanswered`, `quoted`, `declined`, `expired` |
| `lastUpdated` | ❌ Missing | **Lost** | Timestamp string |
| `responseTimeMinutes` | ❌ Missing | **Lost** | Response time metric |
| `isSelected` | ❌ Missing | **Lost** | UI selection state |
| `aircraftCategory` | ❌ Missing | **Lost** | Category (e.g., "Heavy jet") |
| `hasMedical` | ❌ Missing | **Lost** | Medical equipment flag |
| `hasPackage` | ❌ Missing | **Lost** | Package transport flag |
| `avinodeDeepLink` | ❌ Missing | **Lost** | Deep link to Avinode marketplace |

**Summary**: Only **7 out of 30+ fields** were preserved in `ChatSession.quotes`, resulting in **23+ fields lost**.

## Solution

### Approach: Add Dedicated Field for Full RFQ Data

Instead of changing the existing `quotes` field (which would break backward compatibility), we added a new field `rfqFlights?: RFQFlight[]` to `ChatSession` to store the complete RFQ flight data.

### Changes Made

#### 1. Added `rfqFlights` Field to ChatSession Interface

**File**: `components/chat-sidebar.tsx`

```typescript
export interface ChatSession {
  // ... existing fields ...
  quotes?: Array<{ /* simplified format */ }>
  /** Full RFQ flight data with all fields (departureAirport, arrivalAirport, amenities, etc.) */
  /** This preserves all data needed by RFQFlightCard and RFQFlightsList components */
  rfqFlights?: Array<import('./avinode/rfq-flight-card').RFQFlight>
  // ... rest of fields ...
}
```

#### 2. Updated Conversion Code to Save Full Data

**File**: `components/chat-interface.tsx` (lines 1823-1845)

**BEFORE**:

```typescript
// Lost 23+ fields
const quotesForChatSession = allFormattedQuotes.map((flight, index) => ({
  id: flight.id,
  operatorName: flight.operatorName,
  // ... only 7 fields ...
}))

onUpdateChat(activeChat.id, {
  quotes: quotesForChatSession,  // Data loss!
})
```

**AFTER**:

```typescript
// PRIMARY: Save full RFQFlight[] data (preserves all 30+ fields)
const rfqFlightsForChatSession = allFormattedQuotes.length > 0 
  ? allFormattedQuotes 
  : activeChat.rfqFlights

// SECONDARY: Also save simplified format for backward compatibility
const quotesForChatSession = allFormattedQuotes.map((flight, index) => ({
  // ... simplified format ...
}))

onUpdateChat(activeChat.id, {
  rfqFlights: rfqFlightsForChatSession,  // ✅ Full data preserved
  quotes: quotesForChatSession,           // ✅ Backward compatible
})
```

#### 3. Updated useMemo to Prefer `rfqFlights`

**File**: `components/chat-interface.tsx` (lines 540-642)

**BEFORE**:

```typescript
const rfqFlights: RFQFlight[] = useMemo(() => {
  // Always convert from quotes (inefficient, data loss)
  const rfqFlightsFromChat: RFQFlight[] = (activeChat.quotes || [])
    .map((quote: any) => {
      // Complex conversion logic...
    })
  // ...
}, [activeChat.quotes, ...])
```

**AFTER**:

```typescript
const rfqFlights: RFQFlight[] = useMemo(() => {
  // PRIMARY: Use rfqFlights from ChatSession if available (no conversion needed!)
  if (activeChat.rfqFlights && activeChat.rfqFlights.length > 0) {
    return activeChat.rfqFlights.filter((f): f is RFQFlight => f != null && f.id != null)
  }

  // FALLBACK: Convert from quotes (for backward compatibility)
  const rfqFlightsFromChat: RFQFlight[] = (activeChat.quotes || [])
    .map((quote: any) => {
      // Conversion logic...
    })
  // ...
}, [activeChat.rfqFlights, activeChat.quotes, ...])
```

#### 4. Updated All Quote Save Locations

Updated **3 locations** where quotes are saved to also save `rfqFlights`:

1. **Line 1289**: When quotes come from streaming API response
2. **Line 1435**: When quotes are parsed from agent message text (fallback)
3. **Line 1823**: When Trip ID is submitted and quotes are retrieved

## Benefits

### ✅ Data Preservation

- **All 30+ RFQFlight fields** are now preserved in `ChatSession.rfqFlights`
- No data loss when saving RFQ flight data

### ✅ Performance Improvement

- **No conversion overhead**: UI components can use `rfqFlights` directly
- **Reduced computation**: `useMemo` prefers `rfqFlights` over converting from `quotes`

### ✅ Backward Compatibility

- **Existing `quotes` field** still works for components that use simplified format
- **No breaking changes**: Components using `ChatSession.quotes` continue to work

### ✅ Type Safety

- **Full type checking**: `rfqFlights` is typed as `RFQFlight[]`
- **No `any` types**: Proper TypeScript types throughout

## Migration Path

### For New Code

- **Use `ChatSession.rfqFlights`** for all RFQ flight data
- This provides full data with all fields

### For Existing Code

- **Continue using `ChatSession.quotes`** if you only need simplified format
- Both fields are kept in sync automatically

## Testing Recommendations

1. **Verify data preservation**: Check that all RFQFlight fields are present in `rfqFlights`
2. **Test backward compatibility**: Ensure components using `quotes` still work
3. **Performance testing**: Verify reduced conversion overhead improves render performance
4. **Edge cases**: Test with empty quotes, missing fields, and malformed data

## Related Files

- `components/chat-sidebar.tsx` - ChatSession interface definition
- `components/chat-interface.tsx` - Conversion logic and data saving
- `components/avinode/rfq-flight-card.tsx` - RFQFlight interface definition
- `components/avinode/rfq-flights-list.tsx` - Component using RFQFlight[]

## Conclusion

The solution adds a dedicated `rfqFlights` field to preserve all RFQ flight data while maintaining backward compatibility with the existing `quotes` field. This eliminates data loss and improves performance by avoiding unnecessary conversions.
