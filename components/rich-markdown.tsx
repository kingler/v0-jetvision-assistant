/**
 * Rich Markdown Component
 *
 * Enhanced markdown renderer with GFM support, syntax highlighting, and security.
 */

'use client';

import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { cn } from '@/lib/utils';
import type { Components } from 'react-markdown';

export interface RichMarkdownProps {
  content: string | null;
  className?: string;
  theme?: 'light' | 'dark';
  allowHTML?: boolean;
  components?: Partial<Components>;
  onLinkClick?: (url: string) => void;
  onImageClick?: (url: string) => void;
}

/**
 * Rich Markdown Component
 *
 * Renders markdown with GitHub Flavored Markdown (GFM) support, syntax highlighting,
 * and XSS protection.
 *
 * Features:
 * - GitHub Flavored Markdown (tables, strikethrough, task lists, autolinks)
 * - Syntax highlighting for code blocks
 * - XSS protection with HTML sanitization
 * - Custom link and image click handlers
 * - Theme support (light/dark)
 * - Fully accessible
 *
 * @example
 * ```tsx
 * <RichMarkdown
 *   content="# Hello World\n\nThis is **markdown**"
 *   theme="dark"
 *   onLinkClick={(url) => console.log('Clicked:', url)}
 * />
 * ```
 */
export const RichMarkdown = memo<RichMarkdownProps>(function RichMarkdown({
  content,
  className,
  theme = 'light',
  allowHTML = false,
  components: customComponents,
  onLinkClick,
  onImageClick,
}) {
  // Configure rehype plugins - must be before any conditional returns
  const rehypePlugins = useMemo(() => {
    const plugins: any[] = [
      // Syntax highlighting for code blocks
      rehypeHighlight,
    ];

    // Add sanitization unless explicitly allowed
    if (!allowHTML) {
      plugins.push([
        rehypeSanitize,
        {
          ...defaultSchema,
          // Allow additional safe attributes
          attributes: {
            ...defaultSchema.attributes,
            code: [...(defaultSchema.attributes?.code || []), 'className'],
          },
        },
      ]);
    }

    return plugins;
  }, [allowHTML]);

  // Configure remark plugins
  const remarkPlugins = useMemo(() => [
    // GitHub Flavored Markdown
    remarkGfm,
  ], []);

  // Custom component overrides
  const componentOverrides: Partial<Components> = useMemo(
    () => ({
      // External links open in new tab
      a: ({ href, children, ...props }) => {
        const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
        const isInternal = href?.startsWith('/');

        const handleClick = (e: React.MouseEvent) => {
          if (onLinkClick && href) {
            e.preventDefault();
            onLinkClick(href);
          }
        };

        return (
          <a
            href={href}
            onClick={handleClick}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            {...props}
          >
            {children}
          </a>
        );
      },

      // Lazy-load images with click handler
      img: ({ src, alt, ...props }) => {
        const handleClick = () => {
          if (onImageClick && src) {
            onImageClick(src);
          }
        };

        return (
          <img
            src={src}
            alt={alt || ''}
            loading="lazy"
            onClick={handleClick}
            className={cn('cursor-pointer', onImageClick && 'hover:opacity-80 transition-opacity')}
            {...props}
          />
        );
      },

      // Add language class to code blocks for syntax highlighting
      code: ({ inline, className, children, ...props }: any) => {
        return inline ? (
          <code className={cn('px-1.5 py-0.5 rounded bg-muted text-sm font-mono', className)} {...props}>
            {children}
          </code>
        ) : (
          <code className={cn('block p-4 rounded-lg overflow-x-auto text-sm font-mono', className)} {...props}>
            {children}
          </code>
        );
      },

      // Style headings
      h1: ({ children, ...props }) => (
        <h1 className="text-3xl font-bold mt-6 mb-4 first:mt-0" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2 className="text-2xl font-semibold mt-5 mb-3 first:mt-0" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3 className="text-xl font-semibold mt-4 mb-2 first:mt-0" {...props}>
          {children}
        </h3>
      ),
      h4: ({ children, ...props }) => (
        <h4 className="text-lg font-medium mt-3 mb-2 first:mt-0" {...props}>
          {children}
        </h4>
      ),
      h5: ({ children, ...props }) => (
        <h5 className="text-base font-medium mt-3 mb-2 first:mt-0" {...props}>
          {children}
        </h5>
      ),
      h6: ({ children, ...props }) => (
        <h6 className="text-sm font-medium mt-3 mb-2 first:mt-0" {...props}>
          {children}
        </h6>
      ),

      // Style blockquotes
      blockquote: ({ children, ...props }) => (
        <blockquote
          className="border-l-4 border-primary pl-4 py-2 my-4 italic text-muted-foreground"
          {...props}
        >
          {children}
        </blockquote>
      ),

      // Style lists
      ul: ({ children, ...props }) => (
        <ul className="list-disc list-inside my-4 space-y-2" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }) => (
        <ol className="list-decimal list-inside my-4 space-y-2" {...props}>
          {children}
        </ol>
      ),
      li: ({ children, ...props }) => (
        <li className="ml-4" {...props}>
          {children}
        </li>
      ),

      // Style tables (GFM)
      table: ({ children, ...props }) => (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full divide-y divide-border border border-border rounded-lg" {...props}>
            {children}
          </table>
        </div>
      ),
      thead: ({ children, ...props }) => (
        <thead className="bg-muted" {...props}>
          {children}
        </thead>
      ),
      tbody: ({ children, ...props }) => (
        <tbody className="divide-y divide-border bg-background" {...props}>
          {children}
        </tbody>
      ),
      tr: ({ children, ...props }) => (
        <tr {...props}>
          {children}
        </tr>
      ),
      th: ({ children, ...props }) => (
        <th className="px-4 py-3 text-left text-sm font-semibold" {...props}>
          {children}
        </th>
      ),
      td: ({ children, ...props }) => (
        <td className="px-4 py-3 text-sm" {...props}>
          {children}
        </td>
      ),

      // Style horizontal rules
      hr: (props) => <hr className="my-6 border-border" {...props} />,

      // Style paragraphs
      p: ({ children, ...props }) => (
        <p className="my-3 leading-7 first:mt-0 last:mb-0" {...props}>
          {children}
        </p>
      ),

      // Merge with custom components
      ...customComponents,
    }),
    [onLinkClick, onImageClick, customComponents]
  );

  // Handle empty or null content - must be after all hooks
  if (!content) {
    return null;
  }

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none',
        theme === 'dark' && 'prose-invert',
        'prose-headings:scroll-mt-20',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-code:text-sm prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-muted prose-pre:border prose-pre:border-border',
        'prose-img:rounded-lg prose-img:shadow-md',
        'prose-table:border prose-table:border-border',
        'prose-th:bg-muted',
        'prose-strong:font-semibold',
        'prose-em:italic',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={componentOverrides}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
