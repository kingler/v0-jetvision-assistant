# User Story ID: US104
# Title: Typography Scales Responsively
# Parent Epic: [[EPIC025-design-tokens-theme|EPIC025 - Design System Foundation]]
# Status: Implemented
# Priority: High
# Story Points: 2

## User Story
As a user, I want typography to scale responsively, so text is readable on all devices.

## Acceptance Criteria

### AC1: Responsive Font Scaling
**Given** responsive font sizing is configured
**When** viewing the app on mobile devices
**Then** the base font is 16px; on desktop, it scales up to 20px via clamp() functions

## Tasks
- [[TASK201-responsive-font-scale|TASK201 - Implement responsive font scale using clamp() in the design system]]

## Technical Notes
- Font scale uses CSS clamp() for fluid typography between breakpoints
- Base size: 16px (mobile) to 20px (desktop)
- Heading hierarchy scales proportionally
- Defined in design system tokens and applied via Tailwind config
