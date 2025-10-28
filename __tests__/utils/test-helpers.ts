/**
 * Test Helper Utilities
 *
 * Common utilities and helper functions for writing tests.
 * Provides standardized patterns for testing across the codebase.
 */

import { vi } from 'vitest';

/**
 * Wait for a specified duration
 * @param ms - Milliseconds to wait
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Wait for a condition to become true
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 * @param interval - Check interval in milliseconds (default: 100)
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await wait(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};

/**
 * Create a mock function that can be called multiple times
 * @param returnValues - Array of values to return on each call
 */
export const createSequentialMock = <T>(...returnValues: T[]) => {
  let callCount = 0;
  return vi.fn(() => {
    const value = returnValues[callCount];
    callCount++;
    return value;
  });
};

/**
 * Create a mock function that resolves with different values on each call
 * @param returnValues - Array of values to resolve with on each call
 */
export const createSequentialAsyncMock = <T>(...returnValues: T[]) => {
  let callCount = 0;
  return vi.fn(async () => {
    const value = returnValues[callCount];
    callCount++;
    return value;
  });
};

/**
 * Suppress console output during tests
 * @param fn - Function to run with suppressed console
 */
export const suppressConsole = async <T>(fn: () => T | Promise<T>): Promise<T> => {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  // Suppress all console methods
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();

  try {
    return await fn();
  } finally {
    // Restore console
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }
};

/**
 * Capture console output during test execution
 * @param fn - Function to run while capturing console
 * @returns Object with captured console output
 */
export const captureConsole = async <T>(
  fn: () => T | Promise<T>
): Promise<{
  result: T;
  logs: string[];
  errors: string[];
  warnings: string[];
}> => {
  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };

  console.log = vi.fn((...args) => logs.push(args.join(' ')));
  console.error = vi.fn((...args) => errors.push(args.join(' ')));
  console.warn = vi.fn((...args) => warnings.push(args.join(' ')));

  try {
    const result = await fn();
    return { result, logs, errors, warnings };
  } finally {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  }
};

/**
 * Test if a function throws an error with a specific message
 * @param fn - Function to test
 * @param expectedMessage - Expected error message (string or regex)
 */
export const expectToThrow = async (
  fn: () => void | Promise<void>,
  expectedMessage?: string | RegExp
): Promise<Error> => {
  try {
    await fn();
    throw new Error('Expected function to throw an error, but it did not');
  } catch (error) {
    if (error instanceof Error) {
      if (expectedMessage) {
        if (typeof expectedMessage === 'string') {
          if (!error.message.includes(expectedMessage)) {
            throw new Error(
              `Expected error message to include "${expectedMessage}", but got "${error.message}"`
            );
          }
        } else {
          if (!expectedMessage.test(error.message)) {
            throw new Error(
              `Expected error message to match ${expectedMessage}, but got "${error.message}"`
            );
          }
        }
      }
      return error;
    }
    throw error;
  }
};

/**
 * Generate a random string for test data
 * @param length - Length of the string (default: 10)
 */
export const randomString = (length = 10): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate a random integer within a range
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 */
export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate a random UUID (v4 format)
 */
export const randomUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Create a spy on an object method
 * @param obj - Object to spy on
 * @param method - Method name to spy on
 */
export const createSpy = <T extends object, K extends keyof T>(
  obj: T,
  method: K
): ReturnType<typeof vi.spyOn> => {
  return vi.spyOn(obj, method as any);
};

/**
 * Reset all mocks and spies
 */
export const resetAllMocks = (): void => {
  vi.clearAllMocks();
  vi.resetAllMocks();
  vi.restoreAllMocks();
};

/**
 * Measure execution time of a function
 * @param fn - Function to measure
 * @returns Tuple of [result, duration in ms]
 */
export const measureExecutionTime = async <T>(
  fn: () => T | Promise<T>
): Promise<[T, number]> => {
  const startTime = performance.now();
  const result = await fn();
  const duration = performance.now() - startTime;
  return [result, duration];
};

/**
 * Create a deferred promise that can be resolved/rejected externally
 */
export const createDeferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
} => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

/**
 * Retry a function until it succeeds or max attempts reached
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @param delayMs - Delay between attempts in ms (default: 100)
 */
export const retry = async <T>(
  fn: () => T | Promise<T>,
  maxAttempts = 3,
  delayMs = 100
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        await wait(delayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed');
};
