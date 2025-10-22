/**
 * Client Data Agent Implementation
 *
 * Fetches client profiles from Google Sheets using the MCP server.
 * Enriches context with client preferences, VIP status, and contact information.
 */

import { BaseAgent } from '../core/base-agent';
import type {
  AgentContext,
  AgentResult,
  AgentConfig,
} from '../core/types';
import { AgentType, AgentStatus } from '../core/types';

interface ClientData {
  found: boolean;
  clientName: string;
  email?: string;
  phone?: string;
  company?: string;
  preferences?: Record<string, unknown>;
  vipStatus?: 'standard' | 'vip' | 'ultra_vip';
  matchType?: 'exact' | 'fuzzy';
}

/**
 * ClientDataAgent
 * Fetches and enriches client data from Google Sheets
 */
export class ClientDataAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.CLIENT_DATA,
    });
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    await super.initialize();
    console.log(`[${this.name}] ClientDataAgent initialized`);
  }

  /**
   * Execute the agent
   * Fetches client data from Google Sheets MCP server
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this._status = AgentStatus.RUNNING;

    try {
      // Extract client name from context
      const clientName = this.extractClientName(context);

      // Validate client name
      if (!clientName) {
        throw new Error('Missing required client name in context');
      }

      // Search for client using Google Sheets MCP
      const clientData = await this.searchClient(clientName);

      // Update metrics
      this.metrics.totalExecutions++;
      this.metrics.successfulExecutions++;
      this._status = AgentStatus.COMPLETED;

      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);

      return {
        success: true,
        data: {
          ...clientData,
          requestId: context.requestId,
          sessionId: context.sessionId,
          nextAgent: AgentType.FLIGHT_SEARCH,
        },
        metadata: {
          executionTime,
          toolCalls: this.metrics.toolCallsCount,
        },
      };
    } catch (error) {
      // Handle errors
      this.metrics.totalExecutions++;
      this.metrics.failedExecutions++;
      this._status = AgentStatus.ERROR;

      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error as Error,
        metadata: {
          executionTime,
        },
      };
    }
  }

  /**
   * Extract client name from context
   */
  private extractClientName(context: AgentContext): string | undefined {
    return context.metadata?.clientName as string | undefined;
  }

  /**
   * Search for client using Google Sheets MCP
   * This is a mock implementation - in production would use actual MCP server
   */
  private async searchClient(clientName: string): Promise<ClientData> {
    // Increment tool calls metric
    this.metrics.toolCallsCount++;

    // Mock client database for testing
    const mockClients: Record<string, Omit<ClientData, 'found' | 'clientName' | 'matchType'>> = {
      'John Smith': {
        email: 'john.smith@example.com',
        phone: '+1-555-0123',
        company: 'Smith Corp',
        preferences: {
          aircraftType: 'light_jet',
          budget: 50000,
          amenities: ['wifi', 'catering'],
        },
        vipStatus: 'vip',
      },
      'Jane Doe': {
        email: 'jane.doe@example.com',
        phone: '+1-555-0456',
        company: 'Doe Industries',
        preferences: {
          aircraftType: 'midsize',
          budget: 75000,
        },
        vipStatus: 'ultra_vip',
      },
    };

    // Search for exact match
    const clientData = mockClients[clientName];

    if (clientData) {
      return {
        found: true,
        clientName,
        matchType: 'exact',
        ...clientData,
      };
    }

    // Client not found
    return {
      found: false,
      clientName,
    };
  }

  /**
   * Update average execution time
   */
  private updateAverageExecutionTime(executionTime: number): void {
    const totalExecutions = this.metrics.totalExecutions;
    const currentAverage = this.metrics.averageExecutionTime;

    this.metrics.averageExecutionTime =
      (currentAverage * (totalExecutions - 1) + executionTime) / totalExecutions;
  }
}
