# Proposal Table Integration Plan

**Date**: 2026-01-26
**Status**: Pending Implementation
**Linear Issue**: TBD

## Overview

Integrate the Supabase `proposals` table with proposal generation/storage to ensure proposals are properly linked to client profiles, iso_agents, quotes, and requests.

**Problem**: The proposals table exists with comprehensive schema (migration 004) but is completely unused. Proposals are generated and emailed without any database records being created.

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/services/proposal-service.ts` | CREATE | New service for all proposal DB operations |
| `lib/types/proposal.ts` | CREATE | Service-specific TypeScript types |
| `app/api/proposal/send/route.ts` | UPDATE | Create/update DB record during send flow |
| `app/api/proposal/generate/route.ts` | UPDATE | Create draft record for preview |
| `lib/supabase/admin.ts` | UPDATE | Enhance uploadProposalPdf to return filePath + fileSize |

## Implementation Steps

### Step 1: Create Proposal Service (`lib/services/proposal-service.ts`)

Create a service layer with these functions:

```typescript
// Core CRUD
createProposal(input: CreateProposalInput): Promise<Proposal>
getProposalById(id: string): Promise<Proposal | null>
getProposalsByRequest(requestId: string): Promise<Proposal[]>

// Status updates
updateProposalGenerated(proposalId: string, fileData: FileMetadata): Promise<Proposal>
updateProposalSent(proposalId: string, emailData: EmailMetadata): Promise<Proposal>
updateProposalStatus(proposalId: string, status: ProposalStatus): Promise<Proposal>

// Helpers
findClientProfileByEmail(email: string, isoAgentId: string): Promise<string | null>
findRequestByTripId(tripId: string, isoAgentId: string): Promise<string | null>
```

**Key behavior**:
- Use `supabaseAdmin` for database operations
- Auto-generate proposal_number via PostgreSQL's `generate_proposal_number()` function
- Auto-lookup `client_profile_id` from customer email
- Auto-lookup `request_id` from `tripDetails.tripId` (avinode trip ID)

### Step 2: Create TypeScript Types (`lib/types/proposal.ts`)

```typescript
import type { Database } from './database';

export type Proposal = Database['public']['Tables']['proposals']['Row'];
export type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];
export type ProposalUpdate = Database['public']['Tables']['proposals']['Update'];
export type ProposalStatus = Database['public']['Enums']['proposal_status'];

export interface CreateProposalInput {
  request_id: string;
  iso_agent_id: string;
  quote_id?: string;
  client_profile_id?: string;
  title: string;
  description?: string;
  total_amount?: number;
  margin_applied?: number;
  final_amount?: number;
  metadata?: Record<string, unknown>;
}

export interface FileMetadata {
  file_name: string;
  file_url: string;
  file_path: string;
  file_size_bytes: number;
}

export interface EmailMetadata {
  sent_to_email: string;
  sent_to_name: string;
  email_subject: string;
  email_body: string;
  email_message_id?: string;
}
```

### Step 3: Update `uploadProposalPdf` in `lib/supabase/admin.ts`

Enhance return type to include `filePath` and `fileSizeBytes`:

```typescript
export async function uploadProposalPdf(
  pdfBuffer: Buffer,
  fileName: string,
  isoAgentId: string
): Promise<{
  success: boolean;
  publicUrl?: string;
  filePath?: string;      // ADD: needed for DB record
  fileSizeBytes?: number; // ADD: calculate from buffer
  error?: string;
}>
```

### Step 4: Update `/api/proposal/generate` Route

Add optional database record creation for preview:

1. Add `request_id` to request type (optional - derived from `tripDetails.tripId`)
2. After PDF generation:
   - Look up request by `tripDetails.tripId` (avinode trip ID)
   - If found, create draft proposal record
3. Return `proposal_id` (database UUID) and `proposal_number` (e.g., "PROP-2025-001")

### Step 5: Update `/api/proposal/send` Route

Integrate full database tracking:

1. Look up `request_id` from `body.tripDetails.tripId`
2. Look up `client_profile_id` from `body.customer.email`
3. Get `quote_id` from first `selectedFlights[0].quoteId` if available
4. **After PDF generation**:
   - Create proposal record with status='generated'
   - Update with file metadata from upload
5. **After email sent**:
   - Update proposal with email tracking (sent_to_email, message_id, etc.)
   - Set status='sent' and `sent_at` timestamp

### Step 6: Request ID Resolution

Since `tripDetails.tripId` contains the Avinode trip ID (e.g., "atrip-64956150"), not the request UUID:

```typescript
// In proposal-service.ts
async function getRequestIdFromTripId(tripId: string, isoAgentId: string): Promise<string | null> {
  // Reuse existing findRequestByTripId from admin.ts
  const request = await findRequestByTripId(tripId, isoAgentId);
  return request?.id ?? null;
}
```

## Data Flow

```
User clicks "Send Proposal"
         │
         ▼
POST /api/proposal/send
         │
         ├── 1. Authenticate (get iso_agent_id)
         │
         ├── 2. Resolve foreign keys:
         │      - request_id ← lookup by tripDetails.tripId
         │      - client_profile_id ← lookup by customer.email
         │      - quote_id ← from selectedFlights[0].quoteId
         │
         ├── 3. Generate PDF
         │
         ├── 4. Create proposal record (status='generated')
         │      - Links: request_id, iso_agent_id, quote_id, client_profile_id
         │      - Pricing: total_amount, margin_applied, final_amount
         │
         ├── 5. Upload PDF to storage
         │
         ├── 6. Update proposal with file metadata
         │      - file_name, file_url, file_path, file_size_bytes
         │
         ├── 7. Send email
         │
         └── 8. Update proposal with email tracking
               - sent_to_email, sent_to_name, email_message_id
               - status='sent', sent_at=NOW()
```

## Proposal Status Lifecycle

```
draft       → Preview generated (optional)
    │
    ▼
generated   → PDF created and stored
    │
    ▼
sent        → Email sent to customer
    │
    ├──► viewed    → Customer opened (future webhook)
    │       │
    │       ├──► accepted → Customer accepted
    │       │
    │       └──► rejected → Customer declined
    │
    └──► expired   → Quote validity expired (future cron)
```

## Error Handling

Use compensation pattern (no transactions in Supabase JS):

1. **Create proposal** → If fails, return error immediately
2. **Generate PDF** → If fails, update proposal status='failed' with error in metadata
3. **Upload storage** → If fails, log error but continue (PDF can be re-uploaded)
4. **Send email** → If fails, proposal stays at 'generated' (can retry)

## Verification

After implementation, verify:

1. **Database Records**: Check Supabase dashboard for new proposal records
2. **Foreign Key Links**: Confirm request_id, iso_agent_id, quote_id, client_profile_id are populated
3. **File Metadata**: Verify file_url matches storage URL
4. **Status Transitions**: Confirm status changes from draft → generated → sent
5. **Email Tracking**: Verify email_message_id is saved when email succeeds

### Test Commands

```bash
# Run unit tests for proposal service
npm run test:unit -- proposal-service

# Run integration test
npm run test:integration -- proposal

# Manual verification
# 1. Send a proposal via UI
# 2. Check Supabase: SELECT * FROM proposals ORDER BY created_at DESC LIMIT 1;
# 3. Verify all foreign keys are linked
```

## Notes

- The `generate_proposal_number()` PostgreSQL function already exists in migration 004
- RLS policies are already defined for the proposals table
- The proposals storage bucket already exists and works
- No schema migrations needed - just code changes
