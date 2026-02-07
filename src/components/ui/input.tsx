import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-12 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-[16px] text-white placeholder:text-gray-500',
        'outline-none transition-colors focus:border-bear-blue focus:ring-2 focus:ring-bear-blue/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
