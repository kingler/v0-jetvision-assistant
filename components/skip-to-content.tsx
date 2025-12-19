'use client';

/**
 * Skip to Content Component
 * WCAG 2.4.1 - Bypass Blocks
 *
 * Provides keyboard users a way to skip past navigation
 * and other repeated content to the main content area.
 *
 * @module components/skip-to-content
 */

import React from 'react';

interface SkipToContentProps {
  /** Target element ID to skip to (without #) */
  targetId?: string;
  /** Custom label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Accessible skip link that appears on focus
 * Allows keyboard users to bypass navigation directly to main content
 */
export function SkipToContent({
  targetId = 'main-content',
  label = 'Skip to main content',
  className = '',
}: SkipToContentProps) {
  const navigateToTarget = () => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      // scrollIntoView may not exist in some test environments
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigateToTarget();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateToTarget();
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[9999]
        bg-primary text-primary-foreground
        px-4 py-2 rounded-md
        font-medium text-sm
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        transition-all duration-200
        shadow-lg
        ${className}
      `}
      data-testid="skip-to-content"
    >
      {label}
    </a>
  );
}

export default SkipToContent;
