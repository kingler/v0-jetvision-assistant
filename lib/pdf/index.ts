/**
 * PDF Generation Module
 *
 * Exports for proposal PDF generation functionality.
 */

export { generateProposal, prepareProposalData } from './proposal-generator';
export type {
  GenerateProposalInput,
  GenerateProposalOutput,
} from './proposal-generator';

export { ProposalDocument } from './proposal-template';
export type { ProposalData } from './proposal-template';
