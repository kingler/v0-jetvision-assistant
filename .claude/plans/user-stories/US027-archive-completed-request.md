# User Story ID: US027
# Title: Archive Completed Request
# Parent Epic: [[EPIC006-request-lifecycle|EPIC006 - Request Lifecycle Management]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to archive completed requests, so that my active list stays clean.

## Acceptance Criteria

### AC1: Move to Archived Tab
**Given** a completed request
**When** I archive it
**Then** it moves to the archived tab

### AC2: Archived Request Access
**Given** an archived request
**When** I view the archive
**Then** I can still see its full details

## Tasks
- [[TASK060-archive-request|TASK060 - Implement archive functionality that moves completed requests to the archived tab while preserving full detail access]]

## Technical Notes
- Archiving sets an `archived` flag on the request record in the database rather than deleting data
- The sidebar tabs (Active/Archived) filter requests based on the archived flag
- Archived requests retain all data: route details, quotes, messages, proposal history, and stage progression
- Only completed or cancelled requests can be archived; active requests must be cancelled first
- The archive action is reversible -- requests can be unarchived if needed
