/**
 * Prompt Builder Unit Tests
 *
 * Tests for dynamic prompt building with context injection.
 *
 * @see ONEK-143 - Enhance Agent System Prompts with Chat Messaging & Booking Tools
 */

import { describe, it, expect } from 'vitest';
import {
  buildFlightSearchPrompt,
  buildCommunicationPrompt,
  buildOrchestratorPrompt,
  buildPrompt,
  appendContextSection,
  composeModifiers,
  contextModifier,
  attentionModifier,
  noteModifier,
} from '@/agents/config/prompt-builder';
import { FLIGHT_SEARCH_PROMPT, COMMUNICATION_PROMPT, ORCHESTRATOR_PROMPT } from '@/agents/config/system-prompts';
import { AgentType } from '@/agents/core/types';

describe('Prompt Builder', () => {
  describe('buildFlightSearchPrompt', () => {
    it('should return base prompt when no context provided', () => {
      const prompt = buildFlightSearchPrompt();
      expect(prompt).toBe(FLIGHT_SEARCH_PROMPT);
    });

    it('should return base prompt with empty context', () => {
      const prompt = buildFlightSearchPrompt({});
      expect(prompt).toBe(FLIGHT_SEARCH_PROMPT);
    });

    it('should add active trip context', () => {
      const prompt = buildFlightSearchPrompt({ hasActiveTrip: true });
      expect(prompt).toContain('Current Context');
      expect(prompt).toContain('active trip');
    });

    it('should add trip ID when provided', () => {
      const prompt = buildFlightSearchPrompt({
        hasActiveTrip: true,
        tripId: 'atrip-12345',
      });
      expect(prompt).toContain('Active Trip ID: atrip-12345');
    });

    it('should add pending messages alert', () => {
      const prompt = buildFlightSearchPrompt({ pendingMessages: 5 });
      expect(prompt).toContain('ATTENTION');
      expect(prompt).toContain('5 unread operator message(s)');
    });

    it('should not add pending messages alert when count is 0', () => {
      const prompt = buildFlightSearchPrompt({ pendingMessages: 0 });
      expect(prompt).not.toContain('ATTENTION');
      expect(prompt).not.toContain('unread operator message');
    });

    it('should add quotes received context', () => {
      const prompt = buildFlightSearchPrompt({ quotesReceived: 3 });
      expect(prompt).toContain('NOTE');
      expect(prompt).toContain('3 quote(s) received');
    });

    it('should add booking in progress context', () => {
      const prompt = buildFlightSearchPrompt({ bookingInProgress: true });
      expect(prompt).toContain('Booking is in progress');
      expect(prompt).toContain('Await confirmation webhook');
    });

    it('should add awaiting confirmation context', () => {
      const prompt = buildFlightSearchPrompt({ awaitingConfirmation: true });
      expect(prompt).toContain('Awaiting operator confirmation');
    });

    it('should combine multiple context sections', () => {
      const prompt = buildFlightSearchPrompt({
        hasActiveTrip: true,
        tripId: 'atrip-12345',
        pendingMessages: 2,
        quotesReceived: 5,
        bookingInProgress: true,
      });

      expect(prompt).toContain('Current Context');
      expect(prompt).toContain('atrip-12345');
      expect(prompt).toContain('2 unread operator message');
      expect(prompt).toContain('5 quote(s) received');
      expect(prompt).toContain('Booking is in progress');
    });
  });

  describe('buildCommunicationPrompt', () => {
    it('should return base prompt when no context provided', () => {
      const prompt = buildCommunicationPrompt();
      expect(prompt).toBe(COMMUNICATION_PROMPT);
    });

    it('should add client data context', () => {
      const prompt = buildCommunicationPrompt({ hasClientData: true });
      expect(prompt).toContain('Current Context');
      expect(prompt).toContain('Client data is available');
    });

    it('should add client name when provided', () => {
      const prompt = buildCommunicationPrompt({
        hasClientData: true,
        clientName: 'John Doe',
      });
      expect(prompt).toContain('Client: John Doe');
    });

    it('should add pending proposals context', () => {
      const prompt = buildCommunicationPrompt({ pendingProposals: 3 });
      expect(prompt).toContain('3 pending proposal(s)');
    });

    it('should add recent emails context', () => {
      const prompt = buildCommunicationPrompt({ recentEmails: 2 });
      expect(prompt).toContain('2 recent email(s) sent');
    });

    it('should add attachments context', () => {
      const prompt = buildCommunicationPrompt({ hasAttachments: true });
      expect(prompt).toContain('PDF attachments are available');
    });
  });

  describe('buildOrchestratorPrompt', () => {
    it('should return base prompt when no context provided', () => {
      const prompt = buildOrchestratorPrompt();
      expect(prompt).toBe(ORCHESTRATOR_PROMPT);
    });

    it('should add active workflows context', () => {
      const prompt = buildOrchestratorPrompt({ activeWorkflows: 2 });
      expect(prompt).toContain('Current Context');
      expect(prompt).toContain('2 active workflow(s)');
    });

    it('should add pending tasks context', () => {
      const prompt = buildOrchestratorPrompt({ pendingTasks: 5 });
      expect(prompt).toContain('5 pending task(s)');
    });

    it('should add recent webhooks context', () => {
      const prompt = buildOrchestratorPrompt({ recentWebhooks: 3 });
      expect(prompt).toContain('ATTENTION');
      expect(prompt).toContain('3 recent webhook event(s)');
    });

    it('should add session active context', () => {
      const prompt = buildOrchestratorPrompt({ sessionActive: true });
      expect(prompt).toContain('Session is active');
    });

    it('should add current intent context', () => {
      const prompt = buildOrchestratorPrompt({ currentIntent: 'booking' });
      expect(prompt).toContain('Current user intent: booking');
    });
  });

  describe('buildPrompt', () => {
    it('should build prompt for FlightSearchAgent', () => {
      const prompt = buildPrompt(AgentType.FLIGHT_SEARCH, {
        flightSearch: { hasActiveTrip: true },
      });
      expect(prompt).toContain(FLIGHT_SEARCH_PROMPT);
      expect(prompt).toContain('active trip');
    });

    it('should build prompt for CommunicationAgent', () => {
      const prompt = buildPrompt(AgentType.COMMUNICATION, {
        communication: { hasClientData: true },
      });
      expect(prompt).toContain(COMMUNICATION_PROMPT);
      expect(prompt).toContain('Client data is available');
    });

    it('should build prompt for OrchestratorAgent', () => {
      const prompt = buildPrompt(AgentType.ORCHESTRATOR, {
        orchestrator: { activeWorkflows: 2 },
      });
      expect(prompt).toContain(ORCHESTRATOR_PROMPT);
      expect(prompt).toContain('2 active workflow(s)');
    });

    it('should return base prompt for other agent types', () => {
      const prompt = buildPrompt(AgentType.PROPOSAL_ANALYSIS);
      expect(prompt).toContain('Proposal Analysis Agent');
    });

    it('should add custom context for other agent types', () => {
      const prompt = buildPrompt(AgentType.PROPOSAL_ANALYSIS, {
        custom: { pendingQuotes: 5 },
      });
      expect(prompt).toContain('Current Context');
      expect(prompt).toContain('pendingQuotes: 5');
    });
  });

  describe('appendContextSection', () => {
    it('should append a section to the prompt', () => {
      const basePrompt = 'Base prompt content';
      const result = appendContextSection(basePrompt, 'Custom Section', 'Section content');

      expect(result).toBe('Base prompt content\n\n## Custom Section\nSection content');
    });

    it('should handle empty base prompt', () => {
      const result = appendContextSection('', 'Section', 'Content');
      expect(result).toBe('\n\n## Section\nContent');
    });
  });

  describe('Prompt Modifiers', () => {
    describe('composeModifiers', () => {
      it('should compose multiple modifiers', () => {
        const modifier1 = (prompt: string) => `${prompt} [modified1]`;
        const modifier2 = (prompt: string) => `${prompt} [modified2]`;

        const composed = composeModifiers(modifier1, modifier2);
        const result = composed('Base');

        expect(result).toBe('Base [modified1] [modified2]');
      });

      it('should handle single modifier', () => {
        const modifier = (prompt: string) => `${prompt} [modified]`;
        const composed = composeModifiers(modifier);
        const result = composed('Base');

        expect(result).toBe('Base [modified]');
      });

      it('should handle no modifiers', () => {
        const composed = composeModifiers();
        const result = composed('Base');

        expect(result).toBe('Base');
      });
    });

    describe('contextModifier', () => {
      it('should create a modifier that adds context section', () => {
        const modifier = contextModifier('Test Section', 'Test content');
        const result = modifier('Base prompt');

        expect(result).toContain('## Test Section');
        expect(result).toContain('Test content');
      });
    });

    describe('attentionModifier', () => {
      it('should create a modifier that adds attention note', () => {
        const modifier = attentionModifier('Important message');
        const result = modifier('Base prompt');

        expect(result).toContain('ATTENTION: Important message');
      });
    });

    describe('noteModifier', () => {
      it('should create a modifier that adds note', () => {
        const modifier = noteModifier('Additional information');
        const result = modifier('Base prompt');

        expect(result).toContain('NOTE: Additional information');
      });
    });

    describe('Modifier Composition', () => {
      it('should allow chaining modifiers', () => {
        const basePrompt = 'You are an agent.';

        const composed = composeModifiers(
          contextModifier('Context', 'Active session'),
          attentionModifier('Urgent task pending'),
          noteModifier('Check for updates')
        );

        const result = composed(basePrompt);

        expect(result).toContain('## Context');
        expect(result).toContain('Active session');
        expect(result).toContain('ATTENTION: Urgent task pending');
        expect(result).toContain('NOTE: Check for updates');
      });
    });
  });
});
