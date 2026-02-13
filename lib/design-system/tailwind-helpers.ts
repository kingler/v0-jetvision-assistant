/**
 * Tailwind Helper Utilities
 *
 * Type-safe utility functions for generating Tailwind CSS class names
 * from design system tokens. These helpers provide autocomplete support
 * and ensure consistency between tokens and Tailwind classes.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { tokens } from './tokens';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type BrandColorName = keyof typeof tokens.colors.brand;
type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type SemanticColorName = keyof typeof tokens.colors.semantic;
type ColorVariant = 'bg' | 'text' | 'border' | 'ring' | 'outline';
type SemanticVariant = 'light' | 'dark';

type SpacingValue = keyof typeof tokens.spacing;
type SpacingType =
  | 'p'
  | 'px'
  | 'py'
  | 'pt'
  | 'pr'
  | 'pb'
  | 'pl'
  | 'm'
  | 'mx'
  | 'my'
  | 'mt'
  | 'mr'
  | 'mb'
  | 'ml'
  | 'gap'
  | 'gap-x'
  | 'gap-y';

type ShadowSize = keyof typeof tokens.shadows;
type RadiusSize = keyof typeof tokens.radii;
type ZIndexLayer = keyof typeof tokens.zIndex;

type FontWeight = keyof typeof tokens.typography.fontWeights;
type LineHeight = keyof typeof tokens.typography.lineHeights;

// ============================================================================
// CLASS NAME UTILITY (CN)
// ============================================================================

/**
 * Combines class names with tailwind-merge for conflict resolution
 *
 * @example
 * cn('p-4', 'bg-red-500') // 'p-4 bg-red-500'
 * cn('p-2', 'p-4') // 'p-4' (last wins)
 * cn('btn', isActive && 'btn-active') // conditional classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/**
 * Convert camelCase to kebab-case for Tailwind class names
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Generate Tailwind color class for brand colors
 *
 * @example
 * getColorClass('skyBlue', 500, 'bg') // 'bg-sky-blue-500'
 * getColorClass('skyBlue', 300, 'text') // 'text-sky-blue-300'
 * getColorClass('neutral', 700, 'border') // 'border-neutral-700'
 */
export function getColorClass(
  color: BrandColorName,
  shade: ColorShade,
  variant: ColorVariant
): string {
  const kebabColor = toKebabCase(color);
  return `${variant}-${kebabColor}-${shade}`;
}

/**
 * Generate Tailwind class for semantic colors
 *
 * @example
 * getSemanticColorClass('success', 'bg') // 'bg-success'
 * getSemanticColorClass('error', 'text', 'dark') // 'text-error-dark'
 * getSemanticColorClass('warning', 'bg', 'light') // 'bg-warning-bg'
 */
export function getSemanticColorClass(
  color: SemanticColorName,
  variant: ColorVariant,
  mode?: SemanticVariant | 'bg' | 'border'
): string {
  if (!mode) {
    return `${variant}-${color}`;
  }

  // Handle special modes for background and border variants
  if (mode === 'light') {
    if (variant === 'bg') return `bg-${color}-bg`;
    if (variant === 'border') return `border-${color}-border`;
    return `${variant}-${color}-light`;
  }

  if (mode === 'dark') {
    if (variant === 'bg') return `bg-${color}-bg-dark`;
    if (variant === 'border') return `border-${color}-border-dark`;
    return `${variant}-${color}-dark`;
  }

  return `${variant}-${color}`;
}

// ============================================================================
// SPACING UTILITIES
// ============================================================================

/**
 * Generate Tailwind spacing class
 *
 * @example
 * getSpacingClass(4, 'p') // 'p-4'
 * getSpacingClass(2, 'mx') // 'mx-2'
 * getSpacingClass(6, 'gap') // 'gap-6'
 */
export function getSpacingClass(value: SpacingValue, type: SpacingType): string {
  return `${type}-${value}`;
}

// ============================================================================
// TYPOGRAPHY UTILITIES
// ============================================================================

/**
 * Typography size to Tailwind text size mapping
 */
const typographySizeMap: Record<string, string> = {
  // Display sizes
  'display-2xl': 'text-6xl',
  'display-xl': 'text-5xl',
  'display-lg': 'text-4xl',
  'display-md': 'text-3xl',
  'display-sm': 'text-2xl',
  // Headings
  h1: 'text-4xl',
  h2: 'text-3xl',
  h3: 'text-2xl',
  h4: 'text-xl',
  h5: 'text-lg',
  h6: 'text-base',
  // Body
  'body-xl': 'text-xl',
  'body-lg': 'text-lg',
  body: 'text-base',
  'body-sm': 'text-sm',
  'body-xs': 'text-xs',
  // Labels
  'label-lg': 'text-base',
  label: 'text-sm',
  'label-sm': 'text-xs',
};

/**
 * Font weight to Tailwind class mapping
 */
const fontWeightMap: Record<string, string> = {
  thin: 'font-thin',
  extralight: 'font-extralight',
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
  black: 'font-black',
};

/**
 * Line height to Tailwind class mapping
 */
const lineHeightMap: Record<string, string> = {
  none: 'leading-none',
  tight: 'leading-tight',
  snug: 'leading-snug',
  normal: 'leading-normal',
  relaxed: 'leading-relaxed',
  loose: 'leading-loose',
};

/**
 * Generate combined typography classes
 *
 * @example
 * getTypographyClasses('h1') // 'text-4xl font-bold leading-tight'
 * getTypographyClasses('body', 'semibold', 'relaxed') // 'text-base font-semibold leading-relaxed'
 */
export function getTypographyClasses(
  size: string,
  weight?: string,
  lineHeight?: string
): string {
  const classes: string[] = [];

  // Add text size
  const textSize = typographySizeMap[size] || 'text-base';
  classes.push(textSize);

  // Add font weight (default based on size)
  if (weight) {
    const weightClass = fontWeightMap[weight] || 'font-normal';
    classes.push(weightClass);
  } else {
    // Default weights based on size
    if (size.startsWith('display') || size.startsWith('h')) {
      classes.push('font-bold');
    } else if (size.startsWith('label')) {
      classes.push('font-medium');
    } else {
      classes.push('font-normal');
    }
  }

  // Add line height
  if (lineHeight) {
    const lineHeightClass = lineHeightMap[lineHeight] || 'leading-normal';
    classes.push(lineHeightClass);
  } else {
    // Default line heights based on size
    if (size.startsWith('display') || size.startsWith('h')) {
      classes.push('leading-tight');
    } else {
      classes.push('leading-normal');
    }
  }

  return classes.join(' ');
}

// ============================================================================
// SHADOW UTILITIES
// ============================================================================

/**
 * Generate shadow class
 *
 * @example
 * getShadowClass('md') // 'shadow-md'
 * getShadowClass('primary') // 'shadow-primary'
 */
export function getShadowClass(size: ShadowSize): string {
  return `shadow-${size}`;
}

// ============================================================================
// BORDER RADIUS UTILITIES
// ============================================================================

/**
 * Generate border radius class
 *
 * @example
 * getRadiusClass('lg') // 'rounded-lg'
 * getRadiusClass('full') // 'rounded-full'
 */
export function getRadiusClass(size: RadiusSize): string {
  return `rounded-${size}`;
}

// ============================================================================
// Z-INDEX UTILITIES
// ============================================================================

/**
 * Generate z-index class
 *
 * @example
 * getZIndexClass('modal') // 'z-modal'
 * getZIndexClass('tooltip') // 'z-tooltip'
 */
export function getZIndexClass(layer: ZIndexLayer): string {
  // Convert camelCase to kebab-case for consistency
  const kebabLayer = toKebabCase(String(layer));
  return `z-${kebabLayer}`;
}

// ============================================================================
// COMPONENT CLASS GENERATORS
// ============================================================================

interface ButtonClassOptions {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Generate button classes based on variant and size
 *
 * @example
 * buttonClasses({ variant: 'primary', size: 'md' })
 * buttonClasses({ variant: 'outline', size: 'lg' })
 */
export function buttonClasses(options: ButtonClassOptions = {}): string {
  const { variant = 'primary', size = 'md' } = options;

  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'transition-colors',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-ring',
    'focus-visible:ring-offset-2',
    'disabled:pointer-events-none',
    'disabled:opacity-50',
  ];

  // Variant classes
  const variantClasses: Record<string, string[]> = {
    primary: ['bg-primary', 'text-primary-foreground', 'hover:bg-primary/90'],
    secondary: ['bg-secondary', 'text-secondary-foreground', 'hover:bg-secondary/80'],
    outline: ['border', 'border-input', 'bg-background', 'hover:bg-primary', 'hover:text-primary-foreground'],
    ghost: ['hover:bg-primary', 'hover:text-primary-foreground'],
    destructive: ['bg-destructive', 'text-destructive-foreground', 'hover:bg-destructive/90'],
  };

  // Size classes
  const sizeClasses: Record<string, string[]> = {
    sm: ['h-8', 'px-3', 'py-1', 'text-sm', 'rounded-md'],
    md: ['h-10', 'px-4', 'py-2', 'text-sm', 'rounded-md'],
    lg: ['h-12', 'px-6', 'py-3', 'text-base', 'rounded-lg'],
  };

  return cn(
    ...baseClasses,
    ...(variantClasses[variant] || variantClasses.primary),
    ...(sizeClasses[size] || sizeClasses.md)
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export const tailwindHelpers = {
  cn,
  getColorClass,
  getSemanticColorClass,
  getSpacingClass,
  getTypographyClasses,
  getShadowClass,
  getRadiusClass,
  getZIndexClass,
  buttonClasses,
};

export default tailwindHelpers;
