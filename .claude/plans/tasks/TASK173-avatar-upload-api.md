# Task ID: TASK173
# Task Name: Avatar Upload API
# Parent User Story: [[US090-upload-avatar|US090 - User Avatar Upload]]
# Status: Done
# Priority: Low
# Estimate: 2h

## Description
Create a POST /api/users/me/avatar endpoint that allows authenticated users to upload a profile avatar image. The image is validated, resized, and stored in Supabase Storage.

## Acceptance Criteria
- POST /api/users/me/avatar accepts multipart form data with an image file
- Supported formats: JPEG, PNG, WebP (max 5MB)
- Image is resized to 256x256 pixels for consistent display
- Uploaded image is stored in Supabase Storage `avatars` bucket
- User's `avatar_url` field is updated in the database
- Returns the public URL of the uploaded avatar
- Returns 400 for invalid file type or size exceeding limit
- Returns 401 for unauthenticated requests

## Implementation Details
- **File(s)**: app/api/users/me/avatar/route.ts
- **Approach**: Create a POST handler that parses the multipart form data, validates the file type and size, uploads to Supabase Storage with the user's ID as the filename prefix, updates the user's `avatar_url` field, and returns the public URL. Use sharp or similar for image resizing if available.

## Dependencies
- Supabase Storage configured with `avatars` bucket
- Clerk authentication middleware
- Users table with `avatar_url` column
