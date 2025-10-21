/**
 * Agent Factory
 * Creates and initializes agents based on configuration
 */

import type { IAgent, IAgentFactory, AgentConfig, AgentType } from './types'
import { AgentRegistry } from './agent-registry'
import { BaseAgent } from './base-agent'

/**
 * Agent Factory
 * Responsible for creating agent instances
 */
export class AgentFactory implements IAgentFactory {
  private static instance: AgentFactory
  private registry: AgentRegistry
  private agentConstructors: Map<
    AgentType,
    new (config: AgentConfig) => BaseAgent
  > = new Map()

  private constructor() {
    this.registry = AgentRegistry.getInstance()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AgentFactory {
    if (!AgentFactory.instance) {
      AgentFactory.instance = new AgentFactory()
    }
    return AgentFactory.instance
  }

  /**
   * Register an agent constructor
   * This allows the factory to create instances of specific agent types
   */
  registerAgentType(
    type: AgentType,
    constructor: new (config: AgentConfig) => BaseAgent
  ): void {
    this.agentConstructors.set(type, constructor)
    console.log(`[AgentFactory] Registered agent type: ${type}`)
  }

  /**
   * Create a new agent instance
   */
  createAgent(config: AgentConfig): IAgent {
    const AgentConstructor = this.agentConstructors.get(config.type)

    if (!AgentConstructor) {
      throw new Error(
        `No constructor registered for agent type: ${config.type}\n` +
          `Available types: ${Array.from(this.agentConstructors.keys()).join(', ')}`
      )
    }

    // Create the agent instance
    const agent = new AgentConstructor(config)

    // Register with the registry
    this.registry.register(agent)

    console.log(
      `[AgentFactory] Created agent: ${agent.name} (${agent.id}) - Type: ${agent.type}`
    )

    return agent
  }

  /**
   * Create and initialize an agent
   */
  async createAndInitialize(config: AgentConfig): Promise<IAgent> {
    const agent = this.createAgent(config)
    await agent.initialize()
    return agent
  }

  /**
   * Get agent by ID from registry
   */
  getAgent(id: string): IAgent | undefined {
    return this.registry.getAgent(id)
  }

  /**
   * Get all agents from registry
   */
  getAllAgents(): IAgent[] {
    return this.registry.getAllAgents()
  }

  /**
   * Get all agents of a specific type
   */
  getAgentsByType(type: AgentType): IAgent[] {
    return this.registry.getAgentsByType(type)
  }

  /**
   * Get factory status
   */
  getStatus(): {
    registeredTypes: AgentType[]
    totalAgents: number
    agentsByType: Record<string, number>
  } {
    const registryStatus = this.registry.getStatus()

    return {
      registeredTypes: Array.from(this.agentConstructors.keys()),
      totalAgents: registryStatus.totalAgents,
      agentsByType: registryStatus.agentsByType,
    }
  }
}
