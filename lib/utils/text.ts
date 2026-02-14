/**
 * Text Utilities
 *
 * Shared text processing functions used across the application.
 *
 * @module lib/utils/text
 */

/**
 * Convert markdown-formatted text to plain text.
 *
 * Strips bold, italic, headers, code blocks, inline code, links,
 * and converts bullet lists to Unicode bullets.
 *
 * @param text - Markdown-formatted text
 * @returns Plain text with markdown formatting removed
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    .replace(/^[\s]*(\d+)\.\s+/gm, '$1. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
