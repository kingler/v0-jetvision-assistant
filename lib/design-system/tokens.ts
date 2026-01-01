/**
 * Jetvision Group Design System Tokens
 *
 * Comprehensive design tokens for the private aviation charter platform.
 * Based on Sky Blue (#00a8e8) as primary, Aviation Blue (#0066cc) as legacy, and Sunset Orange (#ff6b35).
 *
 * Supports light and dark modes with WCAG AA accessibility compliance.
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

/**
 * Brand Colors - Aviation & Luxury Theme
 * Inspired by sky, clouds, and premium aviation aesthetics
 */
export const brandColors = {
  // Legacy - Aviation Blue (kept for backward compatibility)
  aviationBlue: {
    50: '#e6f2ff',
    100: '#cce5ff',
    200: '#99cbff',
    300: '#66b0ff',
    400: '#3396ff',
    500: '#0066cc',
    600: '#0052a3',
    700: '#003d7a',
    800: '#002952',
    900: '#001429',
  },

  // Primary - Sky Blue (Innovation, Speed, Trust, Professionalism)
  skyBlue: {
    50: '#e6f7fc',
    100: '#cceff9',
    200: '#99dff3',
    300: '#66cfed',
    400: '#33bfe7',
    500: '#00a8e8', // Primary brand color
    600: '#0087ba',
    700: '#00658b',
    800: '#00445d',
    900: '#00222e',
  },

  // Accent - Sunset Orange (Luxury, Premium)
  sunsetOrange: {
    50: '#fff3ed',
    100: '#ffe7db',
    200: '#ffcfb7',
    300: '#ffb793',
    400: '#ff9f6f',
    500: '#ff6b35', // Accent brand color
    600: '#cc562a',
    700: '#99401f',
    800: '#662b15',
    900: '#33150a',
  },

  // Neutral Colors (Modern, Clean)
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
} as const;

/**
 * Semantic Colors - Context-Aware
 * Mapped to specific use cases with accessibility in mind
 */
export const semanticColors = {
  // Success - Flight confirmed, booking complete
  success: {
    light: '#10b981', // green-500
    dark: '#34d399',  // green-400
    bg: {
      light: '#dcfce7', // green-100
      dark: '#064e3b',  // green-900
    },
    border: {
      light: '#86efac', // green-300
      dark: '#065f46',  // green-800
    },
  },

  // Warning - Attention needed, pending action
  warning: {
    light: '#f59e0b', // amber-500
    dark: '#fbbf24',  // amber-400
    bg: {
      light: '#fef3c7', // amber-100
      dark: '#78350f',  // amber-900
    },
    border: {
      light: '#fcd34d', // amber-300
      dark: '#92400e',  // amber-800
    },
  },

  // Error - Failed action, critical issue
  error: {
    light: '#dc2626', // red-600
    dark: '#f87171',  // red-400
    bg: {
      light: '#fee2e2', // red-100
      dark: '#7f1d1d',  // red-900
    },
    border: {
      light: '#fca5a5', // red-300
      dark: '#991b1b',  // red-800
    },
  },

  // Info - Informational messages
  info: {
    light: '#0891b2', // cyan-600
    dark: '#22d3ee',  // cyan-400
    bg: {
      light: '#cffafe', // cyan-100
      dark: '#164e63',  // cyan-900
    },
    border: {
      light: '#67e8f9', // cyan-300
      dark: '#155e75',  // cyan-800
    },
  },
} as const;

/**
 * CSS Variable Mappings
 * References to CSS variables defined in globals.css
 */
export const cssVarColors = {
  // Light mode
  light: {
    background: 'oklch(1 0 0)',
    foreground: 'oklch(0.25 0 0)',
    card: 'oklch(0.98 0 0)',
    cardForeground: 'oklch(0.3 0 0)',
    popover: 'oklch(1 0 0)',
    popoverForeground: 'oklch(0.25 0 0)',
    primary: 'oklch(0.65 0.18 220)', // Sky Blue 500 (#00a8e8)
    primaryForeground: 'oklch(1 0 0)', // White
    secondary: 'transparent', // Transparent for text link style
    secondaryForeground: 'oklch(0.65 0.18 220)', // Sky Blue 500 (primary color for text)
    muted: 'oklch(0.98 0 0)',
    mutedForeground: 'oklch(0.3 0 0)',
    accent: 'oklch(0.65 0.22 40)',
    accentForeground: 'oklch(1 0 0)',
    destructive: 'oklch(0.55 0.22 25)',
    destructiveForeground: 'oklch(1 0 0)',
    border: 'oklch(0.92 0 0)',
    input: 'oklch(1 0 0)',
    ring: 'oklch(0.55 0.15 200)',
  },

  // Dark mode
  dark: {
    background: 'oklch(0.145 0 0)',
    foreground: 'oklch(0.985 0 0)',
    card: 'oklch(0.145 0 0)',
    cardForeground: 'oklch(0.985 0 0)',
    popover: 'oklch(0.145 0 0)',
    popoverForeground: 'oklch(0.985 0 0)',
    primary: 'oklch(0.70 0.20 220)', // Sky Blue (lighter for dark mode)
    primaryForeground: 'oklch(0.98 0 0)', // White
    secondary: 'transparent', // Transparent for text link style
    secondaryForeground: 'oklch(0.70 0.20 220)', // Sky Blue (primary color for text)
    muted: 'oklch(0.269 0 0)',
    mutedForeground: 'oklch(0.708 0 0)',
    accent: 'oklch(0.70 0.24 40)',
    accentForeground: 'oklch(0.98 0 0)',
    destructive: 'oklch(0.396 0.141 25.723)',
    destructiveForeground: 'oklch(0.637 0.237 25.331)',
    border: 'oklch(0.269 0 0)',
    input: 'oklch(0.269 0 0)',
    ring: 'oklch(0.6 0.15 200)',
  },
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

/**
 * Font Families
 * Arial for sans-serif (clean, professional)
 * Courier New for monospace (data, code)
 */
export const fontFamilies = {
  sans: 'Arial, sans-serif',
  mono: '"Courier New", monospace',
} as const;

/**
 * Font Sizes - Type Scale
 * Mobile-first responsive typography
 */
export const fontSizes = {
  // Display sizes (landing, hero sections)
  display: {
    xl: { mobile: '2.5rem', desktop: '4rem' },      // 40px -> 64px
    lg: { mobile: '2rem', desktop: '3rem' },        // 32px -> 48px
    md: { mobile: '1.75rem', desktop: '2.25rem' },  // 28px -> 36px
    sm: { mobile: '1.5rem', desktop: '2rem' },      // 24px -> 32px
  },

  // Heading sizes
  h1: { mobile: '2rem', desktop: '2.5rem' },        // 32px -> 40px
  h2: { mobile: '1.75rem', desktop: '2rem' },       // 28px -> 32px
  h3: { mobile: '1.5rem', desktop: '1.75rem' },     // 24px -> 28px
  h4: { mobile: '1.25rem', desktop: '1.5rem' },     // 20px -> 24px
  h5: { mobile: '1.125rem', desktop: '1.25rem' },   // 18px -> 20px
  h6: { mobile: '1rem', desktop: '1.125rem' },      // 16px -> 18px

  // Body sizes
  lg: '1.125rem',     // 18px - Large body text
  base: '1rem',       // 16px - Default body text
  sm: '0.875rem',     // 14px - Small text, captions
  xs: '0.75rem',      // 12px - Labels, meta info
  xxs: '0.625rem',    // 10px - Tiny labels
} as const;

/**
 * Font Weights
 */
export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * Line Heights
 */
export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

/**
 * Letter Spacing
 */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

/**
 * Spacing Scale - Base 4px (0.25rem)
 * Consistent spacing for margins, padding, gaps
 */
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
  28: '7rem',        // 112px
  32: '8rem',        // 128px
  36: '9rem',        // 144px
  40: '10rem',       // 160px
  44: '11rem',       // 176px
  48: '12rem',       // 192px
  52: '13rem',       // 208px
  56: '14rem',       // 224px
  60: '15rem',       // 240px
  64: '16rem',       // 256px
  72: '18rem',       // 288px
  80: '20rem',       // 320px
  96: '24rem',       // 384px
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

/**
 * Border Radius - Rounded Corners
 * Smooth, modern aesthetic for private aviation
 */
export const radii = {
  none: '0',
  sm: 'calc(0.5rem - 4px)',  // ~2px
  md: 'calc(0.5rem - 2px)',  // ~6px
  lg: '0.5rem',              // 8px (base radius)
  xl: 'calc(0.5rem + 4px)',  // ~12px
  '2xl': '1rem',             // 16px
  '3xl': '1.5rem',           // 24px
  full: '9999px',            // Fully rounded (pills, avatars)
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

/**
 * Box Shadows - Depth & Elevation
 * Subtle shadows for cards, modals, and elevated elements
 */
export const shadows = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',

  // Colored shadows for emphasis
  primary: '0 10px 15px -3px rgb(0 168 232 / 0.2), 0 4px 6px -4px rgb(0 168 232 / 0.1)', // Sky Blue
  accent: '0 10px 15px -3px rgb(255 107 53 / 0.2), 0 4px 6px -4px rgb(255 107 53 / 0.1)',
} as const;

// ============================================================================
// TRANSITIONS & ANIMATIONS
// ============================================================================

/**
 * Animation Durations
 */
export const durations = {
  fast: '150ms',
  base: '200ms',
  medium: '300ms',
  slow: '500ms',
  slower: '700ms',
} as const;

/**
 * Animation Timing Functions
 */
export const easings = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Common Transitions
 */
export const transitions = {
  all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  colors: 'color 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  shadow: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

/**
 * Responsive Breakpoints - Mobile First
 */
export const breakpoints = {
  sm: '640px',   // Small devices (landscape phones)
  md: '768px',   // Medium devices (tablets)
  lg: '1024px',  // Large devices (desktops)
  xl: '1280px',  // Extra large devices (large desktops)
  '2xl': '1536px', // 2X large devices (larger desktops)
} as const;

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

/**
 * Z-Index Scale - Stacking Context
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  notification: 1700,
} as const;

// ============================================================================
// COMPONENT-SPECIFIC TOKENS
// ============================================================================

/**
 * Button Sizes
 */
export const buttonSizes = {
  sm: {
    height: '2rem',    // 32px
    paddingX: '0.75rem', // 12px
    fontSize: fontSizes.sm,
  },
  default: {
    height: '2.25rem', // 36px
    paddingX: '1rem',  // 16px
    fontSize: fontSizes.base,
  },
  lg: {
    height: '2.5rem',  // 40px
    paddingX: '1.5rem', // 24px
    fontSize: fontSizes.lg,
  },
  icon: {
    size: '2.25rem',   // 36px (square)
  },
} as const;

/**
 * Input Sizes
 */
export const inputSizes = {
  sm: {
    height: '2rem',    // 32px
    paddingX: '0.75rem',
    fontSize: fontSizes.sm,
  },
  default: {
    height: '2.25rem', // 36px
    paddingX: '0.75rem',
    fontSize: fontSizes.base,
  },
  lg: {
    height: '2.75rem', // 44px
    paddingX: '1rem',
    fontSize: fontSizes.lg,
  },
} as const;

/**
 * Card Spacing
 */
export const cardSpacing = {
  padding: spacing[6],        // 24px
  gap: spacing[6],            // 24px
  headerGap: spacing[1.5],    // 6px
} as const;

// ============================================================================
// ACCESSIBILITY
// ============================================================================

/**
 * Focus Ring Styles
 * WCAG 2.1 compliant focus indicators
 */
export const focusRing = {
  width: '3px',
  offset: '2px',
  color: 'var(--color-ring)',
  style: 'solid',
} as const;

/**
 * Minimum Touch Target Sizes
 * WCAG 2.1 AA: 24x24px minimum
 * AAA: 44x44px recommended
 */
export const touchTargets = {
  minimum: '24px',
  recommended: '44px',
} as const;

/**
 * Contrast Ratios (for reference)
 * WCAG AA: 4.5:1 for normal text, 3:1 for large text
 * WCAG AAA: 7:1 for normal text, 4.5:1 for large text
 */
export const contrastRatios = {
  aa: {
    normalText: 4.5,
    largeText: 3,
  },
  aaa: {
    normalText: 7,
    largeText: 4.5,
  },
} as const;

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Complete Design Tokens Object
 */
export const tokens = {
  colors: {
    brand: brandColors,
    semantic: semanticColors,
    cssVars: cssVarColors,
  },
  typography: {
    fontFamilies,
    fontSizes,
    fontWeights,
    lineHeights,
    letterSpacing,
  },
  spacing,
  radii,
  shadows,
  animations: {
    durations,
    easings,
    transitions,
  },
  breakpoints,
  zIndex,
  components: {
    button: buttonSizes,
    input: inputSizes,
    card: cardSpacing,
  },
  accessibility: {
    focusRing,
    touchTargets,
    contrastRatios,
  },
} as const;

// Type exports for TypeScript usage
export type BrandColor = keyof typeof brandColors;
export type SemanticColor = keyof typeof semanticColors;
export type FontSize = keyof typeof fontSizes;
export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radii;
export type Shadow = keyof typeof shadows;
export type Breakpoint = keyof typeof breakpoints;
