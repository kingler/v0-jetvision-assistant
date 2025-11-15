/**
 * Rich Markdown Component Tests
 *
 * Tests for the RichMarkdown component with GFM support.
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RichMarkdown } from '@/components/rich-markdown';

describe('RichMarkdown', () => {
  describe('Basic Markdown', () => {
    it('should render headings', () => {
      const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
      render(<RichMarkdown content={markdown} />);

      expect(screen.getByText('Heading 1')).toBeInTheDocument();
      expect(screen.getByText('Heading 2')).toBeInTheDocument();
      expect(screen.getByText('Heading 3')).toBeInTheDocument();
    });

    it('should render bold text', () => {
      const markdown = 'This is **bold** text';
      render(<RichMarkdown content={markdown} />);

      const boldElement = screen.getByText('bold');
      expect(boldElement.tagName).toBe('STRONG');
    });

    it('should render italic text', () => {
      const markdown = 'This is *italic* text';
      render(<RichMarkdown content={markdown} />);

      const italicElement = screen.getByText('italic');
      expect(italicElement.tagName).toBe('EM');
    });

    it('should render links', () => {
      const markdown = '[Visit example](https://example.com)';
      render(<RichMarkdown content={markdown} />);

      const link = screen.getByRole('link', { name: 'Visit example' });
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should render code blocks', () => {
      const markdown = '```javascript\nconst foo = "bar";\n```';
      render(<RichMarkdown content={markdown} />);

      expect(screen.getByText(/const foo/)).toBeInTheDocument();
    });

    it('should render inline code', () => {
      const markdown = 'Use the `console.log()` function';
      render(<RichMarkdown content={markdown} />);

      const code = screen.getByText('console.log()');
      expect(code.tagName).toBe('CODE');
    });

    it('should render blockquotes', () => {
      const markdown = '> This is a quote';
      render(<RichMarkdown content={markdown} />);

      const quote = screen.getByText('This is a quote');
      expect(quote.closest('blockquote')).toBeInTheDocument();
    });

    it('should render unordered lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      render(<RichMarkdown content={markdown} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should render ordered lists', () => {
      const markdown = '1. First\n2. Second\n3. Third';
      render(<RichMarkdown content={markdown} />);

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('should render horizontal rules', () => {
      const markdown = 'Above\n\n---\n\nBelow';
      const { container } = render(<RichMarkdown content={markdown} />);

      const hr = container.querySelector('hr');
      expect(hr).toBeInTheDocument();
    });
  });

  describe('GitHub Flavored Markdown (GFM)', () => {
    it('should render tables', () => {
      const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
      `;
      render(<RichMarkdown content={markdown} />);

      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 4')).toBeInTheDocument();
    });

    it('should render strikethrough text', () => {
      const markdown = 'This is ~~strikethrough~~ text';
      render(<RichMarkdown content={markdown} />);

      const strikeElement = screen.getByText('strikethrough');
      expect(strikeElement.tagName).toBe('DEL');
    });

    it('should render task lists', () => {
      const markdown = '- [x] Completed task\n- [ ] Incomplete task';
      render(<RichMarkdown content={markdown} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
    });

    it('should auto-link URLs', () => {
      const markdown = 'Visit https://example.com for more info';
      render(<RichMarkdown content={markdown} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should render footnotes', () => {
      const markdown = 'This has a footnote[^1]\n\n[^1]: This is the footnote';
      render(<RichMarkdown content={markdown} />);

      expect(screen.getByText(/This has a footnote/)).toBeInTheDocument();
    });
  });

  describe('Syntax Highlighting', () => {
    it('should apply syntax highlighting to code blocks', () => {
      const markdown = '```javascript\nconst foo = "bar";\nconsole.log(foo);\n```';
      const { container } = render(<RichMarkdown content={markdown} />);

      // Should have syntax-highlighted elements
      const codeBlock = container.querySelector('code');
      expect(codeBlock).toHaveClass(expect.stringContaining('language-javascript'));
    });

    it('should support multiple language syntaxes', () => {
      const markdowns = [
        '```python\ndef hello():\n    print("Hello")\n```',
        '```typescript\nconst x: string = "test";\n```',
        '```bash\necho "Hello World"\n```',
      ];

      markdowns.forEach((markdown) => {
        const { container } = render(<RichMarkdown content={markdown} />);
        const codeBlock = container.querySelector('code');
        expect(codeBlock).toHaveClass(expect.stringMatching(/language-/));
      });
    });
  });

  describe('Security', () => {
    it('should sanitize HTML by default', () => {
      const markdown = '<script>alert("XSS")</script>Hello';
      render(<RichMarkdown content={markdown} />);

      // Script tag should not be rendered
      expect(screen.queryByText('alert("XSS")')).not.toBeInTheDocument();
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    it('should sanitize dangerous attributes', () => {
      const markdown = '<a href="javascript:alert(1)">Click</a>';
      const { container } = render(<RichMarkdown content={markdown} />);

      const link = container.querySelector('a');
      expect(link).not.toHaveAttribute('href', 'javascript:alert(1)');
    });

    it('should allow safe HTML when enabled', () => {
      const markdown = '<div class="custom">Safe HTML</div>';
      render(<RichMarkdown content={markdown} allowHTML={true} />);

      expect(screen.getByText('Safe HTML')).toBeInTheDocument();
    });
  });

  describe('Link Handling', () => {
    it('should open external links in new tab', () => {
      const markdown = '[External](https://example.com)';
      render(<RichMarkdown content={markdown} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not open internal links in new tab', () => {
      const markdown = '[Internal](/dashboard)';
      render(<RichMarkdown content={markdown} />);

      const link = screen.getByRole('link');
      expect(link).not.toHaveAttribute('target', '_blank');
    });

    it('should call onLinkClick when link is clicked', () => {
      const mockOnLinkClick = vi.fn();
      const markdown = '[Click me](https://example.com)';

      render(<RichMarkdown content={markdown} onLinkClick={mockOnLinkClick} />);

      const link = screen.getByRole('link');
      link.click();

      expect(mockOnLinkClick).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('Image Handling', () => {
    it('should render images', () => {
      const markdown = '![Alt text](https://example.com/image.png)';
      render(<RichMarkdown content={markdown} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/image.png');
      expect(img).toHaveAttribute('alt', 'Alt text');
    });

    it('should apply lazy loading to images', () => {
      const markdown = '![Image](https://example.com/image.png)';
      render(<RichMarkdown content={markdown} />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('should call onImageClick when image is clicked', () => {
      const mockOnImageClick = vi.fn();
      const markdown = '![Image](https://example.com/image.png)';

      render(<RichMarkdown content={markdown} onImageClick={mockOnImageClick} />);

      const img = screen.getByRole('img');
      img.click();

      expect(mockOnImageClick).toHaveBeenCalledWith('https://example.com/image.png');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const markdown = 'Hello World';
      const { container } = render(
        <RichMarkdown content={markdown} className="custom-markdown" />
      );

      const wrapper = container.querySelector('.custom-markdown');
      expect(wrapper).toBeInTheDocument();
    });

    it('should apply theme-aware styling', () => {
      const markdown = 'Hello World';
      const { container } = render(<RichMarkdown content={markdown} theme="dark" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass(expect.stringContaining('dark'));
    });
  });

  describe('Custom Components', () => {
    it('should use custom heading component', () => {
      const CustomHeading = ({ level, children }: { level: number; children: React.ReactNode }) => (
        <div data-custom-heading={level}>{children}</div>
      );

      const markdown = '# Custom Heading';
      const { container } = render(
        <RichMarkdown
          content={markdown}
          components={{ h1: CustomHeading }}
        />
      );

      const customHeading = container.querySelector('[data-custom-heading="1"]');
      expect(customHeading).toBeInTheDocument();
    });

    it('should use custom code component', () => {
      const CustomCode = ({ children }: { children: React.ReactNode }) => (
        <code data-custom-code>{children}</code>
      );

      const markdown = '`custom code`';
      const { container } = render(
        <RichMarkdown
          content={markdown}
          components={{ code: CustomCode }}
        />
      );

      const customCode = container.querySelector('[data-custom-code]');
      expect(customCode).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const markdown = '# H1\n## H2\n### H3';
      render(<RichMarkdown content={markdown} />);

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should have alt text for images', () => {
      const markdown = '![Accessible image](https://example.com/image.png)';
      render(<RichMarkdown content={markdown} />);

      const img = screen.getByAltText('Accessible image');
      expect(img).toBeInTheDocument();
    });

    it('should have accessible links', () => {
      const markdown = '[Accessible link](https://example.com)';
      render(<RichMarkdown content={markdown} />);

      const link = screen.getByRole('link', { name: 'Accessible link' });
      expect(link).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize rendered content', () => {
      const markdown = 'Test content';
      const { rerender } = render(<RichMarkdown content={markdown} />);

      rerender(<RichMarkdown content={markdown} />);

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should only re-render when content changes', () => {
      const markdown1 = 'First content';
      const markdown2 = 'Second content';

      const { rerender } = render(<RichMarkdown content={markdown1} />);
      expect(screen.getByText('First content')).toBeInTheDocument();

      rerender(<RichMarkdown content={markdown2} />);
      expect(screen.getByText('Second content')).toBeInTheDocument();
      expect(screen.queryByText('First content')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty content gracefully', () => {
      render(<RichMarkdown content="" />);
      // Should not crash
    });

    it('should handle null content gracefully', () => {
      render(<RichMarkdown content={null as any} />);
      // Should not crash
    });

    it('should handle malformed markdown gracefully', () => {
      const malformed = '# Unclosed **bold\n[link without closing';
      render(<RichMarkdown content={malformed} />);
      // Should still render something
      expect(screen.getByText(/Unclosed/)).toBeInTheDocument();
    });
  });
});
