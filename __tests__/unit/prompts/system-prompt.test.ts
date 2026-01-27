/**
 * Unit Tests for Jetvision System Prompts
 *
 * Tests the centralized prompt module including:
 * - Prompt builder functions
 * - Intent detection
 * - Forced tool detection
 * - Prompt sections structure
 *
 * @module __tests__/unit/prompts/system-prompt.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCompleteSystemPrompt,
  buildSystemPromptWithIntent,
  detectForcedTool,
  FORCED_TOOL_PATTERNS,
  PROMPT_SECTIONS,
  IDENTITY,
  TOOL_REFERENCE,
  SCENARIO_HANDLERS,
  RESPONSE_FORMATS,
  CONTEXT_RULES,
  ERROR_HANDLING,
  AIRPORT_REFERENCE,
} from '@/lib/prompts/jetvision-system-prompt';
import {
  INTENT_PROMPTS,
  INTENT_PATTERNS,
  detectIntent,
  getIntentPrompt,
  listIntents,
} from '@/lib/prompts/intent-prompts';

// =============================================================================
// PROMPT BUILDER TESTS
// =============================================================================

describe('Prompt Builder Functions', () => {
  describe('buildCompleteSystemPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = buildCompleteSystemPrompt();
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include all prompt sections', () => {
      const prompt = buildCompleteSystemPrompt();

      // Check for identity section markers
      expect(prompt).toContain('Jetvision');
      expect(prompt).toContain('ISO agents');

      // Check for tool reference
      expect(prompt).toContain('Available Tools');
      expect(prompt).toContain('create_trip');
      expect(prompt).toContain('get_rfq');

      // Check for scenario handlers
      expect(prompt).toContain('Scenario Decision Trees');
      expect(prompt).toContain('New Flight Request');

      // Check for response formats
      expect(prompt).toContain('Response Templates');
      expect(prompt).toContain('Quote Display Format');

      // Check for context rules
      expect(prompt).toContain('Context Awareness Rules');

      // Check for error handling
      expect(prompt).toContain('Error Handling');

      // Check for airport reference
      expect(prompt).toContain('Airport Codes');
    });

    it('should use consistent section separators', () => {
      const prompt = buildCompleteSystemPrompt();
      // Sections are joined with ---
      expect(prompt).toContain('---');
    });

    it('should be consistent across multiple calls', () => {
      const prompt1 = buildCompleteSystemPrompt();
      const prompt2 = buildCompleteSystemPrompt();
      expect(prompt1).toBe(prompt2);
    });
  });

  describe('buildSystemPromptWithIntent', () => {
    it('should return base prompt when no intent provided', () => {
      const basePrompt = buildCompleteSystemPrompt();
      const promptWithNoIntent = buildSystemPromptWithIntent();
      expect(promptWithNoIntent).toBe(basePrompt);
    });

    it('should return base prompt when unknown intent provided', () => {
      const basePrompt = buildCompleteSystemPrompt();
      const promptWithUnknownIntent = buildSystemPromptWithIntent('unknown_intent', INTENT_PROMPTS);
      expect(promptWithUnknownIntent).toBe(basePrompt);
    });

    it('should append intent prompt when valid intent provided', () => {
      const basePrompt = buildCompleteSystemPrompt();
      const promptWithIntent = buildSystemPromptWithIntent('create_rfp', INTENT_PROMPTS);

      expect(promptWithIntent.length).toBeGreaterThan(basePrompt.length);
      expect(promptWithIntent).toContain('Current Task: Create Flight Request');
    });

    it('should include intent-specific checklist for create_rfp', () => {
      const prompt = buildSystemPromptWithIntent('create_rfp', INTENT_PROMPTS);
      expect(prompt).toContain('Departure airport');
      expect(prompt).toContain('Arrival airport');
      expect(prompt).toContain('Departure date');
      expect(prompt).toContain('passengers');
    });

    it('should include quote analysis guidance for get_quotes intent', () => {
      const prompt = buildSystemPromptWithIntent('get_quotes', INTENT_PROMPTS);
      expect(prompt).toContain('Quote Analysis');
      expect(prompt).toContain('comparison');
    });
  });
});

// =============================================================================
// PROMPT SECTIONS TESTS
// =============================================================================

describe('Prompt Sections', () => {
  describe('IDENTITY section', () => {
    it('should define the agent role clearly', () => {
      expect(IDENTITY).toContain('Jetvision');
      expect(IDENTITY).toContain('charter flight brokers');
      expect(IDENTITY).toContain('ISO agents');
    });

    it('should include behavioral guidelines', () => {
      expect(IDENTITY).toContain('Be concise');
      expect(IDENTITY).toContain('Be professional');
      expect(IDENTITY).toContain('Be proactive');
      expect(IDENTITY).toContain('Never assume');
    });
  });

  describe('TOOL_REFERENCE section', () => {
    it('should document all 23 tools', () => {
      expect(TOOL_REFERENCE).toContain('23 total');
    });

    it('should document Avinode tools (8)', () => {
      expect(TOOL_REFERENCE).toContain('Avinode Tools (8)');
      expect(TOOL_REFERENCE).toContain('create_trip');
      expect(TOOL_REFERENCE).toContain('get_rfq');
      expect(TOOL_REFERENCE).toContain('get_quote');
      expect(TOOL_REFERENCE).toContain('cancel_trip');
      expect(TOOL_REFERENCE).toContain('send_trip_message');
      expect(TOOL_REFERENCE).toContain('get_trip_messages');
      expect(TOOL_REFERENCE).toContain('search_airports');
      expect(TOOL_REFERENCE).toContain('search_empty_legs');
    });

    it('should document Database/CRM tools (12)', () => {
      expect(TOOL_REFERENCE).toContain('Database/CRM Tools (12)');
      expect(TOOL_REFERENCE).toContain('get_client');
      expect(TOOL_REFERENCE).toContain('list_clients');
      expect(TOOL_REFERENCE).toContain('create_client');
      expect(TOOL_REFERENCE).toContain('update_client');
      expect(TOOL_REFERENCE).toContain('get_request');
      expect(TOOL_REFERENCE).toContain('list_requests');
      expect(TOOL_REFERENCE).toContain('get_quotes');
      expect(TOOL_REFERENCE).toContain('update_quote_status');
      expect(TOOL_REFERENCE).toContain('get_operator');
      expect(TOOL_REFERENCE).toContain('list_preferred_operators');
      expect(TOOL_REFERENCE).toContain('create_proposal');
      expect(TOOL_REFERENCE).toContain('get_proposal');
    });

    it('should document Gmail tools (3)', () => {
      expect(TOOL_REFERENCE).toContain('Gmail/Email Tools (3)');
      expect(TOOL_REFERENCE).toContain('send_email');
      expect(TOOL_REFERENCE).toContain('send_proposal_email');
      expect(TOOL_REFERENCE).toContain('send_quote_email');
    });
  });

  describe('SCENARIO_HANDLERS section', () => {
    it('should include all 10 scenario decision trees', () => {
      expect(SCENARIO_HANDLERS).toContain('New Flight Request');
      expect(SCENARIO_HANDLERS).toContain('Trip/Quote Status');
      expect(SCENARIO_HANDLERS).toContain('Search Flights');
      expect(SCENARIO_HANDLERS).toContain('Empty Leg');
      expect(SCENARIO_HANDLERS).toContain('Client Lookup');
      expect(SCENARIO_HANDLERS).toContain('Send Proposal');
      expect(SCENARIO_HANDLERS).toContain('Operator Communication');
      expect(SCENARIO_HANDLERS).toContain('Request History');
      expect(SCENARIO_HANDLERS).toContain('Quote Comparison');
      expect(SCENARIO_HANDLERS).toContain('General Questions');
    });
  });

  describe('RESPONSE_FORMATS section', () => {
    it('should include quote display format', () => {
      expect(RESPONSE_FORMATS).toContain('Quote Display Format');
      expect(RESPONSE_FORMATS).toContain('Operator');
      expect(RESPONSE_FORMATS).toContain('Aircraft');
      expect(RESPONSE_FORMATS).toContain('Price');
    });

    it('should include trip summary format', () => {
      expect(RESPONSE_FORMATS).toContain('Trip Summary Format');
      expect(RESPONSE_FORMATS).toContain('Route');
      expect(RESPONSE_FORMATS).toContain('Date');
      expect(RESPONSE_FORMATS).toContain('Passengers');
    });

    it('should include error message format', () => {
      expect(RESPONSE_FORMATS).toContain('Error Message Format');
      expect(RESPONSE_FORMATS).toContain('Options');
    });

    it('should include confirmation prompt format', () => {
      expect(RESPONSE_FORMATS).toContain('Confirmation Prompt Format');
      expect(RESPONSE_FORMATS).toContain('Reply');
      expect(RESPONSE_FORMATS).toContain('yes');
    });
  });

  describe('CONTEXT_RULES section', () => {
    it('should include rules for tracking context', () => {
      expect(CONTEXT_RULES).toContain('Track Active Trip');
      expect(CONTEXT_RULES).toContain('Remember Client Context');
      expect(CONTEXT_RULES).toContain('Maintain Intent Continuity');
      expect(CONTEXT_RULES).toContain('Handle Relative References');
      expect(CONTEXT_RULES).toContain('Validate Before Calling Tools');
    });
  });

  describe('ERROR_HANDLING section', () => {
    it('should document error types and responses', () => {
      expect(ERROR_HANDLING).toContain('Network');
      expect(ERROR_HANDLING).toContain('Auth Error');
      expect(ERROR_HANDLING).toContain('Not Found');
      expect(ERROR_HANDLING).toContain('Validation Error');
      expect(ERROR_HANDLING).toContain('Rate Limit');
    });

    it('should include graceful degradation guidance', () => {
      expect(ERROR_HANDLING).toContain('Graceful Degradation');
    });
  });

  describe('AIRPORT_REFERENCE section', () => {
    it('should include common US airports', () => {
      expect(AIRPORT_REFERENCE).toContain('KTEB');
      expect(AIRPORT_REFERENCE).toContain('KLAX');
      expect(AIRPORT_REFERENCE).toContain('KJFK');
      expect(AIRPORT_REFERENCE).toContain('KORD');
    });

    it('should include ICAO to IATA mapping note', () => {
      expect(AIRPORT_REFERENCE).toContain('ICAO');
      expect(AIRPORT_REFERENCE).toContain('IATA');
    });
  });

  describe('PROMPT_SECTIONS export', () => {
    it('should export all sections as an object', () => {
      expect(PROMPT_SECTIONS).toHaveProperty('IDENTITY');
      expect(PROMPT_SECTIONS).toHaveProperty('TOOL_REFERENCE');
      expect(PROMPT_SECTIONS).toHaveProperty('SCENARIO_HANDLERS');
      expect(PROMPT_SECTIONS).toHaveProperty('RESPONSE_FORMATS');
      expect(PROMPT_SECTIONS).toHaveProperty('CONTEXT_RULES');
      expect(PROMPT_SECTIONS).toHaveProperty('ERROR_HANDLING');
      expect(PROMPT_SECTIONS).toHaveProperty('AIRPORT_REFERENCE');
    });
  });
});

// =============================================================================
// INTENT DETECTION TESTS
// =============================================================================

describe('Intent Detection', () => {
  describe('detectIntent', () => {
    it('should detect create_rfp intent', () => {
      expect(detectIntent('Create a new trip')).toBe('create_rfp');
      expect(detectIntent('I need a flight from KTEB to KLAX')).toBe('create_rfp');
      expect(detectIntent('Book a jet for tomorrow')).toBe('create_rfp');
      expect(detectIntent('New RFQ please')).toBe('create_rfp');
    });

    it('should detect get_rfp_status intent', () => {
      expect(detectIntent('Check trip LPZ8VC')).toBe('get_rfp_status');
      expect(detectIntent('atrip-12345')).toBe('get_rfp_status');
      expect(detectIntent('arfq-67890')).toBe('get_rfp_status');
      expect(detectIntent("What's the status of my trip?")).toBe('get_rfp_status');
    });

    it('should detect search_flights intent', () => {
      // Pattern: (search|find|look for) + (flights|options)
      expect(detectIntent('Search flights to Miami')).toBe('search_flights');
      // Pattern: (show|list) + (aircraft|jets|planes)
      expect(detectIntent('Show me aircraft')).toBe('search_flights');
    });

    it('should detect get_quotes intent', () => {
      expect(detectIntent('Compare the quotes')).toBe('get_quotes');
      expect(detectIntent('Which quote is best?')).toBe('get_quotes');
    });

    it('should detect empty_legs intent', () => {
      expect(detectIntent('Any empty legs available?')).toBe('empty_legs');
      expect(detectIntent('Discount flights this week')).toBe('empty_legs');
    });

    it('should detect client_lookup intent', () => {
      expect(detectIntent('Find client Acme Corp')).toBe('client_lookup');
      expect(detectIntent('Lookup client john@example.com')).toBe('client_lookup');
      expect(detectIntent('Add a new client')).toBe('client_lookup');
    });

    it('should detect send_proposal intent', () => {
      expect(detectIntent('Send the proposal to client')).toBe('send_proposal');
      expect(detectIntent('Email this to john@example.com')).toBe('send_proposal');
    });

    it('should detect operator_message intent', () => {
      expect(detectIntent('Message the operator')).toBe('operator_message');
      expect(detectIntent('Send a message to operator')).toBe('operator_message');
    });

    it('should detect view_history intent', () => {
      expect(detectIntent('Show my recent requests')).toBe('view_history');
      expect(detectIntent('List past trips')).toBe('view_history');
    });

    it('should return null for unrecognized messages', () => {
      expect(detectIntent('Hello')).toBeNull();
      expect(detectIntent('What time is it?')).toBeNull();
      expect(detectIntent('Random text here')).toBeNull();
    });
  });

  describe('getIntentPrompt', () => {
    it('should return prompt for valid intent', () => {
      const prompt = getIntentPrompt('create_rfp');
      expect(prompt).toBeDefined();
      expect(prompt).toContain('Create Flight Request');
    });

    it('should return undefined for invalid intent', () => {
      expect(getIntentPrompt('unknown_intent')).toBeUndefined();
    });
  });

  describe('listIntents', () => {
    it('should return array of all intents', () => {
      const intents = listIntents();
      expect(Array.isArray(intents)).toBe(true);
      expect(intents.length).toBeGreaterThan(0);
      expect(intents).toContain('create_rfp');
      expect(intents).toContain('get_rfp_status');
      expect(intents).toContain('get_quotes');
    });
  });

  describe('INTENT_PROMPTS', () => {
    it('should have prompts for all documented intents', () => {
      const expectedIntents = [
        'create_rfp',
        'get_rfp_status',
        'search_flights',
        'get_quotes',
        'empty_legs',
        'client_lookup',
        'send_proposal',
        'operator_message',
        'view_history',
        'general_question',
      ];

      for (const intent of expectedIntents) {
        expect(INTENT_PROMPTS[intent]).toBeDefined();
        expect(typeof INTENT_PROMPTS[intent]).toBe('string');
        expect(INTENT_PROMPTS[intent].length).toBeGreaterThan(0);
      }
    });
  });

  describe('INTENT_PATTERNS', () => {
    it('should have patterns for each intent', () => {
      const intents = Object.keys(INTENT_PATTERNS);
      expect(intents.length).toBeGreaterThan(0);

      for (const intent of intents) {
        expect(Array.isArray(INTENT_PATTERNS[intent])).toBe(true);
        expect(INTENT_PATTERNS[intent].length).toBeGreaterThan(0);

        // Each pattern should be a RegExp
        for (const pattern of INTENT_PATTERNS[intent]) {
          expect(pattern instanceof RegExp).toBe(true);
        }
      }
    });
  });
});

// =============================================================================
// FORCED TOOL DETECTION TESTS
// =============================================================================

describe('Forced Tool Detection', () => {
  describe('detectForcedTool', () => {
    it('should detect get_rfq from raw command', () => {
      expect(detectForcedTool('get_rfq LPZ8VC')).toBe('get_rfq');
      expect(detectForcedTool('get_rfq atrip-12345')).toBe('get_rfq');
    });

    it('should detect get_rfq from natural language', () => {
      expect(detectForcedTool('Get RFQs for Trip ID LPZ8VC')).toBe('get_rfq');
      expect(detectForcedTool('Check trip ABC123')).toBe('get_rfq');
      expect(detectForcedTool('Show quotes LPZ8VC')).toBe('get_rfq');
    });

    it('should detect get_rfq from Avinode ID formats', () => {
      expect(detectForcedTool('atrip-12345-67890')).toBe('get_rfq');
      expect(detectForcedTool('arfq-abcdef')).toBe('get_rfq');
    });

    it('should detect create_trip from trip creation requests', () => {
      expect(detectForcedTool('Create trip from KTEB to KLAX')).toBe('create_trip');
      expect(detectForcedTool('Book flight from KJFK to KORD')).toBe('create_trip');
      expect(detectForcedTool('New RFQ from KMIA to KDEN')).toBe('create_trip');
    });

    it('should detect search_empty_legs from empty leg queries', () => {
      expect(detectForcedTool('Search empty legs')).toBe('search_empty_legs');
      expect(detectForcedTool('Find empty leg flights')).toBe('search_empty_legs');
      expect(detectForcedTool('Show legs available')).toBe('search_empty_legs');
    });

    it('should detect list_clients from client search', () => {
      expect(detectForcedTool('Find client Acme Corp')).toBe('list_clients');
      expect(detectForcedTool('Search client john@example.com')).toBe('list_clients');
    });

    it('should detect list_requests from history queries', () => {
      expect(detectForcedTool('Show my requests')).toBe('list_requests');
      expect(detectForcedTool('List recent requests')).toBe('list_requests');
    });

    it('should detect search_airports from airport queries', () => {
      expect(detectForcedTool('What is the airport code?')).toBe('search_airports');
      expect(detectForcedTool('Which is the airport code for Miami?')).toBe('search_airports');
    });

    it('should return null for non-matching messages', () => {
      expect(detectForcedTool('Hello')).toBeNull();
      expect(detectForcedTool('How are you?')).toBeNull();
      expect(detectForcedTool('I have a question')).toBeNull();
    });
  });

  describe('FORCED_TOOL_PATTERNS', () => {
    it('should have pattern definitions with required properties', () => {
      expect(Array.isArray(FORCED_TOOL_PATTERNS)).toBe(true);
      expect(FORCED_TOOL_PATTERNS.length).toBeGreaterThan(0);

      for (const pattern of FORCED_TOOL_PATTERNS) {
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('toolName');
        expect(pattern).toHaveProperty('description');
        expect(pattern.pattern instanceof RegExp).toBe(true);
        expect(typeof pattern.toolName).toBe('string');
        expect(typeof pattern.description).toBe('string');
      }
    });

    it('should include patterns for key tools', () => {
      const toolNames = FORCED_TOOL_PATTERNS.map(p => p.toolName);
      expect(toolNames).toContain('get_rfq');
      expect(toolNames).toContain('create_trip');
      expect(toolNames).toContain('search_empty_legs');
      expect(toolNames).toContain('list_clients');
      expect(toolNames).toContain('list_requests');
      expect(toolNames).toContain('search_airports');
    });
  });
});

// =============================================================================
// EDGE CASES AND INTEGRATION TESTS
// =============================================================================

describe('Edge Cases', () => {
  it('should handle empty string input for intent detection', () => {
    expect(detectIntent('')).toBeNull();
  });

  it('should handle empty string input for forced tool detection', () => {
    expect(detectForcedTool('')).toBeNull();
  });

  it('should be case-insensitive for intent detection', () => {
    expect(detectIntent('CREATE A NEW TRIP')).toBe('create_rfp');
    expect(detectIntent('Create A New Trip')).toBe('create_rfp');
    expect(detectIntent('create a new trip')).toBe('create_rfp');
  });

  it('should be case-insensitive for forced tool detection', () => {
    expect(detectForcedTool('GET_RFQ LPZ8VC')).toBe('get_rfq');
    expect(detectForcedTool('Get_Rfq lPz8vC')).toBe('get_rfq');
  });

  it('should handle messages with embedded whitespace', () => {
    // Intent detection is more flexible with whitespace in the middle
    expect(detectIntent('Create a new trip')).toBe('create_rfp');
    // Forced tool detection uses anchored patterns for raw commands
    expect(detectForcedTool('get_rfq ABC123')).toBe('get_rfq');
  });
});

describe('Integration', () => {
  it('should support full workflow: detect intent → build prompt → get forced tool', () => {
    const message = 'Create a new trip from KTEB to KLAX';

    // Step 1: Detect intent
    const intent = detectIntent(message);
    expect(intent).toBe('create_rfp');

    // Step 2: Build prompt with intent
    const prompt = buildSystemPromptWithIntent(intent!, INTENT_PROMPTS);
    expect(prompt).toContain('Create Flight Request');

    // Step 3: Check for forced tool
    const forcedTool = detectForcedTool(message);
    expect(forcedTool).toBe('create_trip');
  });
});
