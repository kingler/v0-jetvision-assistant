# Task ID: TASK034
# Task Name: Implement File Attachment Component
# Parent User Story: [[US014-view-file-attachments|US014 - View and download file attachments]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Implement the file attachment display component that shows file name, size, type icon, and a download action for files attached to chat messages.

## Acceptance Criteria
- File name is displayed with truncation for long names
- File size is shown in human-readable format (KB, MB)
- File type icon is displayed based on extension (PDF, DOC, XLS, IMG, etc.)
- Download button/icon is visible and clickable
- Hover state provides visual feedback
- Multiple attachments stack vertically
- Unsupported file types show a generic file icon
- Component handles missing metadata gracefully

## Implementation Details
- **File(s)**: `components/message-components/file-attachment.tsx`
- **Approach**: Create a `FileAttachment` component that receives `{ name, size, type, url }` props. Map file extensions to Lucide icons (FileText for PDF, FileSpreadsheet for XLS, Image for images, File for generic). Format file size with a helper function (`formatFileSize`). Display in a compact card layout with icon, name, size, and download button. Use design system muted background for the card. Truncate long file names with CSS `text-overflow: ellipsis`.

## Dependencies
- None (self-contained presentational component)
