# Task ID: TASK071
# Task Name: Side-by-side grid with key metrics aligned
# Parent User Story: [[US035-compare-quotes-side-by-side|US035 - Compare operator quotes]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement a quote comparison view that displays multiple operator quotes in a side-by-side grid format. Key metrics are aligned across columns for easy visual comparison, allowing the sales representative to quickly identify the best option.

## Acceptance Criteria
- Quotes are displayed in a horizontal grid (side-by-side columns)
- Key metrics are aligned in rows across all quotes: total price, aircraft type, operator rating, flight duration, aircraft year, passenger capacity
- Supports comparing 2-5 quotes simultaneously
- Horizontal scrolling on mobile for overflow
- Each column header shows operator name
- Best values in each metric are visually highlighted (e.g., lowest price, highest rating)
- Responsive layout: grid on desktop, stacked cards on mobile with comparison toggle
- Empty/missing values show "-" placeholder

## Implementation Details
- **File(s)**: `components/quotes/quote-comparison.tsx`
- **Approach**: Create a comparison grid component that receives an array of quote objects. Render a table-like structure with quotes as columns and metrics as rows. Use CSS Grid for alignment. Calculate and highlight the best value in each metric row (min for price, max for rating, etc.). On mobile, use a horizontally scrollable container or a card stack with swipe navigation.

## Dependencies
- [[TASK064-store-quote-database|TASK064]] (store-quote-database) - Quotes must be stored and retrievable
- [[TASK066-display-pricing-breakdown|TASK066]] (display-pricing-breakdown) - Pricing display patterns
