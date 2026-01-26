/**
 * Field Validator
 *
 * Validates extracted RFQ data fields for correctness and completeness.
 * Provides helpful error messages and suggestions.
 */

import { RFPData } from './rfp-flow';
import type { ProcessResult } from './rfp-flow';

export class FieldValidator {
  /**
   * Validate route (departure and arrival)
   */
  validateRoute(data: Partial<RFPData>): ProcessResult {
    // Check both fields are present
    if (!data.departure || !data.arrival) {
      if (!data.departure && !data.arrival) {
        return {
          valid: false,
          error: 'Please provide both departure and arrival locations.',
          suggestions: [
            'Example: "From New York to Los Angeles"',
            'Example: "JFK to LAX"',
          ],
        };
      }

      if (!data.arrival) {
        return {
          valid: false,
          error: 'Please provide the arrival location.',
          suggestions: [
            `"${data.departure} to Los Angeles"`,
            `"From ${data.departure} to LAX"`,
          ],
        };
      }

      return {
        valid: false,
        error: 'Please provide the departure location.',
        suggestions: [
          `"From New York to ${data.arrival}"`,
          `"JFK to ${data.arrival}"`,
        ],
      };
    }

    // Check fields are not empty
    if (
      data.departure.trim() === '' ||
      data.arrival.trim() === ''
    ) {
      return {
        valid: false,
        error: 'Departure and arrival cannot be empty.',
      };
    }

    // Check departure and arrival are not the same
    if (
      data.departure.toLowerCase().trim() ===
      data.arrival.toLowerCase().trim()
    ) {
      return {
        valid: false,
        error: 'Departure and arrival locations cannot be the same.',
        suggestions: ['Please provide two different locations.'],
      };
    }

    return { valid: true };
  }

  /**
   * Validate dates (departure and optional return)
   */
  validateDates(data: Partial<RFPData>): ProcessResult {
    // Check departure date is present
    if (!data.departureDate) {
      return {
        valid: false,
        error: 'Please provide a departure date.',
        suggestions: [
          'Example: "Tomorrow"',
          'Example: "December 25th, 2024"',
          'Example: "Next Monday"',
        ],
      };
    }

    // Check departure date is in the future
    const departureDate = new Date(data.departureDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day for comparison

    if (departureDate < now) {
      return {
        valid: false,
        error: 'Departure date must be in the future.',
        suggestions: [
          'Please provide a future date.',
        ],
      };
    }

    // If return date is provided, validate it
    if (data.returnDate) {
      const returnDate = new Date(data.returnDate);

      // Check return is after departure
      if (returnDate <= departureDate) {
        return {
          valid: false,
          error: 'Return date must be after departure date.',
          suggestions: [
            'Please provide a return date that comes after the departure.',
          ],
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate passenger count
   */
  validatePassengers(data: Partial<RFPData>): ProcessResult {
    // Check passengers is present
    if (data.passengers === undefined) {
      return {
        valid: false,
        error: 'Please provide the number of passengers.',
        suggestions: [
          'Example: "5 passengers"',
          'Example: "Just me"',
        ],
      };
    }

    // Check passengers is a positive number
    if (data.passengers <= 0) {
      return {
        valid: false,
        error: 'Number of passengers must be at least 1.',
        suggestions: [
          'Please provide a positive number of passengers.',
        ],
      };
    }

    // Warn about very large passenger counts
    if (data.passengers > 19) {
      return {
        valid: true,
        warning: 'Large passenger count may require special aircraft. We\'ll find the best options for your group.',
      };
    }

    return { valid: true };
  }
}
