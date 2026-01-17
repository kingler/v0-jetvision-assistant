/**
 * Circuit Breaker Health Check API
 *
 * Provides health status and metrics for all circuit breakers.
 * Useful for monitoring dashboards, alerts, and observability.
 *
 * @module app/api/health/circuit-breakers/route.ts
 *
 * @example
 * GET /api/health/circuit-breakers
 *
 * Response:
 * {
 *   "status": "healthy",
 *   "timestamp": "2024-01-15T10:30:00.000Z",
 *   "summary": {
 *     "totalCircuits": 3,
 *     "closedCount": 2,
 *     "openCount": 1,
 *     "halfOpenCount": 0,
 *     "overallHealth": "degraded",
 *     "aggregateSuccessRate": 95.5
 *   },
 *   "circuits": {
 *     "avinode-api": { ... },
 *     "linear-api": { ... }
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import {
  getCircuitBreakerRegistry,
  CircuitBreakerHealthSummary,
} from '@/lib/resilience';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Response format for circuit breaker health check
 */
interface CircuitBreakerHealthResponse {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Timestamp of the health check */
  timestamp: string;
  /** Summary statistics */
  summary: {
    totalCircuits: number;
    closedCount: number;
    openCount: number;
    halfOpenCount: number;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    aggregateSuccessRate: number;
    totalRequests: number;
    unhealthyCircuits: string[];
  };
  /** Individual circuit metrics */
  circuits: CircuitBreakerHealthSummary['circuits'];
}

// =============================================================================
// ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/health/circuit-breakers
 *
 * Returns health status for all circuit breakers in the system.
 * This endpoint is designed for monitoring tools and dashboards.
 *
 * @returns Health summary and individual circuit metrics
 */
export async function GET(): Promise<NextResponse<CircuitBreakerHealthResponse>> {
  try {
    const registry = getCircuitBreakerRegistry();
    const healthSummary = registry.getHealthSummary();

    const response: CircuitBreakerHealthResponse = {
      status: healthSummary.overallHealth,
      timestamp: new Date().toISOString(),
      summary: {
        totalCircuits: healthSummary.totalCircuits,
        closedCount: healthSummary.closedCount,
        openCount: healthSummary.openCount,
        halfOpenCount: healthSummary.halfOpenCount,
        overallHealth: healthSummary.overallHealth,
        aggregateSuccessRate: healthSummary.aggregateSuccessRate,
        totalRequests: healthSummary.totalRequests,
        unhealthyCircuits: healthSummary.unhealthyCircuits,
      },
      circuits: healthSummary.circuits,
    };

    // Set appropriate HTTP status based on health
    const httpStatus =
      healthSummary.overallHealth === 'healthy'
        ? 200
        : healthSummary.overallHealth === 'degraded'
          ? 200 // Still return 200 for degraded to not trigger alerts unnecessarily
          : 503; // Service unavailable for unhealthy

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    console.error('[CircuitBreakerHealth] Error getting health status:', error);

    return NextResponse.json(
      {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        summary: {
          totalCircuits: 0,
          closedCount: 0,
          openCount: 0,
          halfOpenCount: 0,
          overallHealth: 'unhealthy' as const,
          aggregateSuccessRate: 0,
          totalRequests: 0,
          unhealthyCircuits: [],
        },
        circuits: {},
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/circuit-breakers
 *
 * Perform admin actions on circuit breakers.
 * Actions: reset, reset-all
 *
 * Body:
 * {
 *   "action": "reset" | "reset-all",
 *   "circuit": "circuit-name" // Required for "reset" action
 * }
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, circuit } = body;

    const registry = getCircuitBreakerRegistry();

    switch (action) {
      case 'reset':
        if (!circuit) {
          return NextResponse.json(
            { error: 'Circuit name required for reset action' },
            { status: 400 }
          );
        }

        const cb = registry.get(circuit);
        if (!cb) {
          return NextResponse.json(
            { error: `Circuit "${circuit}" not found` },
            { status: 404 }
          );
        }

        cb.reset();
        console.log(`[CircuitBreakerHealth] Circuit "${circuit}" reset via API`);

        return NextResponse.json({
          success: true,
          action: 'reset',
          circuit,
          message: `Circuit "${circuit}" has been reset to CLOSED state`,
        });

      case 'reset-all':
        registry.resetAll();
        console.log('[CircuitBreakerHealth] All circuits reset via API');

        return NextResponse.json({
          success: true,
          action: 'reset-all',
          message: 'All circuit breakers have been reset to CLOSED state',
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[CircuitBreakerHealth] Error handling POST:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
