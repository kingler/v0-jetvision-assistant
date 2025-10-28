/**
 * Error Monitor Agent Implementation
 *
 * Monitors errors, implements retry logic, and tracks error patterns.
 * Provides recovery suggestions and alerts for critical failures.
 */

import { BaseAgent } from '../core/base-agent';
import type {
  AgentContext,
  AgentResult,
  AgentConfig,
} from '../core/types';
import { AgentType, AgentStatus } from '../core/types';

interface ErrorData {
  message: string;
  code?: string;
  source?: string;
  timestamp?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  stack?: string;
}

interface ErrorAnalysis {
  message: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isTransient: boolean;
  errorType: string;
}

interface LogEntry {
  timestamp: Date;
  error: ErrorData;
  requestId: string;
  sessionId?: string;
}

/**
 * ErrorMonitorAgent
 * Monitors and analyzes errors
 */
export class ErrorMonitorAgent extends BaseAgent {
  private errorCounts: Map<string, number> = new Map();

  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.ERROR_MONITOR,
    });
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    await super.initialize();
    console.log(`[${this.name}] ErrorMonitorAgent initialized`);
  }

  /**
   * Execute the agent
   * Analyzes error and determines recovery strategy
   */
  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    this._status = AgentStatus.RUNNING;

    try {
      // Extract and validate error data
      const errorData = this.extractErrorData(context);
      this.validateErrorData(errorData);

      const attemptNumber = this.extractAttemptNumber(context);
      const maxRetries = this.extractMaxRetries(context);

      // Analyze error
      const errorAnalysis = this.analyzeError(errorData);

      // Determine retry strategy
      const shouldRetry = this.shouldRetry(errorAnalysis, attemptNumber, maxRetries);
      const retryDelay = shouldRetry ? this.calculateRetryDelay(attemptNumber) : 0;
      const reason = this.getRetryReason(shouldRetry, attemptNumber, maxRetries);

      // Generate recovery suggestions
      const recoverySuggestions = this.generateRecoverySuggestions(errorAnalysis, shouldRetry);

      // Log error
      const logEntry = this.logError(errorData, context);

      // Track error count
      const errorKey = this.getErrorKey(errorData);
      const currentCount = this.errorCounts.get(errorKey) || 0;
      this.errorCounts.set(errorKey, currentCount + 1);
      const errorCount = this.errorCounts.get(errorKey) || 0;

      // Determine if alert is needed
      const alertRequired = this.shouldAlert(errorAnalysis, errorCount);

      // Determine next agent for retry
      const nextAgent = shouldRetry ? errorData.source : undefined;

      // Update metrics
      this.metrics.totalExecutions++;
      this.metrics.successfulExecutions++;
      this._status = AgentStatus.COMPLETED;

      const executionTime = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTime);

      return {
        success: true,
        data: {
          errorAnalysis,
          shouldRetry,
          retryDelay,
          reason,
          recoverySuggestions,
          logged: true,
          logEntry,
          errorCount,
          alertRequired,
          requestId: context.requestId,
          sessionId: context.sessionId,
          nextAgent,
        },
        metadata: {
          executionTime,
        },
      };
    } catch (error) {
      // Handle errors
      this.metrics.totalExecutions++;
      this.metrics.failedExecutions++;
      this._status = AgentStatus.ERROR;

      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error as Error,
        metadata: {
          executionTime,
        },
      };
    }
  }

  /**
   * Extract error data from context
   */
  private extractErrorData(context: AgentContext): ErrorData | undefined {
    return context.metadata?.error as ErrorData | undefined;
  }

  /**
   * Extract attempt number
   */
  private extractAttemptNumber(context: AgentContext): number {
    return (context.metadata?.attemptNumber as number) || 1;
  }

  /**
   * Extract max retries
   */
  private extractMaxRetries(context: AgentContext): number {
    return (context.metadata?.maxRetries as number) || 3;
  }

  /**
   * Validate error data
   */
  private validateErrorData(errorData: ErrorData | undefined): void {
    if (!errorData || !errorData.message) {
      throw new Error('Missing required field: error data');
    }
  }

  /**
   * Analyze error
   */
  private analyzeError(errorData: ErrorData): ErrorAnalysis {
    const severity = errorData.severity || this.inferSeverity(errorData);
    const isTransient = this.isTransientError(errorData);
    const errorType = this.classifyErrorType(errorData);

    return {
      message: errorData.message,
      source: errorData.source || 'Unknown',
      severity,
      isTransient,
      errorType,
    };
  }

  /**
   * Infer error severity
   */
  private inferSeverity(errorData: ErrorData): 'low' | 'medium' | 'high' | 'critical' {
    const code = errorData.code?.toUpperCase();
    const message = errorData.message.toLowerCase();

    // Critical errors
    if (
      code?.includes('DB') ||
      code?.includes('DATABASE') ||
      message.includes('database') ||
      message.includes('fatal')
    ) {
      return 'critical';
    }

    // High severity
    if (
      code?.includes('AUTH') ||
      code?.includes('PERMISSION') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'high';
    }

    // Low severity
    if (
      code?.includes('CACHE') ||
      message.includes('cache') ||
      message.includes('warning')
    ) {
      return 'low';
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Check if error is transient (can be retried)
   */
  private isTransientError(errorData: ErrorData): boolean {
    const code = errorData.code?.toUpperCase();
    const message = errorData.message.toLowerCase();

    // Transient error indicators
    const transientCodes = ['TIMEOUT', 'NETWORK', 'ECONNREFUSED', 'ECONNRESET'];
    const transientKeywords = ['timeout', 'network', 'connection', 'unavailable', 'temporary'];

    if (code && transientCodes.some((c) => code.includes(c))) {
      return true;
    }

    if (transientKeywords.some((keyword) => message.includes(keyword))) {
      return true;
    }

    // Non-transient error indicators
    const permanentCodes = ['VALIDATION', 'AUTH', 'PERMISSION', 'NOT_FOUND'];
    const permanentKeywords = ['invalid', 'missing required', 'unauthorized', 'forbidden'];

    if (code && permanentCodes.some((c) => code.includes(c))) {
      return false;
    }

    if (permanentKeywords.some((keyword) => message.includes(keyword))) {
      return false;
    }

    // Default: assume transient for safety
    return true;
  }

  /**
   * Classify error type
   */
  private classifyErrorType(errorData: ErrorData): string {
    const code = errorData.code?.toUpperCase();
    const message = errorData.message.toLowerCase();

    if (code?.includes('NETWORK') || message.includes('network')) {
      return 'network';
    }

    if (code?.includes('TIMEOUT') || message.includes('timeout')) {
      return 'timeout';
    }

    if (code?.includes('VALIDATION') || message.includes('invalid') || message.includes('missing required')) {
      return 'validation';
    }

    if (code?.includes('AUTH') || message.includes('unauthorized')) {
      return 'authentication';
    }

    if (code?.includes('DB') || code?.includes('DATABASE') || message.includes('database')) {
      return 'database';
    }

    return 'unknown';
  }

  /**
   * Determine if retry should be attempted
   */
  private shouldRetry(
    errorAnalysis: ErrorAnalysis,
    attemptNumber: number,
    maxRetries: number
  ): boolean {
    // Don't retry if max attempts reached
    if (attemptNumber >= maxRetries) {
      return false;
    }

    // Don't retry non-transient errors
    if (!errorAnalysis.isTransient) {
      return false;
    }

    // Don't retry critical errors
    if (errorAnalysis.severity === 'critical') {
      return false;
    }

    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attemptNumber: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds

    const delay = baseDelay * Math.pow(2, attemptNumber - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Get reason for retry decision
   */
  private getRetryReason(
    shouldRetry: boolean,
    attemptNumber: number,
    maxRetries: number
  ): string {
    if (!shouldRetry) {
      if (attemptNumber >= maxRetries) {
        return `Maximum retry attempts (${maxRetries}) reached`;
      }
      return 'Error is not retryable';
    }

    return `Retrying (attempt ${attemptNumber + 1} of ${maxRetries})`;
  }

  /**
   * Generate recovery suggestions
   */
  private generateRecoverySuggestions(
    errorAnalysis: ErrorAnalysis,
    shouldRetry: boolean
  ): string[] {
    const suggestions: string[] = [];

    if (shouldRetry) {
      suggestions.push(`Retry the operation with exponential backoff`);
    }

    switch (errorAnalysis.errorType) {
      case 'network':
        suggestions.push('Check network connectivity');
        suggestions.push('Verify service endpoint is reachable');
        break;
      case 'timeout':
        suggestions.push('Increase timeout duration');
        suggestions.push('Check service performance');
        break;
      case 'validation':
        suggestions.push('Validate input data before processing');
        suggestions.push('Review data format requirements');
        break;
      case 'authentication':
        suggestions.push('Verify authentication credentials');
        suggestions.push('Check token expiration');
        break;
      case 'database':
        suggestions.push('Check database connection');
        suggestions.push('Verify database credentials');
        suggestions.push('Review database query syntax');
        break;
      default:
        suggestions.push('Review error logs for details');
        suggestions.push('Contact system administrator if issue persists');
    }

    return suggestions;
  }

  /**
   * Log error
   */
  private logError(errorData: ErrorData, context: AgentContext): LogEntry {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      error: errorData,
      requestId: context.requestId || 'unknown',
      sessionId: context.sessionId,
    };

    // In production, would send to logging service
    console.error(`[ErrorMonitor] Error logged:`, logEntry);

    return logEntry;
  }

  /**
   * Get error key for tracking
   */
  private getErrorKey(errorData: ErrorData): string {
    return `${errorData.source || 'unknown'}:${errorData.code || 'unknown'}`;
  }

  /**
   * Determine if alert should be sent
   */
  private shouldAlert(errorAnalysis: ErrorAnalysis, errorCount: number): boolean {
    // Alert on critical errors
    if (errorAnalysis.severity === 'critical') {
      return true;
    }

    // Alert if same error occurs multiple times (5+)
    if (errorCount >= 5) {
      return true;
    }

    // Alert on high severity errors
    if (errorAnalysis.severity === 'high') {
      return true;
    }

    return false;
  }

  /**
   * Update average execution time
   */
  private updateAverageExecutionTime(executionTime: number): void {
    const totalExecutions = this.metrics.totalExecutions;
    const currentAverage = this.metrics.averageExecutionTime;

    this.metrics.averageExecutionTime =
      (currentAverage * (totalExecutions - 1) + executionTime) / totalExecutions;
  }
}
