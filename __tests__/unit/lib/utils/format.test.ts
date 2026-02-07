/**
 * Format Utility Tests - formatMessageTimestamp
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatMessageTimestamp } from '@/lib/utils/format';

describe('formatMessageTimestamp', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return time only for today\'s messages', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 7, 15, 0, 0)); // Feb 7, 2026 3:00 PM

    const today = new Date(2026, 1, 7, 14, 30, 0); // Feb 7, 2026 2:30 PM
    const result = formatMessageTimestamp(today);

    expect(result).toBe('2:30 PM');
  });

  it('should return date + time for non-today messages', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 7, 15, 0, 0)); // Feb 7, 2026

    const yesterday = new Date(2026, 1, 6, 14, 30, 0); // Feb 6, 2026 2:30 PM
    const result = formatMessageTimestamp(yesterday);

    expect(result).toMatch(/Feb 6, 2026 at 2:30 PM/);
  });

  it('should return date + time for messages from a different year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 7, 15, 0, 0));

    const lastYear = new Date(2025, 0, 15, 10, 0, 0); // Jan 15, 2025 10:00 AM
    const result = formatMessageTimestamp(lastYear);

    expect(result).toMatch(/Jan 15, 2025 at 10:00 AM/);
  });

  it('should handle epoch date (fallback for invalid timestamps)', () => {
    const epoch = new Date(0);
    const result = formatMessageTimestamp(epoch);

    // Epoch is never "today", so it should include a date + "at" + time
    // In US timezones, epoch displays as Dec 31, 1969 (UTC-5 offset)
    expect(result).toContain('at');
    expect(result).toMatch(/\d{4}/); // contains a year
  });

  it('should return empty string for Invalid Date', () => {
    const invalid = new Date('not-a-date');
    const result = formatMessageTimestamp(invalid);

    expect(result).toBe('');
  });

  it('should return empty string for non-Date input', () => {
    // @ts-expect-error testing runtime safety
    const result = formatMessageTimestamp('not a date');
    expect(result).toBe('');
  });

  it('should return empty string for null/undefined', () => {
    // @ts-expect-error testing runtime safety
    expect(formatMessageTimestamp(null)).toBe('');
    // @ts-expect-error testing runtime safety
    expect(formatMessageTimestamp(undefined)).toBe('');
  });

  it('should show morning times correctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 7, 15, 0, 0));

    const morning = new Date(2026, 1, 7, 9, 5, 0); // 9:05 AM today
    const result = formatMessageTimestamp(morning);

    expect(result).toBe('9:05 AM');
  });

  it('should handle midnight boundary correctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 7, 0, 5, 0)); // Feb 7, 12:05 AM

    const lateLastNight = new Date(2026, 1, 6, 23, 59, 0); // Feb 6, 11:59 PM
    const result = formatMessageTimestamp(lateLastNight);

    // Should show date since it's yesterday
    expect(result).toMatch(/Feb 6, 2026 at 11:59 PM/);
  });
});
