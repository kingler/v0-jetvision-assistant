# RFQFlightCard Component Documentation

**Location**: `components/avinode/rfq-flight-card.tsx`  
**Purpose**: Displays detailed flight information from an Avinode RFQ response  
**Used In**: Step 3 of the RFP workflow to show available flights to users

---

## Component Overview

The `RFQFlightCard` component renders a single flight option from an RFQ response. It displays comprehensive information about the aircraft, operator, pricing, amenities, and RFQ status in a structured 3-column layout.

---

## DOM Structure

Based on the provided DOM path, the component renders within:

```
main#main-content
  └─ div.min-h-screen
     └─ main.overflow-hidden
        └─ div.flex flex-col h-full
           └─ div.flex-1 overflow-y-auto
              └─ div.max-w-4xl mx-auto
                 └─ ul.space-y-6 (RFQFlightsList)
                    └─ li.border-b (Individual card container)
                       └─ div.bg-white (RFQFlightCard)
                          └─ div.flex pb-4 flex-row (Main content - 3 columns)
```

**Position**: `top=335px, left=397px, width=664px, height=340px`  
**Min Height**: `282px` (enforced via inline style)

---

## Layout Structure

The component uses a **3-column flex layout**:

### Column 1: Aircraft Image (225px width)
- Fixed width: `225px`
- Fixed height: `280px`
- Displays aircraft image or placeholder icon
- Background: `bg-gray-100 dark:bg-gray-800`

### Column 2: Aircraft/Transport/RFQ Status (Flexible width)
- Contains three sections:
  1. **Aircraft Section**: Category, Year of Make
  2. **Transport Section**: Passenger Capacity, Medical, Package
  3. **RFQ Status Section**: Status badge with color coding
- Optional selection checkbox (if `selectable` prop is true)

### Column 3: Price/Amenities/Operator (200px width)
- Fixed width: `200px`
- Contains three sections:
  1. **Price Section**: Total price with optional breakdown
  2. **Amenities Section**: Pets, Smoking, Wi-Fi indicators
  3. **Operator Section**: Company name, email, rating, chat button

---

## Props Interface

```typescript
export interface RFQFlightCardProps {
  flight: RFQFlight;                    // Required: Flight data object
  selectable?: boolean;                 // Show selection checkbox
  onSelect?: (flightId: string, selected: boolean) => void;
  showPriceBreakdown?: boolean;         // Show price breakdown (base/taxes/fees)
  compact?: boolean;                    // Compact layout for smaller screens
  className?: string;                   // Additional CSS classes
  showBookButton?: boolean;             // Show "Review and Book" button
  onReviewAndBook?: (flightId: string) => void;
  onViewChat?: (flightId: string) => void;
  aircraftCategory?: string;           // Override aircraft category
  hasMedical?: boolean;                // Override medical availability
  hasPackage?: boolean;                 // Override package availability
}
```

---

## Flight Data Interface

```typescript
export interface RFQFlight {
  id: string;
  quoteId: string;
  departureAirport: {
    icao: string;
    name?: string;
    city?: string;
  };
  arrivalAirport: {
    icao: string;
    name?: string;
    city?: string;
  };
  departureDate: string;
  departureTime?: string;
  flightDuration: string;
  aircraftType: string;
  aircraftModel: string;
  tailNumber?: string;
  yearOfManufacture?: number;
  passengerCapacity: number;
  aircraftImageUrl?: string;
  operatorName: string;
  operatorRating?: number;
  operatorEmail?: string;
  price: number;
  currency: string;
  priceBreakdown?: {
    base: number;
    taxes: number;
    fees: number;
  };
  validUntil?: string;
  amenities: {
    wifi: boolean;
    pets: boolean;
    smoking: boolean;
    galley: boolean;
    lavatory: boolean;
    medical: boolean;
  };
  rfqStatus: 'sent' | 'unanswered' | 'quoted' | 'declined' | 'expired';
  lastUpdated: string;
  responseTimeMinutes?: number;
  isSelected?: boolean;
  aircraftCategory?: string;
  hasMedical?: boolean;
  hasPackage?: boolean;
}
```

---

## Features

### 1. Status Badge
Color-coded status badges based on RFQ status:
- **Sent**: Blue (`bg-blue-100 text-blue-700`)
- **Unanswered**: Gray (`bg-gray-200 text-gray-700`)
- **Quoted**: Green (`bg-green-100 text-green-700`)
- **Declined**: Red (`bg-red-100 text-red-700`)
- **Expired**: Gray (`bg-gray-100 text-gray-700`)

### 2. Aircraft Image Handling
- Displays aircraft image if `aircraftImageUrl` is provided
- Falls back to placeholder icon (`Plane` icon) if image fails to load
- Handles image loading errors gracefully

### 3. Price Formatting
- Uses `Intl.NumberFormat` for locale-aware currency formatting
- Supports optional price breakdown (base, taxes, fees)
- Formats with proper currency symbols (USD, EUR, GBP, etc.)

### 4. Amenities Display
- Shows 6 amenity types: WiFi, Pets, Smoking, Galley, Lavatory, Medical
- Visual indicators with icons (green when enabled, gray when disabled)
- Tooltips show "Yes" or "No" status

### 5. Selection Support
- Optional checkbox for multi-select workflows
- Visual ring indicator when selected (`ring-2 ring-blue-500`)
- Callback `onSelect` fires when selection changes

### 6. Booking Button
- "Review and Book" button for quoted flights
- Only enabled when `rfqStatus === 'quoted'`
- Triggers Step 4 of the workflow

### 7. Chat Integration
- "View Chat" button in operator section
- Opens operator conversation thread
- Only shown when `onViewChat` callback is provided

---

## Usage Example

### Basic Usage

```tsx
import { RFQFlightCard } from '@/components/avinode/rfq-flight-card';

<RFQFlightCard
  flight={{
    id: 'flight-001',
    quoteId: 'quote-abc123',
    departureAirport: { icao: 'KTEB', name: 'Teterboro Airport' },
    arrivalAirport: { icao: 'KVNY', name: 'Van Nuys Airport' },
    departureDate: '2025-01-15',
    departureTime: '09:00',
    flightDuration: '5h 30m',
    aircraftType: 'Heavy Jet',
    aircraftModel: 'Gulfstream G200',
    passengerCapacity: 10,
    operatorName: 'Executive Jets LLC',
    operatorRating: 4.8,
    price: 32500,
    currency: 'USD',
    amenities: {
      wifi: true,
      pets: true,
      smoking: false,
      galley: true,
      lavatory: true,
      medical: false,
    },
    rfqStatus: 'quoted',
    lastUpdated: '2025-01-05T10:30:00Z',
  }}
/>
```

### With Selection

```tsx
<RFQFlightCard
  flight={flight}
  selectable
  onSelect={(flightId, selected) => {
    console.log(`Flight ${flightId} ${selected ? 'selected' : 'deselected'}`);
  }}
/>
```

### With Booking Button

```tsx
<RFQFlightCard
  flight={flight}
  showBookButton
  onReviewAndBook={(flightId) => {
    // Navigate to Step 4: Review and Book
    router.push(`/rfq/${flightId}/review`);
  }}
/>
```

### With Price Breakdown

```tsx
<RFQFlightCard
  flight={flight}
  showPriceBreakdown
/>
```

---

## Integration with RFQFlightsList

The component is typically used within `RFQFlightsList`:

```tsx
import { RFQFlightsList } from '@/components/avinode/rfq-flights-list';

<RFQFlightsList
  flights={flights}
  selectable
  showBookButton
  onReviewAndBook={handleReviewAndBook}
  onViewChat={handleViewChat}
  sortable
  filterable
/>
```

The list component:
- Renders multiple `RFQFlightCard` components
- Handles selection state management
- Provides sorting and filtering capabilities
- Manages "Select All" functionality

---

## Styling

### Responsive Behavior
- **Compact mode**: Switches to column layout on small screens (`flex-col sm:flex-row`)
- **Image**: Full width on mobile, fixed 225px on desktop
- **Spacing**: Adjusts padding and gaps based on `compact` prop

### Dark Mode Support
- All colors have dark mode variants
- Uses Tailwind's `dark:` prefix for dark mode styles
- Maintains contrast ratios for accessibility

### Accessibility
- Semantic HTML structure
- ARIA labels on interactive elements
- Screen reader announcements for selection changes
- Keyboard navigation support

---

## Data Flow

```
Avinode API Response
  ↓
getRFQFlights() (AvinodeClient)
  ↓
Transform to RFQFlight format
  ↓
RFQFlightsList component
  ↓
RFQFlightCard component (× N)
  ↓
User Interaction (Select/Book/Chat)
```

---

## Related Components

- **RFQFlightsList**: Container component that renders multiple cards
- **RfqQuoteDetailsCard**: Detailed quote information display
- **FlightSearchProgress**: Progress indicator for flight search workflow

---

## Testing

Comprehensive test suite located at:
`__tests__/unit/components/avinode/rfq-flight-card.test.tsx`

Tests cover:
- Rendering with various prop combinations
- Selection functionality
- Price formatting
- Status badge display
- Image error handling
- Booking button states
- Accessibility features

---

## Future Enhancements

Potential improvements:
1. **Aircraft Photos**: Display multiple aircraft photos (when `tailphotos` API parameter is implemented)
2. **Comparison Mode**: Side-by-side comparison of multiple flights
3. **Favorites**: Save favorite flights for quick access
4. **Share**: Share flight details via link or email
5. **Print**: Print-friendly view of flight details
