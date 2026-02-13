/**
 * @vitest-environment jsdom
 */

/**
 * Input Component Tests
 *
 * Verifies forwardRef support (ONEK-226) and variant rendering.
 *
 * @see components/ui/input.tsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  // ---------------------------------------------------------------------------
  // forwardRef (ONEK-226)
  // ---------------------------------------------------------------------------

  describe('forwardRef support', () => {
    it('forwards ref to the underlying input element', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} data-testid="input" />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current).toBe(screen.getByTestId('input'));
    });

    it('has displayName set to "Input"', () => {
      expect(Input.displayName).toBe('Input');
    });
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders an input element with data-slot="input"', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');

      expect(input.tagName).toBe('INPUT');
      expect(input).toHaveAttribute('data-slot', 'input');
    });

    it('passes type prop to input', () => {
      render(<Input type="email" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
    });

    it('merges custom className with variants', () => {
      render(<Input className="custom-class" data-testid="input" />);
      expect(screen.getByTestId('input')).toHaveClass('custom-class');
    });

    it('forwards native input props (placeholder, disabled, etc.)', () => {
      render(
        <Input
          placeholder="Enter email"
          disabled
          data-testid="input"
        />
      );
      const input = screen.getByTestId('input');

      expect(input).toHaveAttribute('placeholder', 'Enter email');
      expect(input).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // Size variants
  // ---------------------------------------------------------------------------

  describe('size variants', () => {
    it('applies default size classes when no size prop', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');

      expect(input.className).toContain('h-9');
    });

    it('applies sm size classes', () => {
      render(<Input size="sm" data-testid="input" />);
      const input = screen.getByTestId('input');

      expect(input.className).toContain('h-8');
    });

    it('applies lg size classes', () => {
      render(<Input size="lg" data-testid="input" />);
      const input = screen.getByTestId('input');

      expect(input.className).toContain('h-10');
    });
  });
});
