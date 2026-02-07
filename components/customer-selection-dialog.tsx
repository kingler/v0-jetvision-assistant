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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, X, Check, ChevronDown, Plus, ArrowLeft } from 'lucide-react';
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
  // State for profit margin percentage
  const [marginPercentage, setMarginPercentage] = useState(30);

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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' ? 'Select Customer for Proposal' : 'Create New Customer'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'select'
              ? 'Choose the customer this proposal is for. Customer information will be retrieved from your client profiles.'
              : 'Enter the details for the new customer. They will be added to your client profiles.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Loading customers...
              </span>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Typeahead search - Select Mode */}
          {!isLoading && mode === 'select' && (
            <div className="space-y-2">
              <label
                htmlFor="customer-typeahead"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Customer <span className="text-red-500">*</span>
              </label>

              <div className="relative" ref={dropdownRef}>
                {/* Input field */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                        'border-green-500 dark:border-green-600 focus-visible:ring-green-500/50'
                    )}
                    autoComplete="off"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {selectedClient && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClear}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                    {/* Create New Customer button */}
                    <button
                      type="button"
                      onClick={handleSwitchToCreate}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-b-2 border-gray-200 dark:border-gray-700"
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
                        <li className="px-3 py-6 text-center text-sm text-gray-500">
                          No customers found. Click above to create one.
                        </li>
                      ) : filteredClients.length === 0 ? (
                        <li className="px-3 py-6 text-center text-sm text-gray-500">
                          No customers match "{searchQuery}"
                        </li>
                      ) : (
                        filteredClients.map((client, index) => (
                          <li
                            key={client.id}
                            data-item
                            role="option"
                            aria-selected={selectedClient?.id === client.id}
                            className={cn(
                              'cursor-pointer px-3 py-2.5 transition-colors',
                              highlightedIndex === index &&
                                'bg-gray-100 dark:bg-gray-800',
                              selectedClient?.id === client.id &&
                                'bg-orange-50 dark:bg-orange-900/20'
                            )}
                            onClick={() => handleSelectClient(client)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {client.company_name}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {client.contact_name} • {client.email}
                                </span>
                              </div>
                              {selectedClient?.id === client.id && (
                                <Check className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Selected customer details preview */}
              {selectedClient && (
                <div className="mt-4 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selected Customer:
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {selectedClient.company_name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Contact: {selectedClient.contact_name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Email: {selectedClient.email}
                  </p>
                  {selectedClient.phone && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Phone: {selectedClient.phone}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profit Margin Slider - shown when customer is selected */}
          {!isLoading && mode === 'select' && selectedClient && showMarginSlider && (
            <div className="space-y-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="margin-slider"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Profit Margin
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={marginPercentage}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                      setMarginPercentage(val);
                    }}
                    className="w-16 text-right text-sm font-semibold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1"
                  />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">%</span>
                </div>
              </div>
              <input
                id="margin-slider"
                type="range"
                min={0}
                max={100}
                step={5}
                value={marginPercentage}
                onChange={(e) => setMarginPercentage(Number(e.target.value))}
                className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This margin will be added on top of the operator cost in the client-facing proposal.
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
                className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 py-2 px-1 -ml-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to customer list</span>
              </button>

              <div className="rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                  Create New Customer
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                  Fill in the details below to add a new customer to your client profiles.
                </p>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="company_name">
                    Company Name <span className="text-red-500">*</span>
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
                    Contact Name <span className="text-red-500">*</span>
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
                    Email <span className="text-red-500">*</span>
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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerSelectionDialog;
