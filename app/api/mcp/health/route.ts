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
 * @param ms - Uptime in milliseconds
 * @returns Formatted uptime string (e.g., "2m 5s", "1h 23m 45s")
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
 * @param state - Server state
 * @returns True if server is unhealthy
 */
function isUnhealthy(state: ServerState): boolean {
  return state === ServerState.CRASHED || state === ServerState.FAILED;
}

/**
 * GET /api/mcp/health
 * Returns health status of all MCP servers
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
