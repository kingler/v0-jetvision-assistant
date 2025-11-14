/**
 * Data Extractor Tool
 *
 * Extracts structured RFP data from natural language input.
 * Handles airports (codes, city names), dates (relative and absolute),
 * passenger counts, and aircraft preferences.
 */

import OpenAI from 'openai';

/**
 * Extracted RFP data
 */
export interface ExtractedRFPData {
  departure?: string; // Airport code or name
  arrival?: string; // Airport code or name
  departureDate?: string; // ISO 8601 date
  returnDate?: string; // ISO 8601 date (optional)
  passengers?: number;
  aircraftType?: string;
  budget?: number;
  clientName?: string;
  notes?: string;
}

/**
 * Data extraction result
 */
export interface ExtractionResult {
  data: ExtractedRFPData;
  confidence: number; // 0-1
  fieldsExtracted: string[]; // List of fields successfully extracted
  ambiguities?: string[]; // List of ambiguous or unclear data
}

/**
 * Data extractor configuration
 */
export interface DataExtractorConfig {
  model?: string;
  temperature?: number;
}

/**
 * DataExtractor
 * Extracts structured data from natural language using GPT-4
 */
export class DataExtractor {
  private openai: OpenAI;
  private config: DataExtractorConfig;

  constructor(config: DataExtractorConfig = {}) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.config = {
      model: config.model || 'gpt-4-turbo-preview',
      temperature: config.temperature ?? 0.2, // Very low temperature for accuracy
    };
  }

  /**
   * Extract RFP data from user message
   *
   * @param userMessage - The user's message
   * @param existingData - Previously extracted data to merge with
   * @param conversationHistory - Optional conversation history for context
   * @returns Extraction result with structured data
   */
  async extractData(
    userMessage: string,
    existingData?: ExtractedRFPData,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<ExtractionResult> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(userMessage, existingData, conversationHistory);

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

      // Merge with existing data
      const mergedData = this.mergeData(existingData, result.data);

      return {
        data: mergedData,
        confidence: result.confidence || 0.8,
        fieldsExtracted: result.fields_extracted || [],
        ambiguities: result.ambiguities || [],
      };
    } catch (error) {
      console.error('[DataExtractor] Error extracting data:', error);
      return {
        data: existingData || {},
        confidence: 0,
        fieldsExtracted: [],
        ambiguities: ['Error occurred during extraction'],
      };
    }
  }

  /**
   * Build system prompt for data extraction
   */
  private buildSystemPrompt(): string {
    return `You are a data extraction expert for a private jet charter booking system.

Your task is to extract structured flight request data from natural language messages.

Fields to extract:
1. **departure**: Airport code (e.g., KTEB, LAX) or city name (e.g., "Los Angeles", "New York")
2. **arrival**: Airport code or city name
3. **departureDate**: ISO 8601 date (YYYY-MM-DD). Handle relative dates:
   - "tomorrow" → next day
   - "next Friday" → next Friday's date
   - "December 15" → 2025-12-15 (assume current year if not specified)
4. **returnDate**: ISO 8601 date (optional, for round trips)
5. **passengers**: Number of passengers (integer)
6. **aircraftType**: Aircraft type or category (e.g., "Gulfstream G650", "light jet", "heavy jet")
7. **budget**: Budget amount in USD (number, no currency symbols)
8. **clientName**: Client name (if mentioned)
9. **notes**: Any additional requirements or notes

Current date: ${new Date().toISOString().split('T')[0]}

Respond in JSON format:
{
  "data": {
    "departure": "string or null",
    "arrival": "string or null",
    "departureDate": "YYYY-MM-DD or null",
    "returnDate": "YYYY-MM-DD or null",
    "passengers": number or null,
    "aircraftType": "string or null",
    "budget": number or null,
    "clientName": "string or null",
    "notes": "string or null"
  },
  "confidence": 0.0-1.0,
  "fields_extracted": ["list", "of", "fields"],
  "ambiguities": ["list", "of", "ambiguous", "data"]
}

Rules:
- Only include fields that are explicitly mentioned or can be confidently inferred
- Use null for fields that are not mentioned
- For airport codes, normalize to ICAO format (4 letters, e.g., KTEB, KMIA)
- For city names, keep as provided but capitalize properly
- For dates, always use ISO 8601 format (YYYY-MM-DD)
- Flag any ambiguous data in the "ambiguities" array`;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(
    userMessage: string,
    existingData?: ExtractedRFPData,
    conversationHistory?: Array<{ role: string; content: string }>
  ): string {
    let prompt = '';

    if (existingData && Object.keys(existingData).length > 0) {
      prompt += 'Previously extracted data:\n';
      prompt += JSON.stringify(existingData, null, 2);
      prompt += '\n\n';
    }

    if (conversationHistory && conversationHistory.length > 0) {
      prompt += 'Recent conversation:\n';
      conversationHistory.slice(-3).forEach((msg) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    prompt += `User's current message: "${userMessage}"\n\n`;
    prompt += 'Extract all flight request data from this message. ';
    prompt += 'If data was previously extracted, update or add to it based on the current message.';

    return prompt;
  }

  /**
   * Merge extracted data with existing data
   * New data takes precedence over existing data
   */
  private mergeData(
    existing?: ExtractedRFPData,
    extracted?: ExtractedRFPData
  ): ExtractedRFPData {
    if (!existing) return extracted || {};
    if (!extracted) return existing;

    return {
      departure: extracted.departure || existing.departure,
      arrival: extracted.arrival || existing.arrival,
      departureDate: extracted.departureDate || existing.departureDate,
      returnDate: extracted.returnDate || existing.returnDate,
      passengers: extracted.passengers ?? existing.passengers,
      aircraftType: extracted.aircraftType || existing.aircraftType,
      budget: extracted.budget ?? existing.budget,
      clientName: extracted.clientName || existing.clientName,
      notes: this.mergeNotes(existing.notes, extracted.notes),
    };
  }

  /**
   * Merge notes fields (append new notes to existing)
   */
  private mergeNotes(existingNotes?: string, newNotes?: string): string | undefined {
    if (!existingNotes && !newNotes) return undefined;
    if (!existingNotes) return newNotes;
    if (!newNotes) return existingNotes;

    // Avoid duplicates
    if (existingNotes.includes(newNotes)) return existingNotes;
    return `${existingNotes}; ${newNotes}`;
  }

  /**
   * Get list of missing required fields
   */
  getMissingFields(data: ExtractedRFPData): string[] {
    const requiredFields: (keyof ExtractedRFPData)[] = [
      'departure',
      'arrival',
      'departureDate',
      'passengers',
    ];

    return requiredFields.filter((field) => !data[field]);
  }

  /**
   * Check if all required fields are present
   */
  isComplete(data: ExtractedRFPData): boolean {
    return this.getMissingFields(data).length === 0;
  }
}
