/**
 * System Prompts Unit Tests
 *
 * Tests for centralized agent system prompts.
 *
 * @see ONEK-143 - Enhance Agent System Prompts with Chat Messaging & Booking Tools
 */

import { describe, it, expect } from 'vitest';
import {
  AGENT_SYSTEM_PROMPTS,
  FLIGHT_SEARCH_PROMPT,
  COMMUNICATION_PROMPT,
  ORCHESTRATOR_PROMPT,
  PROPOSAL_ANALYSIS_PROMPT,
  CLIENT_DATA_PROMPT,
  ERROR_MONITOR_PROMPT,
  getSystemPrompt,
  hasSystemPrompt,
} from '@/agents/config/system-prompts';
import { AgentType } from '@/agents/core/types';

describe('Agent System Prompts', () => {
  describe('AGENT_SYSTEM_PROMPTS mapping', () => {
    it('should have prompts for all agent types', () => {
      const agentTypes = Object.values(AgentType);

      agentTypes.forEach((type) => {
        expect(AGENT_SYSTEM_PROMPTS).toHaveProperty(type);
        expect(AGENT_SYSTEM_PROMPTS[type]).toBeDefined();
        expect(AGENT_SYSTEM_PROMPTS[type].length).toBeGreaterThan(0);
      });
    });

    it('should map to correct prompt constants', () => {
      expect(AGENT_SYSTEM_PROMPTS[AgentType.FLIGHT_SEARCH]).toBe(FLIGHT_SEARCH_PROMPT);
      expect(AGENT_SYSTEM_PROMPTS[AgentType.COMMUNICATION]).toBe(COMMUNICATION_PROMPT);
      expect(AGENT_SYSTEM_PROMPTS[AgentType.ORCHESTRATOR]).toBe(ORCHESTRATOR_PROMPT);
      expect(AGENT_SYSTEM_PROMPTS[AgentType.PROPOSAL_ANALYSIS]).toBe(PROPOSAL_ANALYSIS_PROMPT);
      expect(AGENT_SYSTEM_PROMPTS[AgentType.CLIENT_DATA]).toBe(CLIENT_DATA_PROMPT);
      expect(AGENT_SYSTEM_PROMPTS[AgentType.ERROR_MONITOR]).toBe(ERROR_MONITOR_PROMPT);
    });
  });

  describe('FlightSearchAgent', () => {
    it('should have a comprehensive system prompt', () => {
      const prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);
      expect(prompt).not.toBe('');
      expect(prompt.length).toBeGreaterThan(500);
    });

    it('should include core flight search tools', () => {
      const prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);
      expect(prompt).toContain('search_flights');
      expect(prompt).toContain('create_trip');
      expect(prompt).toContain('get_rfq');
      expect(prompt).toContain('get_quote');
      expect(prompt).toContain('cancel_trip');
    });

    it('should include chat messaging tools', () => {
      const prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);
      expect(prompt).toContain('send_trip_message');
      expect(prompt).toContain('get_trip_messages');
      expect(prompt).toContain('get_message');
    });

    it('should include booking tools', () => {
      const prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);
      expect(prompt).toContain('book_flight');
      expect(prompt).toContain('generate_quote_pdf');
      expect(prompt).toContain('decline_quote');
      expect(prompt).toContain('get_booking_status');
    });

    it('should include operator communication guidelines', () => {
      const prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);
      expect(prompt).toContain('Communicating with Operators');
      expect(prompt).toContain('TripChatFromSeller');
    });

    it('should include booking flow guidelines', () => {
      const prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);
      expect(prompt).toContain('Booking Flow');
      expect(prompt).toContain('customer information');
      expect(prompt).toContain('passenger manifest');
    });

    it('should include response format guidelines', () => {
      const prompt = getSystemPrompt(AgentType.FLIGHT_SEARCH);
      expect(prompt).toContain('Response Format');
      expect(prompt).toContain('trip_id');
      expect(prompt).toContain('quote_id');
    });
  });

  describe('CommunicationAgent', () => {
    it('should have a system prompt defined', () => {
      const prompt = getSystemPrompt(AgentType.COMMUNICATION);
      expect(prompt).not.toBe('');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should include email tools', () => {
      const prompt = getSystemPrompt(AgentType.COMMUNICATION);
      expect(prompt).toContain('send_email');
      expect(prompt).toContain('create_draft');
    });

    it('should include email types', () => {
      const prompt = getSystemPrompt(AgentType.COMMUNICATION);
      expect(prompt).toContain('Flight Proposal Email');
      expect(prompt).toContain('Booking Confirmation Email');
      expect(prompt).toContain('Quote Update Email');
    });

    it('should include email guidelines', () => {
      const prompt = getSystemPrompt(AgentType.COMMUNICATION);
      expect(prompt).toContain('Professional');
      expect(prompt).toContain('PDF');
      expect(prompt).toContain('Mobile-friendly');
    });

    it('should include chat context integration', () => {
      const prompt = getSystemPrompt(AgentType.COMMUNICATION);
      expect(prompt).toContain('Chat Context Integration');
      expect(prompt).toContain('operator messages');
    });
  });

  describe('OrchestratorAgent', () => {
    it('should have a system prompt defined', () => {
      const prompt = getSystemPrompt(AgentType.ORCHESTRATOR);
      expect(prompt).not.toBe('');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should include agent delegation rules', () => {
      const prompt = getSystemPrompt(AgentType.ORCHESTRATOR);
      expect(prompt).toContain('FlightSearchAgent');
      expect(prompt).toContain('CommunicationAgent');
      expect(prompt).toContain('ProposalAnalysisAgent');
      expect(prompt).toContain('Invoke for');
    });

    it('should include intent recognition patterns', () => {
      const prompt = getSystemPrompt(AgentType.ORCHESTRATOR);
      expect(prompt).toContain('Intent Recognition');
      expect(prompt).toContain('Flight Request Intent');
      expect(prompt).toContain('Booking Intent');
      expect(prompt).toContain('Operator Message Intent');
    });

    it('should include webhook event routing', () => {
      const prompt = getSystemPrompt(AgentType.ORCHESTRATOR);
      expect(prompt).toContain('TripRequestSellerResponse');
      expect(prompt).toContain('TripChatFromSeller');
      expect(prompt).toContain('BookingConfirmed');
    });

    it('should include conversation state management', () => {
      const prompt = getSystemPrompt(AgentType.ORCHESTRATOR);
      expect(prompt).toContain('Conversation State Management');
      expect(prompt).toContain('session continuity');
    });
  });

  describe('ProposalAnalysisAgent', () => {
    it('should have a system prompt defined', () => {
      const prompt = getSystemPrompt(AgentType.PROPOSAL_ANALYSIS);
      expect(prompt).not.toBe('');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should include scoring criteria', () => {
      const prompt = getSystemPrompt(AgentType.PROPOSAL_ANALYSIS);
      expect(prompt).toContain('Price Score');
      expect(prompt).toContain('Operator Score');
      expect(prompt).toContain('Aircraft Score');
    });

    it('should include quote analysis tools', () => {
      const prompt = getSystemPrompt(AgentType.PROPOSAL_ANALYSIS);
      expect(prompt).toContain('score_quote');
      expect(prompt).toContain('rank_quotes');
    });
  });

  describe('ClientDataAgent', () => {
    it('should have a system prompt defined', () => {
      const prompt = getSystemPrompt(AgentType.CLIENT_DATA);
      expect(prompt).not.toBe('');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should include data retrieval capabilities', () => {
      const prompt = getSystemPrompt(AgentType.CLIENT_DATA);
      expect(prompt).toContain('get_client_profile');
      expect(prompt).toContain('get_preferences');
    });

    it('should include data security guidelines', () => {
      const prompt = getSystemPrompt(AgentType.CLIENT_DATA);
      expect(prompt).toContain('Data Security');
      expect(prompt).toContain('authorized');
    });
  });

  describe('ErrorMonitorAgent', () => {
    it('should have a system prompt defined', () => {
      const prompt = getSystemPrompt(AgentType.ERROR_MONITOR);
      expect(prompt).not.toBe('');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should include error handling capabilities', () => {
      const prompt = getSystemPrompt(AgentType.ERROR_MONITOR);
      expect(prompt).toContain('capture_error');
      expect(prompt).toContain('retry_task');
    });

    it('should include retry strategy', () => {
      const prompt = getSystemPrompt(AgentType.ERROR_MONITOR);
      expect(prompt).toContain('Retry Strategy');
      expect(prompt).toContain('Exponential backoff');
    });
  });

  describe('getSystemPrompt', () => {
    it('should return correct prompt for each agent type', () => {
      expect(getSystemPrompt(AgentType.FLIGHT_SEARCH)).toBe(FLIGHT_SEARCH_PROMPT);
      expect(getSystemPrompt(AgentType.COMMUNICATION)).toBe(COMMUNICATION_PROMPT);
      expect(getSystemPrompt(AgentType.ORCHESTRATOR)).toBe(ORCHESTRATOR_PROMPT);
    });

    it('should return empty string for unknown agent type', () => {
      expect(getSystemPrompt('unknown' as AgentType)).toBe('');
    });
  });

  describe('hasSystemPrompt', () => {
    it('should return true for all defined agent types', () => {
      expect(hasSystemPrompt(AgentType.FLIGHT_SEARCH)).toBe(true);
      expect(hasSystemPrompt(AgentType.COMMUNICATION)).toBe(true);
      expect(hasSystemPrompt(AgentType.ORCHESTRATOR)).toBe(true);
      expect(hasSystemPrompt(AgentType.PROPOSAL_ANALYSIS)).toBe(true);
      expect(hasSystemPrompt(AgentType.CLIENT_DATA)).toBe(true);
      expect(hasSystemPrompt(AgentType.ERROR_MONITOR)).toBe(true);
    });

    it('should return false for unknown agent type', () => {
      expect(hasSystemPrompt('unknown' as AgentType)).toBe(false);
    });
  });
});
