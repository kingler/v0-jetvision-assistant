/**
 * Action Button Component
 *
 * Individual action button for use in ActionButtons component.
 * Supports keyboard navigation, visual states, and accessibility.
 */

import React from 'react';
import { Button } from '@/components/ui/button';

export interface ActionButtonProps {
  id: string;
  label: string;
  value: string | number;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: React.ReactNode;
  disabled?: boolean;
  onClick: (id: string, value: string | number) => void;
  className?: string;
}

/**
 * ActionButton Component
 *
 * Individual action button with keyboard support and accessibility.
 * Handles Enter and Space key presses for activation.
 */
export function ActionButton({
  id,
  label,
  value,
  variant,
  icon,
  disabled = false,
  onClick,
  className,
}: ActionButtonProps): React.ReactElement {
  // Map variant to Button component variant
  const variantMapping = {
    primary: 'default',
    secondary: 'secondary',
    outline: 'outline',
    ghost: 'ghost',
  } as const;

  const buttonVariant = variant ? variantMapping[variant] : 'outline';

  /**
   * Handle button click
   */
  const handleClick = (): void => {
    if (!disabled) {
      onClick(id, value);
    }
  };

  /**
   * Handle keyboard navigation
   * Supports Enter and Space keys
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) {
      return;
    }

    // Trigger on Enter or Space
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent default space scroll behavior
      onClick(id, value);
    }
  };

  return (
    <Button
      variant={buttonVariant}
      size="sm"
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
      aria-disabled={disabled}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  );
}
