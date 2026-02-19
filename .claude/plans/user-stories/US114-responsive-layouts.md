# User Story ID: US114
# Title: Responsive Layouts for All Devices
# Parent Epic: [[EPIC027-accessibility-responsive|EPIC027 - Accessibility & Responsiveness]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a mobile user, I want layouts to adapt to my screen size, so the app is usable on all devices.

## Acceptance Criteria

### AC1: Layout Adaptation on Mobile
**Given** the viewport is mobile-sized
**When** the layout renders
**Then** the sidebar collapses to a hamburger menu, cards stack vertically, and modals become bottom drawers

## Tasks
- [[TASK216-responsive-breakpoints|TASK216 - Implement responsive breakpoints aligned with design system]]
- [[TASK217-sidebar-collapse|TASK217 - Implement sidebar collapse logic for mobile viewports]]

## Technical Notes
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Sidebar uses sheet/drawer pattern on mobile, persistent panel on desktop
- Cards use CSS Grid with responsive column counts
- Chat interface adapts input area and message layout for mobile
- useIsMobile hook provides consistent breakpoint detection across components
