# User Story ID: US072
# Title: View Operator Profile
# Parent Epic: [[EPIC017-operator-management|EPIC017 - Operator Management]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to view operator profiles, so I can evaluate operator quality.

## Acceptance Criteria

### AC1: Profile shows operator details
**Given** an operator exists
**When** I view their profile
**Then** I see company name, certifications, fleet info, and contact details

## Tasks
- [[TASK140-get-operator-mcp|TASK140 - Call get_operator MCP tool]]
- [[TASK141-display-operator-profile|TASK141 - Display operator profile]]

## Technical Notes
- Operator profiles are fetched via the `get_operator` Supabase MCP tool
- Profile data includes `company_name`, `certifications`, `fleet_info`, and `contact_details`
- Profiles are auto-populated from webhook data and can be enriched manually
- The profile view is accessible from quote cards and operator message threads
