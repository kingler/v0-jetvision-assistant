/**
 * Book Flight Customer Derivation Unit Tests
 *
 * Ensures getBookFlightCustomer correctly derives the selected customer
 * from the generated proposal (persisted customer or latest proposalSentData.client)
 * so the Book Flight modal displays name/email and does not trigger "Customer name is required".
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  getBookFlightCustomer,
  type BookFlightCustomerInput,
} from '@/lib/chat/book-flight-customer';

describe('getBookFlightCustomer', () => {
  describe('persisted customer (from proposal generation)', () => {
    it('returns persisted customer when name and email are present', () => {
      const chat: BookFlightCustomerInput = {
        customer: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          company: 'Acme Corp',
          phone: '+1-555-0100',
        },
        messages: [],
      };
      const result = getBookFlightCustomer(chat);
      expect(result).toEqual({
        name: 'Jane Smith',
        email: 'jane@example.com',
        company: 'Acme Corp',
        phone: '+1-555-0100',
      });
    });

    it('returns persisted customer when only name and email (no company/phone)', () => {
      const chat: BookFlightCustomerInput = {
        customer: { name: 'John Doe', email: 'john@test.com' },
        messages: [],
      };
      const result = getBookFlightCustomer(chat);
      expect(result).toEqual({
        name: 'John Doe',
        email: 'john@test.com',
        company: undefined,
        phone: undefined,
      });
    });

    it('does not use persisted customer when name is empty', () => {
      const chat: BookFlightCustomerInput = {
        customer: { name: '', email: 'jane@example.com' },
        messages: [],
      };
      const result = getBookFlightCustomer(chat);
      expect(result.name).toBe('');
      expect(result.email).toBe('');
    });

    it('does not use persisted customer when email is empty', () => {
      const chat: BookFlightCustomerInput = {
        customer: { name: 'Jane Smith', email: '' },
        messages: [],
      };
      const result = getBookFlightCustomer(chat);
      expect(result.name).toBe('');
      expect(result.email).toBe('');
    });

    it('does not use persisted customer when name is whitespace-only', () => {
      const chat: BookFlightCustomerInput = {
        customer: { name: '   ', email: 'jane@example.com' },
        messages: [],
      };
      const result = getBookFlightCustomer(chat);
      expect(result.name).toBe('');
      expect(result.email).toBe('');
    });
  });

  describe('fallback: proposal-sent message client', () => {
    it('returns client from most recent message with proposalSentData.client', () => {
      const chat: BookFlightCustomerInput = {
        customer: undefined,
        messages: [
          { id: '1', type: 'agent', content: 'Hi', timestamp: new Date() },
          {
            id: '2',
            type: 'agent',
            content: 'Proposal sent',
            timestamp: new Date(),
            proposalSentData: {
              client: { name: 'Alice Brown', email: 'alice@example.com' },
            } as any,
          },
        ],
      };
      const result = getBookFlightCustomer(chat);
      expect(result).toEqual({
        name: 'Alice Brown',
        email: 'alice@example.com',
        company: undefined,
        phone: undefined,
      });
    });

    it('uses latest proposal-sent message when multiple have proposalSentData', () => {
      const chat: BookFlightCustomerInput = {
        customer: undefined,
        messages: [
          {
            id: '1',
            type: 'agent',
            content: 'First',
            timestamp: new Date(),
            proposalSentData: {
              client: { name: 'First Client', email: 'first@example.com' },
            } as any,
          },
          {
            id: '2',
            type: 'agent',
            content: 'Second',
            timestamp: new Date(),
            proposalSentData: {
              client: { name: 'Second Client', email: 'second@example.com' },
            } as any,
          },
        ],
      };
      const result = getBookFlightCustomer(chat);
      expect(result.name).toBe('Second Client');
      expect(result.email).toBe('second@example.com');
    });

    it('skips messages where proposalSentData.client has empty name or email', () => {
      const chat: BookFlightCustomerInput = {
        customer: undefined,
        messages: [
          {
            id: '1',
            type: 'agent',
            content: 'Sent',
            timestamp: new Date(),
            proposalSentData: {
              client: { name: '', email: 'empty@example.com' },
            } as any,
          },
          {
            id: '2',
            type: 'agent',
            content: 'Valid',
            timestamp: new Date(),
            proposalSentData: {
              client: { name: 'Valid Name', email: 'valid@example.com' },
            } as any,
          },
        ],
      };
      const result = getBookFlightCustomer(chat);
      expect(result.name).toBe('Valid Name');
      expect(result.email).toBe('valid@example.com');
    });
  });

  describe('empty / no customer', () => {
    it('returns empty name and email when no customer and no proposal messages', () => {
      const chat: BookFlightCustomerInput = {
        customer: undefined,
        messages: [],
      };
      const result = getBookFlightCustomer(chat);
      expect(result).toEqual({
        name: '',
        email: '',
        company: undefined,
        phone: undefined,
      });
    });

    it('returns empty when messages is undefined', () => {
      const chat: BookFlightCustomerInput = {
        customer: undefined,
      };
      const result = getBookFlightCustomer(chat);
      expect(result.name).toBe('');
      expect(result.email).toBe('');
    });

    it('persisted customer takes precedence over proposal-sent message', () => {
      const chat: BookFlightCustomerInput = {
        customer: { name: 'Persisted', email: 'persisted@example.com' },
        messages: [
          {
            id: '1',
            type: 'agent',
            content: 'Sent',
            timestamp: new Date(),
            proposalSentData: {
              client: { name: 'From Message', email: 'msg@example.com' },
            } as any,
          },
        ],
      };
      const result = getBookFlightCustomer(chat);
      expect(result.name).toBe('Persisted');
      expect(result.email).toBe('persisted@example.com');
    });
  });
});
