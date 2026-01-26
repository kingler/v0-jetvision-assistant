'use client';

/**
 * Customer Selection Dialog Component
 *
 * Dialog component for selecting a customer from the client_profiles database
 * when generating a proposal. Displays a list of available clients and allows
 * the user to select one.
 *
 * @see app/api/clients/route.ts - Client profiles API
 * @see components/chat-interface.tsx - Proposal generation workflow
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, X } from 'lucide-react';

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
 * Fetches client profiles from the API and displays them in a select dropdown.
 * When a customer is selected and confirmed, calls the onSelect callback.
 */
export function CustomerSelectionDialog({
  open,
  onClose,
  onSelect,
  initialCustomerId,
}: CustomerSelectionDialogProps) {
  // State for client profiles list
  const [clients, setClients] = useState<ClientProfile[]>([]);
  // State for selected client ID
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialCustomerId || ''
  );
  // State for loading status
  const [isLoading, setIsLoading] = useState(false);
  // State for error messages
  const [error, setError] = useState<string | null>(null);
  // State for search query
  const [searchQuery, setSearchQuery] = useState<string>('');

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
        setClients(data.clients || []);

        // Pre-select initial customer if provided
        if (initialCustomerId) {
          setSelectedClientId(initialCustomerId);
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
   * Handle customer selection confirmation
   */
  const handleConfirm = () => {
    if (!selectedClientId) {
      setError('Please select a customer');
      return;
    }

    const selectedClient = clients.find((c) => c.id === selectedClientId);
    if (!selectedClient) {
      setError('Selected customer not found');
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
    setSelectedClientId(initialCustomerId || '');
    setError(null);
    setSearchQuery('');
    onClose();
  };

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
   * Get the selected client object
   */
  const selectedClient = clients.find((c) => c.id === selectedClientId);

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

          {/* Client selection dropdown */}
          {!isLoading && !error && (
            <div className="space-y-4">
              {/* Search input */}
              <div className="space-y-2">
                <label
                  htmlFor="customer-search"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Search Customers
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="customer-search"
                    type="text"
                    placeholder="Search by name, company, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Customer dropdown */}
              <div className="space-y-2">
                <label
                  htmlFor="customer-select"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Customer <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedClientId}
                  onValueChange={(value) => {
                    setSelectedClientId(value);
                    setError(null);
                  }}
                >
                  <SelectTrigger id="customer-select" className="w-full">
                    <SelectValue placeholder="Select a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-gray-500">
                        No customers found. Please add customers in your client
                        profiles.
                      </div>
                    ) : filteredClients.length === 0 ? (
                      <div className="px-2 py-6 text-center text-sm text-gray-500">
                        No customers match "{searchQuery}"
                      </div>
                    ) : (
                      filteredClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {client.company_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {client.contact_name} • {client.email}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
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
            disabled={!selectedClientId || isLoading || clients.length === 0}
          >
            Generate Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerSelectionDialog;
