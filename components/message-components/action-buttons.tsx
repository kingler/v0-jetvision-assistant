/**
 * Action Buttons Component
 *
 * Displays inline quick-reply action buttons for user interactions
 * within chat messages. Supports multiple layouts and keyboard navigation.
 */

import React from 'react';
import { ActionButton } from './action-button';
import { ActionButtonsComponent } from './types';

export interface ActionButtonsProps {
  actions: ActionButtonsComponent['actions'];
  layout?: ActionButtonsComponent['layout'];
  onAction?: (actionId: string, value: string | number) => void;
  className?: string;
}

/**
 * ActionButtons Component
 *
 * Renders a collection of action buttons with configurable layout.
 * Supports horizontal, vertical, and grid layouts with full keyboard navigation.
 */
export function ActionButtons({
  actions,
  layout = 'horizontal',
  onAction,
  className,
}: ActionButtonsProps): React.ReactElement {
  /**
   * Layout-specific CSS classes
   */
  const layoutClasses = {
    horizontal: 'flex flex-wrap gap-2',
    vertical: 'flex flex-col gap-2',
    grid: 'grid grid-cols-2 md:grid-cols-3 gap-2',
  };

  /**
   * Handle button click
   */
  const handleAction = (actionId: string, value: string | number): void => {
    onAction?.(actionId, value);
  };

  return (
    <div className={`${layoutClasses[layout]} ${className || ''}`}>
      {actions.map((action) => (
        <ActionButton
          key={action.id}
          id={action.id}
          label={action.label}
          value={action.value}
          variant={action.variant}
          icon={action.icon}
          disabled={action.disabled}
          onClick={handleAction}
          className={layout === 'grid' ? 'w-full' : ''}
        />
      ))}
    </div>
  );
}
