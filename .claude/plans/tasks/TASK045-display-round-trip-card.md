# Task ID: TASK045
# Task Name: TripSummaryCard shows both legs with trip_type="round_trip"
# Parent User Story: [[US018-specify-round-trip|US018 - Create round-trip flight requests]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Update the TripSummaryCard component to display both outbound and return legs when the trip_type is "round_trip". Each leg shows its own route, date, and time while sharing the same trip ID and status.

## Acceptance Criteria
- TripSummaryCard renders two leg sections for round-trip trips
- Outbound leg is labeled and shows departure → arrival with date/time
- Return leg is labeled and shows return route with date/time
- Both legs share the same trip ID and status badge
- Visual separator between outbound and return legs
- Card adapts layout for mobile screens
- trip_type indicator shows "Round Trip" label

## Implementation Details
- **File(s)**: `components/avinode/trip-summary-card.tsx`
- **Approach**: Modify TripSummaryCard to accept a `legs` array prop. When trip_type is "round_trip" and legs has two entries, render both legs with appropriate labels (Outbound/Return). Use the design system spacing and divider tokens for visual separation between legs.

## Dependencies
- [[TASK044-create-round-trip|TASK044]] (create-round-trip) - Requires round-trip trip creation data
- [[TASK053-implement-trip-summary-card|TASK053]] (implement-trip-summary-card) - Base card component
