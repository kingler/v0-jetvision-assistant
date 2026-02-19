# Epic ID: EPIC003
# Epic Name: Rich Message Components
# Parent Feature: [[F001-ai-chat-assistant|F001 - AI Chat Interface]]
# Status: Implemented
# Priority: High

## Description
A library of 20+ rich message component types for displaying structured aviation data inline within the chat interface. This epic covers specialized renderers for quotes, proposals, workflows, file attachments, dashboards, action buttons, and forms that transform raw tool call data into interactive, visually rich UI elements embedded in the conversation flow.

## Goals
- Render quotes, proposals, workflow statuses, attachments, and dashboards inline within chat messages
- Support interactive elements including action buttons, form fields, and expandable sections within messages
- Provide a unified message renderer that dynamically selects the correct component based on message type
- Maintain visual consistency with the design system across all rich message types

## User Stories
- [[US010-view-quote-card-in-chat|US010 - View quote card in chat]]
- [[US011-view-workflow-status|US011 - View workflow status]]
- [[US012-view-proposal-preview|US012 - View proposal preview]]
- [[US013-interact-with-action-buttons|US013 - Interact with action buttons]]
- [[US014-view-file-attachments|US014 - View file attachments]]
- [[US015-view-pipeline-dashboard|US015 - View pipeline dashboard]]

## Acceptance Criteria Summary
- All 20+ message component types render correctly with proper styling and layout
- Action buttons trigger the appropriate API calls and state transitions
- Form fields validate input and submit data back to the AI agent
- File attachments display with correct icons, file size, and download links
- Pipeline dashboard shows accurate stage counts and progress indicators
- Message renderer gracefully falls back for unknown or malformed message types
- All components are responsive and accessible

## Technical Scope
- components/message-components/message-renderer.tsx - Dynamic component selector
- components/message-components/quote-comparison.tsx - Quote comparison grid
- components/message-components/workflow-status.tsx - Workflow stage indicator
- components/message-components/proposal-preview.tsx - Proposal preview card
- components/message-components/action-buttons.tsx - Interactive action buttons
- components/message-components/form-field.tsx - Inline form fields
- components/message-components/file-attachment.tsx - File attachment display
- components/message-components/pipeline-dashboard.tsx - Pipeline overview dashboard
- lib/mcp-ui/tool-ui-registry.ts - Registry mapping tool names to UI components
