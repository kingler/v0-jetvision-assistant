# Feature ID: F001
# Feature Name: AI Chat Assistant
# Status: Implemented
# Priority: Critical

## Description
AI-powered chat assistant that serves as the primary interface for charter flight brokers (ISO agents) to manage their workflow. The assistant understands natural language flight requests, streams responses in real-time via SSE, and renders over 20 rich message types including text, quotes, proposals, contracts, and workflow steps. It provides a conversational experience with message history, conversation starters, error recovery, and tool call indicators.

## Business Value
The chat assistant is the core product surface through which ISO agents interact with the entire Jetvision system. It eliminates the need for brokers to navigate multiple tools and dashboards by consolidating flight request submission, quote review, proposal generation, and contract management into a single conversational interface. This dramatically reduces the time-to-quote and operational complexity for charter flight brokerage.

## Key Capabilities
- Natural language flight request parsing and submission
- Server-Sent Events (SSE) streaming for real-time response delivery
- Rich message rendering with 20+ component types (text, quotes, proposals, contracts, workflows, flight cards, stage badges, email previews, etc.)
- Conversation starters for quick-access common workflows
- Full message history and persistence across sessions
- Error handling with automatic retry and user-facing error messages
- Tool call progress indicators showing agent actions in real-time
- Markdown rendering for formatted text responses
- Chat session management (create, switch, delete sessions)
- Sidebar with session list and metadata

## Related Epics
- [[EPIC001-chat-interface-core|EPIC001 - Chat Interface Core]]
- [[EPIC002-streaming-realtime|EPIC002 - Streaming & Real-time]]
- [[EPIC003-rich-message-components|EPIC003 - Rich Message Components]]

## Dependencies
- [[F006-avinode-marketplace-integration|F006 - Avinode Integration (for flight search and marketplace tools)]]
- [[F010-multi-agent-infrastructure|F010 - Multi-Agent System (for agent execution and tool orchestration)]]

## Technical Components
- `components/chat-interface.tsx` (39KB) - Main chat UI component with message rendering, input handling, and session management
- `lib/chat/` - Chat logic module including message processing, tool call handling, and agent communication
- `lib/chat/hooks/use-streaming-chat.ts` - React hook for SSE streaming chat with connection management and reconnection
- `lib/chat/parsers/sse-parser.ts` - Server-Sent Events parser for processing streamed agent responses
- `components/message-components/` - Library of 20+ specialized message rendering components
- `components/chat-sidebar.tsx` - Session list sidebar with create/switch/delete functionality
- `lib/conversation/message-persistence.ts` - Message persistence layer for saving and loading chat history
- `app/api/chat-sessions/` - API routes for chat session CRUD operations
- `lib/chat/constants/` - Conversation starters and chat configuration constants
