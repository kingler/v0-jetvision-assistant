/**
 * MCP Health Check API Route
 * ONEK-80: Add Health Check Endpoint for MCP Server Status
 *
 * GET /api/mcp/health
 * Returns health status of all registered MCP servers
 *
 * Response Codes:
 * - 200: All servers healthy or transitional states
 * - 401: Unauthorized
 * - 503: One or more servers unhealthy (crashed/failed)
 * - 500: Server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MCPServerManager, ServerState } from '@/lib/services/mcp-server-manager';

/**
 * Format uptime in milliseconds to human-readable string
 *
 * @param ms - Uptime in milliseconds
 * @returns Formatted uptime string (e.g., "2m 5s", "1h 23m 45s", "2d 5h 30m")
 *
 * @example
 * formatUptime(125000)  // Returns "2m 5s"
 * formatUptime(3661000) // Returns "1h 1m 1s"
 * formatUptime(90061000) // Returns "1d 1h 1m 1s"
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours % 24 > 0) parts.push(`${hours % 24}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

  return parts.join(' ') || '0s';
}

/**
 * Check if a server state is considered unhealthy
 *
 * A server is considered unhealthy if it has crashed or failed.
 * Transitional states (starting, stopping) are not considered unhealthy.
 *
 * @param state - Server state from ServerState enum
 * @returns True if server is in CRASHED or FAILED state
 *
 * @example
 * isUnhealthy(ServerState.RUNNING)  // Returns false
 * isUnhealthy(ServerState.CRASHED)  // Returns true
 * isUnhealthy(ServerState.STARTING) // Returns false
 * isUnhealthy(ServerState.FAILED)   // Returns true
 */
function isUnhealthy(state: ServerState): boolean {
  return state === ServerState.CRASHED || state === ServerState.FAILED;
}

/**
 * GET /api/mcp/health
 * Returns health status of all registered MCP servers
 *
 * @param request - Next.js request object
 * @returns JSON response with health status
 *
 * @example Response (200 - Healthy):
 * ```json
 * {
 *   "status": "healthy",
 *   "timestamp": "2025-11-01T15:00:00.000Z",
 *   "serverCount": 1,
 *   "servers": {
 *     "avinode": {
 *       "name": "avinode",
 *       "state": "running",
 *       "uptime": 125000,
 *       "uptimeFormatted": "2m 5s",
 *       "restartCount": 0,
 *       "pid": 12345
 *     }
 *   }
 * }
 * ```
 *
 * @example Response (503 - Unhealthy):
 * ```json
 * {
 *   "status": "unhealthy",
 *   "timestamp": "2025-11-01T15:00:00.000Z",
 *   "serverCount": 1,
 *   "servers": {
 *     "avinode": {
 *       "name": "avinode",
 *       "state": "crashed",
 *       "uptime": 5000,
 *       "uptimeFormatted": "5s",
 *       "restartCount": 2
 *     }
 *   }
 * }
 * ```
 *
 * @throws 401 - Unauthorized (not authenticated)
 * @throws 503 - Service Unavailable (one or more servers unhealthy)
 * @throws 500 - Internal Server Error
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get MCP server manager instance
    const manager = MCPServerManager.getInstance();

    // Get health status for all servers
    const healthStatus = manager.getHealthStatus();

    // Determine overall system health
    const unhealthyServers = Object.values(healthStatus).filter((server) =>
      isUnhealthy(server.state)
    );

    const overallStatus = unhealthyServers.length > 0 ? 'unhealthy' : 'healthy';
    const statusCode = unhealthyServers.length > 0 ? 503 : 200;

    // Format response with human-readable uptime
    const formattedServers = Object.fromEntries(
      Object.entries(healthStatus).map(([name, server]) => [
        name,
        {
          ...server,
          uptimeFormatted: formatUptime(server.uptime),
        },
      ])
    );

    // Build response
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      serverCount: Object.keys(healthStatus).length,
      servers: formattedServers,
    };

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('[MCP Health Check] Error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
