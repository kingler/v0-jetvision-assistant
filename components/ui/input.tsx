import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Input Component - Jetvision Design System
 *
 * Uses design system tokens for sizing and focus states.
 * Supports multiple sizes from design system input tokens.
 */
const inputVariants = cva(
  'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 rounded-md border bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      size: {
        // Design system input sizes (tokens.components.input)
        sm: 'h-8 px-2 py-1 text-sm file:h-6',
        default: 'h-9 px-3 py-1 file:h-7',
        lg: 'h-10 px-4 py-2 file:h-8',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(inputVariants({ size }), className)}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input, inputVariants }
