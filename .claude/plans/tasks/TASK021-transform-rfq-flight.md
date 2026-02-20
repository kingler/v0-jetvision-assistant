# Task ID: TASK021
# Task Name: Transform Raw Quote Data to RFQFlight Format
# Parent User Story: [[US008-extract-quotes-from-stream|US008 - See flight quotes displayed as rich cards]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Convert raw quote data from the Avinode API response into the normalized `RFQFlight` format used by the frontend quote card components.

## Acceptance Criteria
- Raw Avinode quote response is transformed to `RFQFlight` interface
- Aircraft details are mapped (type, category, year, image URL)
- Operator details are mapped (name, rating, logo)
- Pricing is normalized (amount, currency, formatted display string)
- Route information is mapped (departure/arrival airports, times)
- Amenity flags are extracted (wifi, pet, smoking, catering, lavatory, medical)
- Status is mapped to a standardized enum (available, expired, withdrawn)
- Missing optional fields default to sensible fallback values

## Implementation Details
- **File(s)**: `lib/chat/transformers/rfq-transformer.ts`
- **Approach**: Create a `transformToRFQFlight(rawQuote: AvinodeQuoteResponse): RFQFlight` function. Map each field from the Avinode response schema to the `RFQFlight` interface. Handle currency formatting with `Intl.NumberFormat`. Parse date strings into ISO format. Map amenity boolean flags from the response. Provide TypeScript type guards for the raw input. Export the transformer for use in both SSE parsing and historical message rendering.

## Dependencies
- [[TASK020-extract-quotes-sse|TASK020]] (raw quote data extraction from SSE)
