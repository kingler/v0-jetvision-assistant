# User Story ID: US014
# Title: View File Attachments in Chat
# Parent Epic: [[EPIC003-rich-message-components|EPIC003 - Rich Chat UI Components]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want to see file attachments in chat, so that I can download proposals and contracts.

## Acceptance Criteria

### AC1: File attachment renders with metadata
**Given** a file attachment message
**When** it renders
**Then** I see file name, size, and download button

### AC2: PDF download works
**Given** the file is a PDF
**When** I click download
**Then** the file downloads to my device

## Tasks
- [[TASK034-implement-file-attachment|TASK034 - Implement file attachment component]]
- [[TASK035-handle-file-download|TASK035 - Handle file download]]

## Technical Notes
- The FileAttachment component displays a card with file icon, name, size, and download action
- File types are identified by extension and display appropriate icons (PDF, DOC, XLS, etc.)
- File size is formatted in human-readable units (KB, MB)
- Downloads are handled via browser's native download mechanism with proper Content-Disposition headers
- The component is responsive and adapts to mobile widths (see recent fix in commit c2e1b16d)
- Files are stored in Supabase Storage and accessed via signed URLs for security
