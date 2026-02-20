# User Story ID: US108
# Title: Responsive Modal (Dialog/Drawer)
# Parent Epic: [[EPIC026-base-ui-components|EPIC026 - Core UI Component Library]]
# Status: Implemented
# Priority: High
# Story Points: 3

## User Story
As a user, I want modals that adapt to my device, so desktop shows dialog and mobile shows bottom sheet.

## Acceptance Criteria

### AC1: Desktop Dialog Rendering
**Given** the viewport is desktop-sized (>=768px)
**When** a modal opens
**Then** it renders as a centered Dialog overlay with backdrop

### AC2: Mobile Drawer Rendering
**Given** the viewport is mobile-sized (<768px)
**When** a modal opens
**Then** it renders as an iOS-style bottom Drawer using Vaul library

## Tasks
- [[TASK208-responsive-modal|TASK208 - Implement responsive modal component that switches between Dialog and Drawer]]
- [[TASK209-use-is-mobile-hook|TASK209 - Use useIsMobile hook for viewport detection and component selection]]

## Technical Notes
- Desktop: Uses Radix Dialog primitive for centered modal overlay
- Mobile: Uses Vaul (Drawer) for native-feeling bottom sheet experience
- `useIsMobile` hook detects viewport width at 768px breakpoint
- Single API surface: developers use one component, rendering adapts automatically
- Smooth transitions between open/close states on both platforms
