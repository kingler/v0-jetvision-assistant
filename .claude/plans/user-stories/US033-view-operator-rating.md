# User Story ID: US033
# Title: View Operator Rating
# Parent Epic: [[EPIC007-quote-reception-display|EPIC007 - Quote Management]]
# Status: Implemented
# Priority: Medium
# Story Points: 1

## User Story
As an ISO agent, I want to see operator ratings, so that I can recommend quality operators.

## Acceptance Criteria

### AC1: Star Rating Display
**Given** an operator has a rating
**When** it renders
**Then** I see star rating with numeric value

## Tasks
- [[TASK069-display-operator-rating|TASK069 - Build operator star rating display component showing visual stars and numeric rating value]]

## Technical Notes
- Operator ratings come from Avinode's marketplace data included in quote responses
- Rating is displayed as a visual star component (1-5 stars) alongside a numeric value (e.g., 4.7/5.0)
- The rating component uses filled, half-filled, and empty star icons for visual precision
- Ratings help ISO agents assess operator reliability and quality when comparing quotes
- If an operator has no rating, a "No rating available" placeholder is shown
- The rating display is integrated into both the individual quote card and the comparison grid view
