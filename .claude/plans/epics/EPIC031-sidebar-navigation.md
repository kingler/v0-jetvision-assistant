# Epic ID: EPIC031
# Epic Name: Chat Sidebar Navigation
# Parent Feature: [[F013-chat-session-management|F013 - Chat Session Management]]
# Status: Implemented
# Priority: High

## Description
Chat sidebar component that displays all user sessions in a navigable list with status indicators, unread badges, and filtering capabilities. Supports quick switching between sessions, displays flight request context cards inline, and uses Framer Motion stagger animations for smooth list rendering.

## Goals
- Display all chat sessions with status, title, and last message preview
- Enable quick switching between active sessions without page reload
- Show unread message indicators for sessions with new activity
- Provide filtering between active and archived sessions

## User Stories
- [[US127-view-session-list|US127 - View session list in sidebar with title, status, and last activity time]]
- [[US128-switch-between-sessions|US128 - Switch between chat sessions with instant content loading]]
- [[US129-view-unread-badges|US129 - View unread message badge count on sessions with new activity]]
- [[US130-filter-active-archived|US130 - Filter sidebar between active and archived sessions]]
- [[US131-view-operator-threads-per-session|US131 - View operator thread summaries per session for Avinode interactions]]

## Acceptance Criteria Summary
- Sidebar displays all sessions for the authenticated user, sorted by last activity
- Clicking a session loads its messages into the main chat panel without full page reload
- Unread badge shows count of messages received since last session view
- Filter toggles between "Active" and "Archived" session states
- Flight request cards display inline with route, date, and stage badge
- Session list animates with staggered entrance using Framer Motion
- Sidebar is collapsible on desktop and renders as overlay on mobile

## Technical Scope
- components/chat-sidebar.tsx - Main sidebar component with session list and filters
- components/chat/flight-request-card.tsx - Inline flight request context card
- components/chat-interface.tsx - Session switching and message panel integration
- Framer Motion - AnimatePresence, stagger animations for list items
- app/page.tsx - Layout integration with sidebar and main chat panel
