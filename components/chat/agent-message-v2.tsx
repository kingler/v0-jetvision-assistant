'use client';

import React from 'react';
import { ToolUIRenderer } from '@/components/mcp-ui/ToolUIRenderer';
import { handleUIAction, type ActionHandlerContext } from '@/lib/mcp-ui/action-handler';
import type { UIActionResult } from '@mcp-ui/server';
import type { ToolResultWithInput } from '@/lib/chat/types';
import { formatMessageTimestamp } from '@/lib/utils/format';

/**
 * Strip markdown formatting for plain text display.
 */
function stripMarkdown(text: string): string {
  return text
    // Remove standalone JSON object lines (tool results leaked by model)
    .replace(/^\s*\{"[^"]+"\s*:.*\}\s*$/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    .replace(/^[\s]*(\d+)\.\s+/gm, '$1. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface AgentMessageV2Props {
  content: string;
  timestamp: Date;
  toolResults?: ToolResultWithInput[];
  actionContext: ActionHandlerContext;
  isProcessing?: boolean;
}

export function AgentMessageV2({
  content,
  timestamp,
  toolResults,
  actionContext,
  isProcessing,
}: AgentMessageV2Props) {
  const onAction = (action: UIActionResult) => {
    handleUIAction(action, actionContext);
  };

  return (
    <div className="space-y-3">
      {/* Avatar + Badge Header */}
      <div className="flex items-center space-x-2">
        <div className="w-7 h-7 flex items-center justify-center shrink-0">
          <img
            src="/images/jvg-logo.svg"
            alt="Jetvision"
            className="w-full h-full"
            style={{ filter: 'brightness(0)' }}
          />
        </div>
        <span className="text-xs font-semibold text-foreground">
          Jetvision Agent
        </span>
      </div>

      {/* Text content */}
      {content && (
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {stripMarkdown(content)}
        </div>
      )}

      {/* Tool result UIs */}
      {toolResults?.map((tr, index) => (
        <ToolUIRenderer
          key={`${tr.name}-${index}`}
          toolName={tr.name}
          toolInput={tr.input}
          toolResult={tr.result}
          onAction={onAction}
        />
      ))}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="animate-pulse">Thinking...</div>
        </div>
      )}

      {/* Timestamp */}
      <span className="text-[10px] text-muted-foreground">
        {formatMessageTimestamp(timestamp)}
      </span>
    </div>
  );
}

export default AgentMessageV2;
