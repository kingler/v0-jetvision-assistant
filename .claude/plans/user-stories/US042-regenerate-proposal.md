# User Story ID: US042
# Title: Regenerate Proposal
# Parent Epic: [[EPIC009-proposal-generation|EPIC009 - Proposal Generation]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to regenerate a proposal, so that I can update it if details change.

## Acceptance Criteria

### AC1: Regeneration with updated data
**Given** an existing proposal
**When** I request regeneration
**Then** a new PDF generates with updated data

### AC2: Version increment
**Given** regeneration completes
**When** the proposal updates
**Then** the version increments and old PDF is replaced

## Tasks
- [[TASK084-regeneration-api|TASK084 - Implement regeneration API endpoint]]

## Technical Notes
- Regeneration endpoint accepts a proposal ID and re-fetches the latest quote and request data
- Version field on the proposal record increments on each regeneration
- Old PDF is replaced in Supabase Storage with the newly generated file
- Regeneration preserves the existing proposal_number and margin settings
