/**
 * Agent Coordination Module
 * Export all coordination functionality
 */

export { AgentMessageBus, MessageType, type AgentBusMessage, type MessageHandler, messageBus } from './message-bus'
export { HandoffManager, handoffManager } from './handoff-manager'
export { AgentTaskQueue, type TaskQueueConfig, type TaskJobData, type TaskResult } from './task-queue'
export {
  WorkflowStateMachine,
  WorkflowStateManager,
  WorkflowState,
  type StateTransition,
  workflowManager
} from './state-machine'
export {
  TerminalManager,
  TerminalStatus,
  type TerminalConfig,
  type TerminalInstance,
  terminalManager
} from './terminal-manager'
export {
  LinearAgentSpawner,
  type LinearIssueConfig,
  linearAgentSpawner,
  spawnAgentForLinearIssue,
  spawnAgentsForLinearIssues
} from './linear-agent-spawner'
export { type TerminalHandoffConfig } from './handoff-manager'
