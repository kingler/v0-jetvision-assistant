# Task ID: TASK048
# Task Name: Show route, date, passengers, trip ID, status after creation
# Parent User Story: [[US020-view-request-confirmation|US020 - View flight request confirmation details]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Display a comprehensive confirmation view after trip creation showing all key details: route (departure → arrival with airport codes and cities), date and time, passenger count, trip ID, and current status. This is the immediate feedback the user sees after submitting a flight request.

## Acceptance Criteria
- Confirmation displays departure airport (ICAO code + city name)
- Confirmation displays arrival airport (ICAO code + city name)
- Shows formatted date and time of departure
- Shows passenger count
- Shows trip ID prominently
- Shows current status (e.g., "Created", "Pending Quotes")
- Information is clearly organized and easy to scan
- Matches the design system typography and spacing

## Implementation Details
- **File(s)**: `components/mcp-ui/composites/TripCreatedUI.tsx`
- **Approach**: Ensure the TripCreatedUI composite component includes all confirmation fields from the create_trip response. Map the API response fields to human-readable labels. Use the design system's card layout with consistent spacing and typography tokens.

## Dependencies
- [[TASK041-display-trip-confirmation|TASK041]] (display-trip-confirmation) - Base TripCreatedUI component
