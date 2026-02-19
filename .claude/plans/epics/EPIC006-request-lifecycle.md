# Epic ID: EPIC006
# Epic Name: Flight Request Lifecycle Management
# Parent Feature: [[F002-flight-request-management|F002 - Flight Request Management]]
# Status: Implemented
# Priority: High

## Description
End-to-end flight request lifecycle management spanning 10 distinct stages from initial submission through deal closure. This epic covers stage tracking with visual badges, stage transitions driven by user and system actions, request cancellation and archival operations, and filtering/viewing requests by their current lifecycle status.

## Goals
- Track flight requests through 10 lifecycle stages with clear visual indicators
- Display stage badges with color-coded status for quick identification
- Support cancel and archive operations at appropriate lifecycle points
- Enable filtering and browsing of requests by status across the sidebar and dashboard
- Maintain accurate stage history for audit and reporting purposes

## User Stories
- [[US025-view-request-stage-badge|US025 - View request stage badge]]
- [[US026-cancel-active-request|US026 - Cancel active request]]
- [[US027-archive-completed-request|US027 - Archive completed request]]
- [[US028-view-request-details|US028 - View request details]]
- [[US029-filter-requests-by-status|US029 - Filter requests by status]]

## Acceptance Criteria Summary
- All 10 stages are represented with distinct badge colors and labels
- Stage transitions follow the defined workflow rules (no skipping required stages)
- Cancel operation is available for active (non-terminal) requests and updates status accordingly
- Archive operation moves completed/cancelled requests out of the active view
- Request detail view shows current stage, full history, and all associated data
- Sidebar and dashboard support filtering by stage (active, completed, cancelled, archived)
- Stage badge component is reused consistently across all views

## Technical Scope
- components/flight-request-stage-badge.tsx - Color-coded stage badge component
- app/api/requests/ - API routes for request CRUD and status transitions
- lib/chat/constants/workflow.ts - Stage definitions, transitions, and fallback mappings
- Supabase requests table - Status field and stage history tracking
- components/chat-sidebar.tsx - Request list with status filtering
