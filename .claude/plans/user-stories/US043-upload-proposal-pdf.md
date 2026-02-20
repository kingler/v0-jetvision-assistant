# User Story ID: US043
# Title: Upload Proposal PDF to Storage
# Parent Epic: [[EPIC009-proposal-generation|EPIC009 - Proposal Generation]]
# Status: Implemented
# Priority: Medium
# Story Points: 2

## User Story
As an ISO agent, I want the proposal PDF to be stored, so that it can be downloaded or emailed later.

## Acceptance Criteria

### AC1: PDF upload and URL persistence
**Given** a PDF is generated
**When** it's saved
**Then** it uploads to Supabase Storage and the URL is stored in the proposal record

## Tasks
- [[TASK085-upload-pdf-storage|TASK085 - Upload PDF to storage]]
- [[TASK086-store-pdf-url|TASK086 - Store URL in proposals table]]

## Technical Notes
- PDF files are uploaded to Supabase Storage in a dedicated proposals bucket
- The storage URL is persisted in the pdf_url field of the proposals table
- Supports both initial upload and replacement on regeneration
- Storage bucket should have appropriate access policies for authenticated users
