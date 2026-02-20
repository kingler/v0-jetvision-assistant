# Epic ID: EPIC008
# Epic Name: Quote Comparison & Selection
# Parent Feature: [[F003-quote-management|F003 - Quote Management & Comparison]]
# Status: Implemented
# Priority: High

## Description
Side-by-side quote comparison interface enabling users to evaluate multiple operator quotes and select the best option for proposal generation. This epic covers the comparison grid layout, AI-generated recommendations with scoring, quote acceptance/rejection actions, and the selection workflow that feeds into the proposal generation pipeline.

## Goals
- Enable side-by-side comparison of multiple quotes with key metrics highlighted
- Display AI-generated recommendation with scoring rationale for the best quote
- Allow users to accept or reject individual quotes with tracked status changes
- Support quote selection as the trigger for downstream proposal generation
- Present all quotes for a given request in an organized, scannable grid format

## User Stories
- [[US035-compare-quotes-side-by-side|US035 - Compare quotes side-by-side]]
- [[US036-select-quote-for-proposal|US036 - Select quote for proposal]]
- [[US037-accept-reject-quote|US037 - Accept/reject quote]]
- [[US038-view-all-quotes-for-request|US038 - View all quotes for request]]

## Acceptance Criteria Summary
- Comparison view displays 2+ quotes side-by-side with aligned metric rows (price, aircraft, operator, ETA)
- AI recommendation highlights the top-ranked quote with a clear rationale
- Accept action on a quote triggers the proposal generation workflow
- Reject action updates quote status and removes it from the active comparison
- Quote grid shows all received quotes for a request with sortable columns
- Comparison is responsive and gracefully handles varying numbers of quotes
- Selected quote data is passed accurately to the proposal generation step

## Technical Scope
- components/quotes/quote-comparison.tsx - Side-by-side comparison layout
- components/quotes/quote-grid.tsx - Grid view of all quotes for a request
- components/mcp-ui/composites/QuoteComparisonUI.tsx - Composite comparison UI from MCP tool output
- app/api/quotes/ - API routes for quote status updates and selection
- lib/chat/transformers/ - Quote data normalization for comparison display
