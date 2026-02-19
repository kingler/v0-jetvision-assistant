# Task ID: TASK035
# Task Name: Handle File Download
# Parent User Story: [[US014-view-file-attachments|US014 - View and download file attachments]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
Trigger a file download when the user clicks the download button on a file attachment. Handle both direct URL downloads and API-mediated downloads.

## Acceptance Criteria
- Clicking the download button initiates a file download
- Browser's native download dialog is triggered
- File is downloaded with its original name
- Large files show a download progress indicator (if feasible)
- Download errors display a user-friendly error message
- Works for both direct URLs (Supabase storage) and API endpoints
- Download does not navigate away from the chat page

## Implementation Details
- **File(s)**: `components/message-components/file-attachment.tsx`
- **Approach**: For direct URLs, create a hidden `<a>` element with `href` set to the file URL and `download` attribute set to the file name. Programmatically click it and remove it. For API-mediated downloads, fetch the file as a blob, create an object URL with `URL.createObjectURL`, and use the same anchor technique. Wrap in try-catch to handle network errors. Revoke the object URL after download to prevent memory leaks.

## Dependencies
- [[TASK034-implement-file-attachment|TASK034]] (file attachment component contains the download button)
