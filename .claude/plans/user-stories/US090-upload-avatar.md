# User Story ID: US090
# Title: Upload Avatar
# Parent Epic: [[EPIC021-user-onboarding|EPIC021 - User Onboarding]]
# Status: Implemented
# Priority: Low
# Story Points: 1

## User Story
As an ISO agent, I want to upload my avatar, so my profile has a photo.

## Acceptance Criteria

### AC1: Avatar upload and display
**Given** I am on my profile page
**When** I upload an image
**Then** it is stored and displayed as my avatar

## Tasks
- [[TASK173-avatar-upload-api|TASK173 - Implement avatar upload API]]

## Technical Notes
- Avatar images are stored in Supabase Storage bucket `avatars`
- Accepted formats: JPEG, PNG, WebP; max file size 2MB
- Images are resized to 256x256 on upload for consistency
- The `iso_agents` table `avatar_url` field is updated with the storage URL
- Clerk profile image is used as fallback if no custom avatar is uploaded
