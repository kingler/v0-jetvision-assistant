/**
 * Agent Registry
 * Central registry for all agents in the system
 */

import type { IAgent, IAgentRegistry, AgentType } from './types'

/**
 * Singleton Agent Registry
 * Maintains a registry of all active agents
 */
export class AgentRegistry implements IAgentRegistry {
  private static instance: AgentRegistry
  private agents: Map<string, IAgent> = new Map()

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry()
    }
    return AgentRegistry.instance
  }

  /**
   * Register an agent
   */
  register(agent: IAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent already registered: ${agent.id}`)
    }

    this.agents.set(agent.id, agent)
    console.log(
      `[AgentRegistry] Registered agent: ${agent.name} (${agent.id}) - Type: ${agent.type}`
    )
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      this.agents.delete(agentId)
      console.log(`[AgentRegistry] Unregistered agent: ${agent.name} (${agentId})`)
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): IAgent | undefined {
    return this.agents.get(agentId)
  }

  /**
   * Get all agents of a specific type
   */
  getAgentsByType(type: AgentType): IAgent[] {
    return Array.from(this.agents.values()).filter((agent) => agent.type === type)
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): IAgent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get total agent count
   */
  getCount(): number {
    return this.agents.size
  }

  /**
   * Check if agent exists
   */
  has(agentId: string): boolean {
    return this.agents.has(agentId)
  }

  /**
   * Clear all agents (useful for testing)
   */
  clear(): void {
    this.agents.clear()
    console.log('[AgentRegistry] Cleared all agents')
  }

  /**
   * Get registry status
   */
  getStatus(): {
    totalAgents: number
    agentsByType: Record<string, number>
    agents: Array<{ id: string; name: string; type: AgentType; status: string }>
  } {
    const agentsByType: Record<string, number> = {}
    const agents: Array<{ id: string; name: string; type: AgentType; status: string }> =
      []

    for (const agent of this.agents.values()) {
      // Count by type
      agentsByType[agent.type] = (agentsByType[agent.type] || 0) + 1

      // Collect agent info
      agents.push({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
      })
    }

    return {
      totalAgents: this.agents.size,
      agentsByType,
      agents,
    }
  }
}
