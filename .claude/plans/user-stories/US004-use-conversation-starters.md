# User Story ID: US004
# Title: Use Conversation Starters
# Parent Epic: [[EPIC001-chat-interface-core|EPIC001 - Core Chat Experience]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to see smart conversation starters, so that I can quickly initiate common workflows.

## Acceptance Criteria

### AC1: Display starter prompts on empty chat
**Given** the chat is empty
**When** I view the chat
**Then** I see starter prompts for flight requests, active requests, hot opportunities, and deals

### AC2: Activate starter on click
**Given** I click a starter
**When** it activates
**Then** the prompt text is sent as my message

## Tasks
- [[TASK010-implement-conversation-starters|TASK010 - Implement conversation starter components]]
- [[TASK011-hook-smart-starters|TASK011 - Hook up smart starters with useSmartStarters]]

## Technical Notes
- Conversation starters are rendered as clickable cards/buttons in the empty chat state
- The `useSmartStarters` hook provides contextual starter prompts based on user state and recent activity
- Starter categories include: flight request, active requests overview, hot opportunities, and deals pipeline
- Clicking a starter programmatically submits the prompt text through the same message submission flow
- Starters disappear once the first message is sent in the session
