/**
 * PDF Generation Module
 *
 * Exports for proposal and contract PDF generation functionality.
 */

// Proposal exports
export { generateProposal, prepareProposalData } from './proposal-generator';
export type {
  GenerateProposalInput,
  GenerateProposalOutput,
} from './proposal-generator';

export { ProposalDocument } from './proposal-template';
export type { ProposalData } from './proposal-template';

// Contract exports
export {
  generateContract,
  prepareContractData,
  generateCCAuthForm,
  generateContractId,
  generateFileName as generateContractFileName,
  calculateContractPricing,
} from './contract-generator';

export { ContractDocument } from './contract-template';
export type { ContractData } from '@/lib/types/contract';

// Onboarding contract exports
export { generateOnboardingContract, generateOnboardingFileName } from './onboarding-contract-generator';
export type {
  GenerateOnboardingContractInput,
  GenerateOnboardingContractOutput,
} from './onboarding-contract-generator';

export { OnboardingContractDocument } from './onboarding-contract-template';
export type { OnboardingContractData } from './onboarding-contract-template';
