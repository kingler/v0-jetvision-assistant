/**
 * Tool Call Indicator Component
 * Displays visual indicators for AI agent tool invocations
 * Shows progress states with Lucide icons
 */

'use client';

import { useState } from 'react';
import {
  FileText,
  Plane,
  Clock,
  Users,
  Mail,
  TrendingUp,
  Database,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tool call status
 */
type ToolCallStatus = 'starting' | 'in_progress' | 'complete' | 'error';

/**
 * Tool call data
 */
export interface ToolCallData {
  id: string;
  name: string;
  status: ToolCallStatus;
  arguments?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

/**
 * Component props
 */
interface ToolCallIndicatorProps {
  toolCall: ToolCallData;
  compact?: boolean;
  showDetails?: boolean;
}

/**
 * Icon mapping for different tool types
 */
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  create_rfp: FileText,
  search_flights: Plane,
  get_rfp_status: Clock,
  search_clients: Users,
  send_email: Mail,
  analyze_quotes: TrendingUp,
  supabase_query: Database,
  search_aircraft: Search,
};

/**
 * Get icon for tool
 */
function getToolIcon(toolName: string): React.ComponentType<{ className?: string }> {
  return TOOL_ICONS[toolName] || FileText;
}

/**
 * Get human-readable tool name
 */
function getToolDisplayName(toolName: string): string {
  const names: Record<string, string> = {
    create_rfp: 'Create RFP',
    search_flights: 'Search Flights',
    get_rfp_status: 'Get RFP Status',
    search_clients: 'Search Clients',
    send_email: 'Send Email',
    analyze_quotes: 'Analyze Quotes',
    supabase_query: 'Database Query',
    search_aircraft: 'Search Aircraft',
  };

  return names[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format duration
 */
function formatDuration(startTime?: Date, endTime?: Date): string {
  if (!startTime) return '';

  const end = endTime || new Date();
  const durationMs = end.getTime() - startTime.getTime();
  const seconds = Math.floor(durationMs / 1000);

  if (seconds < 1) return `${durationMs}ms`;
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

/**
 * Tool Call Indicator Component
 */
export function ToolCallIndicator({
  toolCall,
  compact = false,
  showDetails = true,
}: ToolCallIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const Icon = getToolIcon(toolCall.name);
  const displayName = getToolDisplayName(toolCall.name);

  // Status styling
  const statusStyles = {
    starting: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    in_progress: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-700 dark:text-purple-300',
      icon: 'text-purple-600 dark:text-purple-400',
    },
    complete: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-600 dark:text-green-400',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-600 dark:text-red-400',
    },
  };

  const styles = statusStyles[toolCall.status];

  // Status icon
  const StatusIcon = () => {
    switch (toolCall.status) {
      case 'starting':
        return <Loader2 className={cn('w-4 h-4 animate-spin', styles.icon)} />;
      case 'in_progress':
        return <Loader2 className={cn('w-4 h-4 animate-spin', styles.icon)} />;
      case 'complete':
        return <CheckCircle className={cn('w-4 h-4', styles.icon)} />;
      case 'error':
        return <XCircle className={cn('w-4 h-4', styles.icon)} />;
    }
  };

  // Status label
  const statusLabel = {
    starting: 'Starting...',
    in_progress: 'Running...',
    complete: 'Complete',
    error: 'Error',
  }[toolCall.status];

  // Compact view
  if (compact) {
    return (
      <div className={cn('inline-flex items-center gap-2 px-2 py-1 rounded text-xs', styles.bg, styles.border, 'border')}>
        <Icon className={cn('w-3 h-3', styles.icon)} />
        <span className={styles.text}>{displayName}</span>
        <StatusIcon />
      </div>
    );
  }

  // Full view
  return (
    <div className={cn('rounded-lg border p-3', styles.bg, styles.border)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', styles.bg)}>
            <Icon className={cn('w-4 h-4', styles.icon)} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={cn('font-medium text-sm', styles.text)}>{displayName}</span>
              <span className={cn('text-xs', styles.text)}>{statusLabel}</span>
            </div>

            {toolCall.status === 'complete' && toolCall.startTime && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDuration(toolCall.startTime, toolCall.endTime)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusIcon />

          {showDetails && (toolCall.arguments || toolCall.result || toolCall.error) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn('p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors', styles.text)}
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {/* Arguments */}
          {toolCall.arguments && Object.keys(toolCall.arguments).length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Arguments:
              </div>
              <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                {JSON.stringify(toolCall.arguments, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {toolCall.result && (
            <div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Result:
              </div>
              <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}

          {/* Error */}
          {toolCall.error && (
            <div>
              <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                Error:
              </div>
              <div className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                {toolCall.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Tool Call List Component
 * Displays multiple tool calls
 */
interface ToolCallListProps {
  toolCalls: ToolCallData[];
  compact?: boolean;
  showDetails?: boolean;
}

export function ToolCallList({ toolCalls, compact = false, showDetails = true }: ToolCallListProps) {
  if (toolCalls.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {toolCalls.map((toolCall) => (
          <ToolCallIndicator key={toolCall.id} toolCall={toolCall} compact={compact} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {toolCalls.map((toolCall) => (
        <ToolCallIndicator key={toolCall.id} toolCall={toolCall} showDetails={showDetails} />
      ))}
    </div>
  );
}
