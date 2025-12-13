import { describe, it, expect } from 'vitest';
import { getTailwindTheme } from '@/lib/design-system';
import { brandColors, semanticColors, spacing, radii, shadows, zIndex } from '@/lib/design-system/tokens';

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

    it('maps aviation blue brand colors to Tailwind format', () => {
      const theme = getTailwindTheme();

      // Should have aviation-blue color family
      expect(theme.colors).toHaveProperty('aviation-blue');
      expect(theme.colors['aviation-blue']).toHaveProperty('50');
      expect(theme.colors['aviation-blue']).toHaveProperty('500');
      expect(theme.colors['aviation-blue']['500']).toBe(brandColors.aviationBlue[500]);
    });

    it('maps sky blue brand colors to Tailwind format', () => {
      const theme = getTailwindTheme();

      expect(theme.colors).toHaveProperty('sky-blue');
      expect(theme.colors['sky-blue']['500']).toBe(brandColors.skyBlue[500]);
    });

    it('maps sunset orange brand colors to Tailwind format', () => {
      const theme = getTailwindTheme();

      expect(theme.colors).toHaveProperty('sunset-orange');
      expect(theme.colors['sunset-orange']['500']).toBe(brandColors.sunsetOrange[500]);
    });

    it('maps semantic colors (success, warning, error, info)', () => {
      const theme = getTailwindTheme();

      expect(theme.colors).toHaveProperty('success');
      expect(theme.colors).toHaveProperty('warning');
      expect(theme.colors).toHaveProperty('error');
      expect(theme.colors).toHaveProperty('info');

      // Success should have DEFAULT, light, dark, bg, and border variants
      expect(theme.colors.success).toHaveProperty('DEFAULT');
      expect(theme.colors.success.DEFAULT).toBe(semanticColors.success.light);
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
    it('aviation blue 500 is the correct hex value', () => {
      const theme = getTailwindTheme();
      expect(theme.colors['aviation-blue']['500']).toBe('#0066cc');
    });

    it('sky blue 500 is the correct hex value', () => {
      const theme = getTailwindTheme();
      expect(theme.colors['sky-blue']['500']).toBe('#00a8e8');
    });

    it('sunset orange 500 is the correct hex value', () => {
      const theme = getTailwindTheme();
      expect(theme.colors['sunset-orange']['500']).toBe('#ff6b35');
    });
  });
});
