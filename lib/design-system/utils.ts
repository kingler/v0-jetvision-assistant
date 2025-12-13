/**
 * Jetvision Group Design System Utilities
 *
 * Helper functions for working with design tokens and creating consistent UIs.
 */

import { tokens } from './tokens';

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Get a brand color shade
 *
 * @example
 * getBrandColor('aviationBlue', 500) // #0066cc
 * getBrandColor('skyBlue', 300) // #66cfed
 */
export function getBrandColor(
  color: keyof typeof tokens.colors.brand,
  shade: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
): string {
  return tokens.colors.brand[color][shade];
}

/**
 * Get a semantic color value
 *
 * @example
 * getSemanticColor('success', 'light') // #10b981
 * getSemanticColor('error', 'dark') // #f87171
 */
export function getSemanticColor(
  type: keyof typeof tokens.colors.semantic,
  variant: 'light' | 'dark'
): string {
  return tokens.colors.semantic[type][variant];
}

/**
 * Get semantic color background
 */
export function getSemanticBg(
  type: keyof typeof tokens.colors.semantic,
  mode: 'light' | 'dark' = 'light'
): string {
  return tokens.colors.semantic[type].bg[mode];
}

/**
 * Get semantic color border
 */
export function getSemanticBorder(
  type: keyof typeof tokens.colors.semantic,
  mode: 'light' | 'dark' = 'light'
): string {
  return tokens.colors.semantic[type].border[mode];
}

/**
 * Convert hex to RGB
 * Useful for creating rgba values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Create rgba color from hex
 *
 * @example
 * rgba('#0066cc', 0.5) // 'rgba(0, 102, 204, 0.5)'
 */
export function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

// ============================================================================
// TYPOGRAPHY UTILITIES
// ============================================================================

/**
 * Get responsive font size
 * Returns mobile size by default, desktop size for larger screens
 *
 * @example
 * getResponsiveFontSize('h1') // { mobile: '2rem', desktop: '2.5rem' }
 */
export function getResponsiveFontSize(size: keyof typeof tokens.typography.fontSizes) {
  const fontSize = tokens.typography.fontSizes[size];
  if (typeof fontSize === 'string') {
    return { mobile: fontSize, desktop: fontSize };
  }
  return fontSize;
}

/**
 * Create a typography style object
 *
 * @example
 * typography('h1', 'bold') // { fontSize: '2rem', fontWeight: 700, ... }
 */
export function typography(
  size: keyof typeof tokens.typography.fontSizes,
  weight: keyof typeof tokens.typography.fontWeights = 'normal',
  lineHeight: keyof typeof tokens.typography.lineHeights = 'normal'
) {
  const fontSize = tokens.typography.fontSizes[size];
  return {
    fontSize: typeof fontSize === 'string' ? fontSize : fontSize.mobile,
    fontWeight: tokens.typography.fontWeights[weight],
    lineHeight: tokens.typography.lineHeights[lineHeight],
    fontFamily: tokens.typography.fontFamilies.sans,
  };
}

/**
 * Get font family
 */
export function getFontFamily(family: keyof typeof tokens.typography.fontFamilies): string {
  return tokens.typography.fontFamilies[family];
}

// ============================================================================
// SPACING UTILITIES
// ============================================================================

/**
 * Get spacing value
 *
 * @example
 * space(4) // '1rem'
 * space('4') // '1rem'
 */
export function space(value: keyof typeof tokens.spacing | string): string {
  return tokens.spacing[value as keyof typeof tokens.spacing] || '0';
}

/**
 * Create spacing for all sides
 *
 * @example
 * spacing(4) // { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
 */
export function spacingAll(value: keyof typeof tokens.spacing) {
  const spaceValue = tokens.spacing[value];
  return {
    top: spaceValue,
    right: spaceValue,
    bottom: spaceValue,
    left: spaceValue,
  };
}

/**
 * Create spacing for specific sides
 *
 * @example
 * spacingSides({ x: 4, y: 2 }) // { paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }
 */
export function spacingSides(sides: {
  x?: keyof typeof tokens.spacing;
  y?: keyof typeof tokens.spacing;
  top?: keyof typeof tokens.spacing;
  right?: keyof typeof tokens.spacing;
  bottom?: keyof typeof tokens.spacing;
  left?: keyof typeof tokens.spacing;
}) {
  return {
    ...(sides.x && {
      paddingLeft: tokens.spacing[sides.x],
      paddingRight: tokens.spacing[sides.x],
    }),
    ...(sides.y && {
      paddingTop: tokens.spacing[sides.y],
      paddingBottom: tokens.spacing[sides.y],
    }),
    ...(sides.top && { paddingTop: tokens.spacing[sides.top] }),
    ...(sides.right && { paddingRight: tokens.spacing[sides.right] }),
    ...(sides.bottom && { paddingBottom: tokens.spacing[sides.bottom] }),
    ...(sides.left && { paddingLeft: tokens.spacing[sides.left] }),
  };
}

// ============================================================================
// BORDER UTILITIES
// ============================================================================

/**
 * Get border radius
 *
 * @example
 * radius('lg') // '0.5rem'
 * radius('full') // '9999px'
 */
export function radius(value: keyof typeof tokens.radii): string {
  return tokens.radii[value];
}

/**
 * Create border style
 *
 * @example
 * border(1, 'gray-300', 'lg') // { borderWidth: '1px', borderColor: '#d1d5db', borderRadius: '0.5rem' }
 */
export function border(
  width: number = 1,
  color: string = 'var(--color-border)',
  borderRadius?: keyof typeof tokens.radii
) {
  return {
    borderWidth: `${width}px`,
    borderStyle: 'solid',
    borderColor: color,
    ...(borderRadius && { borderRadius: tokens.radii[borderRadius] }),
  };
}

// ============================================================================
// SHADOW UTILITIES
// ============================================================================

/**
 * Get box shadow
 *
 * @example
 * shadow('md') // '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
 */
export function shadow(value: keyof typeof tokens.shadows): string {
  return tokens.shadows[value];
}

/**
 * Combine multiple shadows
 *
 * @example
 * combineShadows('sm', 'primary') // 'shadow-sm shadow-primary'
 */
export function combineShadows(...values: Array<keyof typeof tokens.shadows>): string {
  return values.map((v) => tokens.shadows[v]).join(', ');
}

// ============================================================================
// RESPONSIVE UTILITIES
// ============================================================================

/**
 * Create media query
 *
 * @example
 * mediaQuery('md') // '@media (min-width: 768px)'
 */
export function mediaQuery(breakpoint: keyof typeof tokens.breakpoints): string {
  return `@media (min-width: ${tokens.breakpoints[breakpoint]})`;
}

/**
 * Check if current viewport matches breakpoint (client-side only)
 */
export function isBreakpoint(breakpoint: keyof typeof tokens.breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(min-width: ${tokens.breakpoints[breakpoint]})`).matches;
}

/**
 * Get responsive value based on current breakpoint
 *
 * @example
 * responsiveValue({ mobile: '1rem', tablet: '1.5rem', desktop: '2rem' })
 */
export function responsiveValue<T>(values: {
  mobile: T;
  tablet?: T;
  desktop?: T;
  wide?: T;
}): T {
  if (typeof window === 'undefined') return values.mobile;

  if (values.wide && isBreakpoint('2xl')) return values.wide;
  if (values.desktop && isBreakpoint('lg')) return values.desktop;
  if (values.tablet && isBreakpoint('md')) return values.tablet;
  return values.mobile;
}

// ============================================================================
// ANIMATION UTILITIES
// ============================================================================

/**
 * Create transition
 *
 * @example
 * transition('colors') // 'color 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms...'
 */
export function transition(type: keyof typeof tokens.animations.transitions): string {
  return tokens.animations.transitions[type];
}

/**
 * Create custom transition
 *
 * @example
 * customTransition('opacity', 'medium', 'inOut') // 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)'
 */
export function customTransition(
  property: string,
  duration: keyof typeof tokens.animations.durations = 'base',
  easing: keyof typeof tokens.animations.easings = 'inOut'
): string {
  return `${property} ${tokens.animations.durations[duration]} ${tokens.animations.easings[easing]}`;
}

// ============================================================================
// ACCESSIBILITY UTILITIES
// ============================================================================

/**
 * Create focus ring styles
 * WCAG 2.1 compliant focus indicator
 *
 * @example
 * focusRing() // { outline: '3px solid var(--color-ring)', outlineOffset: '2px' }
 */
export function focusRing(customColor?: string) {
  return {
    outline: `${tokens.accessibility.focusRing.width} ${tokens.accessibility.focusRing.style} ${customColor || tokens.accessibility.focusRing.color}`,
    outlineOffset: tokens.accessibility.focusRing.offset,
  };
}

/**
 * Create accessible touch target
 * Ensures minimum 44x44px touch area
 *
 * @example
 * touchTarget() // { minWidth: '44px', minHeight: '44px' }
 */
export function touchTarget(size: 'minimum' | 'recommended' = 'recommended') {
  const targetSize = tokens.accessibility.touchTargets[size];
  return {
    minWidth: targetSize,
    minHeight: targetSize,
  };
}

/**
 * Visually hidden but accessible to screen readers
 * Common pattern for accessible labels
 */
export function visuallyHidden() {
  return {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden' as const,
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    borderWidth: '0',
  };
}

// ============================================================================
// COMPONENT UTILITIES
// ============================================================================

/**
 * Get button size styles
 *
 * @example
 * buttonSize('lg') // { height: '2.5rem', paddingX: '1.5rem', fontSize: '1.125rem' }
 */
export function buttonSize(size: keyof typeof tokens.components.button) {
  return tokens.components.button[size];
}

/**
 * Get input size styles
 */
export function inputSize(size: keyof typeof tokens.components.input) {
  return tokens.components.input[size];
}

/**
 * Get card spacing
 */
export function cardSpacing() {
  return tokens.components.card;
}

// ============================================================================
// UTILITY TYPE HELPERS
// ============================================================================

/**
 * Type-safe CSS-in-JS object creator
 */
export function css<T extends Record<string, unknown>>(styles: T): T {
  return styles;
}

/**
 * Merge multiple style objects
 */
export function mergeStyles<T extends Record<string, unknown>>(...styles: T[]): T {
  return Object.assign({}, ...styles);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const designUtils = {
  // Colors
  getBrandColor,
  getSemanticColor,
  getSemanticBg,
  getSemanticBorder,
  hexToRgb,
  rgba,

  // Typography
  getResponsiveFontSize,
  typography,
  getFontFamily,

  // Spacing
  space,
  spacingAll,
  spacingSides,

  // Borders
  radius,
  border,

  // Shadows
  shadow,
  combineShadows,

  // Responsive
  mediaQuery,
  isBreakpoint,
  responsiveValue,

  // Animations
  transition,
  customTransition,

  // Accessibility
  focusRing,
  touchTarget,
  visuallyHidden,

  // Components
  buttonSize,
  inputSize,
  cardSpacing,

  // Helpers
  css,
  mergeStyles,
};
