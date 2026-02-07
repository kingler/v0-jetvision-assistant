/**
 * Formatting Utility Functions
 *
 * Reusable formatting helpers for currency, time, and duration display.
 * Consolidates duplicate formatting logic from QuoteCard components.
 *
 * @module lib/utils/format
 */

/**
 * Format a number as currency
 *
 * @param amount - The numeric amount to format
 * @param currency - The ISO currency code (default: 'USD')
 * @returns Formatted currency string (e.g., '$45,000')
 *
 * @example
 * formatCurrency(45000) // '$45,000'
 * formatCurrency(45000, 'EUR') // '€45,000'
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format an ISO timestamp as a time string
 *
 * @param isoString - ISO 8601 timestamp or date string
 * @returns Formatted time string (e.g., '10:30 AM')
 *
 * @example
 * formatTime('2024-01-15T10:30:00Z') // '10:30 AM'
 */
export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a duration in minutes as hours and minutes
 *
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., '2h 30m')
 *
 * @example
 * formatDuration(150) // '2h 30m'
 * formatDuration(60) // '1h 0m'
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Format a relative time ago string
 *
 * @param date - Date to format relative to now
 * @returns Formatted relative time (e.g., '5 min ago', '2 hours ago')
 *
 * @example
 * formatTimeAgo(new Date(Date.now() - 5 * 60 * 1000)) // '5 min ago'
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 1) {
    return 'less than a minute ago';
  }
  if (diffMinutes === 1) {
    return '1 min ago';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  if (diffHours === 1) {
    return '1 hour ago';
  }
  return `${diffHours} hours ago`;
}

/**
 * Format a date as a short date string
 *
 * Handles both ISO date-only strings (YYYY-MM-DD) and full timestamp strings.
 * Uses UTC date components to avoid timezone conversion issues that can shift
 * the displayed date by one day.
 *
 * @param isoString - ISO 8601 timestamp or date string (e.g., '2024-01-15' or '2024-01-15T10:30:00Z')
 * @returns Formatted date string (e.g., 'Jan 15, 2024')
 *
 * @example
 * formatDate('2024-01-15') // 'Jan 15, 2024'
 * formatDate('2024-01-15T10:30:00Z') // 'Jan 15, 2024'
 * formatDate('2024-01-15T00:00:00-08:00') // 'Jan 15, 2024' (preserves date regardless of timezone)
 */
export function formatDate(isoString: string): string {
  // Handle ISO date-only format (YYYY-MM-DD)
  const dateOnlyMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    // Use UTC date constructor to avoid timezone shifts
    const date = new Date(
      Date.UTC(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      )
    );
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC', // Use UTC to preserve the date
    });
  }

  // Handle full timestamp strings - extract date portion and use UTC
  const timestampMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (timestampMatch) {
    // Extract date components from timestamp and create UTC date
    const date = new Date(
      Date.UTC(
        Number(timestampMatch[1]),
        Number(timestampMatch[2]) - 1,
        Number(timestampMatch[3])
      )
    );
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC', // Use UTC to preserve the date
    });
  }

  // Fallback: try parsing as-is (for already formatted dates like "Mar 25, 2026" or "March 25, 2026")
  // If it's already formatted, return as-is to avoid double formatting
  const alreadyFormattedMatch = isoString.match(/^(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/);
  if (alreadyFormattedMatch) {
    return isoString;
  }

  // Last resort: parse and format (may have timezone issues)
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    // Invalid date, return original string
    return isoString;
  }

  // Use UTC components to avoid timezone shifts
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format a message timestamp for chat display.
 *
 * Shows time only for today's messages, and date + time for older messages.
 * This matches the standard UX pattern used by Slack, iMessage, WhatsApp.
 *
 * @param date - The Date object to format
 * @returns Formatted timestamp string
 *
 * @example
 * // Today's message
 * formatMessageTimestamp(new Date()) // '2:30 PM'
 *
 * // Older message
 * formatMessageTimestamp(new Date('2025-01-15T14:30:00')) // 'Jan 15, 2025 at 2:30 PM'
 *
 * // Invalid date (epoch fallback)
 * formatMessageTimestamp(new Date(0)) // 'Jan 1, 1970 at 7:00 PM' (or local equivalent)
 */
export function formatMessageTimestamp(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  // For non-today dates, show "Jan 15, 2025 at 2:30 PM"
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${datePart} at ${timePart}`;
}

/**
 * Safely parse a timestamp value into a Date object.
 *
 * Handles Date objects, ISO strings, null, and undefined.
 * Invalid or missing timestamps fall back to epoch (Date(0)) so they sort
 * to the start of the timeline rather than scrambling into the present.
 *
 * @param timestamp - The value to parse (Date, string, null, or undefined)
 * @returns A valid Date object (epoch if input was invalid/missing)
 *
 * @example
 * safeParseTimestamp(new Date('2025-01-15T10:30:00Z')) // Date(2025-01-15...)
 * safeParseTimestamp('2025-01-15T10:30:00Z') // Date(2025-01-15...)
 * safeParseTimestamp(null) // Date(0) - epoch
 * safeParseTimestamp(new Date('invalid')) // Date(0) - epoch
 */
export function safeParseTimestamp(timestamp: Date | string | undefined | null): Date {
  const EPOCH = new Date(0);
  if (!timestamp) return EPOCH;
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? EPOCH : timestamp;
  }
  const parsed = new Date(timestamp);
  return isNaN(parsed.getTime()) ? EPOCH : parsed;
}

/**
 * Format a number with thousand separators
 *
 * @param num - Number to format
 * @returns Formatted number string (e.g., '45,000')
 *
 * @example
 * formatNumber(45000) // '45,000'
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

