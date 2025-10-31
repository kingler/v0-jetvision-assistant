/**
 * Agent Module Exports
 *
 * Registers all agent types with the AgentFactory and exports them
 */

import { AgentFactory } from '@/agents/core/agent-factory';
import { AgentType } from '@/agents/core/types';
import { RFPOrchestratorAgent } from './rfp-orchestrator';

/**
 * Initialize and register all agents
 */
export function registerAgents(): void {
  const factory = AgentFactory.getInstance();

  // Register RFP Orchestrator Agent
  factory.registerAgentType(AgentType.ORCHESTRATOR, RFPOrchestratorAgent as any);

  console.log('[Agents] All agent types registered');
}

/**
 * Export agent classes
 */
export { RFPOrchestratorAgent };

/**
 * Export factory and core types
 */
export { AgentFactory };
export * from '@/agents/core/types';
