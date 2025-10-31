# AI Agents

This directory contains all AI agent implementations for the Jetvision Assistant system.

## Agent Files

- `base-agent.ts` - Base class for all agents with common functionality
- `rfp-orchestrator-agent.ts` - Main workflow coordinator
- `client-data-manager-agent.ts` - Client profile and preference management
- `flight-search-agent.ts` - Aircraft search and RFP distribution
- `proposal-analysis-agent.ts` - Multi-factor quote scoring
- `communication-manager-agent.ts` - Email generation and delivery
- `error-monitoring-agent.ts` - Error logging and recovery

## Usage

All agents extend the `BaseAgent` class and communicate with:
- OpenAI Assistants API for AI processing
- Supabase for data persistence
- MCP servers for external integrations

See `/docs/AGENT_TOOLS.md` for detailed agent documentation.
