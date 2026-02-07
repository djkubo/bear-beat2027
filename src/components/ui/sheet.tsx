'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetPortal = DialogPrimitive.Portal
const SheetClose = DialogPrimitive.Close

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/85 backdrop-blur-md',
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

type SheetSide = 'right' | 'left' | 'top' | 'bottom'

function sideClasses(side: SheetSide) {
  switch (side) {
    case 'left':
      return 'inset-y-0 left-0 w-[min(92vw,340px)] -translate-x-full data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full border-r'
    case 'top':
      return 'inset-x-0 top-0 h-[min(90dvh,520px)] -translate-y-full data-[state=open]:translate-y-0 data-[state=closed]:-translate-y-full border-b'
    case 'bottom':
      return 'inset-x-0 bottom-0 h-[min(90dvh,520px)] translate-y-full data-[state=open]:translate-y-0 data-[state=closed]:translate-y-full border-t'
    case 'right':
    default:
      return 'inset-y-0 right-0 w-[min(92vw,340px)] translate-x-full data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full border-l'
  }
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: SheetSide; showClose?: boolean }
>(({ className, children, side = 'right', showClose = false, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 bg-zinc-950 text-white shadow-[-8px_0_32px_rgba(0,0,0,0.6)] outline-none',
        'border-white/10',
        'transition-transform duration-300 ease-out will-change-transform',
        sideClasses(side),
        className
      )}
      {...props}
    >
      {children}
      {showClose && (
        <SheetClose
          className={cn(
            'absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl',
            'text-zinc-400 hover:text-white hover:bg-white/10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-blue/40'
          )}
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </SheetClose>
      )}
    </DialogPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = DialogPrimitive.Content.displayName

export { Sheet, SheetTrigger, SheetPortal, SheetClose, SheetOverlay, SheetContent }

