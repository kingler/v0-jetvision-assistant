/**
 * Question Generator Tool
 *
 * Generates contextual clarifying questions to gather missing RFP data.
 * Uses GPT-4 to create natural, conversational questions with examples.
 */

import OpenAI from 'openai';
import type { ExtractedRFPData } from './data-extractor';
import type { MessageComponent } from '@/components/message-components/types';

/**
 * Question result
 */
export interface QuestionResult {
  question: string;
  field: string; // Field being asked about
  examples?: string[]; // Example responses
  suggestedActions?: Array<{
    id: string;
    label: string;
    value: string | number;
  }>; // Quick reply buttons
  priority: 'high' | 'medium' | 'low';
  components?: MessageComponent[]; // Message components for rich UI
}

/**
 * Question generator configuration
 */
export interface QuestionGeneratorConfig {
  model?: string;
  temperature?: number;
  maxClarificationRounds?: number;
}

/**
 * QuestionGenerator
 * Generates contextual questions using GPT-4
 */
export class QuestionGenerator {
  private openai: OpenAI;
  private config: QuestionGeneratorConfig;

  constructor(config: QuestionGeneratorConfig = {}) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.config = {
      model: config.model || 'gpt-4-turbo-preview',
      temperature: config.temperature ?? 0.7, // Higher temperature for natural questions
      maxClarificationRounds: config.maxClarificationRounds ?? 3,
    };
  }

  /**
   * Generate clarifying question for missing data
   *
   * @param missingFields - List of missing required fields
   * @param extractedData - Data already extracted
   * @param conversationHistory - Optional conversation history for context
   * @param clarificationRound - Current clarification round (0-indexed)
   * @returns Question to ask user
   */
  async generateQuestion(
    missingFields: string[],
    extractedData: ExtractedRFPData,
    conversationHistory?: Array<{ role: string; content: string }>,
    clarificationRound: number = 0
  ): Promise<QuestionResult | null> {
    // Stop after max clarification rounds
    if (clarificationRound >= this.config.maxClarificationRounds!) {
      return null;
    }

    // Prioritize fields: departure → arrival → departureDate → passengers
    const priorityOrder = ['departure', 'arrival', 'departureDate', 'passengers'];
    const nextField = priorityOrder.find((field) => missingFields.includes(field)) || missingFields[0];

    if (!nextField) {
      return null; // All fields collected
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(nextField, extractedData, conversationHistory);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model!,
        temperature: this.config.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);

      // Build message components
      const components = this.buildMessageComponents(result, nextField);

      return {
        question: result.question,
        field: nextField,
        examples: result.examples || [],
        suggestedActions: result.suggested_actions || [],
        priority: this.getFieldPriority(nextField),
        components,
      };
    } catch (error) {
      console.error('[QuestionGenerator] Error generating question:', error);
      // Fallback to simple question
      return this.generateFallbackQuestion(nextField, extractedData);
    }
  }

  /**
   * Build system prompt for question generation
   */
  private buildSystemPrompt(): string {
    return `You are a helpful assistant for a private jet charter booking system.

Your task is to generate natural, conversational questions to gather missing flight request information.

Guidelines:
1. Ask ONE question at a time
2. Be conversational and friendly, not robotic
3. Reference previously provided information to show you're listening
4. Provide 2-3 example responses to guide the user
5. For passenger count, suggest quick reply buttons (1-8 passengers)
6. For airports, ask for city names (easier than codes)
7. For dates, accept relative dates ("tomorrow", "next Friday") or absolute dates
8. Keep questions concise and clear

Respond in JSON format:
{
  "question": "Natural language question",
  "examples": ["example 1", "example 2", "example 3"],
  "suggested_actions": [
    {"id": "action1", "label": "Label", "value": "value"}
  ],
  "reference_context": "Brief mention of what user already provided"
}

Example suggested_actions:
- For passengers: [{"id": "pax-4", "label": "4 passengers", "value": 4}, ...]
- For aircraft: [{"id": "light", "label": "Light Jet", "value": "light jet"}, ...]
- For round trip: [{"id": "yes", "label": "Yes", "value": "yes"}, {"id": "no", "label": "No", "value": "no"}]`;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(
    missingField: string,
    extractedData: ExtractedRFPData,
    conversationHistory?: Array<{ role: string; content: string }>
  ): string {
    let prompt = '';

    prompt += `Missing field: ${missingField}\n\n`;

    if (Object.keys(extractedData).length > 0) {
      prompt += 'Information already collected:\n';
      Object.entries(extractedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          prompt += `- ${key}: ${value}\n`;
        }
      });
      prompt += '\n';
    }

    if (conversationHistory && conversationHistory.length > 0) {
      prompt += 'Recent conversation:\n';
      conversationHistory.slice(-3).forEach((msg) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `Generate a natural question to ask for the "${missingField}" field. `;
    prompt += 'Reference the information already provided to show context awareness.';

    return prompt;
  }

  /**
   * Build message components for rich UI
   */
  private buildMessageComponents(result: any, field: string): MessageComponent[] {
    const components: MessageComponent[] = [];

    // Add text component with question
    components.push({
      type: 'text',
      content: result.question,
      markdown: false,
    });

    // Add suggested actions as action buttons
    if (result.suggested_actions && result.suggested_actions.length > 0) {
      components.push({
        type: 'action_buttons',
        actions: result.suggested_actions.map((action: any) => ({
          id: action.id,
          label: action.label,
          value: action.value,
          variant: 'outline' as const,
        })),
        layout: this.getActionLayout(field),
      });
    }

    return components;
  }

  /**
   * Get action button layout based on field type
   */
  private getActionLayout(field: string): 'horizontal' | 'vertical' | 'grid' {
    if (field === 'passengers') return 'grid'; // Grid for passenger count
    if (field === 'aircraftType') return 'grid'; // Grid for aircraft types
    return 'horizontal'; // Horizontal for yes/no, simple choices
  }

  /**
   * Generate fallback question if GPT-4 fails
   */
  private generateFallbackQuestion(field: string, data: ExtractedRFPData): QuestionResult {
    const questions: Record<string, { question: string; examples: string[] }> = {
      departure: {
        question: 'Where will you be departing from?',
        examples: ['Los Angeles', 'Teterboro Airport', 'LAX'],
      },
      arrival: {
        question: `Great! Where are you flying to${data.departure ? ` from ${data.departure}` : ''}?`,
        examples: ['Miami', 'New York', 'Las Vegas'],
      },
      departureDate: {
        question: `When would you like to depart${data.departure && data.arrival ? ` from ${data.departure} to ${data.arrival}` : ''}?`,
        examples: ['Tomorrow', 'Next Friday', 'December 15'],
      },
      passengers: {
        question: 'How many passengers will be traveling?',
        examples: ['4 passengers', '6', 'Eight people'],
      },
    };

    const defaultQuestion = {
      question: `Could you provide the ${field}?`,
      examples: [],
    };

    const { question, examples } = questions[field] || defaultQuestion;

    // Add suggested actions for passengers
    const suggestedActions =
      field === 'passengers'
        ? [
            { id: 'pax-2', label: '2', value: 2 },
            { id: 'pax-4', label: '4', value: 4 },
            { id: 'pax-6', label: '6', value: 6 },
            { id: 'pax-8', label: '8', value: 8 },
          ]
        : undefined;

    const components: MessageComponent[] = [
      {
        type: 'text',
        content: question,
        markdown: false,
      },
    ];

    if (suggestedActions) {
      components.push({
        type: 'action_buttons',
        actions: suggestedActions.map((action) => ({
          ...action,
          variant: 'outline' as const,
        })),
        layout: 'grid' as const,
      });
    }

    return {
      question,
      field,
      examples,
      suggestedActions,
      priority: this.getFieldPriority(field),
      components,
    };
  }

  /**
   * Get field priority
   */
  private getFieldPriority(field: string): 'high' | 'medium' | 'low' {
    const highPriority = ['departure', 'arrival', 'departureDate', 'passengers'];
    const mediumPriority = ['returnDate', 'aircraftType'];

    if (highPriority.includes(field)) return 'high';
    if (mediumPriority.includes(field)) return 'medium';
    return 'low';
  }

  /**
   * Generate information response (for queries, not RFP creation)
   */
  async generateInformationResponse(query: string): Promise<QuestionResult> {
    const systemPrompt = `You are a helpful assistant for a private jet charter booking system.

Provide concise, informative answers to user questions about:
- How the system works
- Available aircraft types
- Pricing information (general)
- Service areas
- Booking process

Keep responses brief (2-3 sentences) and friendly.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model!,
        temperature: this.config.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
      });

      const answer = response.choices[0]?.message?.content || 'I can help you book a private jet flight. What are your travel plans?';

      return {
        question: answer,
        field: 'information',
        priority: 'low',
        components: [
          {
            type: 'text',
            content: answer,
            markdown: true,
          },
        ],
      };
    } catch (error) {
      console.error('[QuestionGenerator] Error generating information response:', error);
      return {
        question: 'I can help you book a private jet flight. What are your travel plans?',
        field: 'information',
        priority: 'low',
        components: [
          {
            type: 'text',
            content: 'I can help you book a private jet flight. What are your travel plans?',
            markdown: false,
          },
        ],
      };
    }
  }
}
