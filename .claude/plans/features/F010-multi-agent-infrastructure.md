# Feature ID: F010
# Feature Name: Multi-Agent Infrastructure
# Status: Partial (Core complete, agent implementations pending)
# Priority: Critical

## Description
Multi-agent system infrastructure providing agent lifecycle management, inter-agent coordination, and asynchronous task processing. Built on the OpenAI Agent SDK with MCP (Model Context Protocol) server integration, this feature forms the backbone of the Jetvision AI system, enabling specialized agents to collaborate on complex charter flight brokerage workflows.

## Business Value
The multi-agent infrastructure enables the platform to decompose complex brokerage workflows (RFP processing, proposal generation, client communication) into specialized, independently testable agent units. This architecture supports parallel task execution, fault-tolerant handoffs, and observable workflow state tracking, making the system scalable and maintainable as new capabilities are added.

## Key Capabilities
- Agent core framework:
  - BaseAgent abstract class with standardized lifecycle (initialize, execute, shutdown)
  - AgentFactory singleton for creating and configuring agent instances
  - AgentRegistry for central agent discovery and lookup
  - AgentContextManager for shared state across agent executions
- Agent coordination layer:
  - MessageBus with 7 message types (TASK_CREATED, TASK_STARTED, TASK_COMPLETED, TASK_FAILED, AGENT_HANDOFF, CONTEXT_UPDATE, ERROR) plus terminal event types
  - HandoffManager for typed task delegation between agents with accept/reject semantics
  - AgentTaskQueue backed by BullMQ and Redis with 4 priority levels (urgent, high, normal, low)
  - WorkflowStateMachine with 11 states tracking RFP processing from CREATED through COMPLETED/FAILED/CANCELLED
- MCP server integration via stdio transport for tool execution
- Terminal orchestration for spawning isolated Claude Code instances per Linear issue
- Linear issue agent spawner for automated issue-to-agent assignment
- Git worktree workspace management for isolated development environments
- Phase-to-agent mapping across 9 SDLC phases (branch-init through merge)

## Related Epics
- [[EPIC022-agent-core|EPIC022 - Agent Core]]
- [[EPIC023-agent-coordination|EPIC023 - Agent Coordination]]
- [[EPIC024-mcp-server-infrastructure|EPIC024 - MCP Server Infrastructure]]

## Dependencies
- [[F009-authentication-onboarding|F009 - Authentication and Onboarding (user identity required for agent session context)]]

## Technical Components
- `agents/core/base-agent.ts` - Abstract base class all agents extend
- `agents/core/agent-factory.ts` - Singleton factory for agent creation
- `agents/core/agent-registry.ts` - Central registry for agent discovery
- `agents/core/agent-context.ts` - Shared context manager across agent executions
- `agents/core/types.ts` - Type definitions (AgentType, AgentStatus, AgentConfig, AgentResult)
- `agents/coordination/message-bus.ts` - EventEmitter-based pub/sub messaging
- `agents/coordination/handoff-manager.ts` - Task delegation with accept/reject protocol
- `agents/coordination/task-queue.ts` - BullMQ-backed async task queue with Redis
- `agents/coordination/state-machine.ts` - Workflow state machine with enforced transitions
- `mcp-servers/` - MCP server implementations (Avinode, Gmail, Supabase)
- `mcp-servers/shared/` - Shared MCP utilities and transport configuration
- Redis required for BullMQ task queue (port 6379)
