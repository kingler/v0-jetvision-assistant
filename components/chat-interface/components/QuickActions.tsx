/**
 * QuickActions Component
 *
 * Quick action buttons for common chat actions.
 *
 * Extracted from: components/chat-interface.tsx (lines 2354-2394)
 */

'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

export interface QuickAction {
  /** Display label for the action */
  label: string;
  /** Value to set in the input when clicked */
  value: string;
}

export interface QuickActionsProps {
  /** Handler called with the action value when clicked */
  onSelect: (value: string) => void;
  /** Handler for view workflow button */
  onViewWorkflow?: () => void;
  /** Whether actions are disabled (processing) */
  disabled?: boolean;
  /** Whether to show the view workflow button */
  showViewWorkflow?: boolean;
  /** Custom actions to display (defaults to standard actions) */
  actions?: QuickAction[];
  /** Optional className for customization */
  className?: string;
}

/**
 * Default quick actions
 */
const DEFAULT_ACTIONS: QuickAction[] = [
  { label: 'Update Details', value: 'Can you update the passenger count?' },
  { label: 'Alternative Options', value: 'Show me alternative aircraft options' },
  { label: 'Check Status', value: "What's the status of my request?" },
];

/**
 * Quick action buttons for common chat operations.
 *
 * @example
 * ```tsx
 * <QuickActions
 *   onSelect={(value) => setInputValue(value)}
 *   onViewWorkflow={() => scrollToWorkflow()}
 *   disabled={isProcessing}
 *   showViewWorkflow={currentStep >= 1}
 * />
 * ```
 */
export const QuickActions = memo(function QuickActions({
  onSelect,
  onViewWorkflow,
  disabled = false,
  showViewWorkflow = false,
  actions = DEFAULT_ACTIONS,
  className = '',
}: QuickActionsProps) {
  return (
    <div className={`flex flex-wrap gap-2 mb-4 ${className}`}>
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          onClick={() => onSelect(action.value)}
          disabled={disabled}
          className="text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
        >
          {action.label}
        </Button>
      ))}

      {showViewWorkflow && onViewWorkflow && (
        <Button
          variant="outline"
          size="sm"
          onClick={onViewWorkflow}
          className="text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
        >
          <Eye className="w-3 h-3 mr-1" />
          View Workflow
        </Button>
      )}
    </div>
  );
});

export default QuickActions;
