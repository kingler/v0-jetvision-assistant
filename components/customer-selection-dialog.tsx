'use client';

/**
 * Customer Selection Dialog Component
 *
 * Dialog component for selecting a customer from the client_profiles database
 * when generating a proposal. Uses a typeahead search component for quick
 * customer lookup.
 *
 * @see app/api/clients/route.ts - Client profiles API
 * @see components/chat-interface.tsx - Proposal generation workflow
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, X, Check, ChevronDown, Plus, ArrowLeft, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Client profile data structure from the database
 */
export interface ClientProfile {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string | null;
  preferences?: Record<string, any> | null;
  notes?: string | null;
}

/**
 * Props for CustomerSelectionDialog component
 */
export interface CustomerSelectionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when a customer is selected (with optional margin percentage) */
  onSelect: (customer: ClientProfile, marginPercentage?: number) => void;
  /** Optional initial customer ID to pre-select */
  initialCustomerId?: string;
  /** Whether to show the profit margin slider (default: true) */
  showMarginSlider?: boolean;
  /** Locked customer ID — when set, only this customer can be selected */
  lockedCustomerId?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Customer Selection Dialog
 *
 * Fetches client profiles from the API and displays them in a typeahead
 * search component. When a customer is selected and confirmed, calls the
 * onSelect callback.
 */
export function CustomerSelectionDialog({
  open,
  onClose,
  onSelect,
  initialCustomerId,
  showMarginSlider = true,
  lockedCustomerId,
}: CustomerSelectionDialogProps) {
  // State for client profiles list
  const [clients, setClients] = useState<ClientProfile[]>([]);
  // State for selected client
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  // State for loading status
  const [isLoading, setIsLoading] = useState(false);
  // State for error messages
  const [error, setError] = useState<string | null>(null);
  // State for search query
  const [searchQuery, setSearchQuery] = useState<string>('');
  // State for dropdown visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // State for highlighted index (keyboard navigation)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  // State for mode: 'select' or 'create'
  const [mode, setMode] = useState<'select' | 'create'>('select');
  // State for new customer form
  const [newCustomerForm, setNewCustomerForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
  });
  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for profit margin percentage (default 10% per ONEK-177)
  const [marginPercentage, setMarginPercentage] = useState(10);
  // Whether the user is entering a custom margin value
  const [isCustomMargin, setIsCustomMargin] = useState(false);

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * Fetch client profiles from the API when dialog opens
   */
  useEffect(() => {
    if (!open) return;

    const fetchClients = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/clients');
        if (!response.ok) {
          throw new Error('Failed to fetch clients');
        }

        const data = await response.json();
        const clientList = data.clients || [];
        setClients(clientList);

        // Pre-select initial customer if provided
        if (initialCustomerId) {
          const initialClient = clientList.find(
            (c: ClientProfile) => c.id === initialCustomerId
          );
          if (initialClient) {
            setSelectedClient(initialClient);
            setSearchQuery(initialClient.company_name);
          }
        }
      } catch (err) {
        console.error('[CustomerSelectionDialog] Error fetching clients:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load customers'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [open, initialCustomerId]);

  /**
   * Filter clients based on search query
   */
  const filteredClients = clients.filter((client) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      client.company_name.toLowerCase().includes(query) ||
      client.contact_name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query)
    );
  });

  /**
   * Handle customer selection from dropdown
   */
  const handleSelectClient = useCallback((client: ClientProfile) => {
    setSelectedClient(client);
    setSearchQuery(client.company_name);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setError(null);
  }, []);

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);

    // Clear selection if input doesn't match selected client
    if (selectedClient && value !== selectedClient.company_name) {
      setSelectedClient(null);
    }
  };

  /**
   * Handle input focus
   */
  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredClients.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredClients[highlightedIndex]) {
          handleSelectClient(filteredClients[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  /**
   * Scroll highlighted item into view
   */
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-item]');
      const highlightedItem = items[highlightedIndex] as HTMLElement;
      if (highlightedItem && typeof highlightedItem.scrollIntoView === 'function') {
        highlightedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle customer selection confirmation
   */
  const handleConfirm = () => {
    if (!selectedClient) {
      setError('Please select a customer');
      return;
    }

    // Call the onSelect callback with the selected customer and margin
    onSelect(selectedClient, showMarginSlider ? marginPercentage : undefined);
    // Close the dialog
    onClose();
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    setSelectedClient(null);
    setError(null);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    setMode('select');
    setMarginPercentage(30);
    setNewCustomerForm({
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
    });
    onClose();
  };

  /**
   * Clear selection
   */
  const handleClear = () => {
    setSelectedClient(null);
    setSearchQuery('');
    setIsDropdownOpen(true);
    // Focus the input after clearing
    const input = document.getElementById('customer-typeahead');
    input?.focus();
  };

  /**
   * Switch to create mode
   */
  const handleSwitchToCreate = () => {
    setMode('create');
    setIsDropdownOpen(false);
    setError(null);
  };

  /**
   * Switch back to select mode
   */
  const handleSwitchToSelect = () => {
    setMode('select');
    setNewCustomerForm({
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
    });
    setError(null);
  };

  /**
   * Handle new customer form field change
   */
  const handleFormChange = (field: keyof typeof newCustomerForm, value: string) => {
    setNewCustomerForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Handle new customer creation
   */
  const handleCreateCustomer = async () => {
    // Validate required fields
    if (!newCustomerForm.company_name.trim()) {
      setError('Company name is required');
      return;
    }
    if (!newCustomerForm.contact_name.trim()) {
      setError('Contact name is required');
      return;
    }
    if (!newCustomerForm.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!isValidEmail(newCustomerForm.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_name: newCustomerForm.company_name.trim(),
          contact_name: newCustomerForm.contact_name.trim(),
          email: newCustomerForm.email.trim(),
          phone: newCustomerForm.phone.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create customer');
      }

      const { client: newClient } = await response.json();

      // Add new client to the list
      setClients((prev) => [newClient, ...prev]);

      // Auto-select the new customer
      setSelectedClient(newClient);
      setSearchQuery(newClient.company_name);

      // Reset form and switch back to select mode
      setNewCustomerForm({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
      });
      setMode('select');
    } catch (err) {
      console.error('[CustomerSelectionDialog] Error creating customer:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to create customer'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={handleClose}>
      <ResponsiveModalContent className="sm:max-w-[500px] overflow-visible">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {mode === 'select' ? 'Select Customer for Proposal' : 'Create New Customer'}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {mode === 'select'
              ? 'Choose the customer this proposal is for. Customer information will be retrieved from your client profiles.'
              : 'Enter the details for the new customer. They will be added to your client profiles.'}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="space-y-3 md:space-y-4 py-2 md:py-4 overflow-visible min-h-[350px] max-h-[500px]">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-placeholder" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading customers...
              </span>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="rounded-md bg-error-bg border border-error-border p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Typeahead search - Select Mode */}
          {!isLoading && mode === 'select' && (
            <div className="space-y-2">
              <label
                htmlFor="customer-typeahead"
                className="text-sm font-medium text-foreground"
              >
                Customer <span className="text-destructive">*</span>
              </label>

              <div className="relative" ref={dropdownRef}>
                {/* Input field */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder pointer-events-none" />
                  <Input
                    id="customer-typeahead"
                    type="text"
                    placeholder="Search by name, company, or email..."
                    value={searchQuery}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      'pl-9 pr-16',
                      selectedClient &&
                        'border-success dark:border-success focus-visible:ring-success/50'
                    )}
                    autoComplete="off"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {selectedClient && (
                      <Check className="h-4 w-4 text-success" />
                    )}
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClear}
                        className="p-1 text-text-placeholder hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="p-1 text-text-placeholder hover:text-foreground"
                    >
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isDropdownOpen && 'rotate-180'
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Dropdown list */}
                {isDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
                    {/* Create New Customer button */}
                    <button
                      type="button"
                      onClick={handleSwitchToCreate}
                      className="flex w-full items-center gap-2 px-3 py-3 md:py-2.5 text-sm text-warning hover:bg-warning-bg border-b-2 border-border min-h-[44px] md:min-h-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create New Customer</span>
                    </button>
                    <ul
                      ref={listRef}
                      className="max-h-60 overflow-auto py-1"
                      role="listbox"
                    >
                      {clients.length === 0 ? (
                        <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                          No customers found. Click above to create one.
                        </li>
                      ) : filteredClients.length === 0 ? (
                        <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                          No customers match "{searchQuery}"
                        </li>
                      ) : (
                        filteredClients.map((client, index) => {
                          const isLocked = lockedCustomerId != null && client.id !== lockedCustomerId;
                          return (
                          <li
                            key={client.id}
                            data-item
                            role="option"
                            aria-selected={selectedClient?.id === client.id}
                            aria-disabled={isLocked}
                            className={cn(
                              'px-3 py-3 md:py-2.5 transition-colors min-h-[44px] md:min-h-0',
                              isLocked
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer',
                              !isLocked && highlightedIndex === index &&
                                'bg-surface-tertiary',
                              selectedClient?.id === client.id &&
                                'bg-warning-bg'
                            )}
                            onClick={() => !isLocked && handleSelectClient(client)}
                            onMouseEnter={() => !isLocked && setHighlightedIndex(index)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {client.company_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {client.contact_name} • {client.email}
                                </span>
                              </div>
                              {lockedCustomerId === client.id ? (
                                <Lock className="h-4 w-4 text-warning" />
                              ) : selectedClient?.id === client.id ? (
                                <Check className="h-4 w-4 text-warning" />
                              ) : null}
                            </div>
                          </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Selected customer details preview */}
              {selectedClient && (
                <div className="mt-4 rounded-md bg-surface-secondary border border-border p-3">
                  <p className="text-xs font-medium text-foreground mb-1">
                    Selected Customer:
                  </p>
                  <p className="text-sm text-foreground">
                    {selectedClient.company_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Contact: {selectedClient.contact_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Email: {selectedClient.email}
                  </p>
                  {selectedClient.phone && (
                    <p className="text-xs text-muted-foreground">
                      Phone: {selectedClient.phone}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Service Charge Selector - shown when customer is selected */}
          {!isLoading && mode === 'select' && selectedClient && showMarginSlider && (
            <div className="space-y-3 rounded-md bg-info-bg border border-info-border p-3 md:p-4">
              <label className="text-sm font-medium text-foreground">
                Jetvision Service Charge
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[8, 10, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setMarginPercentage(preset);
                      setIsCustomMargin(false);
                    }}
                    className={cn(
                      'px-3 py-2 md:py-1.5 text-sm font-medium rounded-md border transition-colors min-h-[44px] md:min-h-0',
                      !isCustomMargin && marginPercentage === preset
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-foreground border-border-strong hover:bg-surface-secondary'
                    )}
                  >
                    {preset}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomMargin(true)}
                  className={cn(
                    'px-3 py-2 md:py-1.5 text-sm font-medium rounded-md border transition-colors min-h-[44px] md:min-h-0',
                    isCustomMargin
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border-strong hover:bg-surface-secondary'
                  )}
                >
                  Custom
                </button>
                {isCustomMargin && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={marginPercentage}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                        setMarginPercentage(val);
                      }}
                      autoFocus
                      className="w-16 text-right text-sm font-semibold rounded border border-border-strong bg-card text-foreground px-2 py-1"
                    />
                    <span className="text-sm font-semibold text-primary">%</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                This charge is added on top of the operator cost. The client proposal shows only the total.
              </p>
            </div>
          )}

          {/* Create New Customer Form - Create Mode */}
          {!isLoading && mode === 'create' && (
            <div className="space-y-4">
              {/* Back button */}
              <button
                type="button"
                onClick={handleSwitchToSelect}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground py-2 px-1 -ml-1 rounded hover:bg-surface-tertiary"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to customer list</span>
              </button>

              <div className="rounded-md bg-warning-bg border border-warning-border p-3">
                <p className="text-sm font-medium text-foreground">
                  Create New Customer
                </p>
                <p className="text-xs text-warning mt-1">
                  Fill in the details below to add a new customer to your client profiles.
                </p>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="company_name">
                    Company Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="company_name"
                    type="text"
                    placeholder="Enter company name"
                    value={newCustomerForm.company_name}
                    onChange={(e) => handleFormChange('company_name', e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="contact_name">
                    Contact Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contact_name"
                    type="text"
                    placeholder="Enter contact name"
                    value={newCustomerForm.contact_name}
                    onChange={(e) => handleFormChange('contact_name', e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={newCustomerForm.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={newCustomerForm.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <ResponsiveModalFooter>
          {mode === 'select' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedClient || isLoading}
              >
                Generate Proposal
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleSwitchToSelect}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateCustomer}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create & Select'
                )}
              </Button>
            </>
          )}
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

export default CustomerSelectionDialog;
