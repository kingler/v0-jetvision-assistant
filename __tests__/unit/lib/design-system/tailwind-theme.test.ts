import { describe, it, expect } from 'vitest';
import { getTailwindTheme } from '@/lib/design-system';
import { semanticColors, spacing, radii, shadows, zIndex, brandColors } from '@/lib/design-system/tokens';

describe('Tailwind Theme Configuration', () => {
  describe('getTailwindTheme', () => {
    it('exports a function to generate Tailwind theme', () => {
      expect(typeof getTailwindTheme).toBe('function');
    });

    it('returns a valid Tailwind theme object with colors', () => {
      const theme = getTailwindTheme();

      expect(theme).toHaveProperty('colors');
      expect(theme.colors).toBeDefined();
    });

    it('maps sky blue brand colors to Tailwind format', () => {
      const theme = getTailwindTheme();

      expect(theme.colors).toHaveProperty('sky-blue');
      const skyBlue = theme.colors['sky-blue'] as Record<string, string>;
      expect(skyBlue['500']).toBe(brandColors.skyBlue[500]);
    });

    it('maps semantic colors (success, warning, error, info)', () => {
      const theme = getTailwindTheme();

      expect(theme.colors).toHaveProperty('success');
      expect(theme.colors).toHaveProperty('warning');
      expect(theme.colors).toHaveProperty('error');
      expect(theme.colors).toHaveProperty('info');

      // Success should have DEFAULT, light, dark, bg, and border variants
      const success = theme.colors.success as Record<string, string>;
      expect(success).toHaveProperty('DEFAULT');
      expect(success.DEFAULT).toBe(semanticColors.success.light);
    });

    it('includes spacing scale from tokens', () => {
      const theme = getTailwindTheme();

      expect(theme).toHaveProperty('spacing');
      expect(theme.spacing).toHaveProperty('0');
      expect(theme.spacing).toHaveProperty('1');
      expect(theme.spacing).toHaveProperty('6');
      expect(theme.spacing['6']).toBe(spacing[6]);
    });

    it('includes border radius from tokens', () => {
      const theme = getTailwindTheme();

      expect(theme).toHaveProperty('borderRadius');
      expect(theme.borderRadius).toHaveProperty('sm');
      expect(theme.borderRadius).toHaveProperty('lg');
      expect(theme.borderRadius).toHaveProperty('full');
      expect(theme.borderRadius.lg).toBe(radii.lg);
    });

    it('includes box shadows from tokens', () => {
      const theme = getTailwindTheme();

      expect(theme).toHaveProperty('boxShadow');
      expect(theme.boxShadow).toHaveProperty('sm');
      expect(theme.boxShadow).toHaveProperty('md');
      expect(theme.boxShadow).toHaveProperty('lg');
      expect(theme.boxShadow).toHaveProperty('primary');
      expect(theme.boxShadow.md).toBe(shadows.md);
    });

    it('includes z-index layers from tokens', () => {
      const theme = getTailwindTheme();

      expect(theme).toHaveProperty('zIndex');
      expect(theme.zIndex).toHaveProperty('dropdown');
      expect(theme.zIndex).toHaveProperty('modal');
      expect(theme.zIndex).toHaveProperty('tooltip');
      expect(theme.zIndex.modal).toBe(String(zIndex.modal));
    });
  });

  describe('Color value accuracy', () => {
    it('sky blue 500 is the correct hex value', () => {
      const theme = getTailwindTheme();
      const skyBlue = theme.colors['sky-blue'] as Record<string, string>;
      expect(skyBlue['500']).toBe('#00a8e8');
    });
  });
});
