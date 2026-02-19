# User Story ID: US035
# Title: Compare Quotes Side-by-Side
# Parent Epic: [[EPIC008-quote-comparison-selection|EPIC008 - Proposal Generation]]
# Status: Implemented
# Priority: High
# Story Points: 5

## User Story
As an ISO agent, I want to compare quotes side-by-side, so that I can select the best option for my client.

## Acceptance Criteria

### AC1: Grid Comparison View
**Given** multiple quotes exist
**When** I view comparison
**Then** quotes display in a grid with key metrics aligned (price, aircraft, operator, amenities)

### AC2: Recommended Quote Highlight
**Given** a recommended quote
**When** comparison renders
**Then** the recommended option is highlighted

## Tasks
- [[TASK071-implement-quote-comparison|TASK071 - Build side-by-side quote comparison grid with aligned key metrics (price, aircraft, operator, amenities)]]
- [[TASK072-highlight-recommended-quote|TASK072 - Implement recommended quote highlighting logic and visual treatment in comparison view]]

## Technical Notes
- The comparison view renders quotes in a horizontal grid layout with aligned rows for each metric
- Key comparison metrics: total price, aircraft type/model, operator name/rating, passenger capacity, availability, and amenities
- The AI agent analyzes quotes and designates a recommended option based on price, operator rating, aircraft quality, and client preferences
- The recommended quote is highlighted with a distinct border color and "Recommended" badge
- On mobile viewports, the grid collapses to a swipeable card carousel for usability
- The comparison view is triggered either by user request ("compare quotes") or automatically when multiple quotes are received
