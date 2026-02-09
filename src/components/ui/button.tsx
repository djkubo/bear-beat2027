import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap select-none touch-manipulation',
    'rounded-xl text-sm font-bold',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-bear-blue text-bear-black font-black hover:brightness-110 shadow-[0_0_24px_rgba(8,225,247,0.25)]',
        destructive:
          'bg-red-500 text-white hover:bg-red-500/90 shadow-[0_0_24px_rgba(239,68,68,0.18)]',
        outline: 'border border-white/15 bg-transparent text-white hover:bg-white/5',
        secondary: 'border border-white/10 bg-white/5 text-white hover:bg-white/10',
        ghost: 'bg-transparent text-zinc-300 hover:bg-white/10 hover:text-white',
        link: 'bg-transparent text-bear-blue underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-12 px-5',
        sm: 'h-10 px-4',
        lg: 'h-14 px-8 text-base',
        xl: 'h-16 px-10 text-lg rounded-2xl',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
