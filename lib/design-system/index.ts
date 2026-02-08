/**
 * Jetvision Group Design System
 *
 * Main entry point for the design system.
 * Import all design tokens and utilities from here.
 *
 * @example
 * import { tokens, getBrandColor, typography } from '@/lib/design-system'
 */

// Export all tokens
export {
  tokens,
  brandColors,
  semanticColors,
  cssVarColors,
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  spacing,
  radii,
  shadows,
  durations,
  easings,
  transitions,
  breakpoints,
  zIndex,
  buttonSizes,
  inputSizes,
  cardSpacing,
  focusRing,
  touchTargets,
  contrastRatios,
} from './tokens';

// Export all utilities
export {
  designUtils,
  getBrandColor,
  getSemanticColor,
  getSemanticBg,
  getSemanticBorder,
  hexToRgb,
  rgba,
  getResponsiveFontSize,
  typography,
  getFontFamily,
  space,
  spacingAll,
  spacingSides,
  radius,
  border,
  shadow,
  combineShadows,
  mediaQuery,
  isBreakpoint,
  responsiveValue,
  transition,
  customTransition,
  focusRing as createFocusRing,
  touchTarget,
  visuallyHidden,
  buttonSize,
  inputSize,
  css,
  mergeStyles,
} from './utils';

// Export Tailwind theme generator
export { getTailwindTheme } from './tailwind-theme';
export type { TailwindTheme } from './tailwind-theme';

// Export Tailwind plugin
export { responsiveTypographyPlugin } from './tailwind-plugin';

// Export Tailwind helper utilities
export {
  cn,
  getColorClass,
  getSemanticColorClass,
  getSpacingClass,
  getTypographyClasses,
  getShadowClass,
  getRadiusClass,
  getZIndexClass,
  buttonClasses,
  tailwindHelpers,
} from './tailwind-helpers';

// Export types
export type {
  BrandColor,
  SemanticColor,
  FontSize,
  Spacing,
  Radius,
  Shadow,
  Breakpoint,
} from './tokens';
