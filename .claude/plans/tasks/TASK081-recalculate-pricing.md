# Task ID: TASK081
# Task Name: Recalculate Proposal Pricing with Margin
# Parent User Story: [[US040-adjust-proposal-margin|US040 - Edit margin/markup on proposal]]
# Status: Done
# Priority: High
# Estimate: 2h

## Description
Create a PATCH endpoint that recalculates the proposal's final_amount based on the updated margin. The formula is: final_amount = total_amount + margin, where margin is either a percentage of total_amount or a fixed dollar amount. The endpoint updates the proposal record and returns the new pricing.

## Acceptance Criteria
- PATCH /api/proposal/[id]/margin accepts { margin_type, margin_value }
- margin_type is either "percentage" or "fixed"
- For percentage: margin_amount = total_amount * (margin_value / 100)
- For fixed: margin_amount = margin_value
- final_amount = total_amount + margin_amount
- Updates the proposal record in the database
- Returns the updated proposal with new pricing fields
- Validates margin_value is non-negative
- Returns 404 if proposal not found

## Implementation Details
- **File(s)**: app/api/proposal/[id]/margin/route.ts
- **Approach**: Create a PATCH route handler with dynamic [id] parameter. Validate input with Zod schema. Fetch current proposal to get total_amount. Calculate margin_amount and final_amount. Update proposal record in Supabase. Return updated proposal object.

## Dependencies
- [[TASK079-create-proposal-record|TASK079]] (Create proposal record) - proposal must exist in database
- Proposals table must have margin_type, margin_value, final_amount columns
