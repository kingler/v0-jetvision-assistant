/**
 * Unit Tests for System Prompt Module
 *
 * Tests the centralized prompt builder and supporting utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  IDENTITY_PROMPT,
  SCENARIO_HANDLERS,
  CONTEXT_RULES,
  ERROR_HANDLING,
  RESPONSE_GUIDELINES,
} from '@/lib/prompts/jetvision-system-prompt';
import {
  INTENT_PROMPTS,
  getIntentPrompt,
  isValidIntent,
  getAvailableIntents,
} from '@/lib/prompts/intent-prompts';
import type { IntentType } from '@/lib/prompts/intent-prompts';
import {
  COMMON_AIRPORT_CODES,
  TOOL_REFERENCE,
  AVINODE_TOOLS,
  DATABASE_TOOLS,
  GMAIL_TOOLS,
} from '@/lib/prompts/constants';
import { RESPONSE_TEMPLATES } from '@/lib/prompts/response-templates';

// =============================================================================
// SYSTEM PROMPT BUILDER TESTS
// =============================================================================

describe('buildSystemPrompt', () => {
  it('should return a non-empty string', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('should include identity prompt', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('You are Jetvision');
    expect(prompt).toContain('charter flight brokers');
  });

  it('should include capabilities section', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Your Capabilities');
    expect(prompt).toContain('Flight Requests');
    expect(prompt).toContain('CRM Management');
    expect(prompt).toContain('Quote Management');
  });

  it('should include tool reference section', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Available Tools');
    expect(prompt).toContain('create_trip');
    expect(prompt).toContain('get_rfq');
  });

  it('should include airport codes', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('KTEB');
    expect(prompt).toContain('KJFK');
    expect(prompt).toContain('KLAX');
  });

  it('should include response guidelines', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Response');
    expect(prompt).toContain('concise and professional');
  });

  it('should append intent-specific prompt when intent is provided', () => {
    const promptWithIntent = buildSystemPrompt('create_rfp');
    const promptWithoutIntent = buildSystemPrompt();

    expect(promptWithIntent.length).toBeGreaterThan(promptWithoutIntent.length);
    expect(promptWithIntent).toContain('Create Flight Request');
  });

  it('should return base prompt when invalid intent is provided', () => {
    const promptWithInvalidIntent = buildSystemPrompt('invalid_intent');
    const promptWithoutIntent = buildSystemPrompt();

    expect(promptWithInvalidIntent).toBe(promptWithoutIntent);
  });
});

// =============================================================================
// INTENT PROMPTS TESTS
// =============================================================================

describe('INTENT_PROMPTS', () => {
  it('should have 10 intent prompts defined', () => {
    const intents = Object.keys(INTENT_PROMPTS);
    expect(intents.length).toBe(10);
  });

  it('should include all expected intents', () => {
    const expectedIntents: IntentType[] = [
      'create_rfp',
      'get_rfp_status',
      'search_flights',
      'empty_legs',
      'client_lookup',
      'send_proposal',
      'operator_message',
      'view_history',
      'compare_quotes',
      'general',
    ];

    expectedIntents.forEach((intent) => {
      expect(INTENT_PROMPTS).toHaveProperty(intent);
      expect(INTENT_PROMPTS[intent]).toBeTruthy();
    });
  });

  it('should have non-empty prompts for each intent', () => {
    Object.entries(INTENT_PROMPTS).forEach(([intent, prompt]) => {
      expect(prompt.length).toBeGreaterThan(50);
      expect(prompt).toContain('##'); // Should have markdown headers
    });
  });
});

describe('getIntentPrompt', () => {
  it('should return intent prompt for valid intents', () => {
    const prompt = getIntentPrompt('create_rfp');
    expect(prompt).toBeTruthy();
    expect(prompt).toContain('Create Flight Request');
  });

  it('should return empty string for undefined intent', () => {
    const prompt = getIntentPrompt(undefined);
    expect(prompt).toBe('');
  });

  it('should return empty string for invalid intent', () => {
    const prompt = getIntentPrompt('invalid_intent');
    expect(prompt).toBe('');
  });
});

describe('isValidIntent', () => {
  it('should return true for valid intents', () => {
    expect(isValidIntent('create_rfp')).toBe(true);
    expect(isValidIntent('get_rfp_status')).toBe(true);
    expect(isValidIntent('empty_legs')).toBe(true);
  });

  it('should return false for invalid intents', () => {
    expect(isValidIntent('invalid')).toBe(false);
    expect(isValidIntent('')).toBe(false);
    expect(isValidIntent('CREATE_RFP')).toBe(false); // Case sensitive
  });
});

describe('getAvailableIntents', () => {
  it('should return array of 10 intents', () => {
    const intents = getAvailableIntents();
    expect(Array.isArray(intents)).toBe(true);
    expect(intents.length).toBe(10);
  });

  it('should include create_rfp', () => {
    const intents = getAvailableIntents();
    expect(intents).toContain('create_rfp');
  });
});

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe('Constants', () => {
  describe('COMMON_AIRPORT_CODES', () => {
    it('should include major US airports', () => {
      expect(COMMON_AIRPORT_CODES).toContain('KTEB');
      expect(COMMON_AIRPORT_CODES).toContain('KJFK');
      expect(COMMON_AIRPORT_CODES).toContain('KLAX');
      expect(COMMON_AIRPORT_CODES).toContain('KMIA');
    });

    it('should include city names', () => {
      expect(COMMON_AIRPORT_CODES).toContain('Teterboro');
      expect(COMMON_AIRPORT_CODES).toContain('Los Angeles');
    });
  });

  describe('TOOL_REFERENCE', () => {
    it('should document all Avinode tools', () => {
      AVINODE_TOOLS.forEach((tool) => {
        expect(TOOL_REFERENCE).toContain(tool);
      });
    });

    it('should include tool tables', () => {
      expect(TOOL_REFERENCE).toContain('| Tool | Purpose |');
    });
  });

  describe('Tool arrays', () => {
    it('should have 8 Avinode tools', () => {
      expect(AVINODE_TOOLS.length).toBe(8);
    });

    it('should have 12 Database tools', () => {
      expect(DATABASE_TOOLS.length).toBe(12);
    });

    it('should have 3 Gmail tools', () => {
      expect(GMAIL_TOOLS.length).toBe(3);
    });

    it('should total 23 tools', () => {
      const totalTools = AVINODE_TOOLS.length + DATABASE_TOOLS.length + GMAIL_TOOLS.length;
      expect(totalTools).toBe(23);
    });
  });
});

// =============================================================================
// RESPONSE TEMPLATES TESTS
// =============================================================================

describe('Response Templates', () => {
  it('should include quote display format', () => {
    expect(RESPONSE_TEMPLATES).toContain('Quote Display Format');
    expect(RESPONSE_TEMPLATES).toContain('Operator');
    expect(RESPONSE_TEMPLATES).toContain('Aircraft');
    expect(RESPONSE_TEMPLATES).toContain('Price');
  });

  it('should include trip summary format', () => {
    expect(RESPONSE_TEMPLATES).toContain('Trip Summary Format');
    expect(RESPONSE_TEMPLATES).toContain('Route');
  });

  it('should include error message format', () => {
    expect(RESPONSE_TEMPLATES).toContain('Error Message Format');
    expect(RESPONSE_TEMPLATES).toContain('What you can try');
  });

  it('should include confirmation format', () => {
    expect(RESPONSE_TEMPLATES).toContain('Confirmation Format');
    expect(RESPONSE_TEMPLATES).toContain('confirm');
  });
});

// =============================================================================
// PROMPT SECTION TESTS
// =============================================================================

describe('Prompt Sections', () => {
  it('should export IDENTITY_PROMPT', () => {
    expect(IDENTITY_PROMPT).toBeTruthy();
    expect(IDENTITY_PROMPT).toContain('Jetvision');
  });

  it('should export SCENARIO_HANDLERS', () => {
    expect(SCENARIO_HANDLERS).toBeTruthy();
    expect(SCENARIO_HANDLERS).toContain('Creating a Flight Request');
  });

  it('should export CONTEXT_RULES', () => {
    expect(CONTEXT_RULES).toBeTruthy();
    expect(CONTEXT_RULES).toContain('Context Awareness');
  });

  it('should export ERROR_HANDLING', () => {
    expect(ERROR_HANDLING).toBeTruthy();
    expect(ERROR_HANDLING).toContain('Error Handling');
  });

  it('should export RESPONSE_GUIDELINES', () => {
    expect(RESPONSE_GUIDELINES).toBeTruthy();
    expect(RESPONSE_GUIDELINES).toContain('Response Guidelines');
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Prompt Integration', () => {
  it('should build complete prompt with all sections', () => {
    const prompt = buildSystemPrompt();

    // Check all major sections are included
    expect(prompt).toContain('Your Role');
    expect(prompt).toContain('Your Capabilities');
    expect(prompt).toContain('Available Tools');
    expect(prompt).toContain('Scenario Handling');
    expect(prompt).toContain('Context Awareness');
    expect(prompt).toContain('Error Handling');
    expect(prompt).toContain('Response Guidelines');
    expect(prompt).toContain('Common Airport Codes');
  });

  it('should have reasonable length (under 10000 chars)', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.length).toBeLessThan(10000);
  });

  it('should have reasonable length with intent (under 12000 chars)', () => {
    const prompt = buildSystemPrompt('create_rfp');
    expect(prompt.length).toBeLessThan(12000);
  });
});
