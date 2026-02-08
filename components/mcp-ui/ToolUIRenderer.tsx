'use client';

import { getToolUIEntry } from '@/lib/mcp-ui/tool-ui-registry';
import type { UIActionResult } from '@mcp-ui/server';

export interface ToolUIRendererProps {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult: Record<string, unknown>;
  onAction: (action: UIActionResult) => void;
}

/**
 * Renders the appropriate UI component for a tool result.
 * Returns null for tools without visual output (text-only tools).
 */
export function ToolUIRenderer({
  toolName,
  toolInput,
  toolResult,
  onAction,
}: ToolUIRendererProps) {
  const entry = getToolUIEntry(toolName);

  if (!entry) {
    return null;
  }

  const props = entry.extractProps(toolInput, toolResult, onAction);
  const Component = entry.component;

  return <Component {...props} />;
}
