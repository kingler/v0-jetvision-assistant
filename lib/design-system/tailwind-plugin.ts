/**
 * Tailwind CSS Plugin for Responsive Typography
 * 
 * Provides utility classes for responsive typography that automatically
 * scale between mobile and desktop breakpoints.
 * 
 * Usage:
 * - .text-responsive-h1 - Responsive h1 (32px mobile -> 40px desktop)
 * - .text-responsive-h2 - Responsive h2 (28px mobile -> 32px desktop)
 * - .text-responsive-h3 - Responsive h3 (24px mobile -> 28px desktop)
 * - .text-responsive-h4 - Responsive h4 (20px mobile -> 24px desktop)
 * - .text-responsive-h5 - Responsive h5 (18px mobile -> 20px desktop)
 * - .text-responsive-h6 - Responsive h6 (16px mobile -> 18px desktop)
 * - .text-responsive-display-xl - Responsive display XL (40px mobile -> 64px desktop)
 * - .text-responsive-display-lg - Responsive display LG (32px mobile -> 48px desktop)
 * - .text-responsive-display-md - Responsive display MD (28px mobile -> 36px desktop)
 * - .text-responsive-display-sm - Responsive display SM (24px mobile -> 32px desktop)
 */

import plugin from 'tailwindcss/plugin';
import { fontSizes } from './tokens';

export const responsiveTypographyPlugin = plugin(function({ addUtilities }) {
  const responsiveTypography = {
    // Responsive headings
    '.text-responsive-h1': {
      fontSize: fontSizes.h1.mobile,
      '@screen md': {
        fontSize: fontSizes.h1.desktop,
      },
    },
    '.text-responsive-h2': {
      fontSize: fontSizes.h2.mobile,
      '@screen md': {
        fontSize: fontSizes.h2.desktop,
      },
    },
    '.text-responsive-h3': {
      fontSize: fontSizes.h3.mobile,
      '@screen md': {
        fontSize: fontSizes.h3.desktop,
      },
    },
    '.text-responsive-h4': {
      fontSize: fontSizes.h4.mobile,
      '@screen md': {
        fontSize: fontSizes.h4.desktop,
      },
    },
    '.text-responsive-h5': {
      fontSize: fontSizes.h5.mobile,
      '@screen md': {
        fontSize: fontSizes.h5.desktop,
      },
    },
    '.text-responsive-h6': {
      fontSize: fontSizes.h6.mobile,
      '@screen md': {
        fontSize: fontSizes.h6.desktop,
      },
    },
    
    // Responsive display sizes
    '.text-responsive-display-xl': {
      fontSize: fontSizes.display.xl.mobile,
      '@screen md': {
        fontSize: fontSizes.display.xl.desktop,
      },
    },
    '.text-responsive-display-lg': {
      fontSize: fontSizes.display.lg.mobile,
      '@screen md': {
        fontSize: fontSizes.display.lg.desktop,
      },
    },
    '.text-responsive-display-md': {
      fontSize: fontSizes.display.md.mobile,
      '@screen md': {
        fontSize: fontSizes.display.md.desktop,
      },
    },
    '.text-responsive-display-sm': {
      fontSize: fontSizes.display.sm.mobile,
      '@screen md': {
        fontSize: fontSizes.display.sm.desktop,
      },
    },
  };

  addUtilities(responsiveTypography);
});

export default responsiveTypographyPlugin;

