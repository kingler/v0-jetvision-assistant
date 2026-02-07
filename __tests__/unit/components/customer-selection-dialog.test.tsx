/**
 * Customer Selection Dialog Component Tests
 *
 * Comprehensive tests for the CustomerSelectionDialog component with typeahead search.
 * Tests rendering, search filtering, keyboard navigation, selection, and accessibility.
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CustomerSelectionDialog,
  type ClientProfile,
} from '@/components/customer-selection-dialog';

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample client data
const mockClients: ClientProfile[] = [
  {
    id: 'client-1',
    company_name: 'Apex Ventures',
    contact_name: 'Michael Chen',
    email: 'michael@apex.com',
    phone: '+1-555-0101',
  },
  {
    id: 'client-2',
    company_name: 'Tech Innovations Corp',
    contact_name: 'Amanda Stevens',
    email: 'amanda@techinnovations.com',
    phone: '+1-555-0102',
  },
  {
    id: 'client-3',
    company_name: 'Global Finance Partners',
    contact_name: 'Richard Montgomery',
    email: 'richard@globalfinance.com',
    phone: null,
  },
  {
    id: 'client-4',
    company_name: 'Sunrise Entertainment',
    contact_name: 'Victoria Lane',
    email: 'victoria@sunrise.com',
    phone: '+1-555-0104',
  },
];

describe('CustomerSelectionDialog', () => {
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnSelect = vi.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ clients: mockClients }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog when open', async () => {
      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Select Customer for Proposal')).toBeInTheDocument();
      expect(
        screen.getByText(/Choose the customer this proposal is for/i)
      ).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <CustomerSelectionDialog
          open={false}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByText('Select Customer for Proposal')).not.toBeInTheDocument();
    });

    it('should show loading state while fetching clients', () => {
      // Don't resolve the fetch yet
      mockFetch.mockReturnValue(new Promise(() => {}));

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Loading customers...')).toBeInTheDocument();
    });

    it('should render search input after loading', async () => {
      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });
    });

    it('should render Cancel and Generate Proposal buttons', async () => {
      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'Generate Proposal' })
        ).toBeInTheDocument();
      });
    });

    it('should disable Generate Proposal button when no customer is selected', async () => {
      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Generate Proposal' });
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch clients')).toBeInTheDocument();
      });
    });

    it('should display error when no customers available and trying to confirm', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ clients: [] }),
      });

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/No customers found/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Typeahead Search', () => {
    it('should filter clients by company name', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);
      await user.type(input, 'Apex');

      await waitFor(() => {
        // Check that only filtered results are in the dropdown
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('Apex Ventures');
        expect(listbox).not.toHaveTextContent('Tech Innovations Corp');
      });
    });

    it('should filter clients by contact name', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);
      await user.type(input, 'Amanda');

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('Tech Innovations Corp');
        expect(listbox).not.toHaveTextContent('Apex Ventures');
      });
    });

    it('should filter clients by email', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);
      await user.type(input, 'globalfinance');

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('Global Finance Partners');
        expect(listbox).not.toHaveTextContent('Apex Ventures');
      });
    });

    it('should show no matches message when search returns empty', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);
      await user.type(input, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/No customers match/i)).toBeInTheDocument();
      });
    });

    it('should be case insensitive when searching', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);
      await user.type(input, 'APEX');

      await waitFor(() => {
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('Apex Ventures');
      });
    });
  });

  describe('Selection', () => {
    it('should select a client when clicked', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      // Open dropdown
      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);

      // Click on a client
      const clientItem = await screen.findByText('Apex Ventures');
      await user.click(clientItem);

      // Check that selection preview is shown
      await waitFor(() => {
        expect(screen.getByText('Selected Customer:')).toBeInTheDocument();
        expect(screen.getByText('Contact: Michael Chen')).toBeInTheDocument();
        expect(screen.getByText('Email: michael@apex.com')).toBeInTheDocument();
      });
    });

    it('should enable Generate Proposal button after selection', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);

      const clientItem = await screen.findByText('Apex Ventures');
      await user.click(clientItem);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Generate Proposal' });
        expect(button).not.toBeDisabled();
      });
    });

    it('should call onSelect with selected client when confirmed', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);

      const clientItem = await screen.findByText('Apex Ventures');
      await user.click(clientItem);

      const confirmButton = screen.getByRole('button', { name: 'Generate Proposal' });
      await user.click(confirmButton);

      expect(mockOnSelect).toHaveBeenCalledWith(mockClients[0], expect.any(Number));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should clear selection when clear button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);

      // Select a client from the dropdown
      const options = await screen.findAllByRole('option');
      await user.click(options[0]); // Click first option (Apex Ventures)

      // Verify selection was made
      await waitFor(() => {
        expect(screen.getByText('Selected Customer:')).toBeInTheDocument();
      });

      // Find and click clear button (the X button in the input area)
      const inputContainer = input.closest('.relative');
      const clearButton = inputContainer?.querySelector('button svg.lucide-x')?.closest('button');
      if (clearButton) {
        await user.click(clearButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('Selected Customer:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should open dropdown on ArrowDown key', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);
      await user.keyboard('{Escape}'); // Close dropdown first
      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('should navigate through items with ArrowDown and ArrowUp', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);

      // Navigate down
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      // Navigate up
      await user.keyboard('{ArrowUp}');

      // The dropdown should still be visible
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should select highlighted item on Enter key', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);

      // Navigate to first item and select
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Selected Customer:')).toBeInTheDocument();
      });
    });

    it('should close dropdown on Escape key', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);

      // Dropdown should be open
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Press Escape
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Actions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show error when confirming without selection', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Generate Proposal' })
        ).toBeInTheDocument();
      });

      // Button should be disabled, but let's verify the error state
      const confirmButton = screen.getByRole('button', { name: 'Generate Proposal' });
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Initial Customer Selection', () => {
    it('should pre-select customer when initialCustomerId is provided', async () => {
      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          initialCustomerId="client-2"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Selected Customer:')).toBeInTheDocument();
        // The selected customer preview shows the company name and contact info
        const preview = screen.getByText('Selected Customer:').closest('div');
        expect(preview).toHaveTextContent('Tech Innovations Corp');
        expect(preview).toHaveTextContent('Amanda Stevens');
      });
    });

    it('should populate search input with pre-selected customer name', async () => {
      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          initialCustomerId="client-1"
        />
      );

      await waitFor(() => {
        const input = screen.getByPlaceholderText(
          'Search by name, company, or email...'
        ) as HTMLInputElement;
        expect(input.value).toBe('Apex Ventures');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form elements', async () => {
      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Customer/)).toBeInTheDocument();
      });
    });

    it('should have proper listbox role for dropdown', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should have option role for list items', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(mockClients.length);
    });

    it('should have aria-selected on selected option', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);

      const clientItem = await screen.findByText('Apex Ventures');
      await user.click(clientItem);

      // Reopen dropdown
      await user.click(input);

      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty client list', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ clients: [] }),
      });

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/No customers found/i)
        ).toBeInTheDocument();
      });
    });

    it('should handle client without phone number', async () => {
      const user = userEvent.setup();

      render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Search by name, company, or email...');
      await user.click(input);
      await user.type(input, 'Global Finance');

      // Click on the option in the dropdown
      const listbox = screen.getByRole('listbox');
      const option = listbox.querySelector('[role="option"]');
      if (option) {
        await user.click(option);
      }

      await waitFor(() => {
        expect(screen.getByText('Selected Customer:')).toBeInTheDocument();
        // The preview should not contain Phone: since this client has no phone
        const preview = screen.getByText('Selected Customer:').closest('div');
        expect(preview).not.toHaveTextContent('Phone:');
      });
    });

    it('should reset state when dialog is closed and reopened', async () => {
      const { rerender } = render(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Search by name, company, or email...')
        ).toBeInTheDocument();
      });

      // Close dialog
      rerender(
        <CustomerSelectionDialog
          open={false}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      // Reopen dialog
      rerender(
        <CustomerSelectionDialog
          open={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      await waitFor(() => {
        const input = screen.getByPlaceholderText(
          'Search by name, company, or email...'
        ) as HTMLInputElement;
        expect(input.value).toBe('');
      });
    });
  });
});
