# User Story ID: US105
# Title: Dark Mode Toggle
# Parent Epic: [[EPIC025-design-tokens-theme|EPIC025 - Design System Foundation]]
# Status: Implemented
# Priority: Medium
# Story Points: 3

## User Story
As a user, I want to toggle dark mode, so I can use the app in low-light environments.

## Acceptance Criteria

### AC1: Manual Dark Mode Toggle
**Given** light mode is currently active
**When** I toggle to dark mode
**Then** all CSS variables switch to dark values via oklch transitions smoothly

### AC2: System Preference Auto-Detection
**Given** the user's system preference is set
**When** prefers-color-scheme is dark
**Then** dark mode activates automatically on first visit

## Tasks
- [[TASK202-theme-provider|TASK202 - Implement theme provider with toggle functionality]]
- [[TASK203-dark-mode-css-vars|TASK203 - Define dark mode CSS variables using oklch color space]]

## Technical Notes
- Theme provider wraps the application and manages light/dark state
- CSS custom properties switch between light and dark token sets
- oklch color space enables smooth, perceptually uniform transitions
- System preference detection via `prefers-color-scheme` media query
- User preference persisted in localStorage
