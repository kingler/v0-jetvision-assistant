/**
 * Book Flight Customer Derivation
 *
 * Derives the customer to show in the Book Flight modal from the chat session:
 * 1. Persisted customer (set when a proposal is generated and a customer is selected)
 * 2. Fallback: client from the most recent proposal-sent message (proposalSentData.client)
 *
 * Ensures the selected customer name and email from the generated proposal
 * are available for the contract modal and avoids "Customer name is required" errors.
 *
 * @see components/avinode/book-flight-modal.tsx
 * @see components/chat-interface.tsx (bookFlightCustomer useMemo)
 */

/** Chat-like shape used for derivation (subset of ChatSession) */
export interface BookFlightCustomerInput {
  customer?: {
    name: string;
    email?: string;
    company?: string;
    phone?: string;
  };
  messages?: Array<{
    proposalSentData?: {
      client?: { name?: string; email?: string };
    };
    // Allow additional message properties (id, type, content, timestamp, etc.)
    [key: string]: unknown;
  }>;
}

/** Customer shape expected by BookFlightModal */
export interface BookFlightCustomerOutput {
  name: string;
  email: string;
  company?: string;
  phone?: string;
}

/**
 * Derives the customer to pass to the Book Flight modal.
 * Prefers persisted chat.customer; falls back to the most recent proposal-sent message client.
 *
 * @param chat - Chat session (or subset) with customer and messages
 * @returns Customer object for BookFlightModal (empty name/email if none found)
 */
export function getBookFlightCustomer(
  chat: BookFlightCustomerInput
): BookFlightCustomerOutput {
  const persisted = chat.customer;
  if (persisted?.name?.trim() && persisted.email?.trim()) {
    return {
      name: persisted.name,
      email: persisted.email,
      company: persisted.company,
      phone: persisted.phone,
    };
  }
  const ms = chat.messages ?? [];
  for (let i = ms.length - 1; i >= 0; i--) {
    const msg = ms[i];
    const client = msg?.proposalSentData?.client;
    if (client?.name?.trim() && client?.email?.trim()) {
      return {
        name: client.name,
        email: client.email,
        company: undefined,
        phone: undefined,
      };
    }
  }
  return {
    name: '',
    email: '',
    company: undefined,
    phone: undefined,
  };
}
