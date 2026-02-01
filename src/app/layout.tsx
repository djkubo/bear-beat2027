import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ManyChatWidget } from '@/components/manychat/ManyChat'
import { MetaPixel } from '@/components/analytics/MetaPixel'
import { AttributionTracker } from '@/components/tracking/AttributionTracker'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { PushPrompt } from '@/components/notifications/PushPrompt'
import { Suspense } from 'react'

const inter = Inter({ subsets: ['latin'] })

// ==========================================
// SEO + OPEN GRAPH + METADATA COMPLETO
// ==========================================

export const metadata: Metadata = {
  title: {
    default: 'Bear Beat - Video Remixes para DJs 2026 | +178 Videos HD',
    template: '%s | Bear Beat'
  },
  description: 'Descarga 178 video remixes en HD para DJs. Reggaeton, Cumbia, Bachata, Salsa y más. Organizados por género, con Key y BPM. Pago único $350 MXN. Descarga ilimitada por Web.',
  keywords: [
    'video remixes', 'videos para dj', 'video pool', 'dj video', 
    'reggaeton videos', 'cumbia videos', 'bachata videos',
    'descargar videos dj', 'video remix 2026', 'bear beat',
    'videos musicales hd', 'video mixing', 'vj loops'
  ],
  authors: [{ name: 'Bear Beat' }],
  creator: 'Bear Beat',
  publisher: 'Bear Beat',
  
  // Open Graph - Facebook/WhatsApp
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: 'https://bearbeat.mx',
    siteName: 'Bear Beat',
    title: 'Bear Beat - +178 Video Remixes para DJs',
    description: 'El arsenal completo de videos que usan los DJs profesionales. Descarga ilimitada por $350 MXN. Reggaeton, Cumbia, Bachata, Salsa y más.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Bear Beat - Video Remixes para DJs',
      }
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Bear Beat - +178 Video Remixes para DJs',
    description: 'Descarga 178 videos HD para tus eventos. Pago único $350 MXN.',
    images: ['/og-image.png'],
  },
  
  // Favicon y iconos
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  
  // Manifest para PWA
  manifest: '/manifest.json',
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Verificación
  verification: {
    google: 'tu-codigo-de-verificacion',
  },
  
  // Otros
  category: 'music',
  classification: 'DJ Software & Content',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#08E1F7',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Preconnect para performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: 'Bear Beat - Pack Video Remixes 2026',
              description: '178 video remixes HD para DJs profesionales',
              brand: {
                '@type': 'Brand',
                name: 'Bear Beat'
              },
              offers: {
                '@type': 'Offer',
                price: '350',
                priceCurrency: 'MXN',
                availability: 'https://schema.org/InStock',
                url: 'https://bearbeat.mx/checkout'
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.9',
                reviewCount: '2847'
              }
            })
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />

        {/* Attribution Tracker */}
        <Suspense fallback={null}>
          <AttributionTracker />
        </Suspense>

        {/* Meta Pixel (Facebook) */}
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>

        {/* ManyChat Widget */}
        <ManyChatWidget />
        
        {/* Chat Widget Web */}
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
        
        {/* Push Notifications Prompt */}
        <Suspense fallback={null}>
          <PushPrompt />
        </Suspense>
      </body>
    </html>
  )
}
