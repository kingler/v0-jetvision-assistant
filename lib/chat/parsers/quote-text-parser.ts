/**
 * Quote Text Parser
 *
 * Parses quotes from agent text message content.
 * Extracts structured quote data from messages like:
 * "Here are the quotes for your trip..."
 * "1. Operator Name\n   Aircraft: ...\n   Tail Number: ..."
 * "#### 1. Operator Name\n- **Aircraft**: ...\n- **Max Passengers**: ..."
 *
 * Supports both plain numbered lists and markdown headers with bullet points.
 */

import { QUOTE_INDICATORS } from '../constants';
import type { Quote } from '../types';

/**
 * Parsed quote from text
 */
export interface ParsedTextQuote {
  id: string;
  operatorName: string;
  aircraftType: string;
  tailNumber?: string;
  passengerCapacity?: number;
  price?: number;
  currency?: string;
  rfqStatus?: string;
  operatorEmail?: string;
}

/**
 * Check if message content contains quote indicators
 */
export function hasQuoteIndicators(messageContent: string): boolean {
  const lowerContent = messageContent.toLowerCase();
  return QUOTE_INDICATORS.some((indicator) => lowerContent.includes(indicator));
}

/**
 * Parse quotes from agent text message content
 *
 * @param messageContent - The agent message text content
 * @returns Array of parsed quote objects, or empty array if none found
 */
export function parseQuotesFromText(messageContent: string): ParsedTextQuote[] {
  const quotes: ParsedTextQuote[] = [];

  // Check if message contains quote indicators
  if (!hasQuoteIndicators(messageContent)) {
    return quotes;
  }

  // Split message into lines for parsing
  const lines = messageContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let currentQuote: Partial<ParsedTextQuote> | null = null;

  /**
   * Helper function to save the current quote before starting a new one
   */
  const saveCurrentQuote = () => {
    if (currentQuote && currentQuote.operatorName) {
      quotes.push({
        id: currentQuote.id || `quote-${quotes.length + 1}`,
        operatorName: currentQuote.operatorName,
        aircraftType: currentQuote.aircraftType || 'Unknown Aircraft',
        tailNumber: currentQuote.tailNumber,
        passengerCapacity: currentQuote.passengerCapacity,
        price: currentQuote.price,
        currency: currentQuote.currency || 'USD',
        rfqStatus: currentQuote.rfqStatus || 'unanswered',
        operatorEmail: currentQuote.operatorEmail,
      });
    }
  };

  for (const line of lines) {
    // Check if line starts a new quote (numbered list item or markdown header)
    // Supports formats like:
    // - "1. Operator Name"
    // - "#### 1. Operator Name"
    // - "### 1. Operator Name"
    // - "## 1. Operator Name"
    const quoteNumberMatch = line.match(/^(?:#{1,4}\s*)?(\d+)\.\s*(.+)$/);

    if (quoteNumberMatch) {
      // Save previous quote if exists
      saveCurrentQuote();

      // Start new quote - extract operator name (remove markdown formatting)
      const operatorName = quoteNumberMatch[2]
        .replace(/^\*\*|\*\*$/g, '') // Remove bold markers
        .trim();

      currentQuote = {
        id: `quote-${quotes.length + 1}`,
        operatorName,
      };
      continue;
    }

    // Parse quote details if we have an active quote
    if (currentQuote) {
      // Remove markdown formatting from line for easier parsing
      const cleanLine = line
        .replace(/^[-*]\s*/, '') // Remove bullet point markers
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep text
        .trim();

      // Aircraft type (supports "Aircraft:", "**Aircraft**:", "- **Aircraft**:")
      const aircraftMatch =
        cleanLine.match(/aircraft:\s*(.+)/i) || cleanLine.match(/aircraft\s+type:\s*(.+)/i);
      if (aircraftMatch) {
        currentQuote.aircraftType = aircraftMatch[1].trim();
        continue;
      }

      // Category (can be used as aircraft type fallback)
      const categoryMatch = cleanLine.match(/category:\s*(.+)/i);
      if (categoryMatch && !currentQuote.aircraftType) {
        currentQuote.aircraftType = categoryMatch[1].trim();
        continue;
      }

      // Tail number (supports "Tail Number:", "Aircraft Tail Number:", "Tail:", etc.)
      const tailMatch =
        cleanLine.match(/tail\s*(?:number)?:\s*([A-Z0-9]+)/i) ||
        cleanLine.match(/aircraft\s+tail\s*(?:number)?:\s*([A-Z0-9]+)/i);
      if (tailMatch) {
        currentQuote.tailNumber = tailMatch[1].trim();
        continue;
      }

      // Passenger capacity (supports "Max Passengers:", "Passengers:", "Capacity:")
      const passengersMatch =
        cleanLine.match(/max\s+passengers?:\s*(\d+)/i) ||
        cleanLine.match(/maximum\s+passengers?:\s*(\d+)/i) ||
        cleanLine.match(/passengers?:\s*(\d+)/i) ||
        cleanLine.match(/capacity:\s*(\d+)/i);
      if (passengersMatch) {
        currentQuote.passengerCapacity = parseInt(passengersMatch[1], 10);
        continue;
      }

      // Price (supports various formats)
      const priceMatch =
        cleanLine.match(/(?:price|quote|total|cost):\s*\$?([\d,]+(?:\.\d{2})?)/i) ||
        cleanLine.match(/\$([\d,]+(?:\.\d{2})?)/);
      if (priceMatch) {
        currentQuote.price = parseFloat(priceMatch[1].replace(/,/g, ''));
        currentQuote.currency = 'USD';
        continue;
      }

      // RFQ Status
      const statusMatch =
        cleanLine.match(/quote\s+status:\s*(\w+)/i) || cleanLine.match(/status:\s*(\w+)/i);
      if (statusMatch) {
        currentQuote.rfqStatus = statusMatch[1].toLowerCase();
        continue;
      }

      // Operator email (if present)
      const emailMatch = cleanLine.match(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
      );
      if (emailMatch) {
        currentQuote.operatorEmail = emailMatch[1];
        continue;
      }
    }
  }

  // Save last quote if exists
  saveCurrentQuote();

  return quotes;
}

/**
 * Convert parsed text quotes to Quote format
 */
export function convertParsedQuotesToQuotes(parsedQuotes: ParsedTextQuote[]): Quote[] {
  return parsedQuotes.map((pq, index) => ({
    id: pq.id,
    operatorName: pq.operatorName,
    aircraftType: pq.aircraftType,
    tailNumber: pq.tailNumber,
    passengerCapacity: pq.passengerCapacity,
    price: pq.price,
    currency: pq.currency,
    status: pq.rfqStatus,
    operatorEmail: pq.operatorEmail,
    score: undefined,
    ranking: index + 1,
    isRecommended: index === 0,
  }));
}
