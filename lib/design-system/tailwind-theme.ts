/**
 * Tailwind Theme Generator
 *
 * Generates a Tailwind CSS theme configuration from design system tokens.
 * This enables using design tokens as Tailwind utility classes.
 *
 * @example
 * // In tailwind.config.ts
 * import { getTailwindTheme } from '@/lib/design-system'
 * export default {
 *   theme: {
 *     extend: getTailwindTheme()
 *   }
 * }
 */

import {
  brandColors,
  semanticColors,
  spacing,
  radii,
  shadows,
  zIndex,
  fontSizes,
  fontWeights,
  lineHeights,
} from './tokens';

/**
 * Tailwind theme object type
 * Uses a more permissive type that's compatible with Tailwind's Config['theme']['extend']
 */
export type TailwindTheme = {
  colors: Record<string, Record<string, string> | string>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  boxShadow: Record<string, string>;
  zIndex: Record<string, string>;
  fontSize: Record<string, string | [string, { lineHeight: string }]>;
  fontWeight: Record<string, number>;
  lineHeight: Record<string, number>;
}

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Generate Tailwind theme configuration from design tokens
 *
 * @returns Tailwind theme object ready to be used in tailwind.config.ts
 */
export function getTailwindTheme(): TailwindTheme {
  return {
    colors: {
      // Brand colors - Aviation Blue
      'aviation-blue': Object.entries(brandColors.aviationBlue).reduce(
        (acc, [shade, value]) => {
          acc[shade] = value;
          return acc;
        },
        {} as Record<string, string>
      ),

      // Brand colors - Sky Blue
      'sky-blue': Object.entries(brandColors.skyBlue).reduce(
        (acc, [shade, value]) => {
          acc[shade] = value;
          return acc;
        },
        {} as Record<string, string>
      ),

      // Brand colors - Sunset Orange
      'sunset-orange': Object.entries(brandColors.sunsetOrange).reduce(
        (acc, [shade, value]) => {
          acc[shade] = value;
          return acc;
        },
        {} as Record<string, string>
      ),

      // Brand colors - Neutral
      neutral: Object.entries(brandColors.neutral).reduce(
        (acc, [shade, value]) => {
          acc[shade] = value;
          return acc;
        },
        {} as Record<string, string>
      ),

      // Semantic colors
      success: {
        DEFAULT: semanticColors.success.light,
        light: semanticColors.success.light,
        dark: semanticColors.success.dark,
        bg: semanticColors.success.bg.light,
        'bg-dark': semanticColors.success.bg.dark,
        border: semanticColors.success.border.light,
        'border-dark': semanticColors.success.border.dark,
      },

      warning: {
        DEFAULT: semanticColors.warning.light,
        light: semanticColors.warning.light,
        dark: semanticColors.warning.dark,
        bg: semanticColors.warning.bg.light,
        'bg-dark': semanticColors.warning.bg.dark,
        border: semanticColors.warning.border.light,
        'border-dark': semanticColors.warning.border.dark,
      },

      error: {
        DEFAULT: semanticColors.error.light,
        light: semanticColors.error.light,
        dark: semanticColors.error.dark,
        bg: semanticColors.error.bg.light,
        'bg-dark': semanticColors.error.bg.dark,
        border: semanticColors.error.border.light,
        'border-dark': semanticColors.error.border.dark,
      },

      info: {
        DEFAULT: semanticColors.info.light,
        light: semanticColors.info.light,
        dark: semanticColors.info.dark,
        bg: semanticColors.info.bg.light,
        'bg-dark': semanticColors.info.bg.dark,
        border: semanticColors.info.border.light,
        'border-dark': semanticColors.info.border.dark,
      },
    },

    // Spacing scale from tokens
    spacing: Object.entries(spacing).reduce(
      (acc, [key, value]) => {
        acc[String(key)] = value;
        return acc;
      },
      {} as Record<string, string>
    ),

    // Border radius from tokens
    borderRadius: {
      none: radii.none,
      sm: radii.sm,
      md: radii.md,
      lg: radii.lg,
      xl: radii.xl,
      '2xl': radii['2xl'],
      '3xl': radii['3xl'],
      full: radii.full,
    },

    // Box shadows from tokens
    boxShadow: {
      xs: shadows.xs,
      sm: shadows.sm,
      md: shadows.md,
      lg: shadows.lg,
      xl: shadows.xl,
      '2xl': shadows['2xl'],
      inner: shadows.inner,
      none: shadows.none,
      primary: shadows.primary,
      accent: shadows.accent,
    },

    // Z-index layers from tokens
    zIndex: {
      base: String(zIndex.base),
      dropdown: String(zIndex.dropdown),
      sticky: String(zIndex.sticky),
      fixed: String(zIndex.fixed),
      'modal-backdrop': String(zIndex.modalBackdrop),
      modal: String(zIndex.modal),
      popover: String(zIndex.popover),
      tooltip: String(zIndex.tooltip),
      notification: String(zIndex.notification),
    },

    // Font sizes from tokens
    fontSize: {
      // Body sizes (static)
      lg: fontSizes.lg,
      base: fontSizes.base,
      sm: fontSizes.sm,
      xs: fontSizes.xs,
      xxs: fontSizes.xxs,

      // Headings (responsive - use with responsive classes)
      'h1-mobile': fontSizes.h1.mobile,
      'h1-desktop': fontSizes.h1.desktop,
      'h2-mobile': fontSizes.h2.mobile,
      'h2-desktop': fontSizes.h2.desktop,
      'h3-mobile': fontSizes.h3.mobile,
      'h3-desktop': fontSizes.h3.desktop,
      'h4-mobile': fontSizes.h4.mobile,
      'h4-desktop': fontSizes.h4.desktop,
      'h5-mobile': fontSizes.h5.mobile,
      'h5-desktop': fontSizes.h5.desktop,
      'h6-mobile': fontSizes.h6.mobile,
      'h6-desktop': fontSizes.h6.desktop,

      // Display sizes (responsive)
      'display-xl-mobile': fontSizes.display.xl.mobile,
      'display-xl-desktop': fontSizes.display.xl.desktop,
      'display-lg-mobile': fontSizes.display.lg.mobile,
      'display-lg-desktop': fontSizes.display.lg.desktop,
      'display-md-mobile': fontSizes.display.md.mobile,
      'display-md-desktop': fontSizes.display.md.desktop,
      'display-sm-mobile': fontSizes.display.sm.mobile,
      'display-sm-desktop': fontSizes.display.sm.desktop,
    },

    // Font weights from tokens
    fontWeight: {
      normal: fontWeights.normal,
      medium: fontWeights.medium,
      semibold: fontWeights.semibold,
      bold: fontWeights.bold,
    },

    // Line heights from tokens
    lineHeight: {
      none: lineHeights.none,
      tight: lineHeights.tight,
      snug: lineHeights.snug,
      normal: lineHeights.normal,
      relaxed: lineHeights.relaxed,
      loose: lineHeights.loose,
    },
  };
}

export default getTailwindTheme;
