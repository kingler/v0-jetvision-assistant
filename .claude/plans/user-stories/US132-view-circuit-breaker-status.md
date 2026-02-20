# User Story ID: US132
# Title: View Circuit Breaker Status
# Parent Epic: [[EPIC032-health-monitoring|EPIC032 - System Health & Diagnostics]]
# Status: Partial
# Priority: Medium
# Story Points: 2

## User Story
As an admin, I want to view circuit breaker status, so I know if external services are healthy.

## Acceptance Criteria

### AC1: Circuit Breaker State Visibility
**Given** circuit breakers are configured for external service calls
**When** I check the health status endpoint
**Then** I see the current state (open, closed, or half-open) for each monitored service

## Tasks
- [[TASK246-health-endpoint|TASK246 - Implement health endpoint exposing circuit breaker states]]

## Technical Notes
- Circuit breaker pattern applied to: Avinode API, Supabase, Gmail API
- States: closed (healthy), open (failing, requests blocked), half-open (testing recovery)
- Health endpoint: GET `/api/health/circuit-breakers`
- Thresholds configurable: failure count, timeout duration, recovery interval
- Status partially implemented; admin UI dashboard pending
