import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Button Component - Jetvision Design System
 *
 * Variants:
 * - default: Sky Blue (primary brand color)
 * - secondary: Text link style with primary color
 * - destructive: Error red
 * - outline: Bordered button
 * - ghost: Transparent background
 * - link: Text link style
 *
 * Sizes use design system spacing tokens.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Primary - Sky Blue (#00a8e8)
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        // Secondary - Text link style (flat, no background, primary color text)
        secondary:
          'bg-transparent text-primary underline-offset-4 hover:underline shadow-none',
        // Destructive - Error red
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        // Outline - Interactive hover (matches sidebar "New" button)
        outline:
          'border bg-background shadow-xs hover:bg-interactive-bg hover:border-interactive-border hover:text-interactive-text dark:bg-input/30 dark:border-input',
        // Ghost - Interactive hover (matches sidebar "New" button)
        ghost:
          'hover:bg-interactive-bg hover:text-interactive-text',
        // Header - for dark header; white text only; hover bg applied via globals.css
        header:
          'bg-transparent !text-white hover:!text-white',
        // Link
        link: 'text-primary underline-offset-4 hover:underline',
        // Success variant
        success:
          'bg-success text-white shadow-xs hover:bg-success/90',
        // Warning variant
        warning:
          'bg-warning text-white shadow-xs hover:bg-warning/90',
      },
      size: {
        // Design system button sizes (tokens.components.button)
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        xl: 'h-12 rounded-lg px-8 text-base has-[>svg]:px-6',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }
