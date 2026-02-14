import { describe, it, expect } from 'vitest';
import { stripMarkdown } from '@/lib/utils/text';

describe('stripMarkdown', () => {
  it('strips bold markers', () => {
    expect(stripMarkdown('**bold text**')).toBe('bold text');
  });

  it('strips italic markers', () => {
    expect(stripMarkdown('*italic*')).toBe('italic');
  });

  it('strips underline bold markers', () => {
    expect(stripMarkdown('__bold__')).toBe('bold');
  });

  it('strips underline italic markers', () => {
    expect(stripMarkdown('_italic_')).toBe('italic');
  });

  it('strips headers', () => {
    expect(stripMarkdown('## Header')).toBe('Header');
  });

  it('strips code blocks', () => {
    expect(stripMarkdown('```\ncode\n```')).toBe('');
  });

  it('strips inline code', () => {
    expect(stripMarkdown('use `fn()`')).toBe('use fn()');
  });

  it('strips links, keeps text', () => {
    expect(stripMarkdown('[click](http://x.com)')).toBe('click');
  });

  it('converts bullet lists', () => {
    expect(stripMarkdown('- item')).toBe('• item');
  });

  it('preserves numbered lists', () => {
    expect(stripMarkdown('1. first')).toBe('1. first');
  });

  it('collapses excess newlines', () => {
    expect(stripMarkdown('a\n\n\n\nb')).toBe('a\n\nb');
  });

  it('returns empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(stripMarkdown('  hello  ')).toBe('hello');
  });
});
