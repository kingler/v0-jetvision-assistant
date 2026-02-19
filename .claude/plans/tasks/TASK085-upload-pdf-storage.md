# Task ID: TASK085
# Task Name: Upload Generated PDF to Supabase Storage
# Parent User Story: [[US043-upload-proposal-pdf|US043 - Store proposal PDF in cloud storage]]
# Status: Done
# Priority: Medium
# Estimate: 2h

## Description
Upload the generated proposal PDF to Supabase Storage for persistent access. The PDF is stored in a dedicated "proposals" bucket with a structured path (e.g., proposals/{proposal_id}/{proposal_number}.pdf) to enable easy retrieval and management.

## Acceptance Criteria
- POST /api/proposal/upload-pdf accepts the PDF buffer and proposal metadata
- Uploads to Supabase Storage "proposals" bucket
- Uses structured path: proposals/{proposal_id}/{filename}.pdf
- Sets correct content-type (application/pdf)
- Returns the public or signed URL of the uploaded file
- Handles upload errors with appropriate error messages
- Overwrites existing file if re-uploading (for regeneration)

## Implementation Details
- **File(s)**: app/api/proposal/upload-pdf/route.ts
- **Approach**: Create an API route that receives the PDF buffer (from the generation step) and uploads it to Supabase Storage using supabase.storage.from('proposals').upload(). Generate the storage path from proposal metadata. Return the public URL or create a signed URL for secure access. Handle the case where the bucket doesn't exist by creating it on first use.

## Dependencies
- Supabase Storage configured with a "proposals" bucket
- [[TASK078-generate-pdf|TASK078]] (Generate PDF) - provides the PDF buffer to upload
- Supabase client configured in lib/supabase
