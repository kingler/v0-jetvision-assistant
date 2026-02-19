# Task ID: TASK249
# Task Name: Analytics API Endpoint
# Parent User Story: [[US135-view-analytics-summary|US135 - Business metrics analytics API]]
# Status: Partial
# Priority: Medium
# Estimate: 3h

## Description
Implement a GET endpoint that returns aggregated business metrics including total requests, conversion rates, average response times, revenue figures, and top operators. This powers the analytics dashboard.

## Acceptance Criteria
- GET `/api/analytics` returns aggregated business metrics
- Response includes: total requests, quotes received, proposals sent, conversion rate
- Response includes: average response time, revenue metrics, top 5 operators
- Date range filtering via `from` and `to` query parameters
- Default date range is last 30 days
- Metrics are computed from database aggregations (not real-time calculation)
- Authentication required (admin/broker role check)
- Response time is under 500ms for typical date ranges
- Unit tests verify metric calculations and date filtering

## Implementation Details
- **File(s)**: `app/api/analytics/route.ts`
- **Approach**: Create a Next.js GET route handler. Parse date range from query parameters. Execute Supabase aggregate queries (COUNT, AVG, SUM) on the requests, quotes, and proposals tables. Compute derived metrics (conversion rate = proposals_accepted / quotes_received). Return the structured JSON response.

## Dependencies
- Database tables (requests, quotes, proposals) must have sufficient data
- [[TASK250-analytics-summary-card|TASK250]] (analytics-summary-card) consumes this endpoint
