# Task ID: TASK086
# Task Name: Store PDF URL in Proposals Table
# Parent User Story: [[US043-upload-proposal-pdf|US043 - Store proposal PDF in cloud storage]]
# Status: Done
# Priority: Medium
# Estimate: 1h

## Description
After uploading the PDF to Supabase Storage, save the resulting file_url back to the proposals table record. This enables the proposal preview component and email sending flow to reference the stored PDF by URL.

## Acceptance Criteria
- Updates the proposal record's file_url field with the storage URL
- file_url is a valid HTTPS URL pointing to the stored PDF
- URL is accessible for download and email attachment
- Returns the updated proposal record
- Handles the case where proposal record doesn't exist (404)

## Implementation Details
- **File(s)**: lib/services/proposal-service.ts
- **Approach**: Add an updateProposalFileUrl function to the proposal service that takes proposal_id and file_url, then updates the Supabase proposals table. This function is called as the final step after PDF upload in the proposal generation pipeline. Use supabase.from('proposals').update({ file_url }).eq('id', proposal_id).

## Dependencies
- [[TASK085-upload-pdf-storage|TASK085]] (Upload PDF) - provides the file_url to store
- [[TASK079-create-proposal-record|TASK079]] (Create proposal record) - proposal record must exist
- Proposals table must have a file_url column
