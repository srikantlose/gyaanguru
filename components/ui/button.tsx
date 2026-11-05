import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'border-2 border-ink bg-marigold text-ink shadow-brut hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-lift active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        destructive: 'border-2 border-ink bg-coral text-ink shadow-brut hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-lift active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        outline: 'border-2 border-ink bg-card text-ink shadow-soft hover:bg-brand-soft hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-lift active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        secondary: 'border-2 border-ink bg-brand text-ink shadow-soft hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-lift active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        ghost: 'hover:bg-ink/5 hover:text-ink',
        link: 'text-primary font-semibold underline-offset-4 hover:underline',
        pop: 'border-2 border-ink bg-ink text-white shadow-[4px_4px_0_0_var(--color-marigold)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--color-marigold)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-12 rounded-xl px-6 text-base has-[>svg]:px-5',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
