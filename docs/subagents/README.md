# JetVision AI Assistant - Subagents Documentation

**Version**: 1.0.0
**Last Updated**: October 20, 2025
**AI Model**: GPT-5
**Framework**: OpenAI Agents Python SDK

---

## 📚 Documentation Overview

This directory contains comprehensive documentation for all AI subagents and their supporting technologies in the JetVision AI Assistant system. The documentation is organized to help developers understand, implement, and maintain each component effectively.

---

## 🤖 AI Agents Documentation

The JetVision system uses 6 specialized AI agents, each with specific responsibilities:

### Core Agents

1. **[RFP Orchestrator Agent](./agents/orchestrator/README.md)**
   - Main workflow coordinator
   - Delegates tasks to specialized agents
   - Manages agent communication and state
   - **Technology**: GPT-5, BullMQ

2. **[Client Data Manager Agent](./agents/client-data/README.md)**
   - Client profile analysis and management
   - Google Sheets synchronization
   - Client history tracking
   - **Technology**: GPT-5, Google Sheets API, Supabase

3. **[Flight Search Agent](./agents/flight-search/README.md)**
   - Aircraft search and filtering
   - Avinode API integration via MCP
   - RFP creation and management
   - **Technology**: GPT-5, Avinode MCP Server

4. **[Proposal Analysis Agent](./agents/proposal-analysis/README.md)**
   - Multi-factor quote scoring
   - Proposal comparison and ranking
   - Recommendation generation
   - **Technology**: GPT-5, Advanced reasoning

5. **[Communication Manager Agent](./agents/communication/README.md)**
   - Email generation and personalization
   - Gmail API integration via MCP
   - Communication history tracking
   - **Technology**: GPT-5, Gmail MCP Server

6. **[Error Monitoring Agent](./agents/error-monitor/README.md)**
   - Real-time error detection
   - Automatic recovery strategies
   - Logging and alerting
   - **Technology**: GPT-5, Sentry, Supabase

---

## 🔧 Technology Stack Documentation

### Queue Management
- **[BullMQ Documentation](./technology-stack/bullmq/README.md)**
  - Queue setup and configuration
  - Job processing patterns
  - Worker management
  - Error handling and retries

### Aviation APIs
- **[Avinode API Documentation](./technology-stack/avinode/README.md)**
  - Empty leg search
  - Watch management
  - Airport search and pricing
  - Quote and RFQ creation
  - MCP server integration

### AI/ML Framework
- **[OpenAI Agents Python SDK](./technology-stack/openai-agents/README.md)**
  - Agent creation and configuration
  - Tool context and execution
  - Sessions and streaming
  - MCP integration patterns

### Supporting Services
- **[Supporting Services Documentation](./technology-stack/supporting-services/README.md)**
  - Clerk authentication integration
  - Supabase database and auth
  - Google APIs (Sheets, Gmail)
  - Next.js framework patterns
  - Vercel deployment strategies

---

## 📖 Integration Guides

- **[Integration Patterns](./guides/integration-patterns.md)**
  - Agent communication patterns
  - MCP server integration
  - Database access patterns
  - Error handling strategies

- **[Best Practices](./guides/best-practices.md)**
  - Code organization
  - Testing strategies
  - Performance optimization
  - Security considerations

- **[Common Pitfalls](./guides/common-pitfalls.md)**
  - Known issues and solutions
  - Debugging tips
  - Troubleshooting guide

---

## 🚀 Quick Start

### For New Developers

1. **Read the Agent Documentation**: Start with the [RFP Orchestrator](./agents/orchestrator/README.md) to understand the overall workflow
2. **Review Technology Stack**: Familiarize yourself with [BullMQ](./technology-stack/bullmq/README.md) and [OpenAI Agents](./technology-stack/openai-agents/README.md)
3. **Check Integration Patterns**: Review [Integration Patterns](./guides/integration-patterns.md) before implementing
4. **Follow Best Practices**: Reference [Best Practices](./guides/best-practices.md) throughout development

### For Implementing a New Agent

1. Copy the base agent structure from any existing agent documentation
2. Define agent tools and capabilities
3. Implement agent logic using OpenAI Agents SDK
4. Add BullMQ job processing
5. Write comprehensive tests
6. Update this documentation

---

## 📦 Project Context

This documentation supports the main implementation plan:
- **[Main README](../../README.md)** - Project overview
- **[Implementation Plan](../../IMPLEMENTATION_PLAN.md)** - 6-7 week schedule
- **[System Architecture](../../SYSTEM_ARCHITECTURE.md)** - Visual diagrams
- **[Prerequisites](../../PREREQUISITES_CHECKLIST.md)** - Setup requirements

---

## 🔄 Documentation Maintenance

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Oct 20, 2025 | Initial documentation structure |

### Contributing to Documentation

When updating agent or technology documentation:

1. Update version numbers and timestamps
2. Add changelog entries
3. Update code examples to reflect latest patterns
4. Cross-reference related documentation
5. Test all code examples

### Documentation Standards

- Use Markdown with GitHub-flavored syntax
- Include code blocks with language identifiers
- Add working code examples
- Link to official documentation
- Include error handling examples
- Add diagrams where helpful (Mermaid syntax)

---

## 🆘 Getting Help

- **Issues**: Create GitHub issue with `docs` label
- **Questions**: Check agent-specific README files first
- **Updates**: Follow version history for changes
- **Errors**: Reference [Common Pitfalls](./guides/common-pitfalls.md)

---

**Built with ❤️ using Next.js 14, OpenAI GPT-5, and Supabase**

**Documentation Status**: ✅ Complete and Current
