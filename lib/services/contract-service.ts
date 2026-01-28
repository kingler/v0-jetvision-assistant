/**
 * Contract Service
 *
 * Service layer for managing contracts in the database.
 * Handles CRUD operations, status transitions, and foreign key resolution.
 *
 * @see lib/types/contract.ts
 * @see supabase/migrations/040_contracts_table.sql
 */

import { supabaseAdmin, findRequestByTripId } from '@/lib/supabase/admin';
import type { Json } from '@/lib/types/database';
import type {
  Contract,
  ContractInsert,
  ContractUpdate,
  ContractStatus,
  CreateContractInput,
  ContractFileMetadata,
  ContractEmailMetadata,
  ContractSignatureData,
  ContractPaymentData,
  CreateContractResult,
  UpdateContractGeneratedResult,
  UpdateContractSentResult,
  UpdateContractSignedResult,
  UpdateContractPaymentResult,
} from '@/lib/types/contract';

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
    console.error('[ContractService] Error finding client profile by email:', error);
    return null;
  }

  return data?.id ?? null;
}

/**
 * Find a request by Avinode Trip ID
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
 * Generate a contract number using PostgreSQL function
 * Falls back to timestamp-based generation if function fails
 *
 * @returns Generated contract number (e.g., 'CONTRACT-2026-001')
 */
async function generateContractNumber(): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.rpc('generate_contract_number');

    if (error) {
      console.error('[ContractService] Error generating contract number:', error);
      // Fallback to timestamp-based number
      const timestamp = Date.now().toString(36).toUpperCase();
      return `CONTRACT-${new Date().getFullYear()}-${timestamp}`;
    }

    return data as string;
  } catch (err) {
    console.error('[ContractService] Unexpected error generating contract number:', err);
    const timestamp = Date.now().toString(36).toUpperCase();
    return `CONTRACT-${new Date().getFullYear()}-${timestamp}`;
  }
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Create a new contract record in the database
 *
 * The contract_number is auto-generated using PostgreSQL's generate_contract_number()
 * function. Status defaults to 'draft'.
 *
 * @param input - Contract creation input
 * @returns Created contract with ID and contract_number
 */
export async function createContract(
  input: CreateContractInput
): Promise<CreateContractResult> {
  // Generate contract number
  const contractNumber = await generateContractNumber();

  // Prepare insert data
  const insertData: ContractInsert = {
    request_id: input.request_id,
    iso_agent_id: input.iso_agent_id,
    proposal_id: input.proposal_id ?? null,
    quote_id: input.quote_id ?? null,
    client_profile_id: input.client_profile_id ?? null,
    contract_number: contractNumber,
    reference_quote_number: input.reference_quote_number ?? null,
    // Client info
    client_name: input.customer.name,
    client_email: input.customer.email,
    client_company: input.customer.company ?? null,
    client_phone: input.customer.phone ?? null,
    // Flight details
    departure_airport: input.flightDetails.departureAirport.icao,
    arrival_airport: input.flightDetails.arrivalAirport.icao,
    departure_date: input.flightDetails.departureDate,
    departure_time: input.flightDetails.departureTime ?? null,
    aircraft_type: input.flightDetails.aircraftType,
    aircraft_model: input.flightDetails.aircraftModel ?? null,
    tail_number: input.flightDetails.tailNumber ?? null,
    passengers: input.flightDetails.passengers,
    // Pricing
    flight_cost: input.pricing.flightCost,
    federal_excise_tax: input.pricing.federalExciseTax,
    domestic_segment_fee: input.pricing.domesticSegmentFee,
    subtotal: input.pricing.subtotal,
    credit_card_fee_percentage: input.pricing.creditCardFeePercentage,
    total_amount: input.pricing.totalAmount,
    currency: input.pricing.currency,
    // Amenities
    amenities: (input.amenities as Json) ?? {},
    // Payment method
    payment_method: input.paymentMethod ?? null,
    // Status
    status: 'draft',
    // Metadata
    metadata: (input.metadata as Json) ?? {},
  };

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .insert(insertData)
    .select('id, contract_number, status, created_at')
    .single();

  if (error) {
    console.error('[ContractService] Error creating contract:', error);
    throw new Error(`Failed to create contract: ${error.message}`);
  }

  console.log('[ContractService] Created contract:', {
    id: data.id,
    contractNumber: data.contract_number,
    requestId: input.request_id,
  });

  return {
    id: data.id,
    contract_number: data.contract_number,
    status: data.status as ContractStatus,
    created_at: data.created_at as string,
  };
}

/**
 * Get a contract by its database UUID
 *
 * @param id - Contract UUID
 * @returns Contract row or null if not found
 */
export async function getContractById(id: string): Promise<Contract | null> {
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('[ContractService] Error getting contract:', error);
    throw new Error(`Failed to get contract: ${error.message}`);
  }

  return data;
}

/**
 * Get a contract by its contract number
 *
 * @param contractNumber - Contract number (e.g., 'CONTRACT-2026-001')
 * @returns Contract row or null if not found
 */
export async function getContractByNumber(contractNumber: string): Promise<Contract | null> {
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .eq('contract_number', contractNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[ContractService] Error getting contract by number:', error);
    throw new Error(`Failed to get contract: ${error.message}`);
  }

  return data;
}

/**
 * Get all contracts for a specific request
 *
 * @param requestId - Request UUID
 * @returns Array of contracts ordered by creation date (newest first)
 */
export async function getContractsByRequest(requestId: string): Promise<Contract[]> {
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ContractService] Error getting contracts by request:', error);
    throw new Error(`Failed to get contracts: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Get all contracts for a specific ISO agent
 *
 * @param isoAgentId - ISO agent UUID
 * @param options - Optional filters
 * @returns Array of contracts ordered by creation date (newest first)
 */
export async function getContractsByAgent(
  isoAgentId: string,
  options?: {
    limit?: number;
    status?: ContractStatus;
  }
): Promise<Contract[]> {
  let query = supabaseAdmin
    .from('contracts')
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
    console.error('[ContractService] Error getting contracts by agent:', error);
    throw new Error(`Failed to get contracts: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Get all contracts for a specific proposal
 *
 * @param proposalId - Proposal UUID
 * @returns Array of contracts ordered by creation date (newest first)
 */
export async function getContractsByProposal(proposalId: string): Promise<Contract[]> {
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ContractService] Error getting contracts by proposal:', error);
    throw new Error(`Failed to get contracts: ${error.message}`);
  }

  return data ?? [];
}

// =============================================================================
// STATUS UPDATE OPERATIONS
// =============================================================================

/**
 * Update a contract after PDF generation
 * Sets file metadata and optionally status
 *
 * @param contractId - Contract UUID
 * @param fileData - File metadata from upload
 * @returns Updated contract result
 */
export async function updateContractGenerated(
  contractId: string,
  fileData: ContractFileMetadata
): Promise<UpdateContractGeneratedResult> {
  const updateData: ContractUpdate = {
    file_name: fileData.file_name,
    file_url: fileData.file_url,
    file_path: fileData.file_path,
    file_size_bytes: fileData.file_size_bytes,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)
    .select('id, contract_number, status, file_url, updated_at')
    .single();

  if (error) {
    console.error('[ContractService] Error updating contract generated:', error);
    throw new Error(`Failed to update contract: ${error.message}`);
  }

  console.log('[ContractService] Updated contract with file data:', {
    id: data.id,
    contractNumber: data.contract_number,
  });

  return {
    id: data.id,
    contract_number: data.contract_number,
    status: data.status as ContractStatus,
    file_url: data.file_url,
    generated_at: data.updated_at,
  };
}

/**
 * Update a contract after email is sent
 * Sets status to 'sent' and records email tracking data
 *
 * @param contractId - Contract UUID
 * @param emailData - Email metadata
 * @returns Updated contract result
 */
export async function updateContractSent(
  contractId: string,
  emailData: ContractEmailMetadata
): Promise<UpdateContractSentResult> {
  const updateData: ContractUpdate = {
    sent_to_email: emailData.sent_to_email,
    email_message_id: emailData.email_message_id ?? null,
    status: 'sent',
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)
    .select('id, contract_number, status, sent_to_email, sent_at')
    .single();

  if (error) {
    console.error('[ContractService] Error updating contract sent:', error);
    throw new Error(`Failed to update contract: ${error.message}`);
  }

  console.log('[ContractService] Updated contract to sent:', {
    id: data.id,
    contractNumber: data.contract_number,
    sentTo: data.sent_to_email,
  });

  return {
    id: data.id,
    contract_number: data.contract_number,
    status: data.status as ContractStatus,
    sent_to_email: data.sent_to_email,
    sent_at: data.sent_at,
  };
}

/**
 * Update contract status
 *
 * @param contractId - Contract UUID
 * @param status - New status
 * @returns Updated contract
 */
export async function updateContractStatus(
  contractId: string,
  status: ContractStatus
): Promise<Contract> {
  const updateData: ContractUpdate = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Set appropriate timestamp based on status
  switch (status) {
    case 'viewed':
      updateData.viewed_at = new Date().toISOString();
      break;
    case 'signed':
      updateData.signed_at = new Date().toISOString();
      break;
    case 'payment_pending':
      // No specific timestamp, just status change
      break;
    case 'paid':
      updateData.payment_received_at = new Date().toISOString();
      break;
    case 'completed':
      updateData.completed_at = new Date().toISOString();
      break;
    case 'cancelled':
      updateData.cancelled_at = new Date().toISOString();
      break;
    case 'expired':
      updateData.expired_at = new Date().toISOString();
      break;
  }

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)
    .select('*')
    .single();

  if (error) {
    console.error('[ContractService] Error updating contract status:', error);
    throw new Error(`Failed to update contract status: ${error.message}`);
  }

  console.log('[ContractService] Updated contract status:', {
    id: data.id,
    contractNumber: data.contract_number,
    status: data.status,
  });

  return data;
}

/**
 * Update a contract when client signs
 * Sets status to 'signed' and records signature data
 *
 * @param contractId - Contract UUID
 * @param signatureData - Signature data
 * @returns Updated contract result
 */
export async function updateContractSigned(
  contractId: string,
  signatureData: ContractSignatureData
): Promise<UpdateContractSignedResult> {
  const now = new Date().toISOString();

  const updateData: ContractUpdate = {
    client_signature_data: signatureData.signature_data,
    client_signed_name: signatureData.signed_name,
    client_signed_date: signatureData.signed_date,
    status: 'signed',
    signed_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)
    .select('id, contract_number, status, client_signed_name, signed_at')
    .single();

  if (error) {
    console.error('[ContractService] Error updating contract signed:', error);
    throw new Error(`Failed to update contract: ${error.message}`);
  }

  console.log('[ContractService] Updated contract to signed:', {
    id: data.id,
    contractNumber: data.contract_number,
    signedBy: data.client_signed_name,
  });

  return {
    id: data.id,
    contract_number: data.contract_number,
    status: data.status as ContractStatus,
    client_signed_name: data.client_signed_name,
    signed_at: data.signed_at,
  };
}

/**
 * Update a contract when payment is received
 * Sets status to 'paid' and records payment data
 *
 * @param contractId - Contract UUID
 * @param paymentData - Payment data
 * @returns Updated contract result
 */
export async function updateContractPayment(
  contractId: string,
  paymentData: ContractPaymentData
): Promise<UpdateContractPaymentResult> {
  const now = new Date().toISOString();

  const updateData: ContractUpdate = {
    payment_reference: paymentData.payment_reference,
    payment_amount: paymentData.payment_amount,
    payment_date: paymentData.payment_date,
    payment_method: paymentData.payment_method,
    cc_last_four: paymentData.cc_last_four ?? null,
    status: 'paid',
    payment_received_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)
    .select('id, contract_number, status, payment_reference, payment_amount, payment_received_at')
    .single();

  if (error) {
    console.error('[ContractService] Error updating contract payment:', error);
    throw new Error(`Failed to update contract: ${error.message}`);
  }

  console.log('[ContractService] Updated contract to paid:', {
    id: data.id,
    contractNumber: data.contract_number,
    paymentRef: data.payment_reference,
    amount: data.payment_amount,
  });

  return {
    id: data.id,
    contract_number: data.contract_number,
    status: data.status as ContractStatus,
    payment_reference: data.payment_reference,
    payment_amount: data.payment_amount,
    payment_received_at: data.payment_received_at,
  };
}

/**
 * Mark a contract as completed
 * Should be called after both signature and payment are received
 *
 * @param contractId - Contract UUID
 * @returns Updated contract
 */
export async function completeContract(contractId: string): Promise<Contract> {
  const now = new Date().toISOString();

  const updateData: ContractUpdate = {
    status: 'completed',
    completed_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)
    .select('*')
    .single();

  if (error) {
    console.error('[ContractService] Error completing contract:', error);
    throw new Error(`Failed to complete contract: ${error.message}`);
  }

  console.log('[ContractService] Contract completed:', {
    id: data.id,
    contractNumber: data.contract_number,
  });

  return data;
}

// =============================================================================
// COMPOSITE OPERATIONS
// =============================================================================

/**
 * Create a contract with automatic foreign key resolution
 *
 * This function resolves:
 * - request_id from tripId (if not provided)
 * - client_profile_id from customerEmail (if not provided)
 *
 * @param input - Contract creation input
 * @param tripId - Avinode trip ID for request resolution
 * @param customerEmail - Customer email for client profile resolution
 * @returns Created contract result or null if request not found
 */
export async function createContractWithResolution(
  input: Omit<CreateContractInput, 'request_id'> & { request_id?: string },
  tripId?: string,
  customerEmail?: string
): Promise<CreateContractResult | null> {
  let requestId: string | undefined = input.request_id;
  let clientProfileId: string | undefined = input.client_profile_id;

  // Resolve request_id from tripId if not provided
  if (!requestId && tripId) {
    const resolvedRequestId = await getRequestIdFromTripId(tripId, input.iso_agent_id);
    if (!resolvedRequestId) {
      console.warn('[ContractService] Could not resolve request_id from tripId:', tripId);
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
      console.log('[ContractService] Resolved client_profile_id from email:', customerEmail);
    }
  }

  return createContract({
    ...input,
    request_id: requestId,
    client_profile_id: clientProfileId,
  });
}

/**
 * Cancel a contract
 *
 * @param contractId - Contract UUID
 * @param reason - Optional cancellation reason
 * @returns Updated contract
 */
export async function cancelContract(
  contractId: string,
  reason?: string
): Promise<Contract> {
  const now = new Date().toISOString();

  // Get current contract to preserve metadata
  const current = await getContractById(contractId);
  if (!current) {
    throw new Error(`Contract not found: ${contractId}`);
  }

  const metadata = {
    ...(current.metadata as Record<string, unknown> || {}),
    cancellation_reason: reason,
    cancelled_by: 'system', // Could be enhanced to track who cancelled
  };

  const updateData: ContractUpdate = {
    status: 'cancelled',
    cancelled_at: now,
    updated_at: now,
    metadata: metadata as Json,
  };

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)
    .select('*')
    .single();

  if (error) {
    console.error('[ContractService] Error cancelling contract:', error);
    throw new Error(`Failed to cancel contract: ${error.message}`);
  }

  console.log('[ContractService] Contract cancelled:', {
    id: data.id,
    contractNumber: data.contract_number,
    reason,
  });

  return data;
}

/**
 * Expire a contract
 * Typically called by a scheduled job when quote validity expires
 *
 * @param contractId - Contract UUID
 * @returns Updated contract
 */
export async function expireContract(contractId: string): Promise<Contract> {
  const now = new Date().toISOString();

  const updateData: ContractUpdate = {
    status: 'expired',
    expired_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)
    .select('*')
    .single();

  if (error) {
    console.error('[ContractService] Error expiring contract:', error);
    throw new Error(`Failed to expire contract: ${error.message}`);
  }

  console.log('[ContractService] Contract expired:', {
    id: data.id,
    contractNumber: data.contract_number,
  });

  return data;
}
