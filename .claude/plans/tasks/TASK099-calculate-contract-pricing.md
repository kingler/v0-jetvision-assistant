# Task ID: TASK099
# Task Name: Calculate Contract Pricing Breakdown
# Parent User Story: [[US049-generate-contract|US049 - Generate contract from accepted proposal]]
# Status: Done
# Priority: High
# Estimate: 3h

## Description
Implement the contract pricing calculation engine that computes the full cost breakdown for a charter flight contract. The calculation includes: base charter price, Federal Excise Tax (FET) at 7.5%, per-passenger segment fees ($5.20/passenger/segment), and optional credit card processing fee (5%). All amounts must be calculated with precision and clearly itemized.

## Acceptance Criteria
- Calculates base_amount from the proposal's final_amount
- Applies FET at 7.5% of base_amount: fet_amount = base_amount * 0.075
- Calculates segment fees: segment_fee = passenger_count * segment_count * 5.20
- Calculates subtotal: subtotal = base_amount + fet_amount + segment_fee
- If payment by credit card: cc_fee = subtotal * 0.05
- Calculates total: total_amount = subtotal + cc_fee (if applicable)
- All amounts rounded to 2 decimal places
- Returns itemized breakdown object with all line items
- Handles edge cases: 0 passengers, single segment, no CC fee

## Implementation Details
- **File(s)**: lib/types/contract.ts
- **Approach**: Define a ContractPricing interface and a calculateContractPricing function. The function accepts { base_amount, passenger_count, segment_count, payment_method } and returns a fully itemized pricing breakdown. Use precise decimal arithmetic (consider Decimal.js or manual rounding). Define constants for tax rates and fee amounts. Export types for use across contract-related components.

## Dependencies
- Proposal final_amount must be available
- Flight details (passenger count, number of segments) must be available
- Payment method selection determines CC fee inclusion
