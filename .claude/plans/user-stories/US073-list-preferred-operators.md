# User Story ID: US073
# Title: List Preferred Operators
# Parent Epic: [[EPIC017-operator-management|EPIC017 - Operator Management]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to see preferred operators, so I can prioritize trusted partners.

## Acceptance Criteria

### AC1: Preferred operators display with details
**Given** preferred operators exist
**When** I list them
**Then** they display with their details and status

## Tasks
- [[TASK142-list-preferred-operators|TASK142 - Call list_preferred_operators MCP]]

## Technical Notes
- Preferred operators are fetched via the `list_preferred_operators` Supabase MCP tool
- Preferred status is a flag on the operator profile that agents can set
- The list displays company name, fleet info, and preferred status indicator
- Preferred operators may be prioritized in quote analysis and proposal generation
