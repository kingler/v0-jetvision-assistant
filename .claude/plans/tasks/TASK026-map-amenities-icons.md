# Task ID: TASK026
# Task Name: Map Amenity Flags to Icons
# Parent User Story: [[US010-view-quote-card-in-chat|US010 - View detailed quote card with aircraft and pricing]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Map amenity boolean flags (wifi, pet-friendly, smoking, catering, lavatory, medical) to their corresponding icons for display on the quote card.

## Acceptance Criteria
- Each amenity flag maps to a distinct, recognizable icon
- Icons use consistent sizing (16px or 20px)
- Icons have tooltips showing the amenity name on hover
- Only amenities that are `true` are displayed
- Icons use a muted color for a clean look, with accent color on hover
- Icon set is extensible for future amenity types
- Accessible labels are provided for screen readers

## Implementation Details
- **File(s)**: `components/avinode/rfq-flight-card.tsx`
- **Approach**: Create an `AMENITY_ICON_MAP` constant that maps amenity keys to Lucide React icons: `wifi` -> `Wifi`, `pet` -> `PawPrint`, `smoking` -> `Cigarette`, `catering` -> `UtensilsCrossed`, `lavatory` -> `Bath`, `medical` -> `Cross`. Render icons in a flex row within the card footer. Each icon is wrapped in a `Tooltip` component with the amenity label. Filter the map to only show amenities where the flag is truthy.

## Dependencies
- [[TASK025-implement-quote-card|TASK025]] (quote card component where amenity icons are rendered)
