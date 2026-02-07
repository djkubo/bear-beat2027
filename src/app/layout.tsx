import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import ChatWidget from '@/components/chat/ChatWidget'
import { Toaster } from 'sonner'
import { TrackingScripts } from '@/components/tracking/TrackingScripts'
import { ClientErrorLogger } from '@/components/tracking/ClientErrorLogger'
import { GlobalErrorBoundary } from '@/components/tracking/GlobalErrorBoundary'

export const metadata: Metadata = {
  title: 'Bear Beat | Video Remixes para DJs 2026 - Catalogo HD por Genero',
  description: 'Video Remixes para DJs 2026: biblioteca HD organizada por genero. Demos, descargas por video, ZIP por carpeta o FTP (FileZilla, Air Explorer). Pago unico. PayPal, tarjeta, OXXO, SPEI.',
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
        <GlobalErrorBoundary>
          <main className="relative min-w-0">
            {children}
          </main>
        </GlobalErrorBoundary>
        <ClientErrorLogger />
        <ChatWidget />
        <Toaster position="top-center" theme="dark" />
      </body>
    </html>
  )
}
