import { describe, it, expect } from 'vitest';
import { getTailwindTheme } from '@/lib/design-system';
import { brandColors, semanticColors } from '@/lib/design-system/tokens';

/**
 * CSS Integration Tests
 *
 * These tests verify that the design system tokens are correctly
 * integrated with Tailwind CSS and CSS variables.
 */

describe('CSS Integration with Design System', () => {
  describe('Tailwind theme generation', () => {
    it('generates colors that can be used with CSS variable fallbacks', () => {
      const theme = getTailwindTheme();

      // Verify the generated color values are valid hex codes
      const skyBlue = theme.colors['sky-blue'] as Record<string, string>;
      expect(skyBlue['500']).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('maps semantic colors with DEFAULT value for Tailwind shorthand', () => {
      const theme = getTailwindTheme();

      // bg-success should work (uses DEFAULT)
      expect(theme.colors.success).toHaveProperty('DEFAULT');
      expect(theme.colors.warning).toHaveProperty('DEFAULT');
      expect(theme.colors.error).toHaveProperty('DEFAULT');
      expect(theme.colors.info).toHaveProperty('DEFAULT');
    });

    it('provides light and dark variants for semantic colors', () => {
      const theme = getTailwindTheme();
      const success = theme.colors.success as Record<string, string>;

      // text-success-light, text-success-dark should work
      expect(success).toHaveProperty('light');
      expect(success).toHaveProperty('dark');
      expect(success.light).toBe(semanticColors.success.light);
      expect(success.dark).toBe(semanticColors.success.dark);
    });

    it('provides background variants for semantic colors', () => {
      const theme = getTailwindTheme();
      const success = theme.colors.success as Record<string, string>;

      // bg-success-bg should work
      expect(success).toHaveProperty('bg');
      expect(success).toHaveProperty('bg-dark');
      expect(success.bg).toBe(semanticColors.success.bg.light);
    });

    it('provides border variants for semantic colors', () => {
      const theme = getTailwindTheme();
      const success = theme.colors.success as Record<string, string>;

      // border-success-border should work
      expect(success).toHaveProperty('border');
      expect(success).toHaveProperty('border-dark');
      expect(success.border).toBe(semanticColors.success.border.light);
    });
  });

  describe('Brand color consistency', () => {
    it('sky blue primary matches CSS variable equivalent', () => {
      const theme = getTailwindTheme();
      const skyBlue = theme.colors['sky-blue'] as Record<string, string>;
      // The CSS variable --primary uses Sky Blue 500
      expect(skyBlue['500']).toBe(brandColors.skyBlue[500]);
      expect(brandColors.skyBlue[500]).toBe('#00a8e8');
    });
  });

  describe('Neutral color scale', () => {
    it('provides full neutral color scale', () => {
      const theme = getTailwindTheme();
      const neutral = theme.colors.neutral as Record<string, string>;

      expect(neutral).toHaveProperty('50');
      expect(neutral).toHaveProperty('100');
      expect(neutral).toHaveProperty('200');
      expect(neutral).toHaveProperty('300');
      expect(neutral).toHaveProperty('400');
      expect(neutral).toHaveProperty('500');
      expect(neutral).toHaveProperty('600');
      expect(neutral).toHaveProperty('700');
      expect(neutral).toHaveProperty('800');
      expect(neutral).toHaveProperty('900');
    });

    it('neutral colors are valid hex values', () => {
      const theme = getTailwindTheme();
      const neutral = theme.colors.neutral as Record<string, string>;

      Object.values(neutral).forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('Theme structure compatibility', () => {
    it('theme object has all required Tailwind keys', () => {
      const theme = getTailwindTheme();

      expect(theme).toHaveProperty('colors');
      expect(theme).toHaveProperty('spacing');
      expect(theme).toHaveProperty('borderRadius');
      expect(theme).toHaveProperty('boxShadow');
      expect(theme).toHaveProperty('zIndex');
    });

    it('spacing values are CSS-compatible strings', () => {
      const theme = getTailwindTheme();

      Object.values(theme.spacing).forEach((value) => {
        // Should be rem or px values
        expect(value).toMatch(/^(\d+(\.\d+)?(rem|px)|0)$/);
      });
    });

    it('border radius values are CSS-compatible strings', () => {
      const theme = getTailwindTheme();

      Object.values(theme.borderRadius).forEach((value) => {
        // Should be rem, px, calc expressions, or special values like 9999px
        expect(value).toMatch(/^(\d+(\.\d+)?(rem|px)|9999px|0|calc\(.+\))$/);
      });
    });

    it('z-index values are numeric strings', () => {
      const theme = getTailwindTheme();

      Object.values(theme.zIndex).forEach((value) => {
        expect(value).toMatch(/^\d+$/);
        expect(parseInt(value, 10)).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
