# User Story ID: US135
# Title: View Analytics Summary
# Parent Epic: [[EPIC033-analytics-dashboard|EPIC033 - Analytics & Monitoring]]
# Status: Partial
# Priority: Medium
# Story Points: 3

## User Story
As an ISO agent, I want to see analytics, so I can track my business performance.

## Acceptance Criteria

### AC1: Analytics Summary Display
**Given** analytics data is available from completed requests
**When** the analytics summary renders
**Then** I see total request count, quote response rate, and deal closure rate

## Tasks
- [[TASK249-analytics-api|TASK249 - Implement analytics API endpoint aggregating request metrics]]
- [[TASK250-analytics-summary-card|TASK250 - Build analytics summary card component]]

## Technical Notes
- Metrics derived from `requests` and `quotes` tables in Supabase
- Key metrics: total requests, quotes received, quotes accepted, conversion rate
- Time-range filter: 7d, 30d, 90d, all-time
- Summary card component uses design system data display patterns
- Partially implemented; API endpoint exists, full dashboard UI pending
