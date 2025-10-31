/**
 * MCP Logger
 *
 * Structured JSON logging for MCP servers.
 * Provides consistent logging format across all MCP components.
 */

import { Logger as LoggerInterface } from './types';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level?: LogLevel;

  /** Whether to include timestamps */
  timestamps?: boolean;

  /** Whether to pretty-print JSON */
  pretty?: boolean;

  /** Custom log prefix */
  prefix?: string;
}

/**
 * Structured logger for MCP servers
 */
export class Logger implements LoggerInterface {
  private level: LogLevel;
  private timestamps: boolean;
  private pretty: boolean;
  private prefix: string;

  constructor(config: LoggerConfig = {}) {
    this.level = config.level || LogLevel.INFO;
    this.timestamps = config.timestamps !== false;
    this.pretty = config.pretty || false;
    this.prefix = config.prefix || '[MCP]';
  }

  /**
   * Log an info message
   */
  info(message: string, meta: Record<string, any> = {}): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta: Record<string, any> = {}): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Log an error message
   */
  error(message: string | Error, meta: Record<string, any> = {}): void {
    if (message instanceof Error) {
      this.log(LogLevel.ERROR, message.message, {
        ...meta,
        stack: message.stack,
        name: message.name,
      });
    } else {
      this.log(LogLevel.ERROR, message, meta);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta: Record<string, any> = {}): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, meta: Record<string, any>): void {
    // Check if log level is sufficient
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: Record<string, any> = {
      level,
      message: `${this.prefix} ${message}`,
      ...meta,
    };

    if (this.timestamps) {
      logEntry.timestamp = new Date().toISOString();
    }

    const output = this.pretty
      ? JSON.stringify(logEntry, null, 2)
      : JSON.stringify(logEntry);

    // Output to appropriate stream
    if (level === LogLevel.ERROR) {
      console.error(output);
    } else if (level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
}
