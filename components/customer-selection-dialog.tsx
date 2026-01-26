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
import { Loader2, Search, X, Check, ChevronDown } from 'lucide-react';
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
  /** Callback when a customer is selected */
  onSelect: (customer: ClientProfile) => void;
  /** Optional initial customer ID to pre-select */
  initialCustomerId?: string;
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

    // Call the onSelect callback with the selected customer
    onSelect(selectedClient);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Customer for Proposal</DialogTitle>
          <DialogDescription>
            Choose the customer this proposal is for. Customer information will
            be retrieved from your client profiles.
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

          {/* Typeahead search */}
          {!isLoading && (
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
                    <ul
                      ref={listRef}
                      className="max-h-60 overflow-auto py-1"
                      role="listbox"
                    >
                      {clients.length === 0 ? (
                        <li className="px-3 py-6 text-center text-sm text-gray-500">
                          No customers found. Please add customers in your
                          client profiles.
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
                              'cursor-pointer px-3 py-2 transition-colors',
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedClient || isLoading || clients.length === 0}
          >
            Generate Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerSelectionDialog;
