/**
 * Proposal Service
 *
 * Service layer for managing proposals in the database.
 * Handles CRUD operations, status transitions, and foreign key resolution.
 *
 * @see lib/types/proposal.ts
 * @see supabase/migrations/004_proposals_table.sql
 */

import { supabaseAdmin, findRequestByTripId } from '@/lib/supabase/admin';
import type { Json } from '@/lib/types/database';
import type {
  Proposal,
  ProposalInsert,
  ProposalUpdate,
  ProposalStatus,
  CreateProposalInput,
  FileMetadata,
  EmailMetadata,
  CreateProposalResult,
  UpdateGeneratedResult,
  UpdateSentResult,
} from '@/lib/types/proposal';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Find a client profile by email address for a specific ISO agent
 *
 * @param email - Customer email address
 * @param isoAgentId - ISO agent UUID
 * @returns Client profile UUID or null if not found
 */
export async function findClientProfileByEmail(
  email: string,
  isoAgentId: string
): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabaseAdmin
    .from('client_profiles')
    .select('id')
    .eq('iso_agent_id', isoAgentId)
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[ProposalService] Error finding client profile by email:', error);
    return null;
  }

  return data?.id ?? null;
}

/**
 * Find a quote's database UUID by its Avinode quote ID
 *
 * @param avinodeQuoteId - Avinode quote ID (e.g., "aquote-393019585")
 * @returns Quote database UUID or null if not found
 */
export async function findQuoteByAvinodeId(
  avinodeQuoteId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('quotes')
    .select('id')
    .eq('avinode_quote_id', avinodeQuoteId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[ProposalService] Error finding quote by Avinode ID:', error);
    return null;
  }

  return data?.id ?? null;
}

/**
 * Find a request by Avinode Trip ID
 * Wrapper around admin.findRequestByTripId for proposal service use
 *
 * @param tripId - Avinode trip ID (e.g., "atrip-64956150")
 * @param isoAgentId - ISO agent UUID
 * @returns Request UUID or null if not found
 */
export async function getRequestIdFromTripId(
  tripId: string,
  isoAgentId: string
): Promise<string | null> {
  const request = await findRequestByTripId(tripId, isoAgentId);
  return request?.id ?? null;
}

/**
 * Generate a proposal number using PostgreSQL function
 * Falls back to timestamp-based generation if function fails
 *
 * @returns Generated proposal number (e.g., 'PROP-2025-001')
 */
async function generateProposalNumber(): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.rpc('generate_proposal_number');

    if (error) {
      console.error('[ProposalService] Error generating proposal number:', error);
      // Fallback to timestamp-based number
      const timestamp = Date.now().toString(36).toUpperCase();
      return `PROP-${new Date().getFullYear()}-${timestamp}`;
    }

    return data as string;
  } catch (err) {
    console.error('[ProposalService] Unexpected error generating proposal number:', err);
    const timestamp = Date.now().toString(36).toUpperCase();
    return `PROP-${new Date().getFullYear()}-${timestamp}`;
  }
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Create a new proposal record in the database
 *
 * The proposal_number is auto-generated using PostgreSQL's generate_proposal_number()
 * function. Status defaults to 'draft'.
 *
 * @param input - Proposal creation input
 * @returns Created proposal with ID and proposal_number
 */
export async function createProposal(
  input: CreateProposalInput
): Promise<CreateProposalResult> {
  // Generate proposal number
  const proposalNumber = await generateProposalNumber();

  // Prepare insert data
  const insertData: ProposalInsert = {
    request_id: input.request_id,
    iso_agent_id: input.iso_agent_id,
    quote_id: input.quote_id ?? null,
    client_profile_id: input.client_profile_id ?? null,
    proposal_number: proposalNumber,
    title: input.title,
    description: input.description ?? null,
    total_amount: input.total_amount ?? null,
    margin_applied: input.margin_applied ?? null,
    final_amount: input.final_amount ?? null,
    file_name: input.file_name,
    file_url: input.file_url,
    file_path: input.file_path ?? null,
    file_size_bytes: input.file_size_bytes ?? null,
    status: 'draft',
    metadata: (input.metadata as Json) ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from('proposals')
    .insert(insertData)
    .select('id, proposal_number, status, created_at')
    .single();

  if (error) {
    console.error('[ProposalService] Error creating proposal:', error);
    throw new Error(`Failed to create proposal: ${error.message}`);
  }

  console.log('[ProposalService] Created proposal:', {
    id: data.id,
    proposalNumber: data.proposal_number,
    requestId: input.request_id,
  });

  return {
    id: data.id,
    proposal_number: data.proposal_number,
    status: data.status as ProposalStatus,
    created_at: data.created_at as string,
  };
}

/**
 * Get a proposal by its database UUID
 *
 * @param id - Proposal UUID
 * @returns Proposal row or null if not found
 */
export async function getProposalById(id: string): Promise<Proposal | null> {
  const { data, error } = await supabaseAdmin
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('[ProposalService] Error getting proposal:', error);
    throw new Error(`Failed to get proposal: ${error.message}`);
  }

  return data;
}

/**
 * Get a proposal by its proposal number
 *
 * @param proposalNumber - Proposal number (e.g., 'PROP-2025-001')
 * @returns Proposal row or null if not found
 */
export async function getProposalByNumber(proposalNumber: string): Promise<Proposal | null> {
  const { data, error } = await supabaseAdmin
    .from('proposals')
    .select('*')
    .eq('proposal_number', proposalNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[ProposalService] Error getting proposal by number:', error);
    throw new Error(`Failed to get proposal: ${error.message}`);
  }

  return data;
}

/**
 * Get all proposals for a specific request
 *
 * @param requestId - Request UUID
 * @returns Array of proposals ordered by creation date (newest first)
 */
export async function getProposalsByRequest(requestId: string): Promise<Proposal[]> {
  const { data, error } = await supabaseAdmin
    .from('proposals')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ProposalService] Error getting proposals by request:', error);
    throw new Error(`Failed to get proposals: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Get all proposals for a specific ISO agent
 *
 * @param isoAgentId - ISO agent UUID
 * @param options - Optional filters
 * @returns Array of proposals ordered by creation date (newest first)
 */
export async function getProposalsByAgent(
  isoAgentId: string,
  options?: {
    limit?: number;
    status?: ProposalStatus;
  }
): Promise<Proposal[]> {
  let query = supabaseAdmin
    .from('proposals')
    .select('*')
    .eq('iso_agent_id', isoAgentId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ProposalService] Error getting proposals by agent:', error);
    throw new Error(`Failed to get proposals: ${error.message}`);
  }

  return data ?? [];
}

// =============================================================================
// STATUS UPDATE OPERATIONS
// =============================================================================

/**
 * Update a proposal after PDF generation
 * Sets status to 'generated' and records file metadata
 *
 * @param proposalId - Proposal UUID
 * @param fileData - File metadata from upload
 * @returns Updated proposal result
 */
export async function updateProposalGenerated(
  proposalId: string,
  fileData: FileMetadata
): Promise<UpdateGeneratedResult> {
  const updateData: ProposalUpdate = {
    file_name: fileData.file_name,
    file_url: fileData.file_url,
    file_path: fileData.file_path,
    file_size_bytes: fileData.file_size_bytes,
    status: 'generated',
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('proposals')
    .update(updateData)
    .eq('id', proposalId)
    .select('id, proposal_number, status, file_url, generated_at')
    .single();

  if (error) {
    console.error('[ProposalService] Error updating proposal generated:', error);
    throw new Error(`Failed to update proposal: ${error.message}`);
  }

  console.log('[ProposalService] Updated proposal to generated:', {
    id: data.id,
    proposalNumber: data.proposal_number,
  });

  return {
    id: data.id,
    proposal_number: data.proposal_number,
    status: data.status as ProposalStatus,
    file_url: data.file_url,
    generated_at: data.generated_at,
  };
}

/**
 * Update a proposal after email is sent
 * Sets status to 'sent' and records email tracking data
 *
 * @param proposalId - Proposal UUID
 * @param emailData - Email metadata
 * @returns Updated proposal result
 */
export async function updateProposalSent(
  proposalId: string,
  emailData: EmailMetadata
): Promise<UpdateSentResult> {
  const updateData: ProposalUpdate = {
    sent_to_email: emailData.sent_to_email,
    sent_to_name: emailData.sent_to_name,
    email_subject: emailData.email_subject,
    email_body: emailData.email_body,
    email_message_id: emailData.email_message_id ?? null,
    status: 'sent',
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('proposals')
    .update(updateData)
    .eq('id', proposalId)
    .select('id, proposal_number, status, sent_to_email, sent_at')
    .single();

  if (error) {
    console.error('[ProposalService] Error updating proposal sent:', error);
    throw new Error(`Failed to update proposal: ${error.message}`);
  }

  console.log('[ProposalService] Updated proposal to sent:', {
    id: data.id,
    proposalNumber: data.proposal_number,
    sentTo: data.sent_to_email,
  });

  return {
    id: data.id,
    proposal_number: data.proposal_number,
    status: data.status as ProposalStatus,
    sent_to_email: data.sent_to_email,
    sent_at: data.sent_at,
  };
}

/**
 * Update proposal status
 *
 * @param proposalId - Proposal UUID
 * @param status - New status
 * @returns Updated proposal
 */
export async function updateProposalStatus(
  proposalId: string,
  status: ProposalStatus
): Promise<Proposal> {
  const updateData: ProposalUpdate = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Set appropriate timestamp based on status
  if (status === 'viewed') {
    updateData.viewed_at = new Date().toISOString();
  } else if (status === 'accepted') {
    updateData.accepted_at = new Date().toISOString();
  } else if (status === 'rejected') {
    updateData.rejected_at = new Date().toISOString();
  } else if (status === 'expired') {
    updateData.expired_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('proposals')
    .update(updateData)
    .eq('id', proposalId)
    .select('*')
    .single();

  if (error) {
    console.error('[ProposalService] Error updating proposal status:', error);
    throw new Error(`Failed to update proposal status: ${error.message}`);
  }

  console.log('[ProposalService] Updated proposal status:', {
    id: data.id,
    proposalNumber: data.proposal_number,
    status: data.status,
  });

  return data;
}

/**
 * Increment view count for a proposal
 *
 * @param proposalId - Proposal UUID
 * @returns Updated proposal
 */
export async function incrementProposalViewCount(proposalId: string): Promise<Proposal> {
  // First get current view count
  const current = await getProposalById(proposalId);
  if (!current) {
    throw new Error(`Proposal not found: ${proposalId}`);
  }

  const newViewCount = (current.view_count ?? 0) + 1;
  const now = new Date().toISOString();

  const updateData: ProposalUpdate = {
    view_count: newViewCount,
    last_viewed_at: now,
    updated_at: now,
  };

  // Update status to 'viewed' if currently 'sent'
  if (current.status === 'sent') {
    updateData.status = 'viewed';
    updateData.viewed_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from('proposals')
    .update(updateData)
    .eq('id', proposalId)
    .select('*')
    .single();

  if (error) {
    console.error('[ProposalService] Error incrementing view count:', error);
    throw new Error(`Failed to increment view count: ${error.message}`);
  }

  return data;
}

/**
 * Increment download count for a proposal
 *
 * @param proposalId - Proposal UUID
 * @returns Updated proposal
 */
export async function incrementProposalDownloadCount(proposalId: string): Promise<Proposal> {
  // First get current download count
  const current = await getProposalById(proposalId);
  if (!current) {
    throw new Error(`Proposal not found: ${proposalId}`);
  }

  const newDownloadCount = (current.download_count ?? 0) + 1;
  const now = new Date().toISOString();

  const updateData: ProposalUpdate = {
    download_count: newDownloadCount,
    last_downloaded_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from('proposals')
    .update(updateData)
    .eq('id', proposalId)
    .select('*')
    .single();

  if (error) {
    console.error('[ProposalService] Error incrementing download count:', error);
    throw new Error(`Failed to increment download count: ${error.message}`);
  }

  return data;
}

// =============================================================================
// COMPOSITE OPERATIONS
// =============================================================================

/**
 * Create a proposal with automatic foreign key resolution
 *
 * This function resolves:
 * - request_id from tripId (if not provided)
 * - client_profile_id from customerEmail (if not provided)
 *
 * @param input - Proposal creation input
 * @param tripId - Avinode trip ID for request resolution
 * @param customerEmail - Customer email for client profile resolution
 * @returns Created proposal result or null if request not found
 */
export async function createProposalWithResolution(
  input: Omit<CreateProposalInput, 'request_id'> & { request_id?: string },
  tripId?: string,
  customerEmail?: string
): Promise<CreateProposalResult | null> {
  let requestId: string | undefined = input.request_id;
  let clientProfileId: string | undefined = input.client_profile_id;

  // Resolve request_id from tripId if not provided
  if (!requestId && tripId) {
    const resolvedRequestId = await getRequestIdFromTripId(tripId, input.iso_agent_id);
    if (!resolvedRequestId) {
      console.warn('[ProposalService] Could not resolve request_id from tripId:', tripId);
      return null;
    }
    requestId = resolvedRequestId;
  }

  if (!requestId) {
    throw new Error('request_id is required - either provide directly or via tripId');
  }

  // Resolve client_profile_id from email if not provided
  if (!clientProfileId && customerEmail) {
    const resolvedClientId = await findClientProfileByEmail(customerEmail, input.iso_agent_id);
    // client_profile_id is optional, so don't fail if not found
    if (resolvedClientId) {
      clientProfileId = resolvedClientId;
      console.log('[ProposalService] Resolved client_profile_id from email:', customerEmail);
    }
  }

  return createProposal({
    ...input,
    request_id: requestId,
    client_profile_id: clientProfileId,
  });
}
