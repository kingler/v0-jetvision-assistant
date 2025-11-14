/**
 * Intent Parser Tool
 *
 * Uses GPT-4 to classify user intent from natural language input.
 * Determines whether the user is creating an RFP, asking a question,
 * clarifying information, or having general conversation.
 */

import OpenAI from 'openai';

/**
 * User intent types
 */
export enum UserIntent {
  RFP_CREATION = 'rfp_creation',
  INFORMATION_QUERY = 'information_query',
  CLARIFICATION_RESPONSE = 'clarification_response',
  GENERAL_CONVERSATION = 'general_conversation',
}

/**
 * Intent classification result
 */
export interface IntentResult {
  intent: UserIntent;
  confidence: number; // 0-1
  reasoning?: string;
}

/**
 * Intent parser configuration
 */
export interface IntentParserConfig {
  model?: string;
  temperature?: number;
}

/**
 * IntentParser
 * Classifies user intent using GPT-4
 */
export class IntentParser {
  private openai: OpenAI;
  private config: IntentParserConfig;

  constructor(config: IntentParserConfig = {}) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.config = {
      model: config.model || 'gpt-4-turbo-preview',
      temperature: config.temperature ?? 0.3, // Low temperature for consistency
    };
  }

  /**
   * Parse user intent from message
   *
   * @param userMessage - The user's message
   * @param conversationHistory - Optional conversation history for context
   * @returns Intent classification result
   */
  async parseIntent(
    userMessage: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<IntentResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(userMessage, conversationHistory);

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
      return {
        intent: this.mapIntent(result.intent),
        confidence: result.confidence || 0.8,
        reasoning: result.reasoning,
      };
    } catch (error) {
      console.error('[IntentParser] Error parsing intent:', error);
      // Default to RFP creation if uncertain
      return {
        intent: UserIntent.RFP_CREATION,
        confidence: 0.5,
        reasoning: 'Error occurred, defaulting to RFP creation',
      };
    }
  }

  /**
   * Build system prompt for intent classification
   */
  private buildSystemPrompt(): string {
    return `You are an intent classification expert for a private jet charter booking system.

Your task is to classify user messages into one of four intents:

1. **rfp_creation**: User is trying to create a new flight request (RFP)
   - Examples: "I need a flight to Miami", "Book me a jet from LA to NY next Friday", "8 passengers to Vegas"

2. **information_query**: User is asking for information about the system, pricing, or general questions
   - Examples: "How does this work?", "What aircraft types do you have?", "What's the cost?", "Do you fly to Europe?"

3. **clarification_response**: User is responding to a clarifying question with additional information
   - Examples: "6 passengers", "Next Tuesday", "Yes, round trip", "Los Angeles International"

4. **general_conversation**: User is making small talk or off-topic conversation
   - Examples: "Hello", "Thanks", "How are you?", "Great!"

Respond in JSON format:
{
  "intent": "rfp_creation|information_query|clarification_response|general_conversation",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why you chose this intent"
}

Consider:
- Context from conversation history (if provided)
- Keywords related to travel, dates, locations, passenger counts
- Question marks indicate queries
- Short responses after questions likely indicate clarifications`;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(
    userMessage: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): string {
    let prompt = '';

    if (conversationHistory && conversationHistory.length > 0) {
      prompt += 'Recent conversation:\n';
      conversationHistory.slice(-3).forEach((msg) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `User's current message: "${userMessage}"\n\n`;
    prompt += 'Classify the intent of this message.';

    return prompt;
  }

  /**
   * Map string intent to enum
   */
  private mapIntent(intentString: string): UserIntent {
    const intentMap: Record<string, UserIntent> = {
      rfp_creation: UserIntent.RFP_CREATION,
      information_query: UserIntent.INFORMATION_QUERY,
      clarification_response: UserIntent.CLARIFICATION_RESPONSE,
      general_conversation: UserIntent.GENERAL_CONVERSATION,
    };

    return intentMap[intentString] || UserIntent.RFP_CREATION;
  }
}
