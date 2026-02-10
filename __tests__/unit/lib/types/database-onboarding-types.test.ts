import { describe, it, expect } from 'vitest';
import type { Database, Tables } from '@/lib/types/database';

// These type imports should fail in the RED phase because they don't exist yet
import type { OnboardingStatus, OnboardingContract, ContractToken } from '@/lib/types/database';

describe('Onboarding Database Types', () => {
  describe('onboarding_status enum', () => {
    it('should have the correct enum values', () => {
      const validStatuses: OnboardingStatus[] = ['pending', 'contract_sent', 'contract_signed', 'completed'];
      expect(validStatuses).toHaveLength(4);
      expect(validStatuses).toContain('pending');
      expect(validStatuses).toContain('contract_sent');
      expect(validStatuses).toContain('contract_signed');
      expect(validStatuses).toContain('completed');
    });
  });

  describe('iso_agents onboarding fields', () => {
    it('should include onboarding fields in the Row type', () => {
      // This test verifies the type exists by creating a partial mock
      const agent: Partial<Tables<'iso_agents'>> = {
        first_name: 'Jane',
        last_name: 'Doe',
        date_of_birth: '1990-05-15',
        phone: '+15551234567',
        street_address: '123 Main St',
        address_line_2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        country: 'US',
        onboarding_status: 'pending',
      };
      expect(agent.first_name).toBe('Jane');
      expect(agent.onboarding_status).toBe('pending');
    });
  });

  describe('onboarding_contracts table', () => {
    it('should have the correct Row type shape', () => {
      const contract: Partial<OnboardingContract> = {
        id: 'uuid-123',
        agent_id: 'agent-uuid',
        pdf_storage_path: 'onboarding/agent-uuid/contract.pdf',
        commission_percentage: 10,
        status: 'pending',
        signed_at: null,
        signed_name: null,
        acknowledgment_terms: false,
        acknowledgment_disclosures: false,
      };
      expect(contract.commission_percentage).toBe(10);
      expect(contract.status).toBe('pending');
    });
  });

  describe('contract_tokens table', () => {
    it('should have the correct Row type shape', () => {
      const token: Partial<ContractToken> = {
        id: 'uuid-456',
        contract_id: 'contract-uuid',
        agent_id: 'agent-uuid',
        token: 'abc123hex',
        email: 'test@example.com',
        expires_at: '2026-02-12T00:00:00Z',
        used_at: null,
      };
      expect(token.token).toBe('abc123hex');
      expect(token.used_at).toBeNull();
    });
  });

  describe('Constants.public.Enums', () => {
    it('should include onboarding_status in Constants', async () => {
      const { Constants } = await import('@/lib/types/database');
      expect(Constants.public.Enums.onboarding_status).toEqual([
        'pending', 'contract_sent', 'contract_signed', 'completed',
      ]);
    });
  });
});
