# Task ID: TASK084
# Task Name: Proposal Regeneration API
# Parent User Story: [[US042-regenerate-proposal|US042 - Regenerate proposal with updated details]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Create a PATCH endpoint that regenerates a proposal with updated details. This allows the sales representative to request a new version of the proposal after making changes to margin, customer selection, or other details. The endpoint re-generates the PDF and updates the proposal record while preserving the original proposal_number.

## Acceptance Criteria
- PATCH /api/proposal/[id]/regenerate accepts optional override fields
- Re-generates the PDF with current proposal data
- Uploads new PDF to storage, replacing the previous version
- Updates the proposal record with new file_url and updated_at
- Increments a version counter on the proposal
- Returns the updated proposal object
- Returns 404 if proposal not found
- Only allows regeneration for proposals in "draft" status

## Implementation Details
- **File(s)**: app/api/proposal/[id]/regenerate/route.ts
- **Approach**: Create a PATCH route handler that fetches the current proposal, re-runs the PDF generation pipeline (TASK078), uploads the new PDF (TASK085), and updates the proposal record. Use a version field to track regeneration count. Validate that proposal status is "draft" before allowing regeneration.

## Dependencies
- [[TASK078-generate-pdf|TASK078]] (Generate PDF) - PDF generation function
- [[TASK085-upload-pdf-storage|TASK085]] (Upload PDF) - storage upload function
- [[TASK079-create-proposal-record|TASK079]] (Create proposal record) - proposal must exist
