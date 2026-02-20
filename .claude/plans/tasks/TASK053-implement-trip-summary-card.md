# Task ID: TASK053
# Task Name: Card with airports (ICAO + city), dates, passengers, status, type
# Parent User Story: [[US023-view-trip-summary-card|US023 - View trip summary card]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the TripSummaryCard component that displays a comprehensive trip overview including airport details (ICAO codes and city names), departure dates and times, passenger count, current status, and trip type (one-way, round-trip, multi-city).

## Acceptance Criteria
- Displays departure airport with ICAO code and city name (e.g., "KTEB - Teterboro")
- Displays arrival airport with ICAO code and city name (e.g., "KVNY - Van Nuys")
- Shows route with directional arrow or flight path visual
- Displays departure date in user-friendly format
- Displays departure time if specified
- Shows passenger count with icon
- Shows trip type badge (One-Way, Round Trip, Multi-City)
- Shows status badge with appropriate color coding
- Includes trip ID display
- Card uses design system tokens for colors, spacing, and typography
- Responsive layout for mobile and desktop

## Implementation Details
- **File(s)**: `components/avinode/trip-summary-card.tsx`
- **Approach**: Build a reusable card component that accepts trip data as props (airports, dates, passengers, status, type, tripId). Use a structured layout with header (route + type), body (details grid), and footer (status + actions). Apply design system tokens for consistent styling and ensure all text is properly formatted using locale-aware date/number formatting.

## Dependencies
- [[TASK041-display-trip-confirmation|TASK041]] (display-trip-confirmation) - TripCreatedUI uses this card
