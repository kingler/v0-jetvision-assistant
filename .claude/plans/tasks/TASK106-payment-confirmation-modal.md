# Task ID: TASK106
# Task Name: Payment Confirmation Modal Component
# Parent User Story: [[US053-confirm-payment|US053 - Confirm payment received]]
# Status: Done
# Priority: Critical
# Estimate: 3h

## Description
Create a modal dialog component for confirming that payment has been received for a signed contract. The modal captures payment details including the total amount due, payment method used, and a reference number for tracking. This is a critical step in the deal closure workflow.

## Acceptance Criteria
- Modal displays the contract total amount as the expected payment amount
- Payment amount field is pre-filled but editable (for partial payments or adjustments)
- Payment method dropdown: Wire Transfer, Credit Card, Check, ACH
- Reference number text input for transaction tracking
- Payment date picker (defaults to today)
- Notes/memo optional text area
- Confirm button calls the payment API (TASK107)
- Cancel button closes without action
- Validates all required fields before submission
- Shows confirmation summary before final submit

## Implementation Details
- **File(s)**: components/contract/payment-confirmation-modal.tsx
- **Approach**: Build using the design system Dialog component. Use controlled form state with useState for all fields. Pre-populate amount from contract data. Use Select component for payment method. Add form validation with Zod schema. On confirm, call POST /api/contract/[id]/payment. Show loading state during submission and success/error feedback.

## Dependencies
- [[TASK107-call-confirm-payment|TASK107]] (Confirm payment API) - backend endpoint
- [[TASK103-implement-sign-api|TASK103]] (Sign API) - contract must be in "signed" status
- Design system Dialog, Input, Select, DatePicker components
