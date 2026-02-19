# User Story ID: US127
# Title: View Session List in Sidebar
# Parent Epic: [[EPIC031-sidebar-navigation|EPIC031 - Sidebar & Session Management UI]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As an ISO agent, I want to see all sessions in a sidebar, so I can navigate between conversations.

## Acceptance Criteria

### AC1: Session List Display
**Given** chat sessions exist for the current user
**When** the sidebar renders
**Then** each session shows the route, date, status, and flight request stage badge

### AC2: Animated Session List
**Given** the session list renders
**When** sessions appear or update
**Then** Framer Motion stagger animations apply for smooth visual transitions

## Tasks
- [[TASK237-sidebar-session-list|TASK237 - Implement sidebar session list with route, date, status, and stage badge]]
- [[TASK238-stagger-animations|TASK238 - Apply Framer Motion stagger animations to session list items]]

## Technical Notes
- Sidebar component at `components/chat-sidebar.tsx`
- Session items display: route (e.g., "KTEB -> KLAX"), relative date, status indicator
- FlightRequestStageBadge component shows current workflow stage
- Stagger animation: 50ms delay between items using Framer Motion's staggerChildren
- List sorted by most recent activity (updated_at descending)
