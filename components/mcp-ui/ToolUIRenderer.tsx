'use client';

import React from 'react';
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
 * Catches errors in extractProps or rendering to prevent chat crashes.
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

  try {
    const props = entry.extractProps(toolInput, toolResult, onAction);
    const Component = entry.component;

    return (
      <ToolUIErrorBoundary toolName={toolName}>
        <Component {...props} />
      </ToolUIErrorBoundary>
    );
  } catch (err) {
    console.error(`[ToolUIRenderer] extractProps failed for "${toolName}":`, err);
    return (
      <div className="text-xs text-muted-foreground italic p-2">
        Unable to display {toolName} result.
      </div>
    );
  }
}

interface ErrorBoundaryProps {
  toolName: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ToolUIErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[ToolUIErrorBoundary] Render error in "${this.props.toolName}":`, error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="text-xs text-muted-foreground italic p-2">
          Unable to display {this.props.toolName} result.
        </div>
      );
    }
    return this.props.children;
  }
}
