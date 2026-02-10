/**
 * Onboarding Service
 *
 * Business logic for the ISO agent onboarding flow:
 * - Register agent (update iso_agents with personal details)
 * - Generate employment commission contract PDF
 * - Send contract via email with secure token
 * - Validate token and capture digital signature
 *
 * NOTE: The new tables (onboarding_contracts, contract_tokens) and new columns
 * on iso_agents are from migration 037_iso_agent_onboarding.sql. Until Supabase
 * types are regenerated after migration, we use type assertions for new fields.
 *
 * @see lib/validations/onboarding.ts
 * @see lib/pdf/onboarding-contract-generator.ts
 * @see lib/services/email-service.ts
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { OnboardingFormData, OnboardingStatus } from '@/lib/validations/onboarding';

// =============================================================================
// SUPABASE CLIENT (untyped for new tables not yet in generated types)
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// =============================================================================
// TYPES
// =============================================================================

export interface RegisterAgentResult {
  success: boolean;
  agentId: string;
  onboardingStatus: OnboardingStatus;
  error?: string;
}

export interface GenerateContractResult {
  success: boolean;
  contractId?: string;
  pdfStoragePath?: string;
  error?: string;
}

export interface SendContractResult {
  success: boolean;
  tokenId?: string;
  error?: string;
}

export interface ValidateTokenResult {
  valid: boolean;
  contractId?: string;
  agentId?: string;
  agentEmail?: string;
  pdfStoragePath?: string;
  error?: string;
  errorCode?: 'EXPIRED' | 'USED' | 'NOT_FOUND' | 'EMAIL_MISMATCH';
}

export interface SignContractResult {
  success: boolean;
  error?: string;
}

export interface OnboardingStatusResult {
  onboardingStatus: OnboardingStatus;
  agentId: string;
  email: string;
  fullName: string;
  hasContract: boolean;
  contractSigned: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TOKEN_EXPIRY_HOURS = 72;
const DEFAULT_COMMISSION_PERCENTAGE = 10.0;

// =============================================================================
// TOKEN GENERATION
// =============================================================================

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// =============================================================================
// REGISTER AGENT
// =============================================================================

export async function registerAgent(
  clerkUserId: string,
  formData: OnboardingFormData
): Promise<RegisterAgentResult> {
  // Find the agent by clerk_user_id
  const { data: agent, error: findError } = await db
    .from('iso_agents')
    .select('id, onboarding_status')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (findError || !agent) {
    return {
      success: false,
      agentId: '',
      onboardingStatus: 'pending',
      error: 'ISO agent not found for this user',
    };
  }

  // Check if already past 'pending' — idempotent
  if (agent.onboarding_status !== 'pending') {
    return {
      success: true,
      agentId: agent.id,
      onboardingStatus: agent.onboarding_status as OnboardingStatus,
    };
  }

  // Update agent with personal details
  const { error: updateError } = await db
    .from('iso_agents')
    .update({
      first_name: formData.firstName,
      last_name: formData.lastName,
      full_name: `${formData.firstName} ${formData.lastName}`,
      date_of_birth: formData.dateOfBirth,
      phone: formData.phone,
      address_line_1: formData.addressLine1,
      address_line_2: formData.addressLine2 || null,
      city: formData.city,
      state: formData.state,
      zip_code: formData.zipCode,
      onboarding_status: 'profile_complete',
      commission_percentage: DEFAULT_COMMISSION_PERCENTAGE,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agent.id);

  if (updateError) {
    console.error('[OnboardingService] Failed to update agent:', updateError);
    return {
      success: false,
      agentId: agent.id,
      onboardingStatus: 'pending',
      error: 'Failed to save profile data',
    };
  }

  return {
    success: true,
    agentId: agent.id,
    onboardingStatus: 'profile_complete',
  };
}

// =============================================================================
// GENERATE CONTRACT
// =============================================================================

export async function createContractRecord(
  agentId: string,
  pdfStoragePath: string,
  commissionPercentage: number = DEFAULT_COMMISSION_PERCENTAGE
): Promise<GenerateContractResult> {
  const { data: contract, error } = await db
    .from('onboarding_contracts')
    .insert({
      agent_id: agentId,
      pdf_storage_path: pdfStoragePath,
      commission_percentage: commissionPercentage,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[OnboardingService] Failed to create contract record:', error);
    return {
      success: false,
      error: 'Failed to create contract record',
    };
  }

  return {
    success: true,
    contractId: contract.id,
    pdfStoragePath,
  };
}

// =============================================================================
// SEND CONTRACT
// =============================================================================

export async function createContractToken(
  contractId: string,
  agentId: string,
  email: string
): Promise<{ token: string; tokenId: string } | null> {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  const { data, error } = await db
    .from('contract_tokens')
    .insert({
      contract_id: contractId,
      agent_id: agentId,
      token,
      email,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[OnboardingService] Failed to create token:', error);
    return null;
  }

  return { token, tokenId: data.id };
}

export async function updateOnboardingStatus(
  agentId: string,
  status: OnboardingStatus
): Promise<boolean> {
  const { error } = await db
    .from('iso_agents')
    .update({
      onboarding_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId);

  if (error) {
    console.error('[OnboardingService] Failed to update onboarding status:', error);
    return false;
  }

  return true;
}

// =============================================================================
// VALIDATE TOKEN
// =============================================================================

export async function validateContractToken(
  token: string,
  authenticatedEmail?: string
): Promise<ValidateTokenResult> {
  const { data: tokenRow, error } = await db
    .from('contract_tokens')
    .select('*, onboarding_contracts(pdf_storage_path)')
    .eq('token', token)
    .single();

  if (error || !tokenRow) {
    return {
      valid: false,
      error: 'Token not found',
      errorCode: 'NOT_FOUND',
    };
  }

  // Check if already used
  if (tokenRow.used_at) {
    return {
      valid: false,
      error: 'This token has already been used',
      errorCode: 'USED',
    };
  }

  // Check expiration
  if (new Date(tokenRow.expires_at) < new Date()) {
    return {
      valid: false,
      error: 'This token has expired',
      errorCode: 'EXPIRED',
    };
  }

  // Check email binding if authenticated email is provided
  if (authenticatedEmail && tokenRow.email !== authenticatedEmail) {
    return {
      valid: false,
      error: 'This token is not associated with your email address',
      errorCode: 'EMAIL_MISMATCH',
    };
  }

  const contracts = tokenRow.onboarding_contracts as { pdf_storage_path: string } | null;

  return {
    valid: true,
    contractId: tokenRow.contract_id,
    agentId: tokenRow.agent_id,
    agentEmail: tokenRow.email,
    pdfStoragePath: contracts?.pdf_storage_path,
  };
}

// =============================================================================
// SIGN CONTRACT
// =============================================================================

export async function signContract(
  token: string,
  signedName: string,
  ipAddress: string
): Promise<SignContractResult> {
  // First validate the token
  const validation = await validateContractToken(token);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const now = new Date().toISOString();

  // Mark token as used
  const { error: tokenError } = await db
    .from('contract_tokens')
    .update({ used_at: now })
    .eq('token', token);

  if (tokenError) {
    console.error('[OnboardingService] Failed to mark token as used:', tokenError);
    return { success: false, error: 'Failed to process signature' };
  }

  // Update the contract with signature data
  const { error: contractError } = await db
    .from('onboarding_contracts')
    .update({
      status: 'signed',
      signed_at: now,
      signed_name: signedName,
      signed_ip_address: ipAddress,
      signature_data: JSON.stringify({
        signedName,
        signedAt: now,
        ipAddress,
        method: 'typed_name_acknowledgment',
      }),
      updated_at: now,
    })
    .eq('id', validation.contractId!);

  if (contractError) {
    console.error('[OnboardingService] Failed to update contract:', contractError);
    // Rollback: un-mark token so user can retry
    await db.from('contract_tokens').update({ used_at: null }).eq('token', token);
    return { success: false, error: 'Failed to save signature' };
  }

  // Update agent onboarding status to 'completed'
  const statusUpdated = await updateOnboardingStatus(
    validation.agentId!,
    'completed'
  );

  if (!statusUpdated) {
    console.error('[OnboardingService] Failed to update agent status to completed');
    // Rollback: revert contract and token so user can retry
    await db.from('onboarding_contracts').update({ status: 'pending', signed_at: null, signed_name: null, signed_ip_address: null, signature_data: null, updated_at: now }).eq('id', validation.contractId!);
    await db.from('contract_tokens').update({ used_at: null }).eq('token', token);
    return { success: false, error: 'Failed to complete onboarding. Please try again.' };
  }

  return { success: true };
}

// =============================================================================
// GET ONBOARDING STATUS
// =============================================================================

export async function getOnboardingStatus(
  clerkUserId: string
): Promise<OnboardingStatusResult | null> {
  const { data: agent, error } = await db
    .from('iso_agents')
    .select('id, email, full_name, onboarding_status')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error || !agent) {
    return null;
  }

  // Check if there's a contract
  const { data: contracts } = await db
    .from('onboarding_contracts')
    .select('id, status')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const latestContract = contracts?.[0];

  return {
    onboardingStatus: agent.onboarding_status as OnboardingStatus,
    agentId: agent.id,
    email: agent.email,
    fullName: agent.full_name,
    hasContract: !!latestContract,
    contractSigned: latestContract?.status === 'signed',
  };
}

// =============================================================================
// GET AGENT FOR CONTRACT GENERATION
// =============================================================================

export async function getAgentForContractGeneration(agentId: string) {
  const { data, error } = await db
    .from('iso_agents')
    .select(
      'id, email, full_name, first_name, last_name, date_of_birth, phone, address_line_1, address_line_2, city, state, zip_code, commission_percentage, onboarding_status'
    )
    .eq('id', agentId)
    .single();

  if (error) {
    console.error('[OnboardingService] Failed to get agent:', error);
    return null;
  }

  return data;
}
