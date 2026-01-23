/**
 * Flight Request Parser Utility
 * 
 * Parses flight request details from user messages to extract:
 * - Departure and arrival airport codes (ICAO/IATA)
 * - Departure date
 * - Passenger count
 * - Route string for display
 * 
 * This ensures chat sessions are updated immediately when a user sends
 * a message, so both the header and sidebar card show correct information.
 */

/**
 * Parsed flight request details from user message
 */
export interface ParsedFlightRequest {
  /** Departure airport code (ICAO or IATA) */
  departureAirport?: string;
  /** Arrival airport code (ICAO or IATA) */
  arrivalAirport?: string;
  /** Route string for display (e.g., "KTEB → KVNY") */
  route?: string;
  /** Departure date as ISO string */
  departureDate?: string;
  /** Departure date formatted for display */
  date?: string;
  /** Number of passengers */
  passengers?: number;
}

/**
 * Parse airport codes from message text
 * Looks for patterns like:
 * - "KTEB to KVNY"
 * - "from KTEB to KVNY"
 * - "KTEB → KVNY"
 * - "Teterboro (KTEB) to Van Nuys (KVNY)"
 * 
 * @param text - User message text
 * @returns Object with departure and arrival airport codes
 */
function extractAirportCodes(text: string): { departure?: string; arrival?: string } {
  // Pattern for ICAO codes (4 uppercase letters) or IATA codes (3 uppercase letters)
  const airportCodePattern = /\b([A-Z]{3,4})\b/g
  const allCodes = text.match(airportCodePattern) || []
  
  if (allCodes.length >= 2) {
    // Try to find codes with context: "from ... (KTEB) to ... (KVNY)"
    const fromPattern = /(?:from|departure).*?\(?([A-Z]{3,4})\)?/i
    const toPattern = /(?:to|arrival|destination).*?\(?([A-Z]{3,4})\)?/i
    
    const fromMatch = text.match(fromPattern)
    const toMatch = text.match(toPattern)
    
    if (fromMatch && toMatch) {
      return {
        departure: fromMatch[1]?.toUpperCase(),
        arrival: toMatch[1]?.toUpperCase(),
      }
    }
    
    // Fallback: look for "X to Y" pattern (handles both "to" and arrow "→")
    const routePattern = /\b([A-Z]{3,4})\s+(?:to|→)\s+([A-Z]{3,4})\b/i
    const routeMatch = text.match(routePattern)
    
    if (routeMatch) {
      return {
        departure: routeMatch[1]?.toUpperCase(),
        arrival: routeMatch[2]?.toUpperCase(),
      }
    }
    
    // Last resort: use first two codes found (assuming order is departure, arrival)
    return {
      departure: allCodes[0],
      arrival: allCodes[1],
    }
  }
  
  // Try to find single airport code with context
  if (allCodes.length === 1) {
    if (text.toLowerCase().match(/from|departure/)) {
      return { departure: allCodes[0] }
    }
    if (text.toLowerCase().match(/to|arrival|destination/)) {
      return { arrival: allCodes[0] }
    }
  }
  
  return {}
}

/**
 * Parse departure date from message text
 * Handles formats like:
 * - "March 25, 2026"
 * - "Mar 25, 2026"
 * - "3/25/2026"
 * - "2026-03-25"
 * - "25th of March 2026"
 * 
 * @param text - User message text
 * @returns Parsed date as ISO string and formatted string, or undefined
 */
function extractDepartureDate(text: string): { iso?: string; formatted?: string } | undefined {
  // Pattern for various date formats
  const datePatterns = [
    // Full date: "March 25, 2026" or "Mar 25, 2026"
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
    // Short date: "3/25/2026" or "03/25/2026"
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
    // ISO date: "2026-03-25"
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
    // Day of month: "25th of March 2026"
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec),?\s+(\d{4})\b/i,
  ]

  const monthNames: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  }

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      try {
        let date: Date

        if (pattern === datePatterns[0] || pattern === datePatterns[3]) {
          // Month name format
          const monthName = match[1].toLowerCase()
          const day = parseInt(match[2], 10)
          const year = parseInt(match[3], 10)
          const month = monthNames[monthName]

          if (month !== undefined) {
            date = new Date(year, month, day)
          } else {
            continue
          }
        } else if (pattern === datePatterns[1]) {
          // Short date format (M/D/YYYY)
          const month = parseInt(match[1], 10) - 1
          const day = parseInt(match[2], 10)
          const year = parseInt(match[3], 10)
          date = new Date(year, month, day)
        } else if (pattern === datePatterns[2]) {
          // ISO date format (YYYY-MM-DD)
          const year = parseInt(match[1], 10)
          const month = parseInt(match[2], 10) - 1
          const day = parseInt(match[3], 10)
          date = new Date(year, month, day)
        } else {
          continue
        }

        // Validate date
        if (isNaN(date.getTime())) {
          continue
        }

        // Return both ISO date string and formatted string (avoid timezone shifts)
        const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`
        const formatted = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })

        return { iso, formatted }
      } catch {
        continue
      }
    }
  }

  return undefined
}

/**
 * Parse passenger count from message text
 * Handles formats like:
 * - "4 passengers"
 * - "for 4 passengers"
 * - "4 people"
 * - "party of 4"
 * - Written numbers: "four passengers"
 * 
 * @param text - User message text
 * @returns Passenger count or undefined
 */
function extractPassengerCount(text: string): number | undefined {
  const normalizedInput = text.toLowerCase()

  // Handle "just me"
  if (normalizedInput.includes('just me') || normalizedInput === 'me') {
    return 1
  }

  // Extract numeric passengers
  const numericMatch = normalizedInput.match(/(\d+)\s+(?:passenger|people|pax|person)/)
  if (numericMatch) {
    return parseInt(numericMatch[1], 10)
  }

  // "for X passengers"
  const forMatch = normalizedInput.match(/for\s+(\d+)\s+(?:passenger|people|pax|person)/)
  if (forMatch) {
    return parseInt(forMatch[1], 10)
  }

  // "party of X" or "family of X"
  const partyMatch = normalizedInput.match(/(?:party|family)\s+of\s+(\d+)/)
  if (partyMatch) {
    return parseInt(partyMatch[1], 10)
  }

  // Written numbers
  const writtenNumbers: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  }

  for (const [word, num] of Object.entries(writtenNumbers)) {
    if (normalizedInput.match(new RegExp(`(?:party|family)\\s+of\\s+${word}\\b`))) {
      return num
    }
    if (normalizedInput.includes(`${word} passenger`)) {
      return num
    }
  }

  return undefined
}

/**
 * Parse flight request details from user message
 * 
 * Extracts airport codes, date, and passenger count from natural language text.
 * This is used to immediately update chat sessions when a user sends a message,
 * ensuring both the header and sidebar card show correct information.
 * 
 * @param message - User message text
 * @returns Parsed flight request details
 */
export function parseFlightRequest(message: string): ParsedFlightRequest {
  const result: ParsedFlightRequest = {}

  // Extract airport codes
  const airportCodes = extractAirportCodes(message)
  if (airportCodes.departure && airportCodes.arrival) {
    result.departureAirport = airportCodes.departure
    result.arrivalAirport = airportCodes.arrival
    result.route = `${airportCodes.departure} → ${airportCodes.arrival}`
  } else if (airportCodes.departure) {
    result.departureAirport = airportCodes.departure
  } else if (airportCodes.arrival) {
    result.arrivalAirport = airportCodes.arrival
  }

  // Extract departure date
  const dateInfo = extractDepartureDate(message)
  if (dateInfo) {
    result.departureDate = dateInfo.iso
    result.date = dateInfo.formatted
  }

  // Extract passenger count
  const passengers = extractPassengerCount(message)
  if (passengers !== undefined) {
    result.passengers = passengers
  }

  return result
}
