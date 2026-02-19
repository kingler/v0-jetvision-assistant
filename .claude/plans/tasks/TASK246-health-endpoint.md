# Task ID: TASK246
# Task Name: Circuit Breaker Health Endpoint
# Parent User Story: [[US132-view-circuit-breaker-status|US132 - Health check endpoint for circuit breakers]]
# Status: Partial
# Priority: Medium
# Estimate: 2h

## Description
Implement a GET health check endpoint that reports the current state of all circuit breakers in the system (Avinode API, Supabase, Gmail, etc.). This supports operational monitoring and diagnostics.

## Acceptance Criteria
- GET `/api/health/circuit-breakers` returns status of all circuit breakers
- Response format: `{ breakers: [{ name, state, failureCount, lastFailure, lastSuccess }] }`
- States: "closed" (healthy), "open" (failing), "half-open" (testing)
- Endpoint is accessible without authentication (public health check)
- Response includes overall system health status (healthy/degraded/unhealthy)
- Response time is under 100ms (no external calls)
- Returns 200 for all states (health info is in the body)
- Unit tests verify response format and state reporting

## Implementation Details
- **File(s)**: `app/api/health/circuit-breakers/route.ts`
- **Approach**: Create a Next.js GET route handler. Import the circuit breaker registry (or create one if needed). Iterate over all registered breakers and collect their current state. Return a JSON response with the aggregated status. Determine overall health based on whether any breakers are open.

## Dependencies
- Circuit breaker implementation must exist or be created
- No authentication dependency (public endpoint)
