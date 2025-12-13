import { describe, it, expect } from 'vitest';

/**
 * Tailwind Helpers Tests
 *
 * Tests for utility functions that generate Tailwind class names
 * from design system tokens.
 */

describe('Tailwind Helper Utilities', () => {
  describe('getColorClass', () => {
    it('generates correct Tailwind class for brand colors', async () => {
      const { getColorClass } = await import('@/lib/design-system/tailwind-helpers');

      expect(getColorClass('aviationBlue', 500, 'bg')).toBe('bg-aviation-blue-500');
      expect(getColorClass('skyBlue', 300, 'text')).toBe('text-sky-blue-300');
      expect(getColorClass('sunsetOrange', 600, 'border')).toBe('border-sunset-orange-600');
    });

    it('generates correct Tailwind class for neutral colors', async () => {
      const { getColorClass } = await import('@/lib/design-system/tailwind-helpers');

      expect(getColorClass('neutral', 100, 'bg')).toBe('bg-neutral-100');
      expect(getColorClass('neutral', 700, 'text')).toBe('text-neutral-700');
    });

    it('generates semantic color classes', async () => {
      const { getSemanticColorClass } = await import('@/lib/design-system/tailwind-helpers');

      expect(getSemanticColorClass('success', 'bg')).toBe('bg-success');
      expect(getSemanticColorClass('error', 'text')).toBe('text-error');
      expect(getSemanticColorClass('warning', 'border')).toBe('border-warning');
      expect(getSemanticColorClass('info', 'bg')).toBe('bg-info');
    });

    it('generates semantic color variant classes', async () => {
      const { getSemanticColorClass } = await import('@/lib/design-system/tailwind-helpers');

      expect(getSemanticColorClass('success', 'bg', 'light')).toBe('bg-success-bg');
      expect(getSemanticColorClass('error', 'bg', 'dark')).toBe('bg-error-bg-dark');
      expect(getSemanticColorClass('warning', 'border', 'light')).toBe('border-warning-border');
    });
  });

  describe('getSpacingClass', () => {
    it('generates padding classes', async () => {
      const { getSpacingClass } = await import('@/lib/design-system/tailwind-helpers');

      expect(getSpacingClass(4, 'p')).toBe('p-4');
      expect(getSpacingClass(2, 'px')).toBe('px-2');
      expect(getSpacingClass(6, 'py')).toBe('py-6');
      expect(getSpacingClass(3, 'pt')).toBe('pt-3');
    });

    it('generates margin classes', async () => {
      const { getSpacingClass } = await import('@/lib/design-system/tailwind-helpers');

      expect(getSpacingClass(4, 'm')).toBe('m-4');
      expect(getSpacingClass(2, 'mx')).toBe('mx-2');
      expect(getSpacingClass(6, 'my')).toBe('my-6');
      expect(getSpacingClass(8, 'mb')).toBe('mb-8');
    });

    it('generates gap classes', async () => {
      const { getSpacingClass } = await import('@/lib/design-system/tailwind-helpers');

      expect(getSpacingClass(4, 'gap')).toBe('gap-4');
      expect(getSpacingClass(2, 'gap-x')).toBe('gap-x-2');
      expect(getSpacingClass(6, 'gap-y')).toBe('gap-y-6');
    });
  });

  describe('getTypographyClasses', () => {
    it('returns combined typography classes for text sizes', async () => {
      const { getTypographyClasses } = await import('@/lib/design-system/tailwind-helpers');

      const h1Classes = getTypographyClasses('h1');
      expect(h1Classes).toContain('text-');
      expect(h1Classes).toContain('font-');
    });

    it('includes optional weight and line-height', async () => {
      const { getTypographyClasses } = await import('@/lib/design-system/tailwind-helpers');

      const customClasses = getTypographyClasses('body', 'semibold', 'relaxed');
      expect(customClasses).toContain('font-semibold');
      expect(customClasses).toContain('leading-relaxed');
    });
  });

  describe('getShadowClass', () => {
    it('generates shadow classes', async () => {
      const { getShadowClass } = await import('@/lib/design-system/tailwind-helpers');

      expect(getShadowClass('sm')).toBe('shadow-sm');
      expect(getShadowClass('md')).toBe('shadow-md');
      expect(getShadowClass('lg')).toBe('shadow-lg');
      expect(getShadowClass('primary')).toBe('shadow-primary');
    });
  });

  describe('getRadiusClass', () => {
    it('generates border radius classes', async () => {
      const { getRadiusClass } = await import('@/lib/design-system/tailwind-helpers');

      expect(getRadiusClass('sm')).toBe('rounded-sm');
      expect(getRadiusClass('md')).toBe('rounded-md');
      expect(getRadiusClass('lg')).toBe('rounded-lg');
      expect(getRadiusClass('full')).toBe('rounded-full');
    });
  });

  describe('getZIndexClass', () => {
    it('generates z-index classes', async () => {
      const { getZIndexClass } = await import('@/lib/design-system/tailwind-helpers');

      expect(getZIndexClass('dropdown')).toBe('z-dropdown');
      expect(getZIndexClass('modal')).toBe('z-modal');
      expect(getZIndexClass('tooltip')).toBe('z-tooltip');
    });
  });

  describe('cn helper', () => {
    it('merges class names correctly', async () => {
      const { cn } = await import('@/lib/design-system/tailwind-helpers');

      expect(cn('p-4', 'bg-red-500')).toBe('p-4 bg-red-500');
      expect(cn('p-4', undefined, 'bg-red-500')).toBe('p-4 bg-red-500');
      expect(cn('p-4', false && 'hidden', 'bg-red-500')).toBe('p-4 bg-red-500');
    });

    it('handles conditional classes', async () => {
      const { cn } = await import('@/lib/design-system/tailwind-helpers');
      const isActive = true;

      expect(cn('btn', isActive && 'btn-active')).toBe('btn btn-active');
      expect(cn('btn', !isActive && 'btn-inactive')).toBe('btn');
    });

    it('handles conflicting Tailwind classes (last wins)', async () => {
      const { cn } = await import('@/lib/design-system/tailwind-helpers');

      // With tailwind-merge, p-4 should override p-2
      expect(cn('p-2', 'p-4')).toBe('p-4');
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });
  });

  describe('buttonVariants helper', () => {
    it('generates button class combinations', async () => {
      const { buttonClasses } = await import('@/lib/design-system/tailwind-helpers');

      const primaryBtn = buttonClasses({ variant: 'primary', size: 'md' });
      expect(primaryBtn).toContain('bg-');
      expect(primaryBtn).toContain('px-');
      expect(primaryBtn).toContain('py-');
    });

    it('supports different button sizes', async () => {
      const { buttonClasses } = await import('@/lib/design-system/tailwind-helpers');

      const smBtn = buttonClasses({ size: 'sm' });
      const lgBtn = buttonClasses({ size: 'lg' });

      expect(smBtn).not.toBe(lgBtn);
    });
  });
});
