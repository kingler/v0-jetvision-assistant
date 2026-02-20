# Feature ID: F005
# Feature Name: Contract & Payment Management
# Status: Implemented
# Priority: Critical

## Description
Contract generation, signing, and payment management system that closes deals from accepted proposals through to final payment confirmation. The feature generates contracts with detailed pricing including base cost, Federal Excise Tax (FET at 7.5%), segment fees, and credit card processing fees (5%), then tracks contracts through a full lifecycle from draft to completion. Payment confirmation captures method and reference details, updating the deal to closed_won status.

## Business Value
Contract and payment management is the final mile of the sales process where revenue is realized. By automating contract generation from accepted proposals with accurate tax and fee calculations, the system eliminates manual contract preparation errors and accelerates deal closure. The structured lifecycle tracking ensures no contract falls through the cracks, while payment confirmation provides clear audit trails. Moving from proposal acceptance to signed contract in minutes rather than days directly impacts cash flow and broker commission timing.

## Key Capabilities
- Generate contracts from accepted proposals with complete pricing structure
- Contract pricing breakdown:
  - Base cost (from accepted quote with broker margin)
  - Federal Excise Tax (FET) at 7.5%
  - Segment fees per flight leg
  - Credit card processing fee at 5%
  - Total contract value
- Send contracts to customers for review and signing
- Contract signing status tracking
- Payment confirmation with method and reference number capture
- Deal closure with closed_won status update
- Contract status lifecycle:
  1. Draft - Contract generated, under internal review
  2. Sent - Contract delivered to customer
  3. Viewed - Customer has opened the contract
  4. Signed - Customer has signed the contract
  5. Payment Pending - Awaiting payment
  6. Paid - Payment received and confirmed
  7. Completed - Deal fully closed
- Contract numbering and reference management

## Related Epics
- [[EPIC011-contract-generation|EPIC011 - Contract Generation]]
- [[EPIC012-payment-deal-closure|EPIC012 - Payment & Deal Closure]]

## Dependencies
- [[F004-proposal-generation|F004 - Proposal Generation (contracts are generated from accepted proposals)]]

## Technical Components
- `app/api/contract/` - API routes for contract generation, delivery, signing, and payment operations
- `components/contract/` - Contract display, status tracking, and payment confirmation UI components
- `lib/types/contract.ts` - Contract type definitions, status enums, and pricing calculation types
- `lib/services/` - Contract generation service with tax and fee calculation logic
- `components/chat/` - Chat-embedded contract cards and payment confirmation interactions
