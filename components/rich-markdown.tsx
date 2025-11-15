/**
 * Rich Markdown Component
 *
 * Enhanced markdown renderer with GFM support, syntax highlighting, and security.
 * @stub - This is a stub file created for TDD. Implementation pending.
 */

'use client';

import type { ReactNode } from 'react';

export interface RichMarkdownProps {
  content: string;
  className?: string;
  theme?: 'light' | 'dark';
  allowHTML?: boolean;
  components?: Record<string, React.ComponentType<any>>;
  onLinkClick?: (url: string) => void;
  onImageClick?: (url: string) => void;
}

export function RichMarkdown(_props: RichMarkdownProps): JSX.Element {
  throw new Error('RichMarkdown component not yet implemented (TDD stub)');
}
