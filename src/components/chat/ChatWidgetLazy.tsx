'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LazyChatWidget = dynamic(() => import('@/components/chat/ChatWidget'), {
  ssr: false,
})

/**
 * Reduce JS en el primer paint: no carga el widget completo hasta que el usuario lo necesite.
 * En /checkout lo montamos inmediato para conservar el "rescate" automático.
 */
export default function ChatWidgetLazy() {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin') ?? false
  const [shouldLoad, setShouldLoad] = useState(false)
  const [requestedOpen, setRequestedOpen] = useState(false)
  const [loadingChunk, setLoadingChunk] = useState(false)

  // En checkout: montar inmediatamente.
  useEffect(() => {
    if (isAdmin) return
    if (pathname?.startsWith('/checkout')) setShouldLoad(true)
  }, [pathname, isAdmin])

  // Prefetch suave: baja el chunk cuando el navegador esté libre (sin montar el widget).
  useEffect(() => {
    if (isAdmin || shouldLoad) return
    if (typeof navigator !== 'undefined' && navigator.webdriver) return
    const prefetch = () => import('@/components/chat/ChatWidget').catch(() => {})
    const t = window.setTimeout(() => {
      // requestIdleCallback no existe en todos los navegadores
      if ('requestIdleCallback' in window) {
        ;(window as any).requestIdleCallback(() => prefetch(), { timeout: 2000 })
      } else {
        prefetch()
      }
    }, 3500)
    return () => window.clearTimeout(t)
  }, [shouldLoad, isAdmin])

  if (isAdmin) return null

  if (shouldLoad) {
    return <LazyChatWidget defaultOpen={requestedOpen} />
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[45]',
        'flex flex-col items-end pointer-events-none [&>*]:pointer-events-auto'
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        paddingRight: 'env(safe-area-inset-right, 0)',
      }}
    >
      <Button
        type="button"
        onClick={async () => {
          setLoadingChunk(true)
          setRequestedOpen(true)
          try {
            await import('@/components/chat/ChatWidget')
          } catch {
            // ignore
          } finally {
            setShouldLoad(true)
          }
        }}
        aria-label={loadingChunk ? 'Cargando chat' : 'Abrir chat'}
        className="h-12 w-12 min-w-[48px] min-h-[48px] rounded-full bg-bear-blue/90 hover:bg-bear-blue text-bear-black shadow-lg touch-manipulation"
      >
        {loadingChunk ? <Loader2 size={22} className="animate-spin" /> : <MessageSquare size={22} />}
      </Button>
    </div>
  )
}
