/**
 * @vitest-environment jsdom
 */

/**
 * PaymentConfirmationModal Component Tests
 *
 * Tests for rendering, validation, and form submission.
 *
 * @see components/contract/payment-confirmation-modal.tsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  PaymentConfirmationModal,
  type PaymentConfirmationModalProps,
} from '@/components/contract/payment-confirmation-modal';

// =============================================================================
// HELPERS
// =============================================================================

const defaultProps: PaymentConfirmationModalProps = {
  open: true,
  onClose: vi.fn(),
  contractId: 'contract-uuid-456',
  contractNumber: 'CONTRACT-2026-001',
  totalAmount: 45182.76,
  currency: 'USD',
  onConfirm: vi.fn(),
};

function renderModal(overrides: Partial<PaymentConfirmationModalProps> = {}) {
  return render(
    <PaymentConfirmationModal {...defaultProps} {...overrides} />
  );
}

// =============================================================================
// TESTS
// =============================================================================

describe('PaymentConfirmationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('Rendering', () => {
    it('displays contract number in description', () => {
      renderModal();

      expect(screen.getByText(/CONTRACT-2026-001/)).toBeInTheDocument();
    });

    it('pre-fills the payment amount', () => {
      renderModal();

      const amountInput = screen.getByLabelText(/Payment Amount/i);
      expect(amountInput).toHaveValue(45182.76);
    });

    it('defaults payment method to wire', () => {
      renderModal();

      // The SelectTrigger should show Wire Transfer
      expect(screen.getByText('Wire Transfer')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  describe('Validation', () => {
    it('shows error when reference is empty and submit is clicked', async () => {
      renderModal();

      // Click confirm without entering reference
      const confirmButton = screen.getByRole('button', { name: /Confirm Payment/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/reference is required/i)).toBeInTheDocument();
      });

      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('shows error when amount is 0', async () => {
      renderModal();

      // Set amount to 0
      const amountInput = screen.getByLabelText(/Payment Amount/i);
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, '0');

      // Enter a reference so validation gets to amount check
      const refInput = screen.getByPlaceholderText(/Wire transfer/i);
      await userEvent.type(refInput, 'WT-001');

      const confirmButton = screen.getByRole('button', { name: /Confirm Payment/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/greater than 0/i)).toBeInTheDocument();
      });
    });

    it('clears error when user types in reference field', async () => {
      renderModal();

      // Trigger error
      const confirmButton = screen.getByRole('button', { name: /Confirm Payment/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/reference is required/i)).toBeInTheDocument();
      });

      // Type in reference field - error should clear
      const refInput = screen.getByPlaceholderText(/Wire transfer/i);
      await userEvent.type(refInput, 'W');

      await waitFor(() => {
        expect(screen.queryByText(/reference is required/i)).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------------

  describe('Submission', () => {
    it('calls onConfirm with correct data on valid submission', async () => {
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      renderModal({ onConfirm });

      // Fill in reference
      const refInput = screen.getByPlaceholderText(/Wire transfer/i);
      await userEvent.type(refInput, 'WT-2026-001');

      // Submit
      const confirmButton = screen.getByRole('button', { name: /Confirm Payment/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith({
          paymentAmount: 45182.76,
          paymentMethod: 'wire',
          paymentReference: 'WT-2026-001',
        });
      });
    });

    it('calls onClose after successful submission', async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      renderModal({ onClose, onConfirm });

      const refInput = screen.getByPlaceholderText(/Wire transfer/i);
      await userEvent.type(refInput, 'WT-001');

      const confirmButton = screen.getByRole('button', { name: /Confirm Payment/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('shows error message when onConfirm throws', async () => {
      const onConfirm = vi.fn().mockRejectedValue(new Error('API failed'));
      renderModal({ onConfirm });

      const refInput = screen.getByPlaceholderText(/Wire transfer/i);
      await userEvent.type(refInput, 'WT-001');

      const confirmButton = screen.getByRole('button', { name: /Confirm Payment/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/API failed/i)).toBeInTheDocument();
      });
    });

    it('does not close modal when onConfirm throws', async () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn().mockRejectedValue(new Error('API failed'));
      renderModal({ onClose, onConfirm });

      const refInput = screen.getByPlaceholderText(/Wire transfer/i);
      await userEvent.type(refInput, 'WT-001');

      const confirmButton = screen.getByRole('button', { name: /Confirm Payment/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/API failed/i)).toBeInTheDocument();
      });

      // onClose should NOT have been called
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not render when open is false', () => {
      renderModal({ open: false });

      expect(screen.queryByText(/Confirm Payment/i)).not.toBeInTheDocument();
    });
  });
});
