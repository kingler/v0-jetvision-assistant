/**
 * Logger Utility
 *
 * Environment-aware logging that suppresses debug/log/warn in production
 * while preserving error visibility.
 *
 * @module lib/utils/logger
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
  debug: (component: string, ...args: unknown[]): void => {
    if (isDev) console.log(`[${component}]`, ...args);
  },
};
