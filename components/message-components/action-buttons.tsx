/**
 * Action Buttons Component
 *
 * Displays inline quick-reply action buttons for user interactions
 * within chat messages.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ActionButtonsComponent } from './types';

export interface ActionButtonsProps {
  actions: ActionButtonsComponent['actions'];
  layout?: ActionButtonsComponent['layout'];
  onAction?: (actionId: string, value: string | number) => void;
  className?: string;
}

export function ActionButtons({ actions, layout = 'horizontal', onAction, className }: ActionButtonsProps) {
  const layoutClasses = {
    horizontal: 'flex flex-wrap gap-2',
    vertical: 'flex flex-col gap-2',
    grid: 'grid grid-cols-2 md:grid-cols-3 gap-2',
  };

  return (
    <div className={`${layoutClasses[layout]} ${className || ''}`}>
      {actions.map((action) => {
        // Map 'primary' to 'default' for Button component compatibility
        const variantMapping = {
          primary: 'default',
          secondary: 'secondary',
          outline: 'outline',
          ghost: 'ghost',
        } as const;
        const variant = action.variant ? variantMapping[action.variant] : 'outline';

        return (
          <Button
            key={action.id}
            variant={variant}
            size="sm"
            disabled={action.disabled}
            onClick={() => onAction?.(action.id, action.value)}
            className={layout === 'grid' ? 'w-full' : ''}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
