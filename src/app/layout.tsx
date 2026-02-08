import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import ChatWidgetLazy from '@/components/chat/ChatWidgetLazy'
import { Toaster } from 'sonner'
import { TrackingScripts } from '@/components/tracking/TrackingScripts'
import { ClientErrorLogger } from '@/components/tracking/ClientErrorLogger'
import { GlobalErrorBoundary } from '@/components/tracking/GlobalErrorBoundary'

export const metadata: Metadata = {
  title: 'Bear Beat | Video Remixes para DJs 2026 - Catalogo HD por Genero',
  description: 'Video Remixes para DJs 2026: biblioteca HD organizada por genero. Demos, descargas por video, ZIP por carpeta o FTP (FileZilla, Air Explorer). Pago unico. PayPal, tarjeta, OXXO, SPEI.',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/favicon.png', type: 'image/png' }],
  },
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <Suspense fallback={null}>
          <TrackingScripts />
        </Suspense>
      </head>
      <body className="font-sans relative min-w-0 overflow-x-hidden overflow-y-auto bg-black text-white antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed top-4 left-4 z-[1000] rounded-xl border border-bear-blue/40 bg-zinc-950/95 px-4 py-2 text-sm font-bold text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-blue/40"
        >
          Saltar al contenido
        </a>
        <GlobalErrorBoundary>
          <main id="main-content" tabIndex={-1} className="relative min-w-0">
            {children}
          </main>
        </GlobalErrorBoundary>
        <ClientErrorLogger />
        <ChatWidgetLazy />
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  )
}
