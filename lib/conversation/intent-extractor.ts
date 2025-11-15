/**
 * Intent Extractor
 *
 * Extracts structured data from natural language user input.
 * Handles various phrasings and formats for RFP data fields.
 */

import { RFPData } from './rfp-flow';

export class IntentExtractor {
  /**
   * Extract departure and arrival from route input
   */
  extractRoute(input: string): Partial<RFPData> & { confidence?: number } {
    const normalizedInput = input.toLowerCase();

    // Pattern: Airport codes "JFK to LAX" (check original input first for uppercase)
    let match = input.match(/\b([A-Z]{3})\s+to\s+([A-Z]{3})\b/);
    if (match) {
      return {
        departure: match[1].toUpperCase(),
        arrival: match[2].toUpperCase(),
        confidence: 0.95,
      };
    }

    // Pattern: "from X to Y"
    match = normalizedInput.match(/from\s+([a-z\s]+)\s+to\s+([a-z\s]+?)$/i);
    if (match) {
      return {
        departure: this.cleanCityName(match[1].trim()),
        arrival: this.cleanCityName(match[2].trim()),
        confidence: 0.95,
      };
    }

    // Pattern: "X to Y" (city names)
    match = normalizedInput.match(/\b([a-z]{3,}(?:\s+[a-z]{3,})?)\s+to\s+([a-z]{3,}(?:\s+[a-z]{3,})?)\b/i);
    if (match) {
      return {
        departure: this.cleanCityName(match[1]),
        arrival: this.cleanCityName(match[2]),
        confidence: 0.9,
      };
    }

    // Pattern: lowercase airport codes "jfk to lax"
    match = normalizedInput.match(/\b([a-z]{3})\s+to\s+([a-z]{3})\b/);
    if (match) {
      return {
        departure: match[1].toUpperCase(),
        arrival: match[2].toUpperCase(),
        confidence: 0.95,
      };
    }

    // Pattern: "flying from X to Y"
    match = normalizedInput.match(/flying\s+from\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s|$)/i);
    if (match) {
      return {
        departure: this.cleanCityName(match[1]),
        arrival: this.cleanCityName(match[2]),
        confidence: 0.9,
      };
    }

    // Pattern: "I need to go from X to Y"
    match = normalizedInput.match(/go\s+from\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s|$)/i);
    if (match) {
      return {
        departure: this.cleanCityName(match[1]),
        arrival: this.cleanCityName(match[2]),
        confidence: 0.85,
      };
    }

    // Partial match: "from X"
    match = normalizedInput.match(/from\s+([a-z\s]+?)(?:\s|$)/i);
    if (match) {
      return {
        departure: this.cleanCityName(match[1]),
        confidence: 0.5,
      };
    }

    // Partial match: "just X"
    match = normalizedInput.match(/just\s+([a-z\s]+?)(?:\s|$)/i);
    if (match) {
      return {
        departure: this.cleanCityName(match[1]),
        confidence: 0.3,
      };
    }

    return { confidence: 0 };
  }

  /**
   * Extract departure and return dates from input
   */
  extractDates(input: string): Partial<RFPData> & { ambiguous?: boolean } {
    const normalizedInput = input.toLowerCase();
    const now = new Date();

    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];

    // Extract explicit dates with year (December 25th, 2024)
    let explicitDateMatch = input.match(
      /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i
    );
    if (explicitDateMatch) {
      const monthIndex = monthNames.indexOf(explicitDateMatch[1].toLowerCase());
      if (monthIndex !== -1) {
        const date = new Date(
          parseInt(explicitDateMatch[3]),
          monthIndex,
          parseInt(explicitDateMatch[2])
        );

        // Check for return date in same input
        const returnMatchIndex = input.indexOf('return');
        if (returnMatchIndex > 0) {
          const returnPart = input.substring(returnMatchIndex);
          const returnDateMatch = returnPart.match(
            /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i
          );
          if (returnDateMatch) {
            const returnMonthIndex = monthNames.indexOf(returnDateMatch[1].toLowerCase());
            if (returnMonthIndex !== -1) {
              const returnDate = new Date(
                parseInt(returnDateMatch[3]),
                returnMonthIndex,
                parseInt(returnDateMatch[2])
              );
              return {
                departureDate: date.toISOString(),
                returnDate: returnDate.toISOString(),
              };
            }
          }
        }

        return { departureDate: date.toISOString() };
      }
    }

    // Extract explicit dates without year (December 25th) - assume current or next year
    explicitDateMatch = input.match(
      /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?!\s*,?\s*\d{4})/i
    );
    if (explicitDateMatch) {
      const monthIndex = monthNames.indexOf(explicitDateMatch[1].toLowerCase());
      if (monthIndex !== -1) {
        const currentYear = now.getFullYear();
        let date = new Date(
          currentYear,
          monthIndex,
          parseInt(explicitDateMatch[2])
        );

        // If date is in the past, use next year
        if (date < now) {
          date = new Date(
            currentYear + 1,
            monthIndex,
            parseInt(explicitDateMatch[2])
          );
        }

        // Check for return date in same input
        const returnMatchIndex = input.toLowerCase().indexOf('return');
        if (returnMatchIndex > 0) {
          const returnPart = input.substring(returnMatchIndex);
          const returnDateMatch = returnPart.match(
            /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i
          );
          if (returnDateMatch) {
            const returnMonthIndex = monthNames.indexOf(returnDateMatch[1].toLowerCase());
            if (returnMonthIndex !== -1) {
              const returnYear = returnMonthIndex < monthIndex ? currentYear + 1 : currentYear;
              const returnDate = new Date(
                returnYear,
                returnMonthIndex,
                parseInt(returnDateMatch[2])
              );
              return {
                departureDate: date.toISOString(),
                returnDate: returnDate.toISOString(),
              };
            }
          }
        }

        return { departureDate: date.toISOString() };
      }
    }

    // Handle "tomorrow, returning in X days" or "tomorrow, return in X days"
    if (normalizedInput.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const returningMatch = normalizedInput.match(/return(?:ing)?\s+in\s+(\d+)\s+days?/);
      if (returningMatch) {
        const returnDate = new Date(tomorrow);
        returnDate.setDate(returnDate.getDate() + parseInt(returningMatch[1]));
        return {
          departureDate: tomorrow.toISOString(),
          returnDate: returnDate.toISOString(),
        };
      }

      return { departureDate: tomorrow.toISOString() };
    }

    // Handle "today"
    if (normalizedInput.includes('today')) {
      return { departureDate: now.toISOString() };
    }

    // Handle "yesterday" (will be caught by validator as invalid)
    if (normalizedInput.includes('yesterday')) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { departureDate: yesterday.toISOString() };
    }

    // "next week"
    if (normalizedInput.includes('next week')) {
      const date = new Date(now);
      date.setDate(date.getDate() + 7);
      return { departureDate: date.toISOString() };
    }

    // "next Monday" etc with optional return (check BEFORE "in X days" pattern)
    const dayMatch = normalizedInput.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (dayMatch) {
      const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(
        dayMatch[1].toLowerCase()
      );
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;

      const date = new Date(now);
      date.setDate(date.getDate() + daysUntil);

      // Check for "returning in X days" pattern
      const returningMatch = normalizedInput.match(/return(?:ing)?\s+in\s+(\d+)\s+days?/);
      if (returningMatch) {
        const returnDate = new Date(date);
        returnDate.setDate(returnDate.getDate() + parseInt(returningMatch[1]));
        return {
          departureDate: date.toISOString(),
          returnDate: returnDate.toISOString(),
        };
      }

      return { departureDate: date.toISOString() };
    }

    // "in X days" (must come AFTER "next Monday" to avoid false matches)
    const inDaysMatch = normalizedInput.match(/in\s+(\d+)\s+days?/);
    if (inDaysMatch) {
      const date = new Date(now);
      date.setDate(date.getDate() + parseInt(inDaysMatch[1]));
      return { departureDate: date.toISOString() };
    }

    // Ambiguous: "next month"
    if (normalizedInput.includes('next month')) {
      return { ambiguous: true };
    }

    return {};
  }

  /**
   * Extract passenger count from input
   */
  extractPassengers(input: string): Partial<RFPData> {
    const normalizedInput = input.toLowerCase();

    // Handle "just me"
    if (normalizedInput.includes('just me') || normalizedInput === 'me') {
      return { passengers: 1 };
    }

    // Extract numeric passengers
    const numericMatch = normalizedInput.match(/(\d+)\s+(?:passengers?|people|pax)/);
    if (numericMatch) {
      return { passengers: parseInt(numericMatch[1]) };
    }

    // "party of X" or "family of X"
    const partyMatch = normalizedInput.match(/(?:party|family)\s+of\s+(\d+)/);
    if (partyMatch) {
      return { passengers: parseInt(partyMatch[1]) };
    }

    // "for X people"
    const forMatch = normalizedInput.match(/for\s+(\d+)\s+people/);
    if (forMatch) {
      return { passengers: parseInt(forMatch[1]) };
    }

    // Written numbers (handle "party of four", "four passengers", etc)
    const writtenNumbers: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
    };

    for (const [word, num] of Object.entries(writtenNumbers)) {
      // Check for "party of X" or "family of X" with written numbers
      if (normalizedInput.match(new RegExp(`(?:party|family)\\s+of\\s+${word}\\b`))) {
        return { passengers: num };
      }
      // Check for "X passengers"
      if (normalizedInput.includes(word + ' passenger')) {
        return { passengers: num };
      }
    }

    return {};
  }

  /**
   * Extract aircraft type preference from input
   */
  extractAircraftType(input: string): Partial<RFPData> {
    const normalizedInput = input.toLowerCase();

    // Handle "no preference"
    if (
      normalizedInput.includes('no preference') ||
      normalizedInput.includes('any') ||
      normalizedInput.includes('don\'t care')
    ) {
      return {};
    }

    // Common aircraft categories
    const categories = [
      'light jet',
      'midsize jet',
      'heavy jet',
      'super midsize',
      'turboprop',
    ];

    for (const category of categories) {
      if (normalizedInput.includes(category)) {
        return { aircraftType: category };
      }
    }

    // Specific models
    const models = [
      'Citation',
      'Challenger',
      'Gulfstream',
      'Learjet',
      'Falcon',
      'Phenom',
      'Embraer',
    ];

    for (const model of models) {
      if (normalizedInput.includes(model.toLowerCase())) {
        return { aircraftType: input.trim() };
      }
    }

    // Generic "jet"
    if (normalizedInput.includes('jet')) {
      return { aircraftType: 'jet' };
    }

    return {};
  }

  /**
   * Extract budget and special requirements from input
   */
  extractBudget(input: string): Partial<RFPData> {
    const normalizedInput = input.toLowerCase();
    const result: Partial<RFPData> = {};

    // Extract budget with "k" suffix (e.g., "50k", "Budget 50k")
    const budgetKMatch = input.match(/(\d{1,3})\s*k\b/i);
    if (budgetKMatch) {
      result.budget = parseFloat(budgetKMatch[1]) * 1000;
    } else {
      // Extract budget with commas (e.g., "50,000")
      const budgetCommaMatch = input.match(/\$?\s*(\d{1,3}(?:,\d{3})+)/);
      if (budgetCommaMatch) {
        result.budget = parseFloat(budgetCommaMatch[1].replace(/,/g, ''));
      } else {
        // Extract plain large numbers (5+ digits to avoid false positives)
        const plainMatch = input.match(/\$?\s*(\d{5,})/);
        if (plainMatch) {
          result.budget = parseFloat(plainMatch[1]);
        }
      }
    }

    // Extract special requirements
    const requirements = [];
    if (normalizedInput.includes('wifi') || normalizedInput.includes('wi-fi')) {
      requirements.push('WiFi');
    }
    if (normalizedInput.includes('catering')) {
      requirements.push('Catering');
    }
    if (normalizedInput.includes('pet')) {
      requirements.push('Pet-friendly');
    }
    if (normalizedInput.includes('wheelchair')) {
      requirements.push('Wheelchair accessible');
    }

    if (requirements.length > 0) {
      result.specialRequirements = requirements.join(', ');
    }

    return result;
  }

  /**
   * Helper: Clean city name and restore proper capitalization
   */
  private cleanCityName(city: string): string {
    const cleaned = city.trim().replace(/\s+/g, ' ');
    // Capitalize each word
    return cleaned
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Helper: Parse relative date from text
   */
  private parseRelativeDate(text: string): string | null {
    const normalizedText = text.toLowerCase().trim();
    const now = new Date();

    if (normalizedText.includes('tomorrow')) {
      const date = new Date(now);
      date.setDate(date.getDate() + 1);
      return date.toISOString();
    }

    const inDaysMatch = normalizedText.match(/in\s+(\d+)\s+days?/);
    if (inDaysMatch) {
      const date = new Date(now);
      date.setDate(date.getDate() + parseInt(inDaysMatch[1]));
      return date.toISOString();
    }

    return null;
  }
}
