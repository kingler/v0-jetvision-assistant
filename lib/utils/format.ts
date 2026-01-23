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
 * @param isoString - ISO 8601 timestamp or date string
 * @returns Formatted date string (e.g., 'Jan 15, 2024')
 *
 * @example
 * formatDate('2024-01-15T10:30:00Z') // 'Jan 15, 2024'
 */
export function formatDate(isoString: string): string {
  const dateOnlyMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      )
    : new Date(isoString);

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
