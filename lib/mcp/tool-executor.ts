/**
 * MCP Tool Executor Utilities
 *
 * Functions for executing MCP tools with retry logic and SSE streaming.
 * Extracted from app/api/chat/respond/route.ts for testability.
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  timeout?: number;
}

/**
 * Check if error is retryable (transient network/server errors)
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('econnreset') ||
    message.includes('timeout')
  ) {
    return true;
  }

  // HTTP 503/504 errors
  if (message.includes('503') || message.includes('504')) {
    return true;
  }

  if (message.includes('service unavailable') || message.includes('gateway timeout')) {
    return true;
  }

  return false;
}

/**
 * Execute MCP tool and emit SSE progress events
 * ONEK-81: Implement executeTool() Function for MCP Tool Invocation
 */
export async function executeTool(
  toolName: string,
  toolArgs: Record<string, unknown>,
  mcpClient: Client,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<string> {
  if (!toolName || toolName.trim() === '') {
    throw new Error('Tool name is required');
  }

  if (!mcpClient || !encoder || !controller) {
    throw new Error('Required parameters missing');
  }

  const sendSSE = (type: string, data: unknown) => {
    const message = `data: ${JSON.stringify({ type, data })}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  try {
    console.log(`[executeTool] Executing MCP tool: ${toolName}`, toolArgs);

    sendSSE('tool_call_start', {
      toolName,
      arguments: toolArgs,
    });

    const result = await mcpClient.callTool({
      name: toolName,
      arguments: toolArgs,
    });

    let resultText = '';
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text') {
          resultText += item.text;
        } else {
          // Log unsupported content types for future extensibility
          console.warn(
            `[executeTool] Unsupported tool result content type encountered: ${item.type}`,
            item
          );
        }
      }
    }

    sendSSE('tool_call_result', {
      toolName,
      result: resultText,
    });

    console.log(`[executeTool] Tool execution successful: ${toolName}`);
    return resultText;
  } catch (error) {
    console.error(`[executeTool] Tool execution error: ${toolName}`, error);

    sendSSE('tool_call_error', {
      toolName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Execute MCP tool with exponential backoff retry logic
 * ONEK-82: Add Retry Logic and Error Handling for Tool Execution
 *
 * Implements robust retry mechanism with:
 * - Exponential backoff (1s, 2s, 4s)
 * - Retryable error classification
 * - SSE retry event streaming
 * - Configurable max retries (default: 3)
 *
 * @param toolName - Name of the MCP tool
 * @param toolArgs - Tool arguments
 * @param mcpClient - MCP client instance
 * @param encoder - TextEncoder for SSE
 * @param controller - Stream controller
 * @param options - Retry configuration
 * @returns Tool execution result
 */
export async function executeToolWithRetry(
  toolName: string,
  toolArgs: Record<string, unknown>,
  mcpClient: Client,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  options: RetryOptions = {}
): Promise<string> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelay ?? 1000;

  const sendSSE = (type: string, data: unknown) => {
    const message = `data: ${JSON.stringify({ type, data })}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Execute tool
      const result = await executeTool(toolName, toolArgs, mcpClient, encoder, controller);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const shouldRetry = isRetryableError(lastError) && attempt < maxRetries - 1;

      if (!shouldRetry) {
        // Permanent error or max retries reached - throw immediately
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      // Jitter prevents thundering herd by adding randomness
      const baseBackoff = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * baseBackoff * 0.1; // 10% jitter
      const delay = Math.floor(baseBackoff + jitter);

      console.log(
        `[executeToolWithRetry] Retrying ${toolName} (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms`,
        lastError.message
      );

      // Emit retry event
      sendSSE('tool_call_retry', {
        toolName,
        attempt: attempt + 1,
        maxRetries,
        nextRetryDelay: delay,
        error: lastError.message,
      });

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw lastError || new Error('Max retries exceeded');
}
